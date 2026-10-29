import * as THREE from 'three';
import { Conversation, isDirectCommand } from './conversation.js?v=0.7.1';

// Bello 0.7.1 — voice commands, tactile material textures, expressive AR desk companion.
const button = document.getElementById('arButton');
const status = document.getElementById('status');
const instruction = document.getElementById('instruction');
const tip = document.getElementById('tip');
const overlay = document.getElementById('overlay');
const arControls = document.getElementById('arControls');
const moveButton = document.getElementById('moveButton');
const smallerButton = document.getElementById('smallerButton');
const largerButton = document.getElementById('largerButton');
const sizeLabel = document.getElementById('sizeLabel');
const breakButton = document.getElementById('breakButton');
const autoButton = document.getElementById('autoButton');
const soundButton = document.getElementById('soundButton');
const playButton = document.getElementById('playButton');
const moreButton = document.getElementById('moreButton');
const extras = document.getElementById('extras');
const micButton = document.getElementById('micButton');
const previewMicButton = document.getElementById('previewMicButton');
const voiceRepliesButton = document.getElementById('voiceRepliesButton');
const voiceToast = document.getElementById('voiceToast');
const commandButtons = [...document.querySelectorAll('[data-bello-command]')];
let voiceRepliesEnabled = true;
const conversation = new Conversation();
let conversationState = 'idle';
let engagementEpoch = 0;
let speechEpoch = 0;

let soundEnabled = true;
let audioContext = null;

// Tiny original synthesized voice effects; no external audio or microphones.
// Audio is created only after an explicit user interaction (Chrome autoplay policy).
function chirp(pattern) {
  if (!soundEnabled) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  try {
    if (!audioContext) audioContext = new AudioContextType();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime + .025;
    const patterns = {
      wave: [[560,.00,.11],[770,.12,.12],[910,.24,.16]],
      jump: [[400,.00,.09],[810,.11,.16]],
      dance: [[660,.00,.10],[520,.12,.10],[820,.24,.11],[620,.37,.14]],
      spin: [[740,.00,.12],[920,.13,.11],[550,.26,.17]],
      giggle: [[680,.00,.09],[825,.10,.09],[660,.20,.08],[910,.30,.15]],
      peek: [[440,.00,.13],[670,.16,.13]],
      hello: [[550,.00,.12],[710,.14,.15]],
    };
    for (const [freq, offset, length] of (patterns[pattern] || patterns.hello)) {
      const osc = audioContext.createOscillator();
      const volume = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + offset + length);
      volume.gain.setValueAtTime(.0001, now + offset);
      volume.gain.exponentialRampToValueAtTime(.045, now + offset + .018);
      volume.gain.exponentialRampToValueAtTime(.0001, now + offset + length);
      osc.connect(volume); volume.connect(audioContext.destination);
      osc.start(now + offset); osc.stop(now + offset + length + .02);
      osc.onended = () => { osc.disconnect(); volume.disconnect(); };
    }
  } catch (_error) { /* Audio is optional; never disrupt AR. */ }
}

moreButton.addEventListener('click', () => {
  markEngaged();
  extras.hidden = !extras.hidden;
  moreButton.setAttribute('aria-expanded', String(!extras.hidden));
  moreButton.setAttribute('aria-label', extras.hidden ? 'Show extra Bello controls' : 'Hide extra Bello controls');
});
soundButton.addEventListener('click', () => {
  markEngaged();
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? '🔊 On' : '🔇 Off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  setStatus(soundEnabled ? 'Bello sounds are on. Tap Bello to hear him!' : 'Bello sounds are muted.');
  if (soundEnabled) chirp('hello');
});

// Prevent clicks on controls from also registering as AR scene taps.
overlay.addEventListener('beforexrselect', (event) => {
  if (event.target.closest('button, input, form, details, .conversation-panel')) event.preventDefault();
});

// Built model is ~84 cm tall at scale 1; 12 cm is a comfortable desk companion.
const MODEL_HEIGHT_METERS = 0.84;
const MIN_HEIGHT_CM = 6;
const MAX_HEIGHT_CM = 24;
const HEIGHT_STEP_CM = 2;
let heightCm = 12;
function applyARSize() {
  sizeLabel.textContent = `${heightCm} cm`;
  smallerButton.disabled = heightCm <= MIN_HEIGHT_CM;
  largerButton.disabled = heightCm >= MAX_HEIGHT_CM;
  if (session) companion.scale.setScalar((heightCm / 100) / MODEL_HEIGHT_METERS);
}
smallerButton.addEventListener('click', () => {
  markEngaged();
  heightCm = Math.max(MIN_HEIGHT_CM, heightCm - HEIGHT_STEP_CM);
  applyARSize();
});
largerButton.addEventListener('click', () => {
  markEngaged();
  heightCm = Math.min(MAX_HEIGHT_CM, heightCm + HEIGHT_STEP_CM);
  applyARSize();
});

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

const skinTex = paintTexture('skin', 127);
const denimTex = paintTexture('denim', 331);
const steelTex = paintTexture('steel', 977);
const rubberTex = paintTexture('rubber', 1129);
const woodTex = paintTexture('wood', 2401);
const surfaceMats = {
  yellow: new THREE.MeshStandardMaterial({ map: skinTex, roughness:.79, bumpMap:skinTex, bumpScale:.0016 }),
  denim: new THREE.MeshStandardMaterial({ map: denimTex, roughness:.9, bumpMap:denimTex, bumpScale:.004 }),
  rubber: new THREE.MeshStandardMaterial({ map:rubberTex, roughness:.82, bumpMap:rubberTex, bumpScale:.0018 }),
  metal: new THREE.MeshStandardMaterial({ map:steelTex, metalness:.78, roughness:.27, bumpMap:steelTex, bumpScale:.0007 }),
  wood: new THREE.MeshStandardMaterial({ map:woodTex, roughness:.74, bumpMap:woodTex, bumpScale:.002 })
};

