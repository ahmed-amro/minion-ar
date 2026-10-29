import * as THREE from 'three';

// Bello 0.1 — entirely client-side, no camera upload, AI or API required.
const button = document.getElementById('arButton');
const status = document.getElementById('status');
const instruction = document.getElementById('instruction');
const tip = document.getElementById('tip');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 30);
camera.position.set(0, 0.85, 1.8);
camera.lookAt(0, 0.41, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
// Mobile WebXR AR sessions generally provide 'local' tracking, not 'local-floor'.
// Three.js defaults to 'local-floor', which was causing requestReferenceSpace to fail.
renderer.xr.setReferenceSpaceType('local');
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x71809a, 2.3));
const sunlight = new THREE.DirectionalLight(0xffffff, 2.0);
sunlight.position.set(-2, 3, 2);
scene.add(sunlight);

const previewBase = new THREE.Group();
const baseDisk = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 0.4, 0.035, 48),
  new THREE.MeshStandardMaterial({ color: 0x405978, metalness: .15, roughness: .55 })
);
baseDisk.position.y = -0.04;
previewBase.add(baseDisk);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.011, 10, 60),
  new THREE.MeshBasicMaterial({ color: 0xffd850 }));
rim.rotation.x = -Math.PI / 2;
rim.position.y = -0.02;
previewBase.add(rim);
scene.add(previewBase);

const companion = buildCompanion();
scene.add(companion);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.105, 0.135, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

const controller = renderer.xr.getController(0);
controller.addEventListener('select', handleTap);
scene.add(controller);

let session = null;
let hitTestSource = null;
let hitTestRequested = false;
let placed = false;
let reaction = null;
let reactionStarted = 0;
let anchorRotation = 0;
const xrCamPosition = new THREE.Vector3();

function setStatus(message) { status.textContent = message; }

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .7, ...extra });
}

function addMesh(parent, geometry, mat, x, y, z) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function buildCompanion() {
  const root = new THREE.Group();
  const motion = new THREE.Group();
  root.add(motion);
  const yellow = material(0xfbe12a);
  const blue = material(0x2869d3);
  const navy = material(0x111b32);
  const rubber = material(0x202126);
  const metal = material(0xb9c4cd, {metalness: .8, roughness: .25});

  // Rounded yellow body (approximately 75cm tall in real-world AR units).
  addMesh(motion, new THREE.CapsuleGeometry(.17, .37, 10, 24), yellow, 0, .43, 0);
  // Overall trousers and bib.
  addMesh(motion, new THREE.CylinderGeometry(.167, .155, .23, 32), blue, 0, .25, 0);
  addMesh(motion, new THREE.BoxGeometry(.215, .17, .045), blue, 0, .353, .156);
  const pocket = addMesh(motion, new THREE.BoxGeometry(.085, .06, .012), material(0x1d52ac), 0, .29, .185);
  pocket.rotation.z = .02;
  for (const side of [-1, 1]) {
    const strap = addMesh(motion, new THREE.BoxGeometry(.052, .15, .035), blue, side * .122, .392, .123);
    strap.rotation.z = side * -.25;
    addMesh(motion, new THREE.SphereGeometry(.012, 10, 10), metal, side * .105, .395, .147);
  }
  // Black goggle head strap around circumference.
  addMesh(motion, new THREE.CylinderGeometry(.175, .175, .048, 40), rubber, 0, .557, 0);
  // One big expressive eye, with metallic ring and brown pupil.
  addMesh(motion, new THREE.SphereGeometry(.105, 28, 20), metal, 0, .558, .149);
  addMesh(motion, new THREE.SphereGeometry(.081, 28, 20), material(0xffffff), 0, .558, .214);
  addMesh(motion, new THREE.SphereGeometry(.04, 20, 16), material(0x6c4127), .007, .554, .288);
  addMesh(motion, new THREE.SphereGeometry(.023, 20, 16), navy, .007, .554, .320);
  addMesh(motion, new THREE.SphereGeometry(.009, 12, 12), material(0xffffff, {emissive:0x222222}), -.003, .568, .339);
  // Smile, formed from a gentle upward-curving line.
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.063,.417,.168),
    new THREE.Vector3(-.035,.39,.176),
    new THREE.Vector3(0,.38,.179),
    new THREE.Vector3(.035,.39,.176),
    new THREE.Vector3(.063,.417,.168)
  ]);
  addMesh(motion, new THREE.TubeGeometry(smileCurve, 20, .005, 8, false), material(0x5b382c), 0,0,0);

  // Arms rotate from shoulders so we can wave later.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * .176, .415, 0);
    motion.add(arm);
    addMesh(arm, new THREE.CylinderGeometry(.028,.028,.19,12), yellow, 0, -.1, 0);
    addMesh(arm, new THREE.SphereGeometry(.04,14,12), rubber, 0, -.205, 0);
    arm.rotation.z = side * .22;
    arms.push(arm);
  }
  // Feet and chunky boots.
  for (const side of [-1, 1]) {
    addMesh(motion,new THREE.CylinderGeometry(.03,.031,.125,14), blue, side * .065, .112, 0);
    const boot = addMesh(motion,new THREE.SphereGeometry(.055,16,14), rubber, side * .069,.055,.032);
    boot.scale.set(1.0,.65,1.38);
  }
  // Three comically unruly hairs.
  for (const [x, tilt] of [[-.033,-.35],[0,0],[.033,.28]]) {
    const hair = addMesh(motion, new THREE.CylinderGeometry(.002,.005,.065,8), rubber, x,.8,0);
    hair.rotation.z = tilt;
  }
  root.userData = { motion, leftArm:arms[0], rightArm:arms[1] };
  return root;
}

