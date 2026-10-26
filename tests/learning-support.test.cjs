const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{PM:{}},console};
context.window.window=context.window;context.PM=context.window.PM;
vm.createContext(context);
for(const source of ['data.js','matching.js','subject-support.js']){
 vm.runInContext(fs.readFileSync(path.join(root,source),'utf8'),context,{filename:source});
}
const PM=context.window.PM;
function student(id,modules,confident_modules,help_modules,extra={}){
 return {id,full_name:'Example Learner',institution_type:'university',institution:'Vaal University of Technology',campus:'Vanderbijlpark Campus',course:'Diploma in Information Technology',study_method:'virtual',modules,confident_modules,help_modules,...extra};
}
const me=student('a',['Database Systems','Programming'],[],['Database Systems']);
const helper=student('b',['Database Systems','Programming'],['Database Systems'],[]);
assert.deepEqual([...PM.SubjectSupport.support(helper,me).canHelp],['Database Systems']);
assert.deepEqual([...PM.SubjectSupport.support(helper,me).canReceiveHelp],[]);
assert.equal(PM.SubjectSupport.support(helper,me).mutual,false);
console.log('PASS: a student can receive help without providing help');
const partner=student('c',['Database Systems','Programming'],['Database Systems'],['Programming']);
const mutualMe=student('d',['Database Systems','Programming'],['Programming'],['Database Systems']);
assert.equal(PM.SubjectSupport.support(partner,mutualMe).mutual,true);
console.log('PASS: two-way learning when strengths and needs complement');
const incompatible=student('e',['Database Systems'],['Database Systems'],[],{study_method:'campus',institution:'University of Cape Town',campus:'Upper Campus'});
assert.equal(PM.SubjectSupport.support(incompatible,me).canHelp.length,0);
console.log('PASS: avoids recommending in-person help across incompatible locations');
const names=PM.SubjectSupport.SUBJECTS.tertiary;
assert.ok(names.includes('Web Development') && names.includes('Database Systems'));
assert.ok(PM.SubjectSupport.SUBJECTS.school.includes('Physical Sciences'));
const valid=PM.SubjectSupport.validated(['Networking','something else','NETWORKING'],['Database Systems','Networking']);
assert.deepEqual([...valid],['Networking']);
console.log('PASS: subject suggestions available and selections restricted to listed modules');
