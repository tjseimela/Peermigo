const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=js.indexOf(' function peerCard(p){');
const end=js.indexOf('\n const loadFailure=',start);
assert.ok(start>=0&&end>start,'peerCard function found');
const src=js.slice(start,end);
const me={id:'viewer',help_modules:['Database Systems'],confident_modules:['Programming']};
const PM={
 formatPersonName:x=>x,formatStudyText:x=>x,
 icon:()=>'<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/></svg>',
 matchDetails:()=>({score:68,showScore:true,signals:[]}),
 ui:{avatar:name=>`<span class="pm-avatar card-avatar" style="display:flex;align-items:center;justify-content:center;background:#ded9fa;color:#5848b8;font-weight:800;font-size:18px">${name.split(/\s+/).map(x=>x[0]).slice(0,2).join('')}</span>`},
 SubjectSupport:{support:(peer,viewer)=>{
   const norm=x=>String(x).trim().toLowerCase();
   const canHelp=(peer.confident_modules||[]).filter(x=>(viewer.help_modules||[]).some(y=>norm(x)===norm(y)));
   const canReceiveHelp=(peer.help_modules||[]).filter(x=>(viewer.confident_modules||[]).some(y=>norm(x)===norm(y)));
   return {canHelp,canReceiveHelp,mutual:canHelp.length>0&&canReceiveHelp.length>0};
 }},
 connectionAction:()=>({state:'none',label:'Connect',disabled:false}),
};
const db={connectionWith:()=>null,identity:()=>me.id};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={PM,db,meCache:me,connectionRows:[],esc};
vm.createContext(context);
const peerCard=vm.runInContext(`(()=>{${src};return peerCard;})()`,context);
const id='11111111-1111-4111-8111-111111111111';
const base={id,full_name:'Example Student',institution_type:'university',institution:'Vaal University of Technology',course:'Information Technology',campus:'Vanderbijlpark',study_method:'hybrid',availability:'flexible',modules:['Database Systems','Programming'],confident_modules:['Database Systems'],help_modules:['Programming'],about:'Study buddy',is_verified:false};
const relevant=peerCard(base);
assert.match(relevant,/class="peer-card peer-card-v2 directory-card has-support-match"/);
assert.match(relevant,/pm-support-badge is-mutual/);
assert.match(relevant,/Mutual learning/);
assert.ok(relevant.indexOf('pm-support-badge')<relevant.indexOf('directory-expandable'),'badge visible while folded');
assert.ok(relevant.indexOf('pm-card-learning-expanded')>relevant.indexOf('directory-expandable'),'full learning subjects appear only inside expanded card');
assert.ok(!relevant.includes('pm-card-learning-overview'),'no always-visible list in compact cards');
assert.equal((relevant.match(/pm-support-badge/g)||[]).length,1,'single support badge');
assert.match(relevant,/Confident in \/ can help with/);
assert.match(relevant,/Needs help with/);
const supportOnly=peerCard({...base,help_modules:[]});
assert.match(supportOnly,/✓ Can help you with/);
assert.ok(!supportOnly.includes('Mutual learning'));
const irrelevant=peerCard({...base,confident_modules:['Networking'],help_modules:['Mathematics']});
assert.ok(!irrelevant.includes('pm-support-badge'),'no support badge when needs do not match');
assert.ok(!irrelevant.includes('has-support-match'),'no support-specific mobile row when unmatched');
assert.ok(irrelevant.includes('pm-card-learning-expanded'),'unmatched details remain available when expanded');
assert.ok(irrelevant.indexOf('pm-card-learning-expanded')>irrelevant.indexOf('directory-expandable'));
const empty=peerCard({...base,confident_modules:[],help_modules:[]});
assert.ok(!empty.includes('pm-card-learning-expanded'),'empty profiles not cluttered');
assert.ok(!empty.includes('pm-support-badge'));
const malicious=peerCard({...base,confident_modules:['<img src=x onerror=alert(1)>']});
assert.ok(!malicious.includes('<img src=x onerror=alert(1)>'),'student-supplied names escaped');
assert.match(malicious,/&lt;img/);
assert.match(fs.readFileSync(path.join(root,'features.js'),'utf8'),/LEARNING SUPPORT/,'full student profile has learning section');
const css=fs.readFileSync(path.join(root,'subject-support.css'),'utf8');
assert.match(css,/\.directory-card\.has-support-match \.peer-card-actions\{grid-row:3\}/,'compact mobile actions shift only when a support badge exists');
console.log('PASS: conditional badge for collapsed cards, complete expanded and full-profile learning details.');
module.exports={peerCard,base,PM,me};
