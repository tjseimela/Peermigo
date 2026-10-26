'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const PM={};const context={window:{PM},PM,console};vm.createContext(context);
for(const file of ['data.js','matching.js']) vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),context,{filename:file});
const me={id:'me',full_name:'Student Viewer',institution_type:'university',institution:'VUT',campus:'Vanderbijlpark',course:'Diploma in IT',modules:['Web Development 3.2','Database Systems'],study_method:'campus',availability:'evenings'};
const other=(id,values={})=>({...me,id,full_name:`Student ${id}`,...values});
const score=(p,m=me)=>PM.matchDetails(p,m);
// One matching data point, with all other academic evidence unavailable, cannot produce 100%.
const noModules=score(other('no-modules',{modules:[]}));
assert.equal(noModules.categoryCoverage.academic,20);
assert.equal(noModules.academicScore,null);
assert.equal(noModules.showScore,false);
assert.equal(noModules.score,0);
assert.equal(noModules.eligible,false);
assert.equal(noModules.insufficientData,true);
// Missing availability is unknown, not a scored mismatch.
const complete=score(other('complete'));
const absentSchedule=score(other('no-schedule',{availability:''}));
assert.equal(absentSchedule.known.availability,false);
assert.equal(absentSchedule.parts.availability,0);
assert.equal(absentSchedule.studyScore,100);
assert.equal(absentSchedule.categoryCoverage.study<100,true);
assert.equal(absentSchedule.showScore,true);
assert.equal(complete.studyScore,100);
assert.equal(absentSchedule.studyScore,complete.studyScore);
assert.ok(absentSchedule.overallCoverage<complete.overallCoverage);
// Known schedule difference is scored; missing is not.
const differentSchedule=score(other('different',{availability:'mornings'}));
assert.equal(differentSchedule.known.availability,true);
assert.ok(differentSchedule.studyScore<absentSchedule.studyScore);
// Missing campus prevents an unsupported 100% study-compatibility reading.
const missingCampus=score(other('no-campus',{campus:''}));
assert.equal(missingCampus.known.campus,false);
assert.equal(missingCampus.studyScore,null);
assert.ok(missingCampus.categoryCoverage.study<60);
assert.equal(missingCampus.showScore,false);
// A known nonmatching module differs from an unknown module.
const unrelated=score(other('unrelated',{modules:['Mechanical Engineering']}));
assert.equal(unrelated.known.modules,true);
assert.equal(unrelated.parts.modules,0);
assert.equal(unrelated.academicScore,20);
assert.equal(unrelated.categoryCoverage.academic,100);
assert.equal(unrelated.showScore,true);
assert.ok(unrelated.score<=50);
// Academic modules alone are enough (80%) to estimate a category; missing course is excluded.
const missingCourse=score(other('no-course',{course:''}));
assert.equal(missingCourse.categoryCoverage.academic,80);
assert.equal(missingCourse.known.course,false);
assert.equal(missingCourse.showScore,true);
assert.ok(missingCourse.academicScore>0);
// Entirely unknown category cannot create artificial compatibility from campus.
const noAcademics=score(other('no-academics',{modules:[],course:''}));
assert.equal(noAcademics.categoryCoverage.academic,0);
assert.equal(noAcademics.academicScore,null);
assert.equal(noAcademics.showScore,false);
// Scores remain symmetric even when coverage is low.
for(const peer of [other('nomod',{modules:[]}),other('nocampus',{campus:''}),other('noschedule',{availability:''}),other('different',{modules:['Chemistry']})]){
 const left=score(peer),right=score(me,peer);
 assert.equal(left.score,right.score);
 assert.equal(left.categoryCoverage.academic,right.categoryCoverage.academic);
 assert.equal(left.categoryCoverage.study,right.categoryCoverage.study);
 assert.equal(left.showScore,right.showScore);
}
// On online study, knowing only the preferred format (about 58% of the
// logistics weight) must NOT create a 100% study-compatibility category.
const onlineViewer={...me,study_method:'virtual',availability:'',institution:'',campus:''};
const onlinePeer={...onlineViewer,id:'only-format',full_name:'Student Online'};
const singleFactor=score(onlinePeer,onlineViewer);
assert.equal(singleFactor.known.format,true);
assert.equal(singleFactor.known.institution,false);
assert.equal(singleFactor.known.availability,false);
assert.ok(singleFactor.categoryCoverage.study<60);
assert.equal(singleFactor.studyScore,null);
assert.equal(singleFactor.showScore,false);
assert.equal(singleFactor.score,0);
// A complete card with too little evidence invites users to inspect the missing data.
const appSource=fs.readFileSync(path.resolve(__dirname,'..','app.js'),'utf8');
assert.match(appSource,/match-pending/);
assert.match(appSource,/Not enough data to calculate a match/);
assert.match(fs.readFileSync(path.resolve(__dirname,'..','match-breakdown.js'),'utf8'),/Not enough data for an overall match/);
assert.equal(PM.MatchingV3.minimumCoverage,.60);
// Keep subject alias/partial credit behavior with evidence present.
const alias=score(other('alias',{modules:['Web Dev 3.2','Database Systems']}));
assert.ok(alias.parts.modules>0);
console.log('PASS: missing-data threshold, normalized scoring, coverage, unknown/zero distinction, symmetry and safety guards');
