// Stores preferences only. No credentials, transcripts or chat history.
export const DEFAULTS = Object.freeze({voiceURI:'', rate:1.18, pitch:1.35, volume:.76,
  personality:'playful', humor:'light', length:'normal', instruction:''});
const KEY = 'bello.preferences.v1';
const oneOf = (v, choices, fallback) => choices.includes(v) ? v : fallback;
const number = (v, low, high, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.min(high,Math.max(low,v)) : fallback;
export function normalize(value) {
  const v = value && typeof value === 'object' ? value : {};
  return {voiceURI: typeof v.voiceURI === 'string' ? v.voiceURI.slice(0,300) : '',
    rate:number(v.rate,.5,2,DEFAULTS.rate),pitch:number(v.pitch,.5,2,DEFAULTS.pitch),volume:number(v.volume,0,1,DEFAULTS.volume),
    personality:oneOf(v.personality,['playful','assistant'],'playful'),
    humor:oneOf(v.humor,['off','light','playful'],'light'),length:oneOf(v.length,['short','normal'],'normal'),
    instruction:typeof v.instruction === 'string' ? v.instruction.slice(0,300) : ''};
}
export function readPreferences(storage) {
  try { return normalize(JSON.parse(storage.getItem(KEY))); } catch (_) { return {...DEFAULTS}; }
}
export function savePreferences(storage, value) {
  try { storage.setItem(KEY,JSON.stringify(normalize(value))); return true; } catch (_) { return false; }
}
export function personalitySettings(value) {
  const {personality,humor,length,instruction} = normalize(value);
  return {personality,humor,length,instruction};
}
export function applyVoice(utterance, value, voices) {
  const prefs = normalize(value);
  const voice = voices.find(v=>v.voiceURI===prefs.voiceURI);
  if (voice) {utterance.voice=voice;utterance.lang=voice.lang;}
  utterance.rate=prefs.rate;utterance.pitch=prefs.pitch;utterance.volume=prefs.volume;
}
export function mountPreferences({get, set, preview, cancel}) {
  const fields = ['voiceURI','rate','pitch','volume','personality','humor','length','instruction'];
  const nodes = Object.fromEntries(fields.map(name=>[name,document.getElementById('pref-'+name)]));
  const notice=document.getElementById('preferencesNotice');
  const synth=window.speechSynthesis;
  function refreshVoices() {
    const voices = synth?.getVoices?.() || [];
    nodes.voiceURI.replaceChildren();
    const add=(text,value)=>{const o=document.createElement('option');o.textContent=text;o.value=value;nodes.voiceURI.append(o);};
    add('Device default (English)', '');
    for (const v of voices) add(`${v.name} · ${v.lang}${v.localService?' · on-device':''}`,v.voiceURI);
    const selected=get().voiceURI;
    if (selected && !voices.some(v=>v.voiceURI===selected)) add('Saved voice unavailable — using default',selected);
    nodes.voiceURI.value=selected;
  }
  function fill() {
    const prefs=get();
    for(const key of fields) nodes[key].value=String(prefs[key]);
    for(const key of ['rate','pitch','volume']) document.getElementById('pref-'+key+'-value').textContent=String(prefs[key]);
  }
  for(const key of fields) nodes[key].addEventListener('input',()=>{
    cancel();
    const prefs={...get(),[key]:['rate','pitch','volume'].includes(key)?Number(nodes[key].value):nodes[key].value};
    const saved=set(normalize(prefs));fill();
    notice.textContent=saved?'Settings saved on this browser. Personality changes apply to the next AI reply.':'Settings work for this visit; browser storage is unavailable.';
  });
  document.getElementById('previewVoice').addEventListener('click',()=>preview('Bello! This is my voice. Ready for a little adventure?'));
  document.getElementById('resetPreferences').addEventListener('click',()=>{cancel();const saved=set({...DEFAULTS});refreshVoices();fill();notice.textContent=saved?'Default settings restored.':'Defaults restored for this visit; browser storage is unavailable.';});
  fill();refreshVoices();synth?.addEventListener?.('voiceschanged',refreshVoices);
  if(!synth) {document.getElementById('previewVoice').disabled=true;notice.textContent='Speech synthesis unavailable. Text chat still works.';}
}