const companion = buildCompanion();
scene.add(companion);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.032, 0.040, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// Retain a Three.js controller only as a fallback when a platform omits event poses.
// The actual tap listener is attached to the native XRSession so we can access
// XRInputSource.targetRaySpace for accurate touch targeting.
const controller = renderer.xr.getController(0);
scene.add(controller);

let session = null;
let hitTestSource = null;
let hitTestRequested = false;
let placed = false;
let relocating = false;
let reaction = null;
let reactionStarted = 0;
let anchorRotation = 0;
// The app cannot tell whether someone is looking at the phone.
// 'Attention' means actual taps or use of an on-screen control.
const IDLE_DELAY_SECONDS = 30;
let autoEnabled = true;
let lastEngagement = performance.now() / 1000;
let breakStarted = null;
let lastBreakStage = -1;
const xrCamPosition = new THREE.Vector3();

function setStatus(message) { status.textContent = message; }

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .7, ...extra });
}

// Procedurally painted PBR-style surface maps. All pixels are generated locally;
// no large downloadable textures, external image assets, or copyrighted models.
// One shared set of 256x256 textures keeps Android AR GPU usage modest.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function paintTexture(type, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rng = seededRandom(seed);
  const image = ctx.createImageData(256,256);
  for (let y=0;y<256;y++) for (let x=0;x<256;x++) {
    const i = (y*256+x)*4;
    const noise = (rng()-.5);
    let r,g,b;
    if (type === 'denim') {
      // Dyed cotton weave: diagonal twill stripes, warp and weft variations.
      const warp = (x%5 === 0 ? 16 : 0), weft = ((y+(x>>1))%7 < 2 ? 13 : -5);
      const shade = warp+weft + 25*noise;
      [r,g,b] = [34+shade*.52, 91+shade*.85, 175+shade];
    } else if (type === 'skin') {
      // Fine non-repeating-looking matte skin grain; not shiny plastic.
      const shade = 13*noise + 2.5*Math.sin(x*.13+y*.23);
      [r,g,b] = [251+shade*.2, 211+shade*.5, 38+shade*.75];
    } else if (type === 'steel') {
      // Horizontal microscopic brushing plus tiny glints.
      const grain = 9*Math.sin(y*2.9) + 18*noise;
      [r,g,b] = [172+grain,181+grain,191+grain];
    } else if (type === 'wood') {
      const grain = 17*Math.sin(x*.115 + 2*Math.sin(y*.025)) + 14*noise;
      [r,g,b] = [151+grain,104+grain*.75,66+grain*.50];
    } else {
      const shade = 24*noise + 5*Math.sin(x*.55+y*.22);
      [r,g,b] = [36+shade,39+shade,46+shade];
    }
    image.data[i]=Math.max(0,Math.min(255,r));
    image.data[i+1]=Math.max(0,Math.min(255,g));
    image.data[i+2]=Math.max(0,Math.min(255,b));
    image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
function stitchLine(parent, points, color = 0xe8d59b) {
  const vertices = points.map(p => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(vertices);
  const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .0028, 4, false),
    new THREE.MeshStandardMaterial({color,roughness:.96}));
  parent.add(line);
  return line;
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
  const yellow = surfaceMats.yellow;
  const blue = surfaceMats.denim;
  const navy = material(0x111b32);
  const rubber = surfaceMats.rubber;
  const metal = surfaceMats.metal;

  // Rounded yellow body (approximately 84cm at scale 1; scaled to 12cm in AR).
  addMesh(motion, new THREE.CapsuleGeometry(.17, .37, 10, 24), yellow, 0, .43, 0);
  // Overall trousers and bib.
  addMesh(motion, new THREE.CylinderGeometry(.167, .155, .23, 32), blue, 0, .25, 0);
  addMesh(motion, new THREE.BoxGeometry(.215, .17, .045), blue, 0, .353, .156);
  const pocket = addMesh(motion, new THREE.BoxGeometry(.085, .06, .012), material(0x1d52ac), 0, .29, .185);
  pocket.rotation.z = .02;
  // Visible cotton stitching and a tiny embroidered pocket detail.
  stitchLine(motion, [[-.102,.439,.181],[-.108,.36,.181],[-.105,.278,.178],[-.055,.257,.190],[.055,.257,.190],[.105,.278,.178],[.108,.36,.181],[.102,.439,.181]]);
  stitchLine(motion, [[-.042,.320,.193],[-.04,.264,.193],[0,.261,.193],[.04,.264,.193],[.042,.320,.193]], 0xb5d8ef);
  for (const side of [-1, 1]) {
    const strap = addMesh(motion, new THREE.BoxGeometry(.052, .15, .035), blue, side * .122, .392, .123);
    strap.rotation.z = side * -.25;
    addMesh(motion, new THREE.SphereGeometry(.012, 10, 10), metal, side * .105, .395, .147);
  }
  // Black goggle head strap around circumference.
  addMesh(motion, new THREE.CylinderGeometry(.175, .175, .048, 40), rubber, 0, .557, 0);
  // Chrome goggle casing with a machined raised outer rim and four rivets.
  addMesh(motion, new THREE.SphereGeometry(.105, 28, 20), metal, 0, .558, .149);
  addMesh(motion, new THREE.TorusGeometry(.095,.012,10,48), metal, 0,.558,.271);
  for (const angle of [0, Math.PI/2, Math.PI, Math.PI*1.5]) {
    addMesh(motion, new THREE.SphereGeometry(.007,10,8), material(0x707a88,{metalness:.6,roughness:.32}),
      .1*Math.cos(angle), .558+.1*Math.sin(angle), .267);
  }
  const eyeBlink = new THREE.Group();
  eyeBlink.position.set(0, .558, 0);
  motion.add(eyeBlink);
  addMesh(eyeBlink, new THREE.SphereGeometry(.081, 28, 20), material(0xffffff), 0, 0, .214);
  const gaze = new THREE.Group();
  eyeBlink.add(gaze);
  addMesh(gaze, new THREE.SphereGeometry(.04, 20, 16), material(0x6c4127), .007, -.004, .288);
  addMesh(gaze, new THREE.SphereGeometry(.023, 20, 16), navy, .007, -.004, .320);
  addMesh(gaze, new THREE.SphereGeometry(.009, 12, 12), material(0xffffff), -.003, .010, .339);
  const closedEyeLine = addMesh(motion,
    new THREE.BoxGeometry(.13, .007, .008), rubber, 0, .558, .309);
  closedEyeLine.visible = false;
  // Smile, formed from a gentle upward-curving line.
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.063,.417,.168),
    new THREE.Vector3(-.035,.39,.176),
    new THREE.Vector3(0,.38,.179),
    new THREE.Vector3(.035,.39,.176),
    new THREE.Vector3(.063,.417,.168)
  ]);
  const smile = addMesh(motion, new THREE.TubeGeometry(smileCurve, 20, .005, 8, false), material(0x5b382c), 0,0,0);
  const surpriseMouth = addMesh(motion, new THREE.SphereGeometry(.034,20,16), material(0x3d2025), 0,.397,.175);
  surpriseMouth.scale.set(1,.87,.17);
  surpriseMouth.visible = false;

  // A transparent volume catches taps on the little character, not the desk.
  // It raycasts normally, but draws no pixels and does not affect AR depth.
  const touchZone = addMesh(motion, new THREE.SphereGeometry(.29, 16, 12),
    new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, depthTest:false}),
    0,.445,.025);
  touchZone.name = 'bello-touch-target';

  // Arms rotate from shoulders so we can wave later.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * .176, .415, 0);
    motion.add(arm);
    addMesh(arm, new THREE.CylinderGeometry(.028,.028,.19,12), yellow, 0, -.1, 0);
    addMesh(arm, new THREE.SphereGeometry(.04,14,12), rubber, 0, -.205, 0);
    // Three tiny raised fingers hint at soft gloves without adding heavy assets.
    for(let finger=-1;finger<=1;finger++) {
      addMesh(arm,new THREE.SphereGeometry(.012,8,6),rubber,finger*.018,-.218,.024);
    }
    arm.rotation.z = side * .22;
    arms.push(arm);
  }
  // Feet and chunky boots.
  for (const side of [-1, 1]) {
    addMesh(motion,new THREE.CylinderGeometry(.03,.031,.125,14), blue, side * .065, .112, 0);
    const boot = addMesh(motion,new THREE.SphereGeometry(.055,16,14), rubber, side * .069,.055,.032);
    boot.scale.set(1.0,.65,1.38);
    // Subtle raised outsole on each boot.
    const sole=addMesh(motion,new THREE.SphereGeometry(.056,16,12),material(0x171a20,{roughness:.92}), side*.069,.028,.038);
    sole.scale.set(1,.29,1.36);
  }
  // Three comically unruly hairs.
  for (const [x, tilt] of [[-.033,-.35],[0,0],[.033,.28]]) {
    const hair = addMesh(motion, new THREE.CylinderGeometry(.002,.005,.065,8), rubber, x,.8,0);
    hair.rotation.z = tilt;
  }
  // Tiny wooden chair, and an open illustrated magazine. Both are hidden until
  // Bello starts his hands-off routine, and inherit his AR position and size.
  const chair = buildChair();
  chair.visible = false;
  root.add(chair);
  const magazine = buildMagazine();
  magazine.visible = false;
  motion.add(magazine);
  root.userData = { motion, leftArm:arms[0], rightArm:arms[1], chair, magazine,
    page: magazine.userData.page, eyeBlink, gaze, closedEyeLine,
    smile, surpriseMouth, touchZone };
  return root;
}


