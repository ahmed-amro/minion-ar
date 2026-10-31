import test from 'node:test';
import assert from 'node:assert/strict';
import { Behavior, ACTIONS, CONVERSATION_STATES } from '../behavior.js';
function tick(b,seconds){for(let i=0;i<Math.ceil(seconds/.02);i++)b.update(.02);}

test('autonomous read begins after quiet interval',()=>{
  const b=new Behavior();tick(b,29);assert.equal(b.activity,'standing');tick(b,1.1);assert.equal(b.activity,'reading');
});
test('conversation freezes reading, page clock, and idle timer through all active states',()=>{
  const b=new Behavior();b.triggerAction('read');tick(b,3);
  for(const state of CONVERSATION_STATES.filter(s=>s!=='idle')){
    b.setConversationState(state);const before=b.snapshot();tick(b,60);
    assert.deepEqual(b.snapshot(),before);
  }
  b.setConversationState('idle');tick(b,1);assert.ok(b.readTime>3);
});
test('conversation suppresses automatic reading even beyond idle delay',()=>{
  const b=new Behavior();b.setConversationState('listening');tick(b,90);assert.equal(b.activity,'standing');
  b.setConversationState('idle');tick(b,29);assert.equal(b.activity,'standing');
});
test('wake reverses reading smoothly instead of resetting the pose',()=>{
  const b=new Behavior();b.triggerAction('read');tick(b,2);b.triggerAction('wake');
  assert.equal(b.readAmount,1);tick(b,.3);assert.ok(b.readAmount>0&&b.readAmount<1);
  tick(b,2);assert.equal(b.readAmount,0);
});
test('gesture waits for reading exit and conversation defers latest action',()=>{
  const b=new Behavior();b.triggerAction('read');tick(b,2);b.setConversationState('speaking');
  assert.equal(b.triggerAction('jump'),'queued');b.triggerAction('wave');tick(b,3);
  assert.equal(b.action,null);b.setConversationState('idle');tick(b,.5);
  assert.equal(b.action,null);tick(b,1);assert.equal(b.action,'wave');
});
test('all gesture hooks complete and return to standing',()=>{
  for(const action of ACTIONS.filter(a=>!['read','wake'].includes(a))){
    const b=new Behavior();b.triggerAction(action);assert.equal(b.action,action);tick(b,4);
    assert.equal(b.action,null);assert.equal(b.activity,'standing');
  }
});
test('auto off suppresses scheduling, explicit read stays available',()=>{
  const b=new Behavior();b.setAutoEnabled(false);tick(b,80);assert.equal(b.activity,'standing');
  b.triggerAction('read');tick(b,2);assert.equal(b.readAmount,1);
});
test('invalid inputs and disposed instances are handled',()=>{
  const b=new Behavior();assert.throws(()=>b.update(NaN));assert.throws(()=>b.update(-1));
  assert.throws(()=>b.setConversationState('unknown'));assert.throws(()=>b.triggerAction('unknown'));
  b.update(100);assert.ok(b.quietTime<=.05);b.dispose();assert.equal(b.triggerAction('wave'),'disposed');
});
