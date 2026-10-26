/* First-time student activation: per-user Supabase progress, no marketing prompts. */
'use strict';
(() => {
 const PM=window.PM, db=PM?.backend;
 if(!PM||!db)return;
 const $=id=>document.getElementById(id);
 const route=(location.pathname.split('/').pop()||'index.html').toLowerCase();
 const allowed=new Set(['discovered_peers_at','opened_notes_at','connected_at']);
 const now=()=>new Date().toISOString();
 let owner=null, state=null, busy=false, focusBefore=null, latest=0;
 const guide={checking:false,active:false};
 PM.Onboarding=guide;
 const hasAll=s=>Boolean(s?.discovered_peers_at&&s?.opened_notes_at&&s?.connected_at);
 const stepsDone=s=>1+['discovered_peers_at','opened_notes_at','connected_at'].filter(k=>s?.[k]).length;
 guide.hasAll=hasAll;
 guide.stepsDone=stepsDone;
 const table=()=>db.requireClient().from('pm_student_onboarding');
 async function getState(){
  const {data,error}=await table().select('*').eq('user_id',owner).maybeSingle();
  if(error)throw error;
  return data||{user_id:owner};
 }
 async function saveField(field){
  if(!owner || db.identity()!==owner)return null;
  const record={user_id:owner,[field]:now()};
  const {data,error}=await table().upsert(record,{onConflict:'user_id'}).select('*').single();
  if(error)throw error;
  state=data;return data;
 }
 async function mark(field){
  if(!allowed.has(field)||!db.user)return;
  try{
   owner=db.identity();
   if(state?.[field])return;
   await saveField(field);
   paint();
  }catch(e){console.warn('Peermigo getting started progress not saved:',e.message);}
 }
 guide.mark=mark;
 function item(id,done){
  const el=$(id);if(!el)return;
  el.classList.toggle('is-done',Boolean(done));
  const ic=el.querySelector('.pm-onb-step-icon');if(ic)ic.textContent=done?'✓':({'pmOnboardingStepPeers':'1','pmOnboardingStepConnect':'2','pmOnboardingStepNotes':'3'}[id]||'✓');
  const go=el.querySelector('.pm-onb-go');if(go)go.textContent=done?'✓':'↗';
  if(done)el.setAttribute('aria-label',(el.querySelector('strong')?.textContent||'Step')+' completed');
  else el.removeAttribute('aria-label');
 }
 function paint(){
  const panel=$('pmOnboardingPanel');if(!panel||!state)return;
  const done=hasAll(state),dismissed=Boolean(state.dismissed_at);
  panel.hidden=done||dismissed;
  if(done||dismissed)return;
  const n=stepsDone(state);
  $('pmOnboardingCount').textContent=n+' of 4';
  $('pmOnboardingBar').style.width=(n/4*100)+'%';
  item('pmOnboardingStepPeers',state.discovered_peers_at);
  item('pmOnboardingStepConnect',state.connected_at);
  item('pmOnboardingStepNotes',state.opened_notes_at);
 }
 function closeDialog(){
  const modal=$('pmOnboardingModal');if(!modal||modal.hidden)return;
  modal.hidden=true;
  document.body.classList.remove('pm-onb-modal-open');
  guide.active=false;
  if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
 }
 function showDialog(firstName){
  const modal=$('pmOnboardingModal');if(!modal)return;
  focusBefore=document.activeElement;
  $('pmOnboardingName').textContent=firstName||'student';
  modal.hidden=false;
  guide.active=true;
  document.body.classList.add('pm-onb-modal-open');
  $('pmOnboardingClose').focus({preventScroll:true});
 }
 async function dismiss(){
  if(busy||!db.user||!owner)return;
  busy=true;
  const controls=[$('pmOnboardingHide'),$('pmOnboardingDismiss')].filter(Boolean);
  controls.forEach(el=>el.disabled=true);
  try{await saveField('dismissed_at');paint();closeDialog();}
  catch(error){console.warn('Could not dismiss getting-started guide:',error.message);
   // Stay dismissible during a temporary network interruption; try again later.
   closeDialog();const panel=$('pmOnboardingPanel');if(panel)panel.hidden=true;
  }finally{busy=false;controls.forEach(el=>el.disabled=false);}
 }
 guide.dismiss=dismiss;
 function events(){
  $('pmOnboardingClose')?.addEventListener('click',closeDialog);
  $('pmOnboardingLater')?.addEventListener('click',closeDialog);
  $('pmOnboardingHide')?.addEventListener('click',dismiss);
  $('pmOnboardingDismiss')?.addEventListener('click',dismiss);
  $('pmOnboardingModal')?.addEventListener('click',e=>{if(e.target===$('pmOnboardingModal'))closeDialog();});
  $('pmOnboardingModal')?.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeDialog();return;}
   if(e.key!=='Tab')return;
   const nodes=[...$('pmOnboardingModal').querySelectorAll('a[href],button:not([disabled])')].filter(el=>el.getClientRects().length);
   if(!nodes.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
 }
 async function checkExistingConnection(){
  if(!owner||state?.connected_at)return;
  try{
   const {data,error}=await db.requireClient().from('connection_requests')
     .select('id,sender_id,recipient_id,status')
     .or(`sender_id.eq.${owner},recipient_id.eq.${owner}`)
     .in('status',['pending','accepted']).limit(30);
   if(error)throw error;
   if((data||[]).some(row=>row.sender_id===owner || row.status==='accepted'))await mark('connected_at');
  }catch(e){console.warn('Connection progress could not be checked:',e.message);}
 }
 async function begin(){
  const request=++latest;
  if(!db.user){closeDialog();$('pmOnboardingPanel')&&($('pmOnboardingPanel').hidden=true);return;}
  guide.checking=true;
  owner=db.identity();
  try{
   state=await getState();
   if(request!==latest||!db.user||owner!==db.identity())return;
   if(route==='matches.html'||route==='search.html'){
    if(!state.discovered_peers_at)await mark('discovered_peers_at');
   }else if(route==='notes.html'){
    if(!state.opened_notes_at)await mark('opened_notes_at');
   }else if(route==='index.html'){
    // The welcome dialog appears only once per student; don't display again on reload/sign-in.
    await checkExistingConnection();
    if(!state.welcome_seen_at&&!state.dismissed_at&&!hasAll(state)){
     // Save first: navigation/reload after a click will not replay the popup.
     const me=await db.profile();
     if(request!==latest||!db.user||owner!==db.identity())return;
     await saveField('welcome_seen_at');
     const name=(me?.given_names||me?.full_name||'student').trim().split(/\s+/)[0];
     showDialog(name);
    }
    paint();
   }
  }catch(error){console.warn('Peermigo getting-started unavailable:',error.message);}
  finally{if(request===latest)guide.checking=false;}
 }
 // Track a real request only after the backend confirms a successful write.
 if(typeof db.sendConnectionRequest==='function'){
  const send=db.sendConnectionRequest;
  db.sendConnectionRequest=async function(...args){const result=await send.apply(this,args);void mark('connected_at');return result;};
 }
 if(typeof db.respondConnectionRequest==='function'){
  const respond=db.respondConnectionRequest;
  db.respondConnectionRequest=async function(...args){const result=await respond.apply(this,args);if(args[1]&&result)void mark('connected_at');return result;};
 }
 events();
 window.addEventListener('pm-ready',()=>{void begin();});
 window.addEventListener('pm-auth-changed',()=>{
  if(!db.user){latest++;owner=null;state=null;closeDialog();const panel=$('pmOnboardingPanel');if(panel)panel.hidden=true;guide.checking=false;}
 });
})();
