'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const P={},env={window:{PM:P},PM:P,console};vm.createContext(env);
for(const file of ['data.js','matching.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),env,{filename:file});
const base={id:'me',full_name:'Student Me',institution:'VUT',institution_type:'university',campus:'Vanderbijlpark Campus',course:'Diploma in IT',modules:['Web Development 3.2','Programming 3','Database Systems'],availability:'evenings',study_method:'virtual'};
const other=(id,overrides={})=>({...base,id,full_name:'Student '+id,...overrides});
const checks=[];
function check(title,fn){try{fn();checks.push({title,pass:true});console.log('PASS',title);}catch(e){checks.push({title,pass:false});console.error('FAIL',title,e.message);process.exitCode=1;}}
const score=(p,me=base)=>P.matchDetails(p,me);
check('VUT abbreviation and full university name canonicalize',()=>assert.equal(P.institutionKey('VUT'),P.institutionKey('Vaal University of Technology')));
check('Waterbeg alias and full TVET name canonicalize',()=>assert.equal(P.institutionKey('Waterbeg'),P.institutionKey('Waterberg TVET College')));
check('Online unrelated same-institution student NOT recommended',()=>{
 const p=other('unrelated',{institution:'Vaal University of Technology',course:'Mechanical Engineering',modules:['Physics'],study_method:'virtual'});
 assert.equal(score(p).eligible,false);
});
check('Online shared modules from different institution ARE recommended',()=>{
 const p=other('online-uj',{institution:'University of Johannesburg',course:'Diploma in Information Technology',modules:['Web Dev 3.2','Programming 3','Database Systems']});
 assert.equal(score(p).eligible,true);assert.ok(score(p).score>=80);
});
check('Online academic match outranks unrelated same campus',()=>{
 const cross=other('cross',{institution:'UJ',modules:['Web Development 3.2','Programming 3','Database Systems']});
 const near=other('near',{course:'Mechanical Engineering',modules:['Physics']});
 assert.ok(score(cross).score>score(near).score);
});
check('Online and campus-only are incompatible, not recommended',()=>{
 const r=score(other('incompatible',{study_method:'campus'}));
 assert.equal(r.score,0);assert.equal(r.formatCompatible,false);assert.equal(r.eligible,false);
});
check('Hybrid is compatible with online and on-campus',()=>{
 assert.equal(score(other('hybrid',{study_method:'hybrid'})).eligible,true);
 const oncampus={...base,study_method:'campus'};
 assert.equal(score(other('hybridcampus',{study_method:'hybrid'}),oncampus).eligible,true);
});
check('On-campus prioritizes same campus institution',()=>{
 const me={...base,study_method:'campus'};
 const local=other('local',{study_method:'campus'});
 const remote=other('other-campus',{study_method:'campus',institution:'University of Johannesburg',campus:'Auckland Park'});
 assert.ok(score(local,me).score>score(remote,me).score);
});
check('Web Dev 3.2 matches Web Development 3.2',()=>{
 assert.equal(P.MatchingV2.sharedTopics(['Web Dev 3.2'],['Web Development 3.2']).matches.length,1);
});
check('Programming 1 does not match Programming 2',()=>{
 assert.equal(P.MatchingV2.sharedTopics(['Programming 1'],['Programming 2']).matches.length,0);
});
check('Overlapping subjects are not double-counted',()=>{
 const a=P.MatchingV2.sharedTopics(['Web Dev 3','Web Development 3'],['Web Development 3']);
 assert.equal(a.matches.length,1);assert.ok(a.score<1);
});
check('Same course abbreviation IT equals Information Technology',()=>assert.equal(P.MatchingV2.courseKey('Diploma in IT'),P.MatchingV2.courseKey('Diploma in Information Technology')));
check('Incomplete peer profile gets no misleading score or recommendation',()=>{
 const r=score(other('incomplete',{course:'',modules:[],full_name:'Student ABC123'}));
 assert.equal(r.showScore,false);assert.equal(r.eligible,false);
});
check('Private/discoverable exclusion remains in data query (checked in integration test)',()=>{
 const source=fs.readFileSync(path.join(root,'api.js'),'utf8');
 assert.match(source,/\.eq\('discoverable',true\)/);
 assert.match(source,/blocked\.has\(peer\.id\)/);
});
check('School versus university is never recommended',()=>{
 const school=other('school',{institution_type:'school',course:'Grade 12',modules:['Mathematics']});
 assert.equal(score(school).eligible,false);
});
check('Different school grades are not recommended despite same subjects',()=>{
 const a=other('school-a',{institution_type:'school',course:'Grade 11',modules:['Mathematics'],study_method:'virtual'});
 const b=other('school-b',{institution_type:'school',course:'Grade 12',modules:['Mathematics'],study_method:'virtual'});
 assert.equal(score(b,a).eligible,false);
});
check('Match scores between 0 and 100',()=>{
 for(const a of ['campus','hybrid','virtual',undefined])for(const b of ['campus','hybrid','virtual',undefined]){
  const m={...base,study_method:a},p=other('p',{study_method:b});
  const value=score(p,m).score;assert.ok(value>=0&&value<=100,`value ${value}`);
 }
});
check('Match score is symmetric for known formats',()=>{
 for(const a of ['campus','hybrid','virtual'])for(const b of ['campus','hybrid','virtual']){
  const m={...base,study_method:a},p=other('p',{study_method:b,institution:'UJ',modules:['Web Dev 3.2','Programming 3']});
  assert.equal(score(p,m).score,score(m,p).score,`formats ${a},${b}`);
 }
});
check('No data is altered by scoring',()=>{
 const a={...base,modules:[...base.modules]},b=other('p',{modules:['Web Dev 3.2']});const before=JSON.stringify([a,b]);
 score(a,b);assert.equal(JSON.stringify([a,b]),before);
});
console.log(`\n${checks.filter(x=>x.pass).length}/${checks.length} scenarios passed`);
