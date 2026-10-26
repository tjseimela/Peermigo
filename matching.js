/* Peermigo matching v4.1. Evidence-aware academic and study compatibility heuristic.
 * We never infer protected traits; score is not a probability.
 * On-campus recommendations require the same institution and confirmed campus.
 * Academic relevance always matters; availability has minimal influence.
 */
'use strict';
window.PM = window.PM || {};
(() => {
 const PM = window.PM;
 // Each context always devotes 70 points to academic relevance (80% modules,
 // 20% course) and 30 points to meeting feasibility. Keep availability <= 4
 // points, even for online students where schedule historically had greater weight.
 const ACADEMIC_WEIGHT=70, STUDY_WEIGHT=30, MIN_COVERAGE=0.60;
 const isPresent = value => String(value ?? '').trim().length > 0;
 const ACADEMIC_PARTS=Object.freeze({modules:56,course:14});
 const studyWeights = (institution,campus,format,availability) => {
  const reservedAvailability = Math.min(4, STUDY_WEIGHT*availability/(institution+campus+format+availability));
  const othersTotal = institution+campus+format;
  const share = (value) => othersTotal? (STUDY_WEIGHT-reservedAvailability)*value/othersTotal:0;
  return Object.freeze({modules:ACADEMIC_PARTS.modules,course:ACADEMIC_PARTS.course,
    institution:share(institution),campus:share(campus),format:share(format),availability:reservedAvailability});
 };
 const WEIGHTS = Object.freeze({
  online:studyWeights(4,0,8,4),
  hybrid:studyWeights(8,6,5,4),
  campus:studyWeights(8,20,2,4)
 });
 const clean = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-ZA')
   .replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const unique = arr => [...new Set(arr.filter(Boolean))];
 const aliasText = raw => clean(raw)
   .replace(/\bweb dev\b/g,'web development')
   .replace(/\bsoftware dev\b/g,'software development')
   .replace(/\b(?:maths|math|mathematics)\s+lit(?:eracy)?\b/g,'mathematical literacy')
   .replace(/\bmathematics literacy\b/g,'mathematical literacy')
   .replace(/\b(?:maths|math)\b/g,'mathematics')
   .replace(/\bit\b/g,'information technology')
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
 const labeledTopics = value => {
  const seen=new Set();
  return asModules(value).map(v=>({key:subjectKey(v),raw:String(v??'').trim()}))
   .filter(item=>{if(item.key.length<=1||seen.has(item.key))return false;seen.add(item.key);return true;});
 };
 // Preserve meaningful module numbering (3.2 -> [3,2]) separately from
 // the subject title. A missing level is not an exact course match.
 const parseSubject = key => {
  const s=subjectKey(key);
  const match=s.match(/(?:^|\s)(?:(?:level|lvl|semester|sem|part|year|unit|grade)\s+)?(\d+[a-z]?(?:\s+\d+[a-z]?)?)$/);
  const title=(match?s.slice(0,match.index):s).trim();
  const level=match?match[1].split(/\s+/).filter(Boolean):[];
  return {title,level};
 };
 const minorWords = new Set(['of','and','the','to','in','for','a','an','introduction','fundamentals','basic','basics']);
 const significant = key => unique(key.split(' ').filter(x=>x.length>1&&!minorWords.has(x)));
 const sameLevel = (a,b) => a.length===b.length && a.every((v,i)=>v===b[i]);
 const levelFactor = (a,b) => {
  if(sameLevel(a,b))return {factor:1,kind:'exact'};
  if(!a.length||!b.length)return {factor:0.68,kind:'missing-level'};
  // Same year/major but unknown minor level ("Web Development 3" vs "3.2").
  if(a[0]===b[0]&&a.length!==b.length&&a.slice(0,Math.min(a.length,b.length))
    .every((v,i)=>v===b[i]))return {factor:0.62,kind:'missing-level'};
  // Different parts in the same year may cover related material but are NOT equal.
  if(a.length>1&&b.length>1&&a[0]===b[0]&&a[1]!==b[1])return {factor:0.26,kind:'different-part'};
  // Programming 1 and Programming 2, or 2.2 vs 3.2, should not count.
  return {factor:0,kind:'different-level'};
 };
 const subjectSimilarity = (a,b) => {
  const pa=parseSubject(a),pb=parseSubject(b);
  if(!pa.title||!pb.title)return {similarity:0,kind:'unrelated'};
  const levels=levelFactor(pa.level,pb.level);
  if(!levels.factor)return {similarity:0,kind:levels.kind};
  let titleScore=0;
  if(pa.title===pb.title){titleScore=1;}
  else{
   const ta=significant(pa.title),tb=significant(pb.title);
   const shared=ta.filter(t=>tb.includes(t)).length;
   const ratio=shared/Math.max(ta.length,tb.length,1);
   const subset=shared===Math.min(ta.length,tb.length);
   // Two distinctive words must overlap; do not infer similarity from a generic
   // term ("Science", "Systems", "Management", etc.) alone.
   if(shared>=2&&ratio>=0.8)titleScore=0.9*ratio;
   else if(shared>=2&&subset&&ratio>=0.6)titleScore=0.7*ratio;
  }
  const similarity=Number((titleScore*levels.factor).toFixed(4));
  const kind=levels.kind==='different-part'?'different-part':
    levels.kind==='missing-level'?'missing-level':
    titleScore===1?'exact':'related-title';
  return {similarity,kind};
 };
 const codeKey=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('en-ZA').trim().replace(/\s+/g,' ');
 const normalCode=x=>String(x||'').normalize('NFKC').trim().toLocaleUpperCase('en-ZA').replace(/[^\p{L}\p{N}]/gu,'');
 const sharedTopics = (a,b,context={}) => {
  const aa=labeledTopics(a),bb=labeledTopics(b),usedA=new Set(),usedB=new Set(),matches=[];
  const possible=[];
  const courseA=isPresent(context.courseA)?context.courseA:'',courseB=isPresent(context.courseB)?context.courseB:'';
  const coursesKnown=Boolean(courseA&&courseB);
  const coursesSimilar=coursesKnown?courseSimilarity(courseA,courseB):null;
  const institutionA=context.institutionA||'',institutionB=context.institutionB||'';
  const sameInstitution=Boolean(institutionA&&institutionB&&PM.institutionKey(institutionA)===PM.institutionKey(institutionB));
  const institutionsKnown=Boolean(institutionA&&institutionB);
  const codesA=context.codesA&&typeof context.codesA==='object'?context.codesA:{};
  const codesB=context.codesB&&typeof context.codesB==='object'?context.codesB:{};
  aa.forEach((x,i)=>bb.forEach((y,j)=>{
   const base=subjectSimilarity(x.key,y.key);
   if(base.similarity<0.2)return;
   const codeA=String(codesA[codeKey(x.raw)]||'').trim(),codeB=String(codesB[codeKey(y.raw)]||'').trim();
   const codesKnown=Boolean(codeA&&codeB),sameCode=codesKnown&&normalCode(codeA)===normalCode(codeB);
   let factor=1,contextKind='name-only';
   if(codesKnown&&sameInstitution&&sameCode){contextKind='shared-code';}
   else if(codesKnown&&sameInstitution&&!sameCode){factor=0.45;contextKind='different-code';}
   else if(coursesKnown&&coursesSimilar===0){factor=sameInstitution?0.60:0.48;contextKind='different-course';}
   else if(coursesKnown&&coursesSimilar>0&&coursesSimilar<1){factor=0.85;contextKind='related-course';}
   else if(coursesKnown&&coursesSimilar===1&&institutionsKnown&&!sameInstitution){factor=0.88;contextKind='different-institution';}
   else if(!coursesKnown){contextKind='course-unknown';}
   else if(codesKnown&&!sameCode){factor=0.82;contextKind='different-code-cross-institution';}
   else if(codesKnown&&sameCode&&!sameInstitution){factor=0.90;contextKind='shared-code-cross-institution';}
   else contextKind='matching-course';
   const similarity=Number((base.similarity*factor).toFixed(4));
   if(similarity>=0.2)possible.push({x,y,i,j,similarity,kind:base.kind,contextKind,codeA,codeB});
  }));
  possible.sort((x,y)=>y.similarity-x.similarity||x.x.key.localeCompare(y.x.key)||x.y.key.localeCompare(y.y.key));
  for(const option of possible){
   if(usedA.has(option.i)||usedB.has(option.j))continue;
   usedA.add(option.i);usedB.add(option.j);
   matches.push({topic:option.x.raw,peerTopic:option.y.raw,similarity:option.similarity,kind:option.kind,
    contextKind:option.contextKind,codeA:option.codeA,codeB:option.codeB});
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
 const modeOf=value=>{
  const v=clean(value);
  if(v==='virtual'||v==='online')return 'virtual';
  if(v==='campus'||v==='on campus'||v==='in person')return 'campus';
  if(v==='hybrid'||v==='both')return 'hybrid';
  return '';
 };
 const compatibleFormats=(a,b)=>!a||!b||a===b||a==='hybrid'||b==='hybrid';
 const formatScore=(a,b)=>!a||!b?0:a===b?1:(a==='hybrid'||b==='hybrid')?0.85:0;
 const contextFor=(a,b)=>a==='campus'||b==='campus'?'campus':a==='hybrid'&&b==='hybrid'?'hybrid':'online';
 const availabilityScore=(a,b)=>{
  if(!a||!b)return 0.5; // Unspecified schedule is unknown, not incompatible.
  if(a===b)return a==='flexible'?0.9:1;
  if(a==='flexible'||b==='flexible')return 0.9;
  return 0.25; // Even different preferred times can be negotiated.
 };
 const validName=p=>Boolean(p?.full_name&&!/^Student [0-9a-f]{6}$/i.test(p.full_name));
 PM.matchDetails=(peer,me)=>{
  const empty={score:0,eligible:false,showScore:false,reason:'Insufficient profile information',sharedModules:[],signals:[],formatCompatible:true};
  if(!me||!peer||(peer.id&&me.id&&peer.id===me.id))return empty;
  const aType=clean(me.institution_type),bType=clean(peer.institution_type);
  // Don't mix school and tertiary levels, even if subject names happen to match.
  if(aType&&bType&&(aType==='school')!==(bType==='school'))
    return {...empty,reason:'Different study levels'};
  const aMode=modeOf(me.study_method),bMode=modeOf(peer.study_method);
  if(!compatibleFormats(aMode,bMode))return {...empty,reason:'Different preferred study formats',formatCompatible:false};
  const sameInstitution=Boolean(me.institution&&peer.institution&&PM.institutionKey(me.institution)===PM.institutionKey(peer.institution));
  const bothCampuses=Boolean(me.campus&&peer.campus);
  // Campus names can be identical at unrelated institutions. They never count alone.
  const sameCampus=Boolean(sameInstitution&&bothCampuses&&PM.campusKey(me.campus)===PM.campusKey(peer.campus));
  const subjects=sharedTopics(me.modules,peer.modules,{courseA:me.course,courseB:peer.course,institutionA:me.institution,institutionB:peer.institution,codesA:me.module_codes,codesB:peer.module_codes});
  const subjectEvidence=!subjects.bothProvided?'unknown':subjects.matches.length?'overlap':'none';
  let course=courseSimilarity(me.course,peer.course);
  if(aType==='school'&&bType==='school'&&clean(me.course)!==clean(peer.course))course=0;
  const gradeMismatch=aType==='school'&&bType==='school'&&/^grade \d+$/i.test(clean(me.course))
    &&/^grade \d+$/i.test(clean(peer.course))&&clean(me.course)!==clean(peer.course);
  const academic=Boolean(subjects.matches.length||course>0);
  const context=contextFor(aMode,bMode);
  const weights=WEIGHTS[context];
  const hasInstitution=isPresent(me.institution)&&isPresent(peer.institution);
  const isSchool=aType==='school'&&bType==='school';
  // Missing values are UNKNOWN, never evidence of a mismatch. For school
  // learners, the same school can stand in for a physical campus.
  const known={
    modules:subjects.bothProvided,
    course:isPresent(me.course)&&isPresent(peer.course),
    institution:hasInstitution,
    campus:isSchool?hasInstitution:(hasInstitution&&bothCampuses),
    format:Boolean(aMode&&bMode),
    availability:isPresent(me.availability)&&isPresent(peer.availability)
  };
  const schedule=known.availability?availabilityScore(clean(me.availability),clean(peer.availability)):0;
  const fmt=known.format?formatScore(aMode,bMode):0;
  const locationVerified=sameInstitution&&(sameCampus||isSchool);
  const parts={modules:subjects.score*weights.modules,course:course*weights.course,
    institution:(sameInstitution?1:0)*weights.institution,
    campus:(context==='campus'?(locationVerified?1:0):sameCampus?1:0)*weights.campus,
    format:fmt*weights.format,
    availability:schedule*weights.availability};
  const sumKnown = keys => keys.reduce((total,k)=>total+(known[k]?weights[k]:0),0);
  const academicKnown=sumKnown(['modules','course']);
  const studyKnown=sumKnown(['institution','campus','format','availability']);
  const academicCoverage=academicKnown/ACADEMIC_WEIGHT;
  const studyCoverage=studyKnown/STUDY_WEIGHT;
  const academicReady=academicCoverage+1e-9>=MIN_COVERAGE;
  const studyReady=studyCoverage+1e-9>=MIN_COVERAGE;
  const academicPoints=parts.modules+parts.course;
  const studyPoints=parts.institution+parts.campus+parts.format+parts.availability;
  // Normalize only compared factors, keeping categories at 70% / 30%.
  // Do not display a numeric category or overall value if its evidence is thin.
  const academicRate=academicReady?academicPoints/academicKnown:null;
  const studyRate=studyReady?studyPoints/studyKnown:null;
  const academicScore=academicReady?Math.round(100*academicRate):null;
  const studyScore=studyReady?Math.round(100*studyRate):null;
  const overallReady=academicReady&&studyReady;
  let score=overallReady?Math.round(ACADEMIC_WEIGHT*academicRate+STUDY_WEIGHT*studyRate):0;
  score=Math.max(0,Math.min(100,score));
  let scoreCapped=false;
  if(overallReady){
    // Hard guards still apply when the available evidence shows incompatibility.
    if(!academic&&score>29){score=29;scoreCapped=true;}
    if(gradeMismatch&&score>19){score=19;scoreCapped=true;}
    if(context==='campus'&&!locationVerified&&score>44){score=44;scoreCapped=true;}
  }
  const subjectsCount=subjects.matches.length;
  const signals=[];
  const exactCount=subjects.matches.filter(m=>m.kind==='exact'&&m.similarity===1).length;
  const relatedCount=subjectsCount-exactCount;
  if(exactCount)signals.push(`${exactCount} shared subject${exactCount===1?'':'s'}`);
  if(relatedCount)signals.push(`${relatedCount} similar subject${relatedCount===1?'':'s'}`);
  if(course)signals.push(course===1?'Same course':'Related course');
  if(sameCampus)signals.push('Same campus');
  else if(sameInstitution)signals.push('Same institution');
  if(aMode&&bMode)signals.push('Compatible study format');
  if(known.availability&&schedule>=0.9)signals.push('Similar availability');
  const enough=Boolean((me.course||topics(me.modules).length)&&(peer.course||topics(peer.modules).length));
  const showScore=validName(peer)&&enough&&overallReady;
  const insufficientData=!overallReady;
  const overallCoverage=Math.round(100*(ACADEMIC_WEIGHT*academicCoverage+STUDY_WEIGHT*studyCoverage)/100);
  const categoryCoverage={academic:Math.round(100*academicCoverage),study:Math.round(100*studyCoverage)};
  const eligible=showScore&&academic&&!gradeMismatch&&Boolean(aMode&&bMode)&&score>=45
    &&(context!=='campus'||locationVerified);
  const reason=insufficientData?'Not enough matching information yet':!academic?'No shared course or subjects':context==='campus'&&!locationVerified
    ?(sameInstitution?'Different or unconfirmed campuses':'Different institutions for on-campus study')
    :signals.slice(0,3).join(' · ')||'Limited shared details';
  return {score,eligible,showScore,insufficientData,overallReady,overallCoverage,categoryCoverage,known,scoreCapped,minimumCoverage:60,reason,academicScore,studyScore,academicWeight:ACADEMIC_WEIGHT,studyWeight:STUDY_WEIGHT,subjectEvidence,
    sharedModules:subjects.matches.filter(m=>m.kind==='exact'&&m.similarity===1).map(m=>m.topic),
    moduleMatches:subjects.matches,
    signals,parts,formatCompatible:true,studyContext:context,locationVerified};
 };
 PM.scoreStudentMatch=(peer,me)=>PM.matchDetails(peer,me).score;
 PM.displayStudentMatch=(peer,me)=>{
  const match=PM.matchDetails(peer,me);
  return match.showScore?match.score:0;
 };
 PM.MatchingV3={version:'4.2.0',weights:WEIGHTS,minimumCoverage:MIN_COVERAGE,academicWeight:ACADEMIC_WEIGHT,studyWeight:STUDY_WEIGHT,subjectKey,courseKey,sharedTopics,contextFor};
 // Compatibility alias for existing directory filters and third-party widgets.
 PM.MatchingV2=PM.MatchingV3;
})();
