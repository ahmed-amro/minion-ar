import * as THREE from 'three';

const smooth = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = THREE.MathUtils.lerp;

// The only writer of animated transforms. Placement and user scale are never touched.
export class AnimationController {
  constructor(parts) {
    this.d = parts;
    this.time = 0;
    this.nextBlink = 2.4;
    this.blinkStart = -10;
    this.q = new THREE.Quaternion();
    this.euler = new THREE.Euler();
    this.inverse = new THREE.Matrix4();
    this.relative = new THREE.Matrix4();
    this.footBounds = new THREE.Box3();
  }
  rotate(object, x, y, z, alpha) {
    this.euler.set(x, y, z);
    this.q.setFromEuler(this.euler);
    object.quaternion.slerp(this.q, alpha);
  }
  update(dt, b) {
    const d = this.d;
    this.time += dt;
    const t = this.time;
    const a = 1 - Math.exp(-12 * dt);
    const read = smooth(b.readAmount);
    const conversation = b.state !== 'idle';
    let y = 0, roll = .006 * Math.sin(t * 1.1), yaw = 0, pitch = -.07 * read;
    let left = -.22, right = .22, leftX = 0, rightX = 0, mouth = 0;
    let squat = 0;
    left = lerp(left, .32, read);
    right = lerp(right, -.32, read);
    leftX = rightX = -1.1 * read;
    const p = b.actionDuration ? b.actionTime / b.actionDuration : 0;
    const w = smooth(b.actionTime / .2) * smooth((b.actionDuration - b.actionTime) / .35);
    const e = b.actionTime;
    if (b.action === 'wave') right = lerp(right, 2.45 + .24 * Math.sin(e * 13), w);
    if (b.action === 'dance') {
      yaw = .3 * Math.sin(e * 7) * w;
      roll += .08 * Math.sin(e * 7) * w;
      squat = .025 * (1 + Math.sin(e * 14)) * w;
      left = lerp(left, -1 + .3 * Math.sin(e * 9), w);
      right = lerp(right, 1 - .3 * Math.sin(e * 9), w);
    }
    if (b.action === 'jump') {
      squat = .07 * Math.sin(Math.PI * smooth(p / .22)) * (p < .22 ? 1 : 0);
      const flight = (p - .22) / .52;
      y = flight > 0 && flight < 1 ? .13 * Math.sin(Math.PI * flight) : 0;
      left = lerp(left, -.9, w); right = lerp(right, .9, w);
      mouth = .8 * w;
    }
    if (b.action === 'spin') { yaw = Math.PI * 2 * smooth(p); left = -.7 * w; right = .7 * w; }
    if (b.action === 'giggle') {
      roll += .06 * Math.sin(e * 20) * w;
      squat = .025 * Math.abs(Math.sin(e * 19)) * w;
      mouth = .5 * w;
    }
    if (b.action === 'peek') {
      left = lerp(left, -2.55, w); right = lerp(right, 2.55, w);
      leftX = rightX = -.65 * w;
      yaw = .12 * Math.sin(e * 4) * w;
    }
    if (b.state === 'listening') { pitch -= .055; roll = .04; }
    if (b.state === 'thinking') { pitch += .035; roll = -.035; }
    if (b.state === 'speaking') {
      pitch += .014 * Math.sin(t * 5);
      mouth = .18 + .35 * (Math.sin(t * 13) ** 2);
      if (read < .05) right += .18 * Math.sin(t * 4);
    }
    // Articulated thigh/knee chain: body settles onto the seat, boots swing forward.
    const sit = read * .95;
    const bend = sit + squat;
    y += .052 * read - .05 * squat;
    d.motion.position.y = lerp(d.motion.position.y, y, a);
    this.rotate(d.motion, pitch, yaw, roll, a);
    this.rotate(d.leftArm, leftX, 0, left, a);
    this.rotate(d.rightArm, rightX, 0, right, a);
    for (const leg of d.legs) {
      this.rotate(leg.hip, -bend, 0, 0, a);
      this.rotate(leg.knee, bend * 1.6, 0, 0, a);
      this.rotate(leg.ankle, -bend * .6, 0, 0, a);
    }
    // Conservative floor clearance for the boots, evaluated in model coordinates.
    // This is local pose correction, not a change to the host's AR anchor.
    d.model.updateWorldMatrix(true,true);
    this.inverse.copy(d.model.matrixWorld).invert();
    let lowest=Infinity;
    for(const leg of d.legs) for(const foot of leg.ankle.children) {
      if(!foot.geometry.boundingBox)foot.geometry.computeBoundingBox();
      this.relative.multiplyMatrices(this.inverse,foot.matrixWorld);
      this.footBounds.copy(foot.geometry.boundingBox).applyMatrix4(this.relative);
      lowest=Math.min(lowest,this.footBounds.min.y);
    }
    if(lowest<d.soleLevel)d.motion.position.y+=d.soleLevel-lowest;
    d.chair.visible = read > .001;
    d.chair.scale.setScalar(Math.max(.001, smooth(read / .35)));
    d.chair.position.x = -.28 * (1 - smooth(read / .45));
    d.magazine.visible = read > .25;
    d.magazine.scale.setScalar(Math.max(.001, smooth((read - .25) / .6)));
    d.magazine.position.y = .35;
    d.magazine.position.z = .22;
    const pagePhase = b.readTime % 7;
    d.page.visible = read > .95 && pagePhase > 5.8;
    // Retain the last page pose during conversation instead of removing it.
    d.page.rotation.y = -Math.PI * smooth((pagePhase - 5.8) / 1.2);
    if (t >= this.nextBlink) {
      this.blinkStart = t;
      this.nextBlink = t + 2.8 + .7 * (1 + Math.sin(t * 2.37));
    }
    const blinkPhase = (t - this.blinkStart) / .21;
    const blink = blinkPhase >= 0 && blinkPhase <= 1 ? Math.sin(Math.PI * blinkPhase) : 0;
    d.setLid(Math.max(blink, b.state === 'thinking' ? .18 : 0));
    let gazeX = .009 * Math.sin(t * .65), gazeY = .004 * Math.sin(t * .4);
    if (read > .5 && !conversation) { gazeX = .01 * Math.sin(b.readTime * 1.3); gazeY = -.018; }
    if (conversation) { gazeX = b.state === 'thinking' ? .012 : 0; gazeY = b.state === 'thinking' ? .012 : 0; }
    d.gaze.position.x = lerp(d.gaze.position.x, gazeX, a);
    d.gaze.position.y = lerp(d.gaze.position.y, gazeY, a);
    d.surpriseMouth.visible = mouth > .08;
    d.smile.visible = !d.surpriseMouth.visible;
    d.surpriseMouth.scale.y = lerp(d.surpriseMouth.scale.y, .25 + mouth, a);
    d.brow.rotation.z = lerp(d.brow.rotation.z, b.state === 'listening' ? -.1 : .02, a);
    // Breathing is a small body deformation, never an oscillating floor position.
    d.body.scale.y = 1 + .002 * Math.sin(t * 2);
    d.shadow.material.opacity = lerp(d.shadow.material.opacity, .29 * (1 - Math.min(1, Math.max(0, y) / .18)), a);
    d.shadow.scale.setScalar(1 - Math.min(.25, Math.max(0, y)));
  }
}