function buildChair() {
  const chair = new THREE.Group();
  const wood = surfaceMats.wood;
  const upholstery = material(0x3c7c8b);
  addMesh(chair, new THREE.BoxGeometry(.37,.042,.30), upholstery, 0,.17,-.055);
  addMesh(chair, new THREE.BoxGeometry(.36,.29,.045), wood, 0,.32,-.19);
  for (const x of [-.14, .14]) for (const z of [-.17, .065]) {
    addMesh(chair, new THREE.CylinderGeometry(.018,.022,.148,9), wood, x,.077,z);
  }
  // A tiny lip beneath the seat makes it recognizable at mug-size.
  addMesh(chair, new THREE.BoxGeometry(.36,.026,.02), wood, 0,.12,.085);
  chair.position.x = -.58; // Starts off-stage; slides behind Bello.
  return chair;
}

function buildMagazine() {
  const book = new THREE.Group();
  book.position.set(0,.39,.225);
  book.rotation.x = -.3;
  const paper = material(0xfff0ce, { side: THREE.DoubleSide });
  const mint = material(0xbce4dd, { side: THREE.DoubleSide });
  const ink = material(0x547174);
  addMesh(book, new THREE.BoxGeometry(.018,.185,.018), material(0xe0a84e), 0,0,0);
  for (const side of [-1,1]) {
    const page = new THREE.Group();
    page.position.x = side * .068;
    page.rotation.y = side * -.16;
    addMesh(page, new THREE.BoxGeometry(.135,.174,.009), side < 0 ? paper : mint, 0,0,0);
    addMesh(page, new THREE.BoxGeometry(.092,.045,.003), material(side < 0 ? 0xa8bd8e : 0x7ba3ca), 0,.035,.007);
    for (let j=0; j<4; j++) addMesh(page, new THREE.BoxGeometry(.103-.007*(j%2),.005,.002), ink, 0,-.004-j*.025,.008);
    book.add(page);
  }
  const flippingPage = new THREE.Group();
  flippingPage.position.set(0,.002,.010);
  addMesh(flippingPage, new THREE.BoxGeometry(.126,.167,.006), paper, .063,0,0);
  flippingPage.visible = false;
  book.add(flippingPage);
  book.userData.page = flippingPage;
  book.scale.setScalar(.001);
  return book;
}

