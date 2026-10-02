const {test}=require('node:test');const assert=require('node:assert/strict');
const {sourceSchema,publicSourceUrl,eligibleSources,sourceSnapshot,researchIsCurrent}=require('../lib/research.ts');
const {buildProfile}=require('../lib/ai/profile.ts');
const id='ab100000-0000-4000-8000-000000000001';
const source={id,revision:1,url:'https://example.com/bio',title:'Sample biography',publisher:'Example',published_date:null,identity_note:'Same name and employer confirmed',excerpt:'Leads a regional engineering team.',relevance:'Ask about work travel.',verification:'verified',include_in_profile:true,prospect_id:id};
test('approval freshness detects changed, deleted and newly selected evidence',()=>{
 const profile={research_sources:[sourceSnapshot(source)]};
 assert.ok(researchIsCurrent(profile,[source]));
 for(const sources of [[],[{...source,revision:2}],[source,{...source,id:'ab100000-0000-4000-8000-000000000002'}]])assert.equal(researchIsCurrent(profile,sources),false);
 assert.ok(researchIsCurrent({},[{...source,include_in_profile:false}]));
});
test('source links reject executable, credentialed and local addresses',()=>{
 assert.ok(publicSourceUrl(source.url));for(const value of ['javascript:alert(1)','http://example.com','https://user:password@example.com','https://localhost/a','https://127.0.0.1/a','https://[::1]/a','https://company.internal/a'])assert.equal(publicSourceUrl(value),false,value);
});
test('verified selection requires an identity match, excerpt and relevance',()=>{
 assert.ok(sourceSchema.safeParse(source).success);
 for(const patch of [{verification:'uncertain'},{identity_note:''},{excerpt:''},{relevance:''}])assert.equal(sourceSchema.safeParse({...source,...patch}).success,false);
 assert.ok(sourceSchema.safeParse({...source,verification:'wrong_person',include_in_profile:false}).success);
 assert.equal(eligibleSources([source,{...source,verification:'uncertain'},{...source,include_in_profile:false}]).length,1);
});
test('research citations preserve exact evidence without increasing confidence or inferring budget',async()=>{
 const savedKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{
  const prospect={id,name:'Research test',budget_range:'Not disclosed'};
  const notes=[{personality_observations:'Requests a written cost breakdown',intentions:'',objections:'',lifestyle_notes:''}];
  const research=sourceSnapshot(source);const result=await buildProfile(prospect,notes,[research]);
  assert.equal(result.confidence,.6);assert.deepEqual(result.research_sources,[research]);assert.equal(result.research_claims[0].source_id,id);assert.equal(result.research_claims[0].statement,source.excerpt);assert.ok(!result.summary.includes('engineering'));assert.equal(result.socio_economic.tier,'Declared budget: Not disclosed');
 }finally{if(savedKey)process.env.OPENAI_API_KEY=savedKey;}
});
