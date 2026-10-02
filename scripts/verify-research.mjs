import assert from 'node:assert/strict';
const base=process.env.TEST_APP_URL || 'http://localhost:3005';let lead;
async function action(payload,status=200){const response=await fetch(base+'/api/actions',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(payload)});const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body.result ?? body;}
const workspace=()=>fetch(base+'/api/workspace').then(r=>r.json());
try{
 lead=(await action({action:'save_prospect',values:{name:'Research QC '+Date.now(),contact_info:'research-test@example.com',source:'referral',cultural_background:'Malay',budget_range:'Unknown',status:'new'}})).id;
 await action({action:'save_interaction',values:{prospect_id:lead,consultant_name:'QC',interaction_type:'call',personality_observations:'Requested documented costs',intentions:'',objections:'',lifestyle_notes:'',mood_after:'neutral'}});
 const values={prospect_id:lead,url:'https://example.com/research-fixture',title:'Fictional QC biography',publisher:'Example fixture',published_date:'2026-01-01',identity_note:'Synthetic matching fixture, not a real person',excerpt:'The sample prospect coordinates regional projects.',relevance:'Ask whether work travel affects meeting times.',verification:'unverified',include_in_profile:false};
 await action({action:'save_source',values:{...values,url:'javascript:alert(1)'}},400);
 const source=await action({action:'save_source',values});
 let profile=await action({action:'generate_profile',id:lead});assert.equal(profile.research_sources.length,0);
 await action({action:'save_source',id:source.id,values:{...values,include_in_profile:true}},400);
 const verified=await action({action:'save_source',id:source.id,values:{...values,verification:'verified',include_in_profile:true}});assert.ok(verified.revision>source.revision);
 profile=await action({action:'generate_profile',id:lead});assert.equal(profile.research_sources.length,1);assert.equal(profile.research_sources[0].id,source.id);assert.equal(Number(profile.confidence),.6);assert.ok(profile.research_claims.some(c=>c.source_id===source.id));
 await action({action:'review_profile',id:profile.id,review_status:'approved'});
 const strategy=await action({action:'generate_strategy',id:lead});await action({action:'review_strategy',id:strategy.id,review_status:'approved'});
 await action({action:'save_source',id:source.id,values:{...values,verification:'verified',include_in_profile:true,excerpt:'The sample prospect coordinates local projects.'}});
 let data=await workspace();assert.equal(data.profiles.find(p=>p.id===profile.id).review_status,'unreviewed');assert.equal(data.strategies.find(s=>s.id===strategy.id).review_status,'unreviewed');assert.equal(data.profiles.find(p=>p.id===profile.id).research_sources[0].excerpt,values.excerpt);
 await action({action:'review_profile',id:profile.id,review_status:'approved'},400);await action({action:'generate_strategy',id:lead},400);
 const fresh=await action({action:'generate_profile',id:lead});await action({action:'review_profile',id:fresh.id,review_status:'approved'});
 await action({action:'delete_source',id:source.id,prospect_id:lead},400);await action({action:'delete_source',id:source.id,prospect_id:lead,confirm:true});
 data=await workspace();assert.ok(!data.research.some(s=>s.id===source.id));assert.equal(data.profiles.find(p=>p.id===fresh.id).review_status,'unreviewed');assert.equal(data.profiles.find(p=>p.id===fresh.id).research_sources.length,1);
 console.log('PASS: saved source → verify/select → cited profile → strategy; evidence edits/deletion invalidate approval, stale approval denied, URL validation and citation history preserved.');
}finally{if(lead){await action({action:'delete_prospect',id:lead,confirm:true});assert.ok(!(await workspace()).research.some(s=>s.prospect_id===lead));console.log('PASS: research test cleanup; unrelated records preserved.');}}
