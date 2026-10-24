'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const P={},env={window:{PM:P},PM:P,console};vm.createContext(env);
for(const file of ['data.js','matching.js','api.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),env,{filename:file});
const uuid=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const me={id:uuid(1),full_name:'Me',institution_type:'university',institution:'VUT',campus:'Vanderbijlpark',course:'Diploma in IT',modules:['Web Development 3.2','Programming 3'],study_method:'virtual',availability:'evenings'};
const make=(i,props={})=>({id:uuid(i),full_name:`Student ${i} Match`,institution_type:'university',institution:'Vaal University of Technology',campus:'Vanderbijlpark',course:'Mechanical Engineering',modules:['Physics'],study_method:'virtual',availability:'evenings',created_at:new Date(2026,0,i).toISOString(),discoverable:true,...props});
const data=[me,
 make(2), // in-person same campus, unrelated subject
 make(3,{institution:'UJ',course:'Diploma in Information Technology',modules:['Web Dev 3.2','Programming 3']}),
 make(4,{institution:'UJ',course:'Diploma in Information Technology',modules:['Web Dev 3.2','Programming 3'],discoverable:false}),
 make(5,{institution:'UJ',course:'Diploma in Information Technology',modules:['Web Dev 3.2','Programming 3']}),
 make(6,{institution:'VUT',course:'Diploma in IT',modules:['Programming 3'],study_method:'campus'}),
 ...Array.from({length:15},(_,index)=>make(index+7))];
class Query {
 constructor(rows){this.rows=rows;this.conditions=[];this.orderings=[];this.negations=[];}
 select(fields,opts){this.countType=opts?.count;return this;}
 eq(k,v){this.conditions.push(row=>row[k]===v);return this;}
 neq(k,v){this.conditions.push(row=>row[k]!==v);return this;}
 not(k,op,raw){if(k==='id') {const ids=raw.slice(1,-1).split(',');this.conditions.push(row=>!ids.includes(row.id));}return this;}
 ilike(k,v){const q=String(v).replace(/%/g,'').toLowerCase();this.conditions.push(row=>String(row[k]||'').toLowerCase().includes(q));return this;}
 or(filters){this.conditions.push(row=>{
  const names=[...String(filters).matchAll(/(full_name|institution|course|campus)\.ilike\.(?:"([^"]+)"|%([^%]+)%)/g)];
  if(!names.length)return true;
  return names.some(match=>String(row[match[1]]||'').toLowerCase().includes(String(match[2]||match[3]).toLowerCase()));
 });return this;}
 order(k,{ascending=true}={}){this.orderings.push([k,ascending]);return this;}
 async range(start,end){let result=this.rows.filter(row=>this.conditions.every(fn=>fn(row)));
   const count=result.length;
   for(const [key,asc] of this.orderings.reverse())result.sort((a,b)=>asc?String(a[key]||'').localeCompare(String(b[key]||'')):String(b[key]||'').localeCompare(String(a[key]||'')));
   return {data:result.slice(start,end+1),count,error:null};
 }
}
P.backend.client={from:table=>{assert.equal(table,'profiles');return {select:(...args)=>new Query(data).select(...args)}}};
P.backend.user={id:me.id};
(async()=>{
 const blocked=[uuid(5)];
 const rec=await P.backend.recommendedDirectoryPeers(me,blocked);
 assert.deepEqual(Array.from(rec.map(p=>p.id)),[uuid(3)]);
 console.log('PASS Recommendations: cross-university academic match included; hidden, blocked, incompatible and unrelated excluded');
 const directory=await P.backend.directoryPage({sort:'match',me,page:0,pageSize:6,excludedIds:blocked});
 assert.equal(directory.rows[0].id,uuid(3));
 assert.equal(directory.count,data.length-3);
 console.log('PASS Directory: matching ranks across entire list, with hidden/blocked/self excluded');
 const byCourse=await P.backend.directoryPage({sort:'match',me,page:0,pageSize:6,sameCourse:true,excludedIds:blocked});
 assert.equal(byCourse.count,2); // Cross-UJ equivalent course and format-incompatible VUT course
 assert.ok(byCourse.rows.some(p=>p.id===uuid(3)));
 console.log('PASS Same Course: canonicalized equivalence and accurate filtered count');
 const second=await P.backend.directoryPage({sort:'match',me,page:1,pageSize:6,excludedIds:blocked});
 assert.equal(second.rows.length,6);
 assert.notEqual(second.rows[0].id,uuid(3));
 console.log('PASS Directory pagination: page 2 excludes globally higher-ranked page 1 candidates');
 console.log('4/4 integration scenarios passed');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