function ease01(x) {
  x = THREE.MathUtils.clamp(x, 0, 1);
  return x*x*(3 - 2*x);
}

function resetActivityVisuals() {
  const d = companion.userData;
  d.chair.visible = false;
  d.chair.position.set(-.58,0,0);
  d.magazine.visible = false;
  d.magazine.scale.setScalar(.001);
  d.page.visible = false;
  d.page.rotation.y = 0;
  d.motion.position.set(0,0,0);
  d.motion.rotation.set(0,0,0);
}

// Called whenever the user touches Bello or an AR control: he drops the idle
// routine and resumes standing. A new 30-second quiet interval starts.
function markEngaged() {
  lastEngagement = performance.now() / 1000;
  if (breakStarted !== null) {
    breakStarted = null;
    lastBreakStage = -1;
    resetActivityVisuals();
  }
  breakButton.textContent = 'Try a break ☕';
}

function startBreak(now = performance.now() / 1000) {
  if ((session && !placed) || relocating) return;
  reaction = null;
  breakStarted = now;
  lastBreakStage = -1;
  breakButton.textContent = 'Wake Bello 👋';
  setStatus('Bello: Where did I put my chair?');
}

breakButton.addEventListener('click', () => {
  if (!session || !placed || relocating) return;
  if (breakStarted !== null) {
    markEngaged();
    setStatus('Bello: I am back! 👋');
  } else {
    markEngaged();
    startBreak();
  }
});

autoButton.addEventListener('click', () => {
  markEngaged();
  autoEnabled = !autoEnabled;
  autoButton.textContent = autoEnabled ? 'Auto: On' : 'Auto: Off';
  autoButton.setAttribute('aria-pressed', String(autoEnabled));
  setStatus(autoEnabled ? 'Bello will entertain himself after 30 quiet seconds.' : 'Bello will stay standing until you tap Try a break.');
});

function animateBreak(t) {
  const d = companion.userData;
  const elapsed = Math.max(0, t - breakStarted);
  const stage = elapsed < 1.6 ? 0 : elapsed < 3.8 ? 1 : elapsed < 5.4 ? 2 : 3;
  if (stage !== lastBreakStage) {
    lastBreakStage = stage;
    setStatus([
      'Bello: Looking for something to do…',
      'Bello: Bringing my chair! 🪑',
      'Bello: Ahhh, comfy!',
      'Bello: Busy reading 📖 — tap to say hello!'
    ][stage]);
  }

  let bounce = 0;
  let spin = 0;
  let left = -.22;
  let right = .22;
  let localX = 0;
  let localY = 0;

  if (stage === 0) {
    // Shuffles in place, not across the desk: no collision detection required.
    localX = .018*Math.sin(elapsed*8);
    bounce = .011*Math.abs(Math.sin(elapsed*10));
    spin = .22*Math.sin(elapsed*4);
  }
  if (elapsed >= 1.6) {
    const arrive = ease01((elapsed-1.6)/2.2);
    d.chair.visible = true;
    d.chair.position.x = -.58*(1-arrive);
    left = -.18 + .4*Math.sin(elapsed*4)*(1-arrive);
    right = .8 + .2*Math.sin(elapsed*7)*(1-arrive);
  }
  if (elapsed >= 3.8) {
    const sit = ease01((elapsed-3.8)/1.6);
    localY = -.095*sit;
    // Bend toward the magazine rather than flying away from the AR anchor.
    d.motion.rotation.x = -.10*sit;
    left = -.22*(1-sit) + .85*sit;
    right = .22*(1-sit) - .85*sit;
    d.magazine.visible = elapsed >= 4.6;
    if (d.magazine.visible) {
      const reveal = ease01((elapsed-4.6)/.75);
      d.magazine.scale.setScalar(Math.max(.001,reveal));
    }
  }
  if (stage === 3) {
    // Calm breathing and the occasional page-turn while reading.
    localY += .003*Math.sin(t*2);
    spin = .025*Math.sin(t*.9);
    d.page.visible = Math.sin((elapsed-5.4)*.75) > .9;
    if (d.page.visible) d.page.rotation.y = .35+.4*Math.sin(t*5);
  } else d.page.visible = false;
  d.motion.position.x = localX;
  d.motion.position.y = localY + bounce;
  d.motion.rotation.y = spin;
  d.leftArm.rotation.z = left;
  d.rightArm.rotation.z = right;
}