async function checkSupport() {
  if (!navigator.xr || !window.isSecureContext) {
    button.textContent = 'AR requires Android Chrome + HTTPS';
    setStatus('3D preview works here. Open this HTTPS page on an AR-supported Android phone.');
    return;
  }
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    button.disabled = !supported;
    button.textContent = supported ? 'Start AR' : 'AR unavailable in this browser';
    setStatus(supported ? 'Ready! Start AR to place Bello on a real surface.' : '3D preview available; this browser cannot start immersive AR.');
  } catch (error) {
    button.textContent = 'Unable to check AR';
    setStatus('AR check failed: ' + error.message);
  }
}

button.addEventListener('click', async () => {
  if (session) {
    try { await session.end(); }
    catch (error) { setStatus('Could not exit AR: ' + error.message); }
    return;
  }

  // Request the AR session directly from the click (a user gesture).
  // Use 'local' reference space, configured above before starting the session.
  let requested = null;
  button.disabled = true;
  setStatus('Starting AR…');
  try {
    requested = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.getElementById('overlay') }
    });
    session = requested;
    requested.addEventListener('end', onSessionEnd, { once: true });
    await renderer.xr.setSession(requested);
    button.textContent = 'Exit AR';
    instruction.textContent = 'Find a flat surface, then tap the white ring to place Bello. Tap again for a surprise!';
    companion.visible = false;
    previewBase.visible = false;
    tip.hidden = false;
    setStatus('Look around to find a surface…');
  } catch (error) {
    // Clean up an XR session if the Three.js renderer fails to initialize it.
    if (requested) {
      try { await requested.end(); } catch (_) { /* Already ended. */ }
    }
    session = null;
    setStatus('Could not start AR: ' + error.message);
    button.textContent = 'Start AR';
  } finally {
    button.disabled = false;
  }
});

function onSessionEnd() {
  if (hitTestSource) hitTestSource.cancel();
  hitTestSource = null;
  hitTestRequested = false;
  session = null;
  placed = false;
  reticle.visible = false;
  tip.hidden = true;
  previewBase.visible = true;
  companion.visible = true;
  companion.position.set(0,0,0);
  companion.rotation.set(0,0,0);
  companion.userData.motion.position.y = 0;
  companion.userData.motion.rotation.y = 0;
  instruction.textContent = 'Open AR again to place your companion anywhere.';
  button.textContent = 'Start AR';
  setStatus('Back in 3D preview.');
}

function handleTap() {
  if (!session) return;
  if (!placed) {
    if (!reticle.visible) {
      setStatus('Scan a textured, well-lit flat surface first.');
      return;
    }
    companion.position.setFromMatrixPosition(reticle.matrix);
    const xrCamera = renderer.xr.getCamera();
    xrCamera.getWorldPosition(xrCamPosition);
    anchorRotation = Math.atan2(xrCamPosition.x - companion.position.x,
      xrCamPosition.z - companion.position.z);
    companion.rotation.y = anchorRotation;
    companion.visible = true;
    placed = true;
    reticle.visible = false;
    tip.hidden = true;
    setStatus('Bello is here! Tap the screen to make him react.');
    return;
  }
  // Tap anywhere after placement, intentionally forgiving for a first prototype.
  const actions = ['wave','jump','dance','spin'];
  reaction = actions[Math.floor(Math.random() * actions.length)];
  reactionStarted = performance.now() / 1000;
  setStatus('Bello: ' + ({wave:'Hello! 👋',jump:'Boing!',dance:'Dance time!',spin:'Wheeee!'}[reaction]));
}

function animate(time) {
  const t = time / 1000;
  const d = companion.userData;
  const motion = d.motion;
  let bounce = .008 * Math.sin(t * 2.5);
  let spin = .045 * Math.sin(t * 1.5);
  let left = -.22 + .07 * Math.sin(t * 1.7);
  let right = .22 - .07 * Math.sin(t * 1.7);
  const elapsed = t - reactionStarted;
  if (reaction && elapsed >= 0 && elapsed < 1.8) {
    if (reaction === 'wave') right = 2.45 + .3 * Math.sin(elapsed * 13);
    if (reaction === 'jump') bounce = Math.abs(Math.sin(elapsed * 9)) * .13;
    if (reaction === 'spin') spin = elapsed * Math.PI * 3;
    if (reaction === 'dance') {
      bounce = Math.abs(Math.sin(elapsed * 12)) * .06;
      spin = Math.sin(elapsed * 9) * .32;
      left = -1 + Math.sin(elapsed * 10) * .4;
      right = 1 - Math.sin(elapsed * 10) * .4;
    }
  } else reaction = null;
  motion.position.y = bounce;
  motion.rotation.y = spin;
  d.leftArm.rotation.z = left;
  d.rightArm.rotation.z = right;
}

renderer.setAnimationLoop((timestamp, frame) => {
  animate(timestamp);
  if (frame && session) {
    if (!hitTestRequested) {
      hitTestRequested = true;
      const currentSession = session;
      currentSession.requestReferenceSpace('viewer')
        .then(space => currentSession.requestHitTestSource({space}))
        .then(source => {
          if (session === currentSession) hitTestSource = source;
          else source.cancel();
        })
        .catch(error => {
          if (session === currentSession) setStatus('Surface detection failed: ' + error.message);
        });
    }
    if (!placed && hitTestSource) {
      const hits = frame.getHitTestResults(hitTestSource);
      const pose = hits.length ? hits[0].getPose(renderer.xr.getReferenceSpace()) : null;
      reticle.visible = Boolean(pose);
      if (pose) reticle.matrix.fromArray(pose.transform.matrix);
    }
  }
  renderer.render(scene,camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

checkSupport();
