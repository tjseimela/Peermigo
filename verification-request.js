(()=>{'use strict';
 const $=id=>document.getElementById(id);
 async function init(){const status=$('requestStatus'),form=$('verificationForm');
  try{await PM.backend.init();const client=PM.backend.requireClient();const {data:{user}}=await client.auth.getUser();if(!user){status.textContent='Sign in to Peermigo before requesting verification.';return;}
   const {data:profile,error:pe}=await client.from('profiles').select('id,full_name,institution,is_verified').eq('id',user.id).single();if(pe)throw pe;
   if(profile.is_verified){status.textContent='✓ Your Peermigo account is already verified.';return;}
   if(!profile.institution||profile.institution.trim().length<2){status.textContent='Add your institution to Edit Profile before requesting verification.';return;}
   const {data:requests,error:re}=await client.from('pm_verification_requests').select('status,created_at,reviewer_note').eq('student_id',user.id).order('created_at',{ascending:false}).limit(1);if(re)throw re;
   const latest=requests?.[0];if(latest?.status==='pending'){status.textContent='Your verification request is pending administrator review.';return;}
   if(latest?.status==='rejected'){status.textContent=`Your last request was not approved. ${latest.reviewer_note||''} You may submit a new request.`;}
   else status.textContent='Requests are reviewed manually. No badge is awarded automatically.';
   form.hidden=false;
   form.addEventListener('submit',async e=>{e.preventDefault();const button=$('requestSubmit');button.disabled=true;button.textContent='Submitting…';
    try{const {error}=await client.from('pm_verification_requests').insert({student_id:user.id,institution_snapshot:profile.institution,request_note:$('requestMessage').value.trim()});if(error)throw error;status.textContent='Request submitted. You will be able to see its status here.';form.hidden=true;
    }catch(err){status.textContent='Could not submit request: '+err.message;}finally{button.disabled=false;button.textContent='Submit request'}
   });
  }catch(err){status.textContent='Unable to check verification status: '+err.message}
 }
 document.addEventListener('DOMContentLoaded',init);
})();