// A blink is a quick double-sided squeeze; the iris also subtly tracks its
// surroundings on an independent rhythm (not actual camera eye tracking).
let nextBlinkAt = performance.now()/1000 + 2.2;
let blinkStarted = -10;
function animateFace(t) {
  const d = companion.userData;
  if (t > nextBlinkAt) {
    blinkStarted = t;
    nextBlinkAt = t + 2.8 + 2.1 * (0.5 + 0.5 * Math.sin(t*2.27));
  }
  const progress = (t - blinkStarted)/.24;
  const closeAmount = progress >= 0 && progress <= 1 ? Math.sin(progress*Math.PI) : 0;
  d.eyeBlink.scale.y = Math.max(.045, 1 - .97 * closeAmount);
  d.closedEyeLine.visible = closeAmount > .90;
  d.gaze.position.x = .012*Math.sin(t*.85) + .005*Math.sin(t*1.9);
  d.gaze.position.y = .008*Math.sin(t*.62);
  d.surpriseMouth.visible = (conversationState === 'speaking' && Math.sin(t*14) > -.25) || reaction === 'jump' || reaction === 'giggle' || reaction === 'peek';
  d.smile.visible = !d.surpriseMouth.visible;
}

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const rayQuaternion = new THREE.Quaternion();
const previewPointer = new THREE.Vector2();
function isPointingAtBello(event) {
  let gotRay = false;
  const ref = renderer.xr.getReferenceSpace();
  try {
    const target = event.inputSource && event.inputSource.targetRaySpace;
    const pose = event.frame && ref && target ? event.frame.getPose(target, ref) : null;
    if (pose) {
      const p = pose.transform.position;
      const q = pose.transform.orientation;
      rayOrigin.set(p.x,p.y,p.z);
      rayQuaternion.set(q.x,q.y,q.z,q.w);
      rayDirection.set(0,0,-1).applyQuaternion(rayQuaternion).normalize();
      gotRay = true;
    }
  } catch (_error) { /* Fall back to Three.js controller pose. */ }
  if (!gotRay) {
    // Some Android WebXR runtimes omit the pose on the select event.
    controller.updateMatrixWorld(true);
    rayOrigin.setFromMatrixPosition(controller.matrixWorld);
    rayQuaternion.setFromRotationMatrix(controller.matrixWorld);
    rayDirection.set(0,0,-1).applyQuaternion(rayQuaternion).normalize();
  }
  raycaster.set(rayOrigin, rayDirection);
  raycaster.near = 0;
  raycaster.far = 15;
  companion.updateMatrixWorld(true);
  return raycaster.intersectObject(companion.userData.touchZone, false).length > 0;
}

// In preview, a mouse click or touch on Bello also triggers an animation.
renderer.domElement.addEventListener('pointerdown', event => {
  if (session) return; // XR tap events are handled by the XR controller.
  const rect = renderer.domElement.getBoundingClientRect();
  previewPointer.set(((event.clientX-rect.left)/rect.width)*2-1,
    -((event.clientY-rect.top)/rect.height)*2+1);
  camera.updateMatrixWorld(true);
  companion.updateMatrixWorld(true);
  raycaster.setFromCamera(previewPointer, camera);
  if (raycaster.intersectObject(companion.userData.touchZone, false).length) reactToTouch();
});

function react(action) {
  markEngaged();
  reaction = action;
  reactionStarted = performance.now()/1000;
  const messages = {
    wave: 'Hello! 👋', jump: 'Boing! 🐸', dance: 'Dance time! 💃',
    spin: 'Wheeee! 🌀', giggle: 'Hehehe! 😄', peek: 'Peekaboo! 👀'
  };
  setStatus('Bello: ' + (messages[action] || 'Here I am!'));
  chirp(action);
}
function reactToTouch() {
  cancelConversation();
  const actions = ['wave','jump','dance','spin','giggle','peek'];
  react(actions[Math.floor(Math.random()*actions.length)]);
}

playButton.addEventListener('click', () => {
  if (placed && session) reactToTouch();
});

