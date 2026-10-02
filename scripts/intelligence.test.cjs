const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profileDraft, strategyDraft, profileConfidence } = require('../lib/ai/rules.ts');
const { buildProfile } = require('../lib/ai/profile.ts');
const { buildStrategy } = require('../lib/ai/strategy.ts');
const prospect = { name:'Lim Wei', budget_range:'2.5M MYR', cultural_background:'Mainland Chinese' };
const notes = [{ personality_observations:'risk-averse and analytical', intentions:'investment for children', objections:'price and downside risk', lifestyle_notes:'family legacy' }];
test('confidence follows evidence count and caps at 0.9', () => {
 assert.equal(profileConfidence(1),0.6); assert.equal(profileConfidence(2),0.7); assert.equal(profileConfidence(100),0.9);
});
test('evidence-based draft uses recorded priorities without ethnicity profiling', () => {
 const draft = profileDraft(prospect,notes);
 assert.deepEqual(draft,profileDraft({...prospect,cultural_background:'Malay'},notes));
 assert.match(draft.summary,/cautious/); assert.match(draft.motivations.join(' '),/family legacy/);
 const strategy = strategyDraft(prospect,{...draft,review_status:'approved',confidence:0.7});
 assert.equal(strategy.talking_points.length,3); assert.match(strategy.pitch_angle,/capital preservation/); assert.match(strategy.closing_technique,/relationship-first/);
});
test('generation blocks missing evidence and unapproved profiles',async()=>{
 await assert.rejects(buildProfile(prospect,[]),/Log at least one interaction/);
 await assert.rejects(buildStrategy(prospect,{review_status:'unreviewed'}),/Approve a profile/);
});
test('AI timeout and malformed output return labelled editable drafts',async()=>{
 const oldFetch = global.fetch; const oldKey = process.env.OPENAI_API_KEY;
 try {
  process.env.OPENAI_API_KEY='unit-test-key';
  global.fetch=async()=>{throw new Error('timeout')};
  assert.equal((await buildProfile(prospect,notes)).source,'rules-assisted-manual-draft:ai-unavailable');
  global.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"summary":"incomplete"}'}}]})});
  assert.equal((await buildProfile(prospect,notes)).source,'rules-assisted-manual-draft:ai-unavailable');
  const strategy=await buildStrategy(prospect,{...profileDraft(prospect,notes),review_status:'approved',confidence:0.7});
  assert.equal(strategy.source,'rules-assisted-manual-draft:ai-unavailable'); assert.equal(strategy.confidence,0.665);
 } finally { global.fetch=oldFetch; if(oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=oldKey; }
});
test('validated model output retains actual model attribution and evidence score',async()=>{
 const oldFetch=global.fetch; const oldKey=process.env.OPENAI_API_KEY;
 try {
  process.env.OPENAI_API_KEY='unit-test-key';
  global.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(profileDraft(prospect,notes))}}]})});
  const result=await buildProfile(prospect,notes);
  assert.equal(result.source,process.env.OPENAI_MODEL || 'gpt-4.1-mini'); assert.equal(result.confidence,0.6);
 } finally { global.fetch=oldFetch; if(oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=oldKey; }
});
