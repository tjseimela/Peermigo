'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),PM={},env={window:{PM},PM,console};vm.createContext(env);
for(const f of ['data.js','matching.js']) vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),env,{filename:f});
const mk=(id,more={})=>({id,full_name:`Test Student ${id}`,institution_type:'university',institution:'VUT',campus:'Vanderbijlpark Campus',course:'Diploma in IT',modules:['Web Development 3.2'],study_method:'campus',availability:'',...more});
const a=mk('a');
const score=(p,m=a)=>PM.matchDetails(p,m);
const example=score(mk('b',{modules:['Mechanical Engineering'],study_method:'hybrid'}));
assert.equal(example.parts.modules,0,'no shared modules earns zero module points');
assert.equal(example.academicScore,20,'same course alone earns only 20% academic match');
assert.ok(example.studyScore>=95 && example.studyScore<=100,'missing availability is excluded from the study denominator');
assert.ok(example.score>=40 && example.score<=45,'course-only academic evidence cannot inflate overall score');
assert.equal(example.eligible,false,'no common modules + matching campus and course cannot be recommended');
assert.equal(example.subjectEvidence,'none');
const same=score(mk('b'));
assert.ok(same.academicScore>=85,'matching modules and course earn strong academic score');
assert.ok(same.score>=90,'strong academic and logistic compatibility should still rank highly');
assert.ok(same.eligible);
const approximate=score(mk('b',{modules:['Web Development']}));
assert.ok(approximate.parts.modules>0&&approximate.parts.modules<56,'partial module title contributes fractional academic credit');
assert.ok(approximate.score>example.score,'similar modules outrank unrelated modules');
const unknown=score(mk('b',{modules:[]}));
assert.equal(unknown.subjectEvidence,'unknown','missing modules distinguished from known mismatch');
assert.equal(unknown.parts.modules,0);
assert.equal(unknown.academicScore,null,'20% academic coverage must not create an academic percentage');
assert.equal(unknown.showScore,false,'no overall match percentage when academic coverage is below 60%');
const offline=score(mk('b',{modules:['Thermodynamics'],course:'Mechanical Engineering'}));
assert.equal(offline.eligible,false,'unrelated academic profiles cannot qualify on location alone');
assert.ok(offline.score<=29);
for(const [mode,maxAvail] of Object.entries(PM.MatchingV3.weights)){
 const w=maxAvail;
 assert.ok(Math.abs(w.modules+w.course-70)<1e-9,`${mode} academic weights total 70`);
 assert.ok(Math.abs(w.institution+w.campus+w.format+w.availability-30)<1e-9,`${mode} study weights total 30`);
 assert.ok(w.availability<=4+1e-9,`${mode} availability never exceeds 4`);
}
for(const mode of ['campus','hybrid','virtual']){
 const m=mk('a',{study_method:mode,availability:'weekends'}),p=mk('b',{study_method:mode,availability:'evenings'});
 const x=score(p,m),y=score(m,p);
 assert.equal(x.score,y.score,`${mode} remains symmetric`);
 const raw=Math.round(Object.values(x.parts).reduce((a,b)=>a+b,0));
 assert.equal(x.score,raw,'uncapped total equals the two weighted pillar contributions');
 assert.equal(x.academicScore,Math.round((x.parts.modules+x.parts.course)/70*100));
 assert.equal(x.studyScore,Math.round((x.parts.institution+x.parts.campus+x.parts.format+x.parts.availability)/30*100));
}
assert.equal(PM.MatchingV3.version,'4.2.0');
console.log('PASS: two-pillar matching 70% academic + 30% study; missing data normalized; safeguards preserved');
