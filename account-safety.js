/* Account settings and blocked-student management; uses existing Supabase session. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => window.PM?.backend;
  const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
  function status(node,message,error=false){
    if(!node)return;
    node.textContent=message;
    node.classList.toggle('pm-error',error);
  }
  async function withSubmit(form,task){
    const button=form.querySelector('[type="submit"]');
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{await task()}finally{if(button)button.disabled=false}
  }
  function initials(name){
    const text=String(name||'Student').trim();
    return text.split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()||'S';
  }
  async function showBlocked(){
    const list=$('pmBlockedList');if(!list)return;
    list.textContent='Loading blocked students…';
    try{
      const rows=await db().blockedProfiles();
      list.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.className='pm-empty-blocks';empty.textContent="No blocked students.";list.append(empty);return;}
      for(const record of rows){
        const id=record.blocked_id;
        if(!UUID.test(id))continue;
        const profile=record.profile;
        const row=document.createElement('div');row.className='pm-block-row';
        const avatar=document.createElement('span');avatar.className='pm-block-avatar';avatar.textContent=initials(profile?.full_name);
        const copy=document.createElement('div');copy.className='pm-block-detail';
        const name=document.createElement('strong');name.textContent=PM.formatPersonName(profile?.full_name)||'Profile unavailable';
        const detail=document.createElement('small');detail.textContent=profile?.institution||'This student is blocked from messaging you.';
        copy.append(name,detail);
        const unblock=document.createElement('button');unblock.type='button';unblock.className='pm-unblock-btn';unblock.textContent='Unblock';
        unblock.setAttribute('aria-label',`Unblock ${profile?.full_name||'this student'}`);
        unblock.addEventListener('click',async()=>{
          if(!await PMDialogs.confirm(`They will be able to message you again.`,{title:`Unblock ${profile?.full_name||'this student'}?`,confirmText:'Unblock'}))return;
          unblock.disabled=true;unblock.textContent='Unblocking…';
          try{await db().unblockPeer(id);row.remove();if(!list.querySelector('.pm-block-row'))await showBlocked();}
          catch(e){status(detail,e.message,true);unblock.disabled=false;unblock.textContent='Unblock';}
        });
        row.append(avatar,copy,unblock);list.append(row);
        if(profile?.avatar_path){
          db().avatarUrl(profile.avatar_path).then(url=>{
            if(!url||!avatar.isConnected)return;
            const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';
            img.addEventListener('error',()=>{img.remove();avatar.textContent=initials(profile?.full_name);},{once:true});
            avatar.replaceChildren(img);
          }).catch(()=>{});
        }
      }
    }catch(e){list.replaceChildren();const err=document.createElement('p');err.className='pm-empty-blocks';err.textContent='Could not load blocked students: '+e.message;list.append(err);}
  }
  async function initialize(){
    if(!db()?.user)return;
    if($('pmBlockedList')&&!initialize.blockedDone){initialize.blockedDone=true;await showBlocked();}
    if(!document.getElementById('pmEmailForm'))return;
    if(initialize.done)return;
    initialize.done=true;
    const user=db().user;
    $('pmCurrentEmail').value=user.email||'';
    $('pmEmailForm').addEventListener('submit',e=>{
      e.preventDefault();if(!e.currentTarget.reportValidity())return;
      withSubmit(e.currentTarget,async()=>{
        const email=$('pmNewEmail').value.trim().toLowerCase();
        if(email===(db().user?.email||'').toLowerCase()){status($('pmEmailStatus'),'Please enter a different email address.',true);return;}
        try{await db().requestEmailChange(email);status($('pmEmailStatus'),'Confirmation sent. Check your email to finish updating your address.');$('pmNewEmail').value='';}
        catch(error){status($('pmEmailStatus'),error.message,true);}
      });
    });
    $('pmPasswordForm').addEventListener('submit',e=>{
      e.preventDefault();if(!e.currentTarget.reportValidity())return;
      withSubmit(e.currentTarget,async()=>{
        const old=$('pmCurrentPassword').value, password=$('pmNewPassword').value, confirmation=$('pmConfirmNewPassword').value;
        if(password!==confirmation){status($('pmPasswordStatus'),'New passwords do not match.',true);return;}
        if(password===old){status($('pmPasswordStatus'),'Choose a different new password.',true);return;}
        try{
          await db().verifyPassword(old);
          await db().updatePassword(password);
          $('pmPasswordForm').reset();
          status($('pmPasswordStatus'),'Password changed successfully.');
        }catch(error){status($('pmPasswordStatus'),error.message,true);}
      });
    });
    let deactivated=false;
    try{deactivated=Boolean((await db().profile())?.deactivated_at);}catch(error){console.warn('Account status:',error.message);}
    const paused=$('pmAccountPaused'),deactivateButton=$('pmDeactivateBtn'),management=$('pmAccountManagement');
    paused.hidden=!deactivated;
    management.hidden=deactivated;
    const reactivation=$('pmReactivateBtn');
    reactivation?.addEventListener('click',async()=>{
      if(reactivation.disabled)return;
      reactivation.disabled=true;reactivation.textContent='Reactivating…';
      try{await db().setAccountDeactivated(false);window.location.replace('settings-account.html');}
      catch(error){await PMDialogs.alert('Could not reactivate account: '+error.message);reactivation.disabled=false;reactivation.textContent='Reactivate account';}
    });
    deactivateButton?.addEventListener('click',async()=>{
      if(!await PMDialogs.confirm('Your profile will be hidden, new messages stopped, and notifications paused until you sign in to reactivate.',{title:'Deactivate account?',confirmText:'Deactivate',kind:'danger'}))return;
      deactivateButton.disabled=true;deactivateButton.textContent='Deactivating…';
      try{
        await db().setAccountDeactivated(true);
        await db().signOut();
        window.location.replace('account.html');
      }catch(error){await PMDialogs.alert('Account deactivation could not be completed: '+error.message);deactivateButton.disabled=false;deactivateButton.textContent='Deactivate account';}
    });
    $('pmDeleteForm')?.addEventListener('submit',e=>{
      e.preventDefault();if(!e.currentTarget.reportValidity())return;
      withSubmit(e.currentTarget,async()=>{
        const check=$('pmDeletePhrase').value.trim();
        if(check!=='DELETE'||!$('pmDeleteAcknowledged').checked){status($('pmDeleteStatus'),'Type DELETE and acknowledge permanent removal.',true);return;}
        if(!await PMDialogs.confirm('All associated data will be removed. This action cannot be undone.',{title:'Permanently delete account?',confirmText:'Delete account',kind:'danger'}))return;
        try{
          status($('pmDeleteStatus'),'Securely removing your account…');
          await db().permanentlyDeleteAccount($('pmDeletePassword').value);
          window.location.replace('account.html?deleted=1');
        }catch(error){status($('pmDeleteStatus'),error.message,true);}
      });
    });
  }
  window.addEventListener('pm-ready',()=>initialize().catch(console.warn));
  // For test fixtures and late-loaded modules when the PM session is already ready.
  if(document.readyState==='complete'&&document.documentElement.classList.contains('pm-auth-ready'))initialize().catch(console.warn);
})();
