export const CONVERSATION_STATES = ['idle', 'listening', 'thinking', 'speaking'];
export const ACTIONS = ['wave', 'dance', 'jump', 'spin', 'giggle', 'peek', 'read', 'wake'];
const DURATIONS = { wave: 2.2, dance: 3.2, jump: 1.7, spin: 2.2, giggle: 2.1, peek: 2.3 };
const approach = (a, b, step) => a < b ? Math.min(b, a + step) : Math.max(b, a - step);

// No DOM, audio, network or Three.js dependency. All time is supplied by the host.
export class Behavior {
  constructor({ idleDelay = 30, random = Math.random } = {}) {
    this.idleDelay = idleDelay;
    this.random = random;
    this.state = 'idle';
    this.autoEnabled = true;
    this.quietTime = 0;
    this.activity = 'standing';
    this.readAmount = 0;
    this.readTime = 0;
    this.action = null;
    this.actionTime = 0;
    this.pending = null;
    this.disposed = false;
  }
  setConversationState(state) {
    if (!CONVERSATION_STATES.includes(state)) throw new RangeError(`Unknown conversation state: ${state}`);
    if (this.disposed || this.state === state) return;
    this.state = state;
    this.quietTime = 0;
    // Immediate conversation priority; the visual controller eases out the old pose.
    if (state !== 'idle') { this.action = null; this.actionTime = 0; }
  }
  setAutoEnabled(enabled) {
    this.autoEnabled = Boolean(enabled);
    this.quietTime = 0;
    // Disable future scheduling; explicit Read remains available, like v0.6.
  }
  markEngaged() { this.quietTime = 0; }
  triggerAction(action) {
    if (!ACTIONS.includes(action)) throw new RangeError(`Unknown action: ${action}`);
    if (this.disposed) return 'disposed';
    this.quietTime = 0;
    if (this.state !== 'idle') { this.pending = action; return 'queued'; }
    this.pending = null;
    this.action = null;
    this.actionTime = 0;
    if (action === 'read') { this.activity = 'reading'; return 'started'; }
    this.activity = 'standing';
    if (action === 'wake') return 'started';
    if (this.readAmount > 0) this.pending = action;
    else this.action = action;
    return this.pending ? 'queued' : 'started';
  }
  update(dt) {
    if (this.disposed) return;
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('deltaSeconds must be finite and nonnegative');
    dt = Math.min(dt, .05); // No catching up after a suspended tab or tracking pause.
    if (this.state !== 'idle') return; // Freeze reading, action time and inactivity timer.
    if (this.pending && (this.activity === 'reading' || this.readAmount === 0)) {
      const action = this.pending;
      this.pending = null;
      this.triggerAction(action);
    }
    this.readAmount = approach(this.readAmount, this.activity === 'reading' ? 1 : 0, dt / 1.25);
    if (this.activity === 'reading') this.readTime += dt;
    if (this.action) {
      this.actionTime += dt;
      if (this.actionTime >= DURATIONS[this.action]) {
        this.action = null;
        this.actionTime = 0;
        this.quietTime = 0;
      }
    } else if (!this.pending && this.activity === 'standing' && this.readAmount === 0) {
      this.quietTime += dt;
      if (this.autoEnabled && this.quietTime >= this.idleDelay) this.triggerAction('read');
    }
  }
  snapshot() {
    return { state: this.state, activity: this.activity, action: this.action,
      actionTime: this.actionTime, actionDuration: DURATIONS[this.action] || 0,
      readAmount: this.readAmount, readTime: this.readTime,
      autoEnabled: this.autoEnabled, quietTime: this.quietTime, pending: this.pending };
  }
  dispose() { this.disposed = true; this.pending = null; this.action = null; }
}
