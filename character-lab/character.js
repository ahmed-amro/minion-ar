import * as THREE from 'three';
import { buildCompanion, paintTexture, material } from './geometry.js';
import { Behavior } from './behavior.js';
import { AnimationController } from './animation.js';

function grainTexture(seed, contrast) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'); const data = ctx.createImageData(128,128);
  let state = seed;
  for (let i=0; i<data.data.length; i+=4) {
    state = (1664525 * state + 1013904223) >>> 0;
    const value = 128 + contrast * (state / 4294967296 - .5);
    data.data[i]=data.data[i+1]=data.data[i+2]=value; data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; // Data map intentionally remains NoColorSpace.
  return t;
}
function createMaterials() {
  const specs = [
    ['yellow','skin',127,.78,0,.0007], ['denim','denim',331,.91,0,.0014],
    ['rubber','rubber',1129,.86,0,.0006], ['metal','steel',977,.32,.72,.00015],
    ['wood','wood',2401,.8,0,.0006]
  ];
  return Object.fromEntries(specs.map(([key,type,seed,roughness,metalness,bumpScale]) =>
    [key,new THREE.MeshStandardMaterial({map:paintTexture(type,seed),
      bumpMap:grainTexture(seed, type==='skin'?30:65),bumpScale,roughness,metalness})]));
}

// A circular cap with a changing chord. Buffers are reused, not allocated per blink.
function createLid(mat, bottom=false) {
  const segments=40;
  const g=new THREE.BufferGeometry();
  const positions=new Float32Array((segments+2)*3);
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const indices=[];
  for(let i=1;i<=segments;i++) indices.push(0,i,i+1);
  g.setIndex(indices); g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(positions.length).fill(0),3));
  for(let i=2;i<positions.length;i+=3) g.attributes.normal.array[i]=1;
  const mesh=new THREE.Mesh(g,mat); mesh.position.set(0,.558,.309);
  mesh.frustumCulled=false;
  return {mesh, update(close) {
    mesh.visible=close>.003;
    const r=.0815, cut=1-(bottom?.25:1.75)*close;
    const theta=Math.acos(THREE.MathUtils.clamp(cut,-1,1));
    const sign=bottom?-1:1;
    positions[0]=0; positions[1]=sign*r*cut; positions[2]=0;
    for(let i=0;i<=segments;i++) {
      const angle=-theta+2*theta*i/segments, j=(i+1)*3;
      positions[j]=r*Math.sin(angle); positions[j+1]=sign*r*Math.cos(angle); positions[j+2]=0;
    }
    g.attributes.position.needsUpdate=true;
  }};
}

function createShadow() {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'); const grad=ctx.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(15,20,25,.9)'); grad.addColorStop(.45,'rgba(15,20,25,.45)');
  grad.addColorStop(1,'rgba(15,20,25,0)'); ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.55,.4),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,
      opacity:.29,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.0008,.025);return shadow;
}

export function createCharacter(options={}) {
  const root=new THREE.Group(); root.name='BelloCharacter';
  const model=buildCompanion(createMaterials()); root.add(model);
  const d=model.userData;
  const lidMat=material(0xf5cc30,{roughness:.78,side:THREE.DoubleSide});
  const upper=createLid(lidMat), lower=createLid(lidMat,true);
  d.motion.add(upper.mesh,lower.mesh);
  d.setLid=value=>{upper.update(value);lower.update(value);}; d.setLid(0);
  d.brow=new THREE.Mesh(new THREE.TorusGeometry(.056,.003,6,24,1.5),material(0x775325));
  d.brow.position.set(-.04,.64,.242); d.motion.add(d.brow);
  // Standing bounds only: exclude props and oversized invisible tap target.
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3(); const box=new THREE.Box3();
  d.motion.traverse(o=>{
    if(o.isMesh && o!==d.touchZone && o.visible && !isChildOf(o,d.magazine)) {
      o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bounds.union(box);
    }
  });
  const standingHeight=bounds.max.y-bounds.min.y;
  model.position.y=-bounds.min.y;
  d.chair.position.y=bounds.min.y-.003;
  d.model=model;d.soleLevel=bounds.min.y;
  const shadow=createShadow();root.add(shadow);d.shadow=shadow;
  const behavior=new Behavior(options);
  const animator=new AnimationController(d);
  let disposed=false;
  const api={root,touchTarget:d.touchZone,standingHeight,
    update(deltaSeconds) {
      if(disposed) return;
      if(!Number.isFinite(deltaSeconds)||deltaSeconds<0) throw new RangeError('Invalid deltaSeconds');
      const dt=Math.min(deltaSeconds,.05);behavior.update(dt);animator.update(dt,behavior.snapshot());
    },
    triggerAction:action=>behavior.triggerAction(action),
    setConversationState:state=>behavior.setConversationState(state),
    setAutoEnabled:enabled=>behavior.setAutoEnabled(enabled),
    markEngaged:()=>behavior.markEngaged(),
    getState:()=>behavior.snapshot(),
    dispose() {
      if(disposed)return;disposed=true;behavior.dispose();
      const geometries=new Set(),materials=new Set(),textures=new Set();
      root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);
        for(const m of (o.material?(Array.isArray(o.material)?o.material:[o.material]):[])) {
          materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
        }});
      geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
      root.removeFromParent();root.clear();
    }
  };
  return api;
}
function isChildOf(object,parent) {
  for(let p=object;p;p=p.parent)if(p===parent)return true;
  return false;
}
