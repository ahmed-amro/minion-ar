// Optional AI transport: no dependencies on Three.js, WebXR, or microphone APIs.
export const ACTIONS = ['none', 'wave', 'dance', 'jump', 'spin', 'giggle', 'peek'];
export function isDirectCommand(raw) {
  const phrase = String(raw).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(hey )?bello\s*/, '').replace(/^please\s+/, '').replace(/\s+please$/, '');
  return /^(stop|enough|freeze|be still|stop dancing|wake|wake up|stand up|get up|hello|hi|dance|boogie|groove|jump|hop|bounce|wave|say hi|say hello|spin|turn around|twirl|laugh|giggle|peek|peekaboo|hide|read|read your magazine|read a book|magazine|book|chair|sit down|take a break|relax|smaller|shrink|tiny|bigger|larger|grow|move|relocate|another spot|mute|quiet|silence|sound off|unmute|sound on|make noise)$/.test(phrase);
}
export function localBackendURL(raw) {
  const url = new URL(raw);
  const host = url.hostname;
  // Deliberately LAN-only. No accidental upload of the pairing code to arbitrary websites.
  const octets = host.split('.').map(Number);
  const ipv4 = /^\d+\.\d+\.\d+\.\d+$/.test(host) && octets.every(n => n >= 0 && n <= 255);
  const privateIP = ipv4 && (octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !(privateIP || host === 'localhost' || host.endsWith('.local')) ||
      url.pathname !== '/' || url.search || url.hash) throw new Error('Use your laptop’s local address, e.g. http://192.168.1.50:8000');
  return url.origin;
}
export class Conversation {
  constructor({fetcher = globalThis.fetch.bind(globalThis), timeout = 22000} = {}) {
    this.fetcher = fetcher; this.timeout = timeout; this.history = []; this.enabled = false;
    this.serial = 0; this.controller = null; this.url = ''; this.token = '';
  }
  cancel() { this.serial++; this.controller?.abort(); this.controller = null; }
  disconnect() { this.cancel(); this.enabled = false; this.token = ''; }
  clear() { this.cancel(); this.history = []; }
  async request(path, data) {
    this.cancel();
    const serial = this.serial;
    const controller = new AbortController(); this.controller = controller;
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetcher(this.url + path, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        // Private IP literals/.local/localhost are already recognizable by Chrome.
        // Avoid optional fetch enum values that vary across browser versions.
        signal: controller.signal,
        headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token},
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const messages = {
          401: 'Pairing code rejected. Copy the code from the currently running backend window.',
          403: 'Backend rejected this website origin. Check the backend window.',
          404: 'Backend endpoint not found. Check the address and backend version.',
          429: 'Backend request limit reached. Wait before trying again.',
          502: 'Laptop reached, but OpenAI rejected the request. Check key validity, credit and model access.',
          503: 'Laptop reached, but its AI service is unavailable.'
        };
        throw new Error(messages[response.status] || 'Backend returned HTTP ' + response.status);
      }
      const result = await response.json();
      if (serial !== this.serial) throw new Error('Cancelled');
      return result;
    } finally { clearTimeout(timer); if (serial === this.serial) this.controller = null; }
  }
  async connect(url, token) {
    this.disconnect(); this.url = localBackendURL(url); this.token = token.trim();
    if (!this.token || this.token.startsWith('sk-')) { this.token = ''; throw new Error('Enter the laptop pairing code, never your OpenAI key.'); }
    const result = await this.request('/health', {});
    if (result.status !== 'ready') throw new Error('Backend is not ready');
    this.enabled = true; return result;
  }
  async turn(text, settings = {}) {
    if (!this.enabled) throw new Error('Not connected');
    const result = await this.request('/chat', {text, history: this.history, settings});
    if (typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 700 || !ACTIONS.includes(result.action)) throw new Error('Invalid reply');
    this.history.push({role: 'user', content: text.slice(0, 1200)}, {role: 'assistant', content: result.reply});
    this.history = this.history.slice(-10);
    return result;
  }
}
