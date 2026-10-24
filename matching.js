/* Peermigo matching v2. A transparent, preference-aware heuristic.
 * No machine-learning claims, no protected characteristics, no database changes.
 * All values come from students' voluntarily supplied study details.
 */
'use strict';
window.PM = window.PM || {};
(() => {
 const PM = window.PM;
 const WEIGHTS = Object.freeze({
  virtual:{modules:50,course:15,institution:4,campus:0,availability:14,format:17},
  hybrid: {modules:43,course:14,institution:12,campus:5,availability:12,format:14},
  campus: {modules:34,course:10,institution:25,campus:15,availability:9,format:7}
 });
 const clean = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-ZA')
   .replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const unique = arr => [...new Set(arr.filter(Boolean))];
 const aliasText = raw => clean(raw)
   .replace(/\bweb dev\b/g,'web development')
   .replace(/\bsoftware dev\b/g,'software development')
   .replace(/\bmaths\b/g,'mathematics')
   .replace(/\bprograming\b/g,'programming')
   .replace(/\binfo tech\b/g,'information technology')
   .replace(/\bict\b/g,'information communication technology')
   .replace(/\bcomputer sci\b/g,'computer science')
   .replace(/\bintro to\b/g,'introduction to')
   .replace(/\bintroductory\b/g,'introduction')
   .replace(/\s+/g,' ').trim();
 // Canonicalize only established, unambiguous course abbreviations. Avoid
 // guessing that two differently numbered modules or broad subject labels match.
 const courseKey = raw => {
  let s=aliasText(raw);
  s=s.replace(/\b(bachelor of science|bsc)\b/g,'bsc')
    .replace(/\b(bachelor of commerce|bcom)\b/g,'bcom')
    .replace(/\b(diploma in|diploma of)\b/g,'diploma')
    .replace(/\b(information technology|\bit\b)\b/g,'information technology')
    .replace(/\bdegree in\b/g,'degree').replace(/\s+/g,' ').trim();
  return s;
 };
 const subjectKey = raw => aliasText(raw)
   .replace(/\b(?:module|subject)\s*:?\s*/g,'')
   .replace(/\b(semester|sem)\s+(\d+)\b/g,'semester $2')
   .replace(/\s+/g,' ').trim();
 const asModules = value => Array.isArray(value)?value:typeof value==='string'?value.split(/[,;\n]+/):[];
 const topics = value => unique(asModules(value).map(subjectKey).filter(s=>s.length>1));
 const levels = key => [...key.matchAll(/\b\d+[a-z]?\b/g)].map(m=>m[0]).sort().join(' ');
 const minorWords = new Set(['of','and','the','to','in','for','a','an','introduction','fundamentals','basic','basics']);
 const significant = key => unique(key.split(' ').filter(x=>x.length>1&&!minorWords.has(x)));
 const subjectSimilarity = (a,b) => {
  if(a===b)return 1;
  // Never equate Programming 1 and Programming 2.
  if(levels(a)!==levels(b))return 0;
  const ta=significant(a),tb=significant(b);
  if(!ta.length||!tb.length)return 0;
  const shared=ta.filter(t=>tb.includes(t)).length;
  const similarity=shared/Math.max(ta.length,tb.length);
  // Exact topic wording with a redundant qualifier can be a strong match.
  return similarity>=0.8 && shared>=2 ? similarity*0.9 : 0;
 };
 const sharedTopics = (a,b) => {
  const aa=topics(a),bb=topics(b),usedA=new Set(),usedB=new Set(),matches=[];
  const possible=[];
  aa.forEach((x,i)=>bb.forEach((y,j)=>{
   const similarity=subjectSimilarity(x,y);
   if(similarity>=0.72)possible.push({x,y,i,j,similarity});
  }));
  // Best one-to-one matches first: prevents repeated or near-duplicate module
  // names artificially inflating scores and keeps the measure symmetric.
  possible.sort((x,y)=>y.similarity-x.similarity||x.x.localeCompare(y.x)||x.y.localeCompare(y.y));
  for(const option of possible){
   if(usedA.has(option.i)||usedB.has(option.j))continue;
   usedA.add(option.i);usedB.add(option.j);
   matches.push({topic:option.x,peerTopic:option.y,similarity:option.similarity});
  }
  const overlap=matches.reduce((total,m)=>total+m.similarity,0);
  const ratio=aa.length&&bb.length?2*overlap/(aa.length+bb.length):0;
  const breadth=matches.length===1?0.86:1;
  return {matches,score:Math.min(1,ratio*breadth),bothProvided:aa.length>0&&bb.length>0};
 };
 const courseSimilarity=(a,b)=>{
  if(!clean(a)||!clean(b))return 0;
  const ca=courseKey(a),cb=courseKey(b);
  if(ca===cb)return 1;
  // Equivalent programme with different qualification prefix, but no
  // cross-field guesses (e.g. IT is not automatically computer science).
  const prefixes=['diploma','advanced diploma','higher certificate','bsc','bcom','degree','bachelor','national diploma'];
  const strip=s=>{let k=s;for(const prefix of prefixes){if(k.startsWith(prefix+' ')){k=k.slice(prefix.length+1);break;}}return k;};
  if(strip(ca)===strip(cb)&&strip(ca).length>=12)return 0.7;
  return 0;
 };
 const compatibleFormats=(a,b)=>!a||!b||a===b||a==='hybrid'||b==='hybrid';
 const formatScore=(a,b)=>!a||!b?0:a===b?1:(a==='hybrid'||b==='hybrid')?0.72:0;
 const studyWeights=(a,b)=>{
  const chosen=[a,b].filter(f=>WEIGHTS[f]);
  if(!chosen.length)return WEIGHTS.hybrid;
  const keys=Object.keys(WEIGHTS.hybrid),out={};
  for(const key of keys)out[key]=chosen.reduce((sum,f)=>sum+WEIGHTS[f][key],0)/chosen.length;
  return out;
 };
 const availabilityScore=(a,b)=>{
  if(!a||!b)return 0;
  if(a===b)return a==='flexible'?0.82:1;
  if(a==='flexible'||b==='flexible')return 0.78;
  return 0;
 };
 const validName=p=>Boolean(p?.full_name&&!/^Student [0-9a-f]{6}$/i.test(p.full_name));
 PM.matchDetails=(peer,me)=>{
  const empty={score:0,eligible:false,showScore:false,reason:'Insufficient profile information',sharedModules:[],signals:[],formatCompatible:true};
  if(!me||!peer || (peer.id && me.id && peer.id===me.id))return empty;
  // School subjects and tertiary modules are not equivalent study levels.
  const aType=clean(me.institution_type),bType=clean(peer.institution_type);
  const schoolMismatch=(aType==='school')!==(bType==='school');
  if(aType&&bType&&schoolMismatch)return {...empty,reason:'Different study levels'};
  if(!compatibleFormats(me.study_method,peer.study_method))
   return {...empty,reason:'Different preferred study formats',formatCompatible:false};
  const inst=Boolean(me.institution&&peer.institution && PM.institutionKey(me.institution)===PM.institutionKey(peer.institution));
  const campus=Boolean(inst&&me.campus&&peer.campus&&PM.campusKey(me.campus)===PM.campusKey(peer.campus));
  const modules=sharedTopics(me.modules,peer.modules);
  let course=courseSimilarity(me.course,peer.course);
  // Different school grades should not get the same-course benefit.
  if(aType==='school'&&bType==='school'&&clean(me.course)!==clean(peer.course))course=0;
  const academic=modules.matches.length>0 || course>0;
  const differentSchoolGrades=aType==='school'&&bType==='school'&&me.course&&peer.course
   &&/^grade [0-9]+$/i.test(clean(me.course))&&/^grade [0-9]+$/i.test(clean(peer.course))
   &&clean(me.course)!==clean(peer.course);
  const weights=studyWeights(me.study_method,peer.study_method);
  const schedule=availabilityScore(me.availability,peer.availability);
  const fmt=formatScore(me.study_method,peer.study_method);
  const parts={modules:modules.score*weights.modules,course:course*weights.course,
   institution:(inst?1:0)*weights.institution,campus:(campus?1:0)*weights.campus,
   availability:schedule*weights.availability,format:fmt*weights.format};
  let score=Math.round(Object.values(parts).reduce((s,n)=>s+n,0));
  // A percentage is a heuristic based on available fields, never a probability.
  score=Math.max(0,Math.min(100,score));
  // Logistics without a common subject/course cannot be a strong study match.
  // This also keeps academically relevant peers ahead of unrelated classmates
  // in the highest-match-first directory, not only in Recommendations.
  if(!academic)score=Math.min(score,29);
  if(differentSchoolGrades)score=Math.min(score,19);
  const signals=[];
  if(modules.matches.length)signals.push(`${modules.matches.length} shared subject${modules.matches.length===1?'':'s'}`);
  if(course)signals.push(course===1?'Same course':'Related course');
  if(inst)signals.push('Same institution');
  if(campus)signals.push('Same campus');
  if(schedule)signals.push('Compatible availability');
  if(fmt)signals.push('Compatible study format');
  const enough=Boolean((me.course||topics(me.modules).length)&&(peer.course||topics(peer.modules).length));
  const showScore=validName(peer)&&enough&&Boolean(me.institution||me.course||topics(me.modules).length)
   &&Boolean(peer.institution||peer.course||topics(peer.modules).length);
  // Requirements for a recommendation: academic relevance, workable study
  // format, meaningful score and available profile. Mere institution alone
  // never qualifies someone as a study partner.
  const eligible=showScore&&academic&&!differentSchoolGrades&&score>=35;
  return {score,eligible,showScore,reason:signals.slice(0,3).join(' · ')||'Limited shared details',
   sharedModules:modules.matches.map(m=>m.topic),signals,parts,formatCompatible:true};
 };
 PM.scoreStudentMatch=(peer,me)=>PM.matchDetails(peer,me).score;
 PM.displayStudentMatch=(peer,me)=>{
  const match=PM.matchDetails(peer,me);
  return match.showScore?match.score:0;
 };
 PM.MatchingV2={version:'2.0.0',weights:WEIGHTS,subjectKey,courseKey,sharedTopics};
})();
