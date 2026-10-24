/* Edit Profile progress: always reflects SAVED Supabase data, never unsaved form inputs. */
'use strict';
(() => {
  const root=document.getElementById('pmEditCompletion');
  const PM=window.PM;
  const db=PM?.backend;
  if(!root || !db || typeof PM.profileCompletion !== 'function') return;
  const pct=root.querySelector('#pmEditCompletionPercent');
  const count=root.querySelector('#pmEditCompletionCount');
  const hint=root.querySelector('#pmEditCompletionHint');
  const track=root.querySelector('#pmEditCompletionTrack');
  const fill=root.querySelector('#pmEditCompletionFill');
  let serial=0;

  function render(profile){
    const status=PM.profileCompletion(profile);
    const value=Math.max(0,Math.min(100,Number(status.percent)||0));
    pct.textContent=`${value}%`;
    count.textContent=`${status.completed} / ${status.total}`;
    hint.textContent=status.complete?'All details added.':'Complete your profile for better study matches.';
    track.setAttribute('aria-valuenow',String(value));
    track.setAttribute('aria-valuetext',`${status.completed} of ${status.total} details added`);
    fill.style.width=`${value}%`;
    root.hidden=false;
  }

  async function refresh(){
    const request=++serial;
    // No guessing a percentage until we have a signed-in account's saved details.
    if(!db.user || !db.client){root.hidden=true;return;}
    const studentId=db.identity();
    try {
      const profile=await db.profile();
      if(request!==serial || studentId!==db.identity())return;
      render(profile);
    } catch(error){
      if(request!==serial)return;
      // Keep the previously fetched status instead of replacing it with a fake 0%.
      console.warn('Profile completion could not load:',error.message);
    }
  }
  window.addEventListener('pm-ready',refresh);
  window.addEventListener('pm-profile-saved',refresh);
  window.addEventListener('pm-profile-photo-changed',refresh);
  window.addEventListener('pm-auth-changed',refresh);
})();
