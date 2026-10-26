'use strict';
/* Personal profile-completion nudges. No push/SMS/email service; no notification records. */
(() => {
 const PM=window.PM;
 const db=PM?.backend;
 const mount=document.getElementById('pmProfileProgress');
 const isHome=(location.pathname.split('/').pop()||'index.html').toLowerCase()==='index.html';
 const waitForWelcome=()=>isHome&&Boolean(PM?.Onboarding);
 if(!PM||!db||!mount)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const snoozeDays=7;
 const snoozeMs=snoozeDays*24*60*60*1000;
 const now=()=>Date.now();
 let overlay=null,previousFocus=null,reminderStamped=false;
 const userKey=()=>`pm.profile-reminder.v1.${db.identity()}`;
 const cardKey=()=>`pm.profile-banner-closed.v1.${db.identity()}`;
 const safeStorage=(which,op,key,value)=>{
   try{const store=which==='session'?sessionStorage:localStorage;if(op==='get')return store.getItem(key);if(op==='set')store.setItem(key,value);if(op==='remove')store.removeItem(key);}catch{/* Private browsing/disabled storage: do not break the website. */}
   return null;
 };
 const completeLink=missing=>{
  const key=missing?.[0]?.key;
  const focusId={photo:'avatarForm',name:'studentName',institution:'institutionName',course:'course',modules:'modules',format:'studyMethod',availability:'availability',about:'about'}[key]||'profileForm';
  return 'profile.html#'+focusId;
 };
 function closeDialog(preempted=false){
  if(!overlay)return;
  if(preempted&&reminderStamped)safeStorage('local','remove',userKey());
  reminderStamped=false;
  overlay.remove();overlay=null;
  document.body.classList.remove('pm-profile-reminder-open');
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function makeDialog(status){
  if(overlay||status.complete||PM.Onboarding?.checking||PM.Onboarding?.active)return;
  const key=userKey();
  const last=Number(safeStorage('local','get',key))||0;
  if(last&&now()-last<snoozeMs)return;
  safeStorage('local','set',key,String(now()));
  reminderStamped=true;
  previousFocus=document.activeElement;
  overlay=document.createElement('div');
  overlay.className='pm-profile-dialog-backdrop';
  overlay.innerHTML=`<section class="pm-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="pmReminderTitle" aria-describedby="pmReminderDesc">
   <div class="pm-profile-dialog-top"><span class="pm-profile-dialog-icon">${PM.icon('user')}</span><button type="button" class="pm-profile-close" aria-label="Close profile reminder" data-reminder-dismiss>×</button></div>
   <p class="pm-profile-eyebrow">LET'S GET YOU CONNECTED</p>
   <h2 id="pmReminderTitle">Complete your study profile</h2>
   <p id="pmReminderDesc" class="pm-profile-dialog-copy">Help other students find someone studying the same subjects. A few details are still missing from your profile.</p>
   <div class="pm-profile-meter-top"><strong>${status.percent}% complete</strong><small>${status.completed} of ${status.total} details added</small></div>
   <div class="pm-profile-meter" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${status.percent}"><span style="width:${status.percent}%"></span></div>
   <p class="pm-profile-check-title">Still to add</p>
   <ul class="pm-profile-missing">${status.missing.map(c=>`<li>${PM.icon('alert')}<span>${esc(c.label)}</span></li>`).join('')}</ul>
   <div class="pm-profile-dialog-actions"><a class="pm-profile-primary" href="${completeLink(status.missing)}">Complete profile ${PM.icon('chevron-right')}</a><button type="button" class="pm-profile-later" data-reminder-dismiss>Remind me later</button></div>
   <p class="pm-profile-footnote">We'll check again in 7 days if your profile is still incomplete.</p>
  </section>`;
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-reminder-dismiss]'))closeDialog();});
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeDialog();return;}
   if(e.key==='Tab'){
    const focusable=[...overlay.querySelectorAll('button,a[href]')].filter(x=>!x.disabled);
    if(!focusable.length)return;
    const i=focusable.indexOf(document.activeElement);
    if(e.shiftKey&&i<=0){e.preventDefault();focusable[focusable.length-1].focus();}
    else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus();}
   }
  });
  document.body.append(overlay);
  document.body.classList.add('pm-profile-reminder-open');
  overlay.querySelector('.pm-profile-close').focus({preventScroll:true});
 }
 function paintCard(status){
  if(status.complete){mount.hidden=true;mount.innerHTML='';closeDialog();safeStorage('session','remove',cardKey());return;}
  if(safeStorage('session','get',cardKey())==='1'){mount.hidden=true;return;}
  const missing=status.missing.map(x=>x.label);
  mount.innerHTML=`<div class="pm-profile-progress-head"><div class="pm-profile-progress-icon">${PM.icon('user')}</div><div class="pm-profile-progress-copy"><span class="pm-profile-eyebrow">YOUR PROFILE</span><h2>A few details make a better match</h2><p>Add ${esc(missing.slice(0,2).join(' and '))}${missing.length>2?` and ${missing.length-2} more`:''} to help students connect with you.</p></div><button type="button" class="pm-progress-dismiss" title="Hide profile progress for this visit" aria-label="Hide profile progress">×</button></div>
   <div class="pm-profile-progress-foot"><div class="pm-profile-progress-stat"><div class="pm-profile-meter-top"><strong>${status.percent}% complete</strong><small>${status.completed} / ${status.total} added</small></div><div class="pm-profile-meter" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${status.percent}"><span style="width:${status.percent}%"></span></div></div><a href="${completeLink(status.missing)}" class="pm-profile-progress-cta">Finish profile ${PM.icon('chevron-right')}</a></div>`;
  mount.querySelector('.pm-progress-dismiss').addEventListener('click',()=>{safeStorage('session','set',cardKey(),'1');mount.hidden=true;});
  mount.hidden=false;
 }
 let latestRequest=0;
 async function refresh({showPopup=false}={}){
  if(!db.user||!db.client){mount.hidden=true;closeDialog();return;}
  const request=++latestRequest;
  try{
   const profile=await db.profile();
   if(request!==latestRequest||!db.user||profile?.deactivated_at)return;
   const status=PM.profileCompletion(profile);
   paintCard(status);
   if(showPopup&&!status.complete)makeDialog(status);
  }catch(error){console.warn('Profile reminder could not check profile:',error.message);}
 }
 // On Home, wait for first-time onboarding to decide whether to display a welcome.
 // The profile prompt can otherwise win the async sign-in race and overlap it.
 window.addEventListener('pm-ready',()=>refresh({showPopup:!waitForWelcome()}));
 window.addEventListener('pm-onboarding-finished',()=>{
  if(isHome)void refresh({showPopup:!PM.Onboarding?.justWelcomed});
 });
 window.addEventListener('pm-onboarding-opened',()=>closeDialog(true));
 window.addEventListener('pm-profile-saved',()=>refresh());
 window.addEventListener('pm-profile-photo-changed',()=>refresh());
 window.addEventListener('pm-auth-changed',()=>{if(!db.user){closeDialog();mount.hidden=true;}else refresh({showPopup:!waitForWelcome()})});
})();
