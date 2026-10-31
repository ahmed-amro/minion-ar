import * as THREE from 'three';
import { createCharacter } from './character.js';

const $ = id => document.getElementById(id);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
renderer.setClearColor(0x111b20,1);$('viewport').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xe9f4ff,0x7b8473,2));
const key=new THREE.DirectionalLight(0xfff1d3,2.8);key.position.set(-1,2,2);scene.add(key);
const fill=new THREE.DirectionalLight(0xbedbe7,.8);fill.position.set(2,.6,-1);scene.add(fill);

// Small generated studio reflection. No downloaded HDRI, postprocessing or shadow map.
const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
const ec=envCanvas.getContext('2d');const gradient=ec.createLinearGradient(0,0,0,256);
gradient.addColorStop(0,'#c9e0ed');gradient.addColorStop(.5,'#677d83');gradient.addColorStop(1,'#273c32');
ec.fillStyle=gradient;ec.fillRect(0,0,512,256);
ec.fillStyle='#ffffff';ec.fillRect(85,45,40,110);ec.fillStyle='#d8e5de';ec.fillRect(310,65,65,70);
const envTexture=new THREE.CanvasTexture(envCanvas);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;
const pmrem=new THREE.PMREMGenerator(renderer);const envTarget=pmrem.fromEquirectangular(envTexture);
scene.environment=envTarget.texture;pmrem.dispose();envTexture.dispose();

const camera=new THREE.PerspectiveCamera(42,1,.005,20);
let orbitAngle=.12, elevation=.22, distance=.36;
function positionCamera() {
  camera.position.set(Math.sin(orbitAngle)*distance,elevation,Math.cos(orbitAngle)*distance);
  camera.lookAt(0,.065,0);
}
positionCamera();
const preview=new THREE.Group();scene.add(preview);
const floor=new THREE.Mesh(new THREE.CircleGeometry(.38,80),new THREE.MeshStandardMaterial({color:0x233d39,roughness:.95}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.0005;preview.add(floor);
const grid=new THREE.GridHelper(.65,26,0x435f57,0x304a43);grid.position.y=-.0002;
grid.material.transparent=true;grid.material.opacity=.3;preview.add(grid);
const ring=new THREE.Mesh(new THREE.RingGeometry(.2,.2005,96),new THREE.MeshBasicMaterial({color:0x6e8d72,transparent:true,opacity:.35,side:THREE.DoubleSide}));
ring.rotation.x=-Math.PI/2;ring.position.y=.0001;preview.add(ring);

// A ten-centimetre mug in preview gives the intended physical scale a reference.
const mug=new THREE.Group();mug.position.set(-.12,0,-.015);preview.add(mug);
const ceramic=new THREE.MeshStandardMaterial({color:0xdad6c8,roughness:.32});
const cup=new THREE.Mesh(new THREE.CylinderGeometry(.035,.03,.095,40,1,true),ceramic);cup.position.y=.0475;mug.add(cup);
const lip=new THREE.Mesh(new THREE.TorusGeometry(.035,.003,8,40),ceramic);lip.rotation.x=Math.PI/2;lip.position.y=.095;mug.add(lip);
const handle=new THREE.Mesh(new THREE.TorusGeometry(.023,.005,8,32),ceramic);handle.position.set(-.034,.052,0);mug.add(handle);
const coffee=new THREE.Mesh(new THREE.CircleGeometry(.032,32),new THREE.MeshStandardMaterial({color:0x37271c,roughness:.3}));
coffee.rotation.x=-Math.PI/2;coffee.position.y=.088;mug.add(coffee);

const bello=createCharacter();scene.add(bello.root);
let heightCm=12;
function setHeight(value) {
  bello.markEngaged();
  heightCm=THREE.MathUtils.clamp(Number(value),6,24);
  bello.root.scale.setScalar(heightCm/100/bello.standingHeight);
  $('size').value=heightCm;$('height').textContent=$('xrHeight').textContent=`${heightCm} cm`;
  $('xrSizeDown').disabled=heightCm<=6;$('xrSizeUp').disabled=heightCm>=24;
}
setHeight(12);
let session=null,placed=false,relocating=false,hitSource=null,sessionVisible=true;
let sourceRequested=false,previousTime=null,disposed=false,lastStats=0;
const reticle=new THREE.Mesh(new THREE.RingGeometry(.025,.031,32).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({color:0xf6d266,side:THREE.DoubleSide}));
reticle.visible=false;reticle.matrixAutoUpdate=false;scene.add(reticle);
const controller=renderer.xr.getController(0);scene.add(controller);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const origin=new THREE.Vector3(),direction=new THREE.Vector3(),quat=new THREE.Quaternion(),camPos=new THREE.Vector3();
const surfaceUp=new THREE.Vector3(),surfaceMatrix=new THREE.Matrix4();

function status(message) {$('status').textContent=$('xrStatus').textContent=message;}
function action(name) {
  const result=bello.triggerAction(name);
  status(result==='queued'?`${name} queued until Bello is available.`:`Bello · ${name}`);
}
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>action(button.dataset.action)));
function conversation(state) {
  bello.setConversationState(state);$('conversation').value=$('xrState').value=state;
  status(state==='idle'?'Bello is free to play.':`${state} · autonomous activity paused`);
}
$('conversation').addEventListener('change',e=>conversation(e.target.value));
$('xrState').addEventListener('change',e=>conversation(e.target.value));
$('auto').addEventListener('change',e=>bello.setAutoEnabled(e.target.checked));
$('size').addEventListener('input',e=>setHeight(e.target.value));
$('xrSizeDown').addEventListener('click',()=>setHeight(heightCm-2));
$('xrSizeUp').addEventListener('click',()=>setHeight(heightCm+2));
$('quality').addEventListener('change',resize);
$('overlay').addEventListener('beforexrselect',e=>{if(e.target.closest('button,select,input,label'))e.preventDefault();});