// Voice v0.6: short push-to-talk commands (no always-on microphone).
// Android Chrome typically exposes webkitSpeechRecognition. Its engine may
// use an online speech service; we do not record, save or upload any audio.
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let speechRecognizer = null;
let listening = false;
let voiceError = '';
let toastTimer = null;
function showVoiceToast(message) {
  voiceToast.textContent = message;
  voiceToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { voiceToast.hidden = true; }, 5200);
}
function setListening(active) {
  listening = active;
  micButton.setAttribute('aria-pressed', String(active));
  previewMicButton.setAttribute('aria-pressed', String(active));
  micButton.textContent = active ? '🛑 Stop' : '🎙 Talk';
  previewMicButton.textContent = active ? '🛑 Stop listening' : '🎙 Test voice in preview';
}
function say(shortLine) {
  const epoch = ++speechEpoch;
  conversationState = 'idle';
  if (!voiceRepliesEnabled || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(shortLine);
    utterance.lang = 'en-US';
    utterance.rate = 1.18;
    utterance.pitch = 1.35;
    utterance.volume = .76;
    conversationState = 'speaking';
    utterance.onend = utterance.onerror = () => {
      if (epoch !== speechEpoch) return;
      conversationState = 'idle'; lastEngagement = performance.now() / 1000;
      if (conversation.enabled) updateConversationStatus('AI ready. Tap Talk for another turn.');
    };
    window.speechSynthesis.speak(utterance);
  } catch (_error) { conversationState = 'idle'; /* Speech output is optional. */ }
}
function runCommand(raw) {
  const phrase = String(raw || '').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  showVoiceToast('Heard: “' + raw + '”');
  if (!phrase) return;
  let reply = '';
  // STOP and WAKE first, so "stop dancing" never triggers "dance".
  if (/\b(stop|enough|freeze|be still)\b/.test(phrase)) {
    markEngaged(); reaction = null; reply = 'Okay, stopping!';
  } else if (/\b(wake|stand up|get up|hello|hi bello)\b/.test(phrase)) {
    markEngaged(); chirp('hello'); reply = 'I am here!';
  } else if (/\b(read|magazine|book|chair|sit down|take a break|relax)\b/.test(phrase)) {
    markEngaged();
    if (session && !placed) reply = 'Place me first!';
    else { startBreak(); reply = 'Time to read!'; }
  } else if (/\b(dance|boogie|groove)\b/.test(phrase)) {
    react('dance'); reply = 'Dance time!';
  } else if (/\b(jump|hop|bounce)\b/.test(phrase)) {
    react('jump'); reply = 'Boing!';
  } else if (/\b(wave|say hi|say hello)\b/.test(phrase)) {
    react('wave'); reply = 'Hello!';
  } else if (/\b(spin|turn around|twirl)\b/.test(phrase)) {
    react('spin'); reply = 'Wheee!';
  } else if (/\b(laugh|giggle|funny)\b/.test(phrase)) {
    react('giggle'); reply = 'Hee hee!';
  } else if (/\b(peek|hide)\b/.test(phrase)) {
    react('peek'); reply = 'Peekaboo!';
  } else if (/\b(smaller|shrink|tiny)\b/.test(phrase)) {
    markEngaged(); heightCm = Math.max(MIN_HEIGHT_CM, heightCm-HEIGHT_STEP_CM); applyARSize(); reply='Smaller!';
  } else if (/\b(bigger|larger|grow)\b/.test(phrase)) {
    markEngaged(); heightCm = Math.min(MAX_HEIGHT_CM, heightCm+HEIGHT_STEP_CM); applyARSize(); reply='Bigger!';
  } else if (/\b(move|relocate|another spot)\b/.test(phrase)) {
    if (session && placed && !relocating) { moveButton.click(); reply='Pick my new spot!'; }
    else reply='Place me first!';
  } else if (/\b(mute|quiet|silence|sound off)\b/.test(phrase)) {
    markEngaged(); soundEnabled=false; soundButton.textContent='🔇 Off'; soundButton.setAttribute('aria-pressed','false'); reply='Quiet mode!';
  } else if (/\b(unmute|sound on|make noise)\b/.test(phrase)) {
    markEngaged(); soundEnabled=true; soundButton.textContent='🔊 On'; soundButton.setAttribute('aria-pressed','true'); reply='Sounds on!';
  } else {
    markEngaged();
    reply = 'I know dance, jump, wave, spin, read and wake!';
  }
  setStatus('Bello: ' + reply);
  // Reply after the capture is complete, avoiding speaker-to-microphone feedback.
  // If a browser doesn't deliver onend, the status still tells you the result.
  if (speechRecognizer && listening) {
    pendingReply = reply;
  } else say(reply);
}
let pendingReply = '';
function stopListening() {
  if (speechRecognizer && listening) {
    try { speechRecognizer.stop(); } catch (_) { setListening(false); }
  }
}
function toggleListening() {
  markEngaged();
  if (!Recognition) {
    showVoiceToast('Voice recognition is not supported in this browser. Try Chrome on Android.');
    return;
  }
  if (listening) { stopListening(); return; }
  cancelConversation();
  // An explicit tap is required by mobile browsers to ask for mic permission.
  try {
    const recog = new Recognition();
    speechRecognizer = recog;
    voiceError = '';
    pendingReply = '';
    recog.lang='en-US';
    recog.continuous=false;
    recog.interimResults=false;
    recog.maxAlternatives=1;
    recog.onstart = () => {
      if (speechRecognizer !== recog) return;
      setListening(true);
      conversationState = 'listening';
      updateConversationStatus('Listening…');
      showVoiceToast('Listening… say “Bello, dance!”');
    };
    let transcript = "";
    recog.onresult = event => {
      if (speechRecognizer !== recog) return;
      transcript = event.results[0]?.[0]?.transcript || '';
      showVoiceToast('Heard: “' + transcript + '”');
    };
    recog.onerror = event => {
      if (speechRecognizer !== recog) return;
      voiceError = event.error || 'unknown';
      pendingReply = '';
      const hints = {
        'not-allowed':'Microphone permission denied. Check Chrome site permissions.',
        'no-speech':'I did not hear a command. Try again.',
        'network':'Speech recognition needs network access in this browser.',
        'audio-capture':'The microphone is busy or unavailable.'
      };
      showVoiceToast(hints[voiceError] || 'Voice recognition: '+voiceError);
    };
    recog.onend = () => {
      if (speechRecognizer !== recog) return;
      setListening(false);
      speechRecognizer = null;
      conversationState = 'idle';
      if (transcript && !voiceError) void handleUtterance(transcript);
      else { lastEngagement = performance.now() / 1000; updateConversationStatus('Microphone stopped. Tap Talk to try again.'); }
      pendingReply = '';
    };
    recog.start();
  } catch (error) {
    speechRecognizer=null;
    setListening(false);
    showVoiceToast('Could not start microphone: '+error.message);
  }
}
micButton.addEventListener('click', toggleListening);
previewMicButton.addEventListener('click', toggleListening);
voiceRepliesButton.addEventListener('click', () => {
  markEngaged();
  voiceRepliesEnabled = !voiceRepliesEnabled;
  voiceRepliesButton.textContent = voiceRepliesEnabled ? '🗣 Replies: On' : '🗣 Replies: Off';
  voiceRepliesButton.setAttribute('aria-pressed', String(voiceRepliesEnabled));
  if (!voiceRepliesEnabled && window.speechSynthesis) { speechEpoch++; window.speechSynthesis.cancel(); conversationState = 'idle'; markEngaged(); }
});
for (const chip of commandButtons) {
  chip.addEventListener('click', () => { cancelConversation(); runCommand(chip.dataset.belloCommand); });
}
if (!Recognition) {
  micButton.disabled = previewMicButton.disabled = true;
  micButton.title = 'Speech recognition not supported in this browser';
  previewMicButton.title = 'Speech recognition not supported in this browser';
}

