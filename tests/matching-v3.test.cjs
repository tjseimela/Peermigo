'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PM={},context={window:{PM},PM,console};vm.createContext(context);
for(const file of ['data.js','matching.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const base={id:'a',full_name:'Alice Student',institution_type:'university',institution:'VUT',campus:'Vanderbijlpark Campus',course:'Diploma in IT',modules:['Web Development 3.2','Programming 3','Database Systems'],availability:'mornings',study_method:'campus'};
const person=(id,p={})=>({...base,id,full_name:id+' Student',...p});
const rating=(a,b)=>PM.matchDetails(b,a);
let total=0;
function test(name,fn){fn();total++;console.log('PASS',name);}
const nearby=person('b');
const differentCampus=person('c',{campus:'Ekurhuleni Campus'});
const noCampus=person('d',{campus:''});
const noAcademic=person('e',{course:'Mechanical Engineering',modules:['Physics','Chemistry']});
test('Physical: same institution AND same campus and academic overlap qualify',()=>{const x=rating(base,nearby);assert.equal(x.eligible,true);assert.equal(x.studyContext,'campus');assert.ok(x.score>=85);assert.ok(x.locationVerified);});
test('Physical: same university, different campus never recommended',()=>{const x=rating(base,differentCampus);assert.equal(x.eligible,false);assert.ok(x.score<=44);assert.match(x.reason,/campus/);});
test('Physical: unknown campus never presumed same',()=>{const x=rating(base,noCampus);assert.equal(x.eligible,false);assert.ok(x.score<=44);});
test('Physical: identical campus name but different university is not a location match',()=>{const x=rating(base,person('f',{institution:'UJ'}));assert.equal(x.eligible,false);assert.equal(x.locationVerified,false);});
test('Physical: unrelated modules and course cannot qualify merely via locality',()=>{const x=rating(base,noAcademic);assert.equal(x.eligible,false);assert.ok(x.score<=29);});
test('Physical: a lone shared module in an unrelated course is not automatically a strong recommendation',()=>{const x=rating(base,person('g',{course:'Civil Engineering',modules:['Programming 3']}));assert.ok(x.parts.modules>0);assert.equal(x.moduleMatches[0].contextKind,'different-course');assert.equal(x.eligible,false);});
test('Physical: availability changes score by at most four',()=>{
 const perfect=rating(base,nearby).score;
 const mismatch=rating(base,person('h',{availability:'weekends'})).score;
 assert.ok(perfect-mismatch<=4,`${perfect} vs ${mismatch}`);
});
test('Physical: availability mismatch never independently disqualifies',()=>{const x=rating(base,person('h',{availability:'weekends'}));assert.equal(x.eligible,true);});
test('Campus-only and online-only are incompatible',()=>{const x=rating(base,person('h',{study_method:'virtual'}));assert.equal(x.eligible,false);assert.equal(x.formatCompatible,false);});
test('Campus-only and hybrid must meet campus/institution check',()=>{const good=rating(base,person('h',{study_method:'hybrid'}));const bad=rating(base,person('i',{study_method:'hybrid',campus:'Ekurhuleni Campus'}));assert.equal(good.eligible,true);assert.equal(bad.eligible,false);});
test('Online: same subjects across universities recommended',()=>{const online=person('a',{study_method:'virtual'});const peer=person('h',{study_method:'virtual',institution:'UJ',campus:'Auckland Park'});const x=rating(online,peer);assert.equal(x.eligible,true);assert.ok(x.score>=65);});
test('Online: same university unrelated subjects/course not recommended',()=>{const online=person('a',{study_method:'virtual'});const peer=person('h',{study_method:'virtual',course:'Engineering',modules:['Thermodynamics']});assert.equal(rating(online,peer).eligible,false);});
test('Online: no campus should not penalize matching',()=>{const online=person('a',{study_method:'virtual'});const peer=person('h',{study_method:'virtual',institution:'UJ',campus:''});assert.equal(rating(online,peer).eligible,true);});
test('Two hybrid students may study online across campuses',()=>{const a=person('a',{study_method:'hybrid'}),b=person('b',{study_method:'hybrid',institution:'UJ',campus:'Auckland Park'});assert.equal(rating(a,b).eligible,true);});
test('Online and hybrid are compatible remotely',()=>{const a=person('a',{study_method:'virtual'}),b=person('b',{study_method:'hybrid',institution:'UJ',campus:'Auckland Park'});assert.equal(rating(a,b).eligible,true);});
test('Unknown format is not treated as confirmed in-person/online availability',()=>{assert.equal(rating(base,person('b',{study_method:''})).eligible,false);});
test('School same institution can meet despite having no campus field',()=>{
 const a=person('a',{institution_type:'school',institution:'School A',campus:'',course:'Grade 12',modules:['Mathematics']});
 const b=person('b',{...a,id:'b',full_name:'Bob Student'});
 assert.equal(rating(a,b).eligible,true);
});
test('School grade mismatch blocks recommendations',()=>{const a=person('a',{institution_type:'school',course:'Grade 12',modules:['Mathematics']}),b=person('b',{institution_type:'school',course:'Grade 11',modules:['Mathematics']});assert.equal(rating(a,b).eligible,false);});
test('Different module levels never count as shared subject',()=>{const a=person('a',{modules:['Programming 1'],course:'Diploma in IT'}),b=person('b',{modules:['Programming 2'],course:'Diploma in IT'});assert.equal(PM.MatchingV3.sharedTopics(a.modules,b.modules).matches.length,0);});
test('On-campus weights total 100, availability max 4',()=>{for(const key of Object.keys(PM.MatchingV3.weights)){const w=PM.MatchingV3.weights[key];assert.equal(Object.values(w).reduce((a,b)=>a+b,0),100);assert.ok(w.availability<=4);}});
test('All mode combinations symmetric, bounded, and never mutate profile objects',()=>{
 for(const left of ['virtual','hybrid','campus',''])for(const right of ['virtual','hybrid','campus','']){
  const a=person('a',{study_method:left}),b=person('b',{study_method:right}),before=JSON.stringify([a,b]);
  const x=rating(a,b),y=rating(b,a);assert.equal(x.score,y.score);assert.ok(x.score>=0&&x.score<=100);assert.equal(JSON.stringify([a,b]),before);
 }
});
console.log(`\n${total}/${total} additional v3 scenario tests passed`);
