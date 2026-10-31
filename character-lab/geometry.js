import * as THREE from 'three';

// Adapted from the supplied Bello v0.6 procedural character.
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
  texture.anisotropy = 1;
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

function buildCompanion(surfaceMats) {
  const root = new THREE.Group();
  const motion = new THREE.Group();
  root.add(motion);
  const yellow = surfaceMats.yellow;
  const blue = surfaceMats.denim;
  const navy = material(0x111b32);
  const rubber = surfaceMats.rubber;
  const metal = surfaceMats.metal;

  // Rounded yellow body (approximately 84cm at scale 1; scaled to 12cm in AR).
  const body = addMesh(motion, new THREE.CapsuleGeometry(.17, .37, 10, 24), yellow, 0, .43, 0);
  // Overall trousers and bib.
  addMesh(motion, new THREE.CylinderGeometry(.177, .173, .23, 32), blue, 0, .25, 0);
  addMesh(motion, beveledBox(.215, .17, .045, .012), blue, 0, .323, .156);
  const pocket = addMesh(motion, beveledBox(.085, .06, .012, .005), blue, 0, .29, .185);
  pocket.rotation.z = .02;
  // Visible cotton stitching and a tiny embroidered pocket detail.
  stitchLine(motion, [[-.102,.409,.181],[-.108,.34,.181],[-.105,.278,.178],[-.055,.257,.190],[.055,.257,.190],[.105,.278,.178],[.108,.34,.181],[.102,.409,.181]]);
  stitchLine(motion, [[-.042,.320,.193],[-.04,.264,.193],[0,.261,.193],[.04,.264,.193],[.042,.320,.193]], 0xb5d8ef);
  for (const side of [-1, 1]) {
    const strap = addMesh(motion, new THREE.BoxGeometry(.052, .15, .035), blue, side * .122, .372, .123);
    strap.rotation.z = side * -.25;
    addMesh(motion, new THREE.SphereGeometry(.012, 10, 10), metal, side * .105, .375, .147);
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
  addMesh(gaze, new THREE.SphereGeometry(.04, 20, 16), material(0x8c5a32), .007, -.004, .291);
  addMesh(gaze, new THREE.SphereGeometry(.023, 20, 16), navy, .007, -.004, .300);
  addMesh(gaze, new THREE.SphereGeometry(.009, 12, 12), material(0xffffff), -.003, .010, .304);
  gaze.children[0].scale.z = .13;
  gaze.children[1].scale.z = .08;
  gaze.children[2].scale.z = .1;
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
  smile.position.y = .04;
  const surpriseMouth = addMesh(motion, new THREE.SphereGeometry(.034,20,16), material(0x3d2025), 0,.437,.175);
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
  // Articulated legs retain the standing silhouette and sole height from v0.6.
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side*.065,.175,0); motion.add(hip);
    addMesh(hip,new THREE.CylinderGeometry(.03,.031,.065,12),blue,0,-.0325,0);
    const knee = new THREE.Group(); knee.position.y=-.065; hip.add(knee);
    addMesh(knee,new THREE.SphereGeometry(.03,12,10),blue,0,0,0);
    addMesh(knee,new THREE.CylinderGeometry(.03,.03,.055,12),blue,0,-.0275,0);
    const ankle = new THREE.Group(); ankle.position.y=-.055; knee.add(ankle);
    const boot=addMesh(ankle,new THREE.SphereGeometry(.055,16,14),rubber,side*.004,0,.032);
    boot.scale.set(1,.65,1.38);
    const sole=addMesh(ankle,new THREE.SphereGeometry(.056,16,12),rubber,side*.004,-.027,.038);
    sole.scale.set(1,.29,1.36);
    legs.push({hip,knee,ankle});
  }
  // Three comically unruly hairs.
  for (const [x, tilt] of [[-.033,-.35],[0,0],[.033,.28]]) {
    const hair = addMesh(motion, new THREE.CylinderGeometry(.002,.005,.065,8), rubber, x,.8,0);
    hair.rotation.z = tilt;
  }
  // Tiny wooden chair, and an open illustrated magazine. Both are hidden until
  // Bello starts his hands-off routine, and inherit his AR position and size.
  const chair = buildChair(surfaceMats);
  chair.visible = false;
  root.add(chair);
  const magazine = buildMagazine();
  magazine.visible = false;
  motion.add(magazine);
  root.userData = { body, legs, motion, leftArm:arms[0], rightArm:arms[1], chair, magazine,
    page: magazine.userData.page, eyeBlink, gaze, closedEyeLine,
    smile, surpriseMouth, touchZone };
  return root;
}


function buildChair(surfaceMats) {
  const chair = new THREE.Group();
  const wood = surfaceMats.wood;
  const upholstery = material(0x3c7c8b);
  addMesh(chair, new THREE.BoxGeometry(.37,.035,.30), upholstery, 0,.11,-.055);
  addMesh(chair, new THREE.BoxGeometry(.36,.33,.045), wood, 0,.30,-.19);
  for (const x of [-.14, .14]) for (const z of [-.17, .065]) {
    addMesh(chair, new THREE.CylinderGeometry(.018,.022,.09,9), wood, x,.047,z);
  }
  // A tiny lip beneath the seat makes it recognizable at mug-size.
  addMesh(chair, new THREE.BoxGeometry(.36,.026,.02), wood, 0,.075,.085);
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


export { buildCompanion, paintTexture, addMesh, material };

// Beveled clothing silhouette; dimensions include the bevel.
function beveledBox(w,h,depth,r) {
  const sh = new THREE.Shape();
  const x=-w/2+r, y=-h/2+r, rw=w-2*r, rh=h-2*r;
  sh.moveTo(x,y); sh.lineTo(x+rw,y); sh.lineTo(x+rw,y+rh);
  sh.lineTo(x,y+rh); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh,{depth:Math.max(.001,depth-2*r),bevelEnabled:true,
    bevelThickness:Math.min(r,depth*.35),bevelSize:r,bevelSegments:3,steps:1,curveSegments:4});
  g.center(); return g;
}