// The optional conversation layer never participates in AR initialization.
const conversationToggle = document.getElementById('conversationToggle');
const conversationPanel = document.getElementById('conversationPanel');
const connectionStatus = document.getElementById('conversationStatus');
const chatLog = document.getElementById('conversationText');
const addressInput = document.getElementById('backendAddress');
const pairingInput = document.getElementById('pairingCode');
const connectButton = document.getElementById('connectButton');
function updateConversationStatus(text) {
  connectionStatus.textContent = text;
  conversationToggle.textContent = conversation.enabled ? '💬 AI connected' : '💬 Local mode';
}
function chatLine(speaker, text) {
  const line = document.createElement('div');
  line.textContent = speaker + ': ' + text;
  chatLog.append(line);
  while (chatLog.children.length > 12) chatLog.firstChild.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
}
function cancelConversation() {
  engagementEpoch++;
  conversation.cancel();
  if (speechRecognizer) {
    const old = speechRecognizer;
    speechRecognizer = null;
    try { old.abort(); } catch (_) {}
  }
  pendingReply = '';
  setListening(false);
  speechEpoch++;
  window.speechSynthesis?.cancel();
  conversationState = 'idle';
  markEngaged();
}
async function handleUtterance(raw) {
  const text = String(raw).trim();
  if (!text) return;
  cancelConversation();
  chatLine('You', text);
  // v0.6's full parser is retained whenever AI is disabled. In AI mode only
  // unambiguous commands bypass the model, avoiding keyword collisions.
  if (!conversation.enabled || isDirectCommand(text)) {
    runCommand(text);
    updateConversationStatus(conversation.enabled ? 'AI ready. Local command handled instantly.' : 'Local commands ready. Laptop connection is optional.');
    return;
  }
  const epoch = engagementEpoch;
  conversationState = 'thinking';
  updateConversationStatus('Thinking…');
  setStatus('Bello is thinking…');
  try {
    const result = await conversation.turn(text);
    if (epoch !== engagementEpoch) return;
    conversationState = 'idle';
    if (result.action !== 'none') react(result.action);
    markEngaged();
    chatLine('Bello', result.reply);
    setStatus('Bello: ' + result.reply);
    updateConversationStatus('AI ready · ' + result.remaining_today + ' attempts left today');
    say(result.reply);
  } catch (_) {
    if (epoch !== engagementEpoch) return;
    conversation.disconnect();
    conversationState = 'idle';
    updateConversationStatus('Laptop or AI unavailable. Local voice commands are active; reconnect when ready.');
    // Replay the same phrase through v0.6, without requiring another mic tap.
    runCommand(text);
  }
}
conversationToggle.addEventListener('click', () => {
  conversationPanel.hidden = !conversationPanel.hidden;
  conversationToggle.setAttribute('aria-expanded', String(!conversationPanel.hidden));
});
document.getElementById('closeConversation').addEventListener('click', () => {
  conversationPanel.hidden = true; conversationToggle.setAttribute('aria-expanded', 'false');
});
document.getElementById('connectForm').addEventListener('submit', async event => {
  event.preventDefault();
  cancelConversation();
  const epoch = engagementEpoch;
  connectButton.disabled = true;
  updateConversationStatus('Connecting to laptop… allow local-network access if Chrome asks.');
  try {
    const result = await conversation.connect(addressInput.value, pairingInput.value);
    if (epoch !== engagementEpoch) { conversation.disconnect(); return; }
    updateConversationStatus('AI ready · ' + result.model + ' · ' + result.daily_limit + ' attempts/day');
    pairingInput.value = '';
    document.getElementById('connectionDetails').open = false;
  } catch (error) {
    if (epoch === engagementEpoch) {
      conversation.disconnect();
      const detail = error.name === 'AbortError' ? 'Connection timed out.' :
        error instanceof TypeError ? 'Browser/network blocked the request. Check the backend window: no new entry means the request did not reach Python.' : error.message;
      updateConversationStatus('Could not connect: ' + detail + ' Local commands still work.');
    }
  } finally { connectButton.disabled = false; }
});
document.getElementById('textForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('messageInput');
  const text = input.value.trim(); input.value = '';
  void handleUtterance(text);
});
document.getElementById('stopConversation').addEventListener('click', () => {
  cancelConversation(); reaction = null; updateConversationStatus('Stopped. Tap Talk when ready.');
});
document.getElementById('clearConversation').addEventListener('click', () => {
  cancelConversation(); conversation.clear(); chatLog.replaceChildren();
  updateConversationStatus('Conversation cleared from this browser session.');
});
document.getElementById('localMode').addEventListener('click', () => {
  cancelConversation(); conversation.disconnect(); pairingInput.value = '';
  updateConversationStatus('Local voice commands active. No laptop needed.');
});
window.addEventListener('pagehide', () => { cancelConversation(); conversation.disconnect(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelConversation(); });

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
    setStatus(supported ? 'Ready! Start AR, then tap Bello to play.' : '3D preview available; this browser cannot start immersive AR.');
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
    requested.addEventListener('select', handleTap);
    await renderer.xr.setSession(requested);
    document.body.classList.add('xr-active');
    button.textContent = 'Exit AR';
    companion.scale.setScalar((heightCm / 100) / MODEL_HEIGHT_METERS);
    arControls.hidden = true;
    extras.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    moveButton.textContent = 'Move Bello';
    relocating = false;
    instruction.textContent = 'Scan a surface and tap the ring to place Bello.';
    companion.visible = false;
    markEngaged();
    previewBase.visible = false;
    tip.hidden = false;
    applyARSize();
    setStatus('Scan your desk for the white circle…');
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
  cancelConversation();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (hitTestSource) hitTestSource.cancel();
  hitTestSource = null;
  hitTestRequested = false;
  session = null;
  placed = false;
  relocating = false;
  arControls.hidden = true;
  extras.hidden = true;
  moreButton.setAttribute('aria-expanded', 'false');
  moveButton.textContent = 'Move Bello';
  document.body.classList.remove('xr-active');
  reticle.visible = false;
  tip.hidden = true;
  previewBase.visible = true;
  companion.visible = true;
  companion.position.set(0,0,0);
  companion.rotation.set(0,0,0);
  companion.scale.setScalar(1);
  markEngaged();
  resetActivityVisuals();
  instruction.textContent = 'Open AR again to place your companion anywhere.';
  button.textContent = 'Start AR';
  setStatus('Back in 3D preview. Tap Bello to play!');
}