function resize() {
  const rect=$('viewport').getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio,Number($('quality').value)));
  if(!session)renderer.setSize(rect.width,rect.height);
  camera.aspect=rect.width/rect.height;
  // Leave space for the director panel on desktop and for the title on mobile.
  camera.setViewOffset(rect.width,rect.height,innerWidth>600?rect.width*.03:0,innerWidth>600?0:-rect.height*.12,rect.width,rect.height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{
  if(session)return;
  bello.markEngaged();
  drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!drag||session)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
  if(drag.moved){orbitAngle-=(e.clientX-drag.lastX)*.008;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-drag.lastY)*.0008,.04,.45);positionCamera();}
  drag.lastX=e.clientX;drag.lastY=e.clientY;
});
renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag||session)return;
  if(!drag.moved){
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    if(raycaster.intersectObject(bello.touchTarget,false).length)action(['wave','giggle','peek'][Math.floor(Math.random()*3)]);
  }drag=null;
});
renderer.domElement.addEventListener('wheel',e=>{
  if(session)return;e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.0003,.2,.7);positionCamera();
},{passive:false});

async function checkSupport() {
  try {
    const supported=isSecureContext&&navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar');
    $('ar').disabled=!supported;$('ar').textContent=supported?'Place Bello in AR ↗':'AR · Android Chrome + HTTPS';
  } catch { $('ar').textContent='AR unavailable · preview ready'; }
}
async function startAR() {
  if(session){await session.end();return;}
  let requested;
  try {
    $('ar').disabled=true;
    requested=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('overlay')}});
    session=requested;
    requested.addEventListener('end',endAR,{once:true});requested.addEventListener('select',selectAR);
    requested.addEventListener('visibilitychange',()=>{sessionVisible=requested.visibilityState==='visible';previousTime=null;});
    await renderer.xr.setSession(requested);
    camera.clearViewOffset();document.body.classList.add('xr-active');$('xrbar').hidden=false;
    preview.visible=false;bello.root.visible=false;renderer.setClearColor(0,0);
    placed=false;relocating=false;sourceRequested=false;sessionVisible=true;previousTime=null;
    $('ar').textContent='Exit AR';status('Scan a horizontal desk, then tap the ring.');
  } catch(e) {
    if(requested)try{await requested.end();}catch{}
    session=null;status(`AR could not start: ${e.message}`);
  } finally {$('ar').disabled=false;}
}
function endAR() {
  hitSource?.cancel();hitSource=null;sourceRequested=false;session=null;placed=false;relocating=false;
  reticle.visible=false;preview.visible=true;bello.root.visible=true;
  bello.root.position.set(0,0,0);bello.root.quaternion.identity();
  conversation('idle');bello.triggerAction('wake');
  document.body.classList.remove('xr-active');$('xrbar').hidden=true;renderer.setClearColor(0x111b20,1);
  $('ar').textContent='Place Bello in AR ↗';$('xrMove').textContent='Move';previousTime=null;resize();
  status('Back in preview. Drag to orbit; tap Bello to play.');
}
function relocate() {
  if(!session)return;
  if(relocating){relocating=false;placed=true;bello.root.visible=true;reticle.visible=false;$('xrMove').textContent='Move';status('Move cancelled.');}
  else if(placed){relocating=true;placed=false;bello.root.visible=false;$('xrMove').textContent='Cancel move';status('Tap the ring at a new spot.');}
}
$('ar').addEventListener('click',startAR);$('xrExit').addEventListener('click',()=>session?.end());
$('xrMove').addEventListener('click',relocate);$('move').addEventListener('click',relocate);
function selectAR(event) {
  if(!session)return;
  if(!placed){
    if(!reticle.visible){status('Keep scanning a textured, well-lit horizontal surface.');return;}
    bello.root.position.setFromMatrixPosition(reticle.matrix);
    renderer.xr.getCamera().getWorldPosition(camPos);
    bello.root.rotation.set(0,Math.atan2(camPos.x-bello.root.position.x,camPos.z-bello.root.position.z),0);
    bello.root.visible=true;placed=true;relocating=false;reticle.visible=false;$('xrMove').textContent='Move';
    bello.triggerAction('wake');status('Placed · tap Bello to play.');return;
  }
  let pose;
  try{pose=event.frame.getPose(event.inputSource.targetRaySpace,renderer.xr.getReferenceSpace());}catch{}
  if(pose){origin.copy(pose.transform.position);quat.copy(pose.transform.orientation);}
  else{controller.updateMatrixWorld(true);origin.setFromMatrixPosition(controller.matrixWorld);controller.getWorldQuaternion(quat);}
  direction.set(0,0,-1).applyQuaternion(quat).normalize();raycaster.set(origin,direction);
  bello.root.updateMatrixWorld(true);
  if(raycaster.intersectObject(bello.touchTarget,false).length)action(['wave','giggle','peek'][Math.floor(Math.random()*3)]);
}
function requestHitSource(current) {
  sourceRequested=true;
  current.requestReferenceSpace('viewer').then(space=>current.requestHitTestSource({space})).then(source=>{
    if(session===current)hitSource=source;else source.cancel();
  }).catch(e=>{if(session===current)status(`Surface detection failed: ${e.message}. Exit and retry AR.`);});
}
document.addEventListener('visibilitychange',()=>{previousTime=null;});
renderer.setAnimationLoop((timestamp,frame)=>{
  if(disposed)return;
  const dt=previousTime===null?0:Math.min(.05,Math.max(0,(timestamp-previousTime)/1000));previousTime=timestamp;
  if(!document.hidden&&(!session||sessionVisible&&placed))bello.update(dt);
  if(frame&&session){
    if(!sourceRequested)requestHitSource(session);
    if(!placed&&hitSource){
      const hit=frame.getHitTestResults(hitSource)[0];const pose=hit?.getPose(renderer.xr.getReferenceSpace());
      reticle.visible=false;
      if(pose){surfaceMatrix.fromArray(pose.transform.matrix);surfaceUp.setFromMatrixColumn(surfaceMatrix,1);
        if(surfaceUp.y>.9){reticle.matrix.copy(surfaceMatrix);reticle.visible=true;}}
    }
  }
  renderer.render(scene,camera);
  if(timestamp-lastStats>500){
    const b=bello.getState();$('activity').textContent=b.state!=='idle'?b.state:b.action|| (b.readAmount>0?'Reading':'Standing');
    $('stats').textContent=`${renderer.info.render.calls} draws · ${(renderer.info.render.triangles/1000).toFixed(1)}k triangles · ${Math.round(b.quietTime)}s quiet`;
    lastStats=timestamp;
  }
});
window.belloLab={character:bello,setConversationState:conversation,triggerAction:action,setHeight,
  inspect:()=>({behavior:bello.getState(),heightCm,standingHeight:bello.standingHeight,
    rootPosition:bello.root.position.toArray(),rootScale:bello.root.scale.toArray(),
    render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
    resources:{...renderer.info.memory},xrActive:!!session,placed})};
window.addEventListener('pagehide',e=>{
  if(e.persisted){previousTime=null;return;}
  disposed=true;renderer.setAnimationLoop(null);hitSource?.cancel();bello.dispose();
  preview.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});reticle.geometry.dispose();reticle.material.dispose();envTarget.dispose();renderer.dispose();
});
status('Drag to orbit; tap Bello to play. Preview mug: approximately 10 cm tall.');checkSupport();
