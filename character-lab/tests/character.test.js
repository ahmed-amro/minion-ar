import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacter } from '../character.js';

// CPU-only canvas stand-in: verifies geometry/lifecycle, not texture pixels or WebGL.
globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  return {width:0,height:0,getContext(){return {
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
    putImageData(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}
  };}};
}};
function tick(c,n=150){for(let i=0;i<n;i++)c.update(.02);}

test('standing size is measured and supports the 12 cm scale',()=>{
  const c=createCharacter();assert.ok(c.standingHeight>.8&&c.standingHeight<.9);
  c.root.scale.setScalar(.12/c.standingHeight);
  assert.ok(Math.abs(c.standingHeight*c.root.scale.y-.12)<1e-12);
  assert.equal(c.touchTarget.name,'bello-touch-target');c.dispose();
});
test('all actions preserve the host root and produce finite animated transforms',()=>{
  const c=createCharacter();c.root.position.set(.12,.4,-.5);c.root.rotation.y=.8;c.root.scale.setScalar(.15);
  const position=c.root.position.toArray(),rotation=c.root.quaternion.toArray(),scale=c.root.scale.toArray();
  for(const action of ['wave','dance','jump','spin','giggle','peek','read','wake']){
    c.triggerAction(action);tick(c,200);
    assert.deepEqual(c.root.position.toArray(),position);assert.deepEqual(c.root.quaternion.toArray(),rotation);
    assert.deepEqual(c.root.scale.toArray(),scale);
    c.root.traverse(o=>{assert.ok([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite));});
  }
  c.dispose();
});
test('reading props and page position persist through conversation, wake hides them after transition',()=>{
  const c=createCharacter();c.triggerAction('read');tick(c,300);
  const d=c.root.children[0].userData;const pageRotation=d.page.rotation.y;
  assert.equal(d.chair.visible,true);assert.equal(d.magazine.visible,true);
  c.setConversationState('listening');const before=c.getState().readTime;tick(c);
  assert.equal(c.getState().readTime,before);assert.equal(d.page.rotation.y,pageRotation);
  assert.equal(d.magazine.visible,true);c.setConversationState('idle');c.triggerAction('wake');tick(c);
  assert.equal(d.chair.visible,false);assert.equal(d.magazine.visible,false);c.dispose();
});
test('boots remain above local floor through standing reactions',()=>{
  const c=createCharacter(),d=c.root.children[0].userData;
  for(const action of ['wave','dance','jump','spin','giggle','peek']){
    c.triggerAction(action);
    for(let i=0;i<170;i++){
      c.update(.02);c.root.updateMatrixWorld(true);
      for(const leg of d.legs)for(const foot of leg.ankle.children){
        const box=new THREE.Box3().setFromObject(foot);
        assert.ok(box.min.y>=-1e-8,`${action}: foot below floor ${box.min.y}`);
      }
    }
  }
  c.dispose();
});
test('resources are disposed once even when shared, and disposal is idempotent',()=>{
  const c=createCharacter();const resources=new Set();
  c.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);
    for(const m of o.material?[o.material]:[]){resources.add(m);for(const t of Object.values(m))if(t?.isTexture)resources.add(t);}
  });
  const counts=new Map();for(const r of resources)r.addEventListener('dispose',()=>counts.set(r,(counts.get(r)||0)+1));
  c.dispose();c.dispose();for(const r of resources)assert.equal(counts.get(r),1);
  assert.equal(c.root.children.length,0);c.update(.02);
});