// Keep Bello anchored in AR while allowing repeated placement without exiting AR.
moveButton.addEventListener('click', () => {
  if (!session) return;
  markEngaged();
  if (relocating) {
    // Cancel relocation: restore Bello at his previous placement.
    relocating = false;
    placed = true;
    companion.visible = true;
    reticle.visible = false;
    tip.hidden = true;
    moveButton.textContent = 'Move Bello';
    setStatus('Move canceled. Bello stayed where he was.');
  } else if (placed) {
    relocating = true;
    placed = false;
    companion.visible = false;
    tip.hidden = false;
    moveButton.textContent = 'Cancel Move';
    setStatus('Point at a new spot and tap the white circle.');
  }
});

function handleTap(event) {
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
    relocating = false;
    arControls.hidden = false;
    moveButton.textContent = 'Move Bello';
    reticle.visible = false;
    tip.hidden = true;
    markEngaged();
    setStatus('Tap Bello to play! After 30 quiet seconds, he takes a break.');
    return;
  }
  // Ignore empty space; interactions must actually target Bello.
  if (!isPointingAtBello(event)) {
    setStatus('Tap directly on Bello to play (or use ⋯ for his other activities).');
    return;
  }
  reactToTouch();
}

function animate(time) {
  const t = time / 1000;
  animateFace(t);
  if (session && placed && !relocating && autoEnabled && conversationState === 'idle' && breakStarted === null
      && t - lastEngagement > IDLE_DELAY_SECONDS) startBreak(t);
  const d = companion.userData;
  if (breakStarted !== null) {
    animateBreak(t);
    return;
  }
  const motion = d.motion;
  let bounce = .008 * Math.sin(t * 2.5);
  let spin = .045 * Math.sin(t * 1.5);
  let left = -.22 + .07 * Math.sin(t * 1.7);
  let right = .22 - .07 * Math.sin(t * 1.7);
  if (conversationState === 'thinking') spin = .10*Math.sin(t*3);
  if (conversationState === 'listening') right = .7;
  const elapsed = t - reactionStarted;
  if (reaction && elapsed >= 0 && elapsed < 1.8) {
    if (reaction === 'wave') right = 2.45 + .3 * Math.sin(elapsed * 13);
    if (reaction === 'giggle') {
      bounce = .028 * Math.abs(Math.sin(elapsed*23));
      spin = .12 * Math.sin(elapsed*16);
      left = -.5 + .22*Math.sin(elapsed*14);
      right = .5 - .22*Math.sin(elapsed*14);
    }
    if (reaction === 'peek') {
      spin = .4*Math.sin(elapsed*8);
      bounce = -.015*Math.sin(elapsed*5);
      left = -1.4;
      right = 1.4;
    }
    if (reaction === 'jump') bounce = Math.abs(Math.sin(elapsed * 9)) * .13;
    if (reaction === 'spin') spin = elapsed * Math.PI * 3;
    if (reaction === 'dance') {
      bounce = Math.abs(Math.sin(elapsed * 12)) * .06;
      spin = Math.sin(elapsed * 9) * .32;
      left = -1 + Math.sin(elapsed * 10) * .4;
      right = 1 - Math.sin(elapsed * 10) * .4;
    }
  } else reaction = null;
  motion.position.x = 0;
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
