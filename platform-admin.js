/* Peermigo admin console. Actual authorization occurs within Supabase PostgreSQL RPCs. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const date=v=>v?new Date(v).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'—';
 const state={tab:'overview',stats:{}, students:{items:[],total:0}, reports:{items:[],total:0},verification:{items:[],total:0},moderation:{items:[],total:0},offsets:{students:0,reports:0,verification:0,moderation:0},limit:20,busy:false,modalAction:null};
 let client;
 async function rpc(name,params={}){const {data,error}=await client.rpc(name,params);if(error)throw error;return data;}
 function toast(message){const box=$('adminToast');box.textContent=message;box.hidden=false;clearTimeout(box._timer);box._timer=setTimeout(()=>box.hidden=true,4200);}
 function setGate(title,description,action){$('adminGate').hidden=false;$('adminApp').hidden=true;$('adminGateTitle').textContent=title;$('adminGateCopy').textContent=description;$('adminGateLink').hidden=!action;}
 function tab(name){if(!['overview','reports','students','verification','moderation'].includes(name))return;state.tab=name;
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('is-active',active);b.setAttribute('aria-current',String(active));});
  document.querySelectorAll('.pm-admin-panel').forEach(p=>p.hidden=p.id!==`panel-${name}`);
  const u=new URL(location.href);u.hash=name;history.replaceState(null,'',u);
  loadTab(name).catch(err=>toast('Could not load information: '+err.message));
 }
 async function refreshOverview(){const d=await rpc('pm_admin_overview');state.stats=d;
  const fields={statStudents:d.students,statHidden:d.hidden,statHiddenLegend:d.hidden,statVerified:d.verified,statReports:Number(d.open_account_reports)+Number(d.open_note_reports),statAccountReports:d.open_account_reports,statNoteReports:d.open_note_reports,statVerification:d.verification_pending,statVisible:Number(d.students)-Number(d.hidden)};
  Object.entries(fields).forEach(([id,value])=>{if($(id))$(id).textContent=String(value)});
  const total=Math.max(1,Number(d.students));$('visibleBar').style.width=(100*(Number(d.students)-Number(d.hidden))/total)+'%';$('hiddenBar').style.width=(100*Number(d.hidden)/total)+'%';
  [['reportTabCount',Number(d.open_account_reports)+Number(d.open_note_reports)],['verifyTabCount',d.verification_pending]].forEach(([id,n])=>{const b=$(id);b.textContent=String(n);b.hidden=!Number(n)});
 }
 function paginate(kind,total){const off=state.offsets[kind],end=Math.min(off+state.limit,total);
  const prefix=kind==='verification'?'verify':kind;
  $(`${prefix}Pagination`).textContent=total?`${off+1}–${end} of ${total}`:'0 results';
  $(`${prefix}Prev`).disabled=off===0;$(`${prefix}Next`).disabled=end>=total;
 }
 async function loadStudents(){const data=await rpc('pm_admin_students',{p_search:$('studentSearch').value.trim(),p_filter:$('studentFilter').value,p_offset:state.offsets.students,p_limit:state.limit});
  state.students=data;const rows=$('studentRows');rows.innerHTML='';
  for(const student of data.items){const tr=document.createElement('tr');
    const name=escapeHTML(student.full_name||'Student'),institution=escapeHTML(student.institution||'Not provided'),course=escapeHTML(student.course||''),campus=escapeHTML(student.campus||'');
    const hidden=student.discoverable===false,verified=student.is_verified===true,disabled=!!student.permanently_disabled_at,suspended=!disabled&&!!student.suspended_until&&new Date(student.suspended_until)>new Date();
    tr.innerHTML=`<td><div class="pm-admin-student-info"><span class="pm-admin-avatar">${escapeHTML((student.full_name||'S').trim().slice(0,1).toUpperCase())}</span><span><strong>${name}</strong><small>Joined ${escapeHTML(date(student.created_at))}${student.deactivated_at?' · Deactivated':''}${disabled?' · Disabled':suspended?' · Suspended until '+escapeHTML(date(student.suspended_until)):''}</small></span></div></td>
     <td>${institution}<small>${course}${campus?' · '+campus:''}</small></td>
     <td><span class="pm-admin-tag ${hidden?'pm-is-hidden':''}">${hidden?'Hidden':'Discoverable'}</span></td>
     <td><span class="pm-admin-tag ${verified?'verified':''}">${verified?'✓ Verified':'Not verified'}</span></td>
     <td><button type="button" class="pm-admin-small-button" data-manage-student="${escapeHTML(student.id)}">Verify</button> <button type="button" class="pm-admin-small-button" data-moderate-student="${escapeHTML(student.id)}">Moderate</button></td>`;
    rows.appendChild(tr);
  }
  if(!data.items.length){const tr=document.createElement('tr');tr.innerHTML='<td colspan="5" class="pm-admin-empty">No students match this filter.</td>';rows.appendChild(tr)}
  paginate('students',data.total);
 }
 function reportCard(r){const kind=r.kind==='note'?'Note report':r.kind==='appeal'?'Moderation appeal':'Account report';const el=document.createElement('article');el.className='pm-admin-card';
  el.innerHTML=`<div class="pm-admin-card-top"><div><span class="pm-admin-eyebrow">${escapeHTML(kind)}</span><h3>${escapeHTML(r.target_label||'Unavailable / removed')}</h3><div class="pm-admin-card-meta"><span>Submitted ${escapeHTML(date(r.created_at))}</span><span>Report ID ${escapeHTML(String(r.id).slice(0,8))}</span></div></div><span class="pm-admin-tag ${escapeHTML(r.review_status)}">${escapeHTML(r.review_status||'new')}</span></div>
   <div class="pm-admin-card-note">${escapeHTML(r.reason||'No reason provided')}${r.details?'\n'+escapeHTML(r.details):''}</div>
   ${r.note_body?`<p><strong>Reported note excerpt:</strong> ${escapeHTML(r.note_body)}</p>`:''}
   ${r.reviewer_note?`<p><strong>Previous admin note:</strong> ${escapeHTML(r.reviewer_note)}</p>`:''}${r.note_removed?'<p><strong>This note has been removed.</strong></p>':''}
   <div class="pm-admin-card-actions">${r.kind==='note'&&r.target_id?`<button type="button" class="pm-admin-small-button" data-moderate-note="${escapeHTML(r.target_id)}" data-note-action="${r.note_removed?'restore':'remove'}">${r.note_removed?'Restore note':'Remove note'}</button>`:''}${r.reported_student_id?`<button type="button" class="pm-admin-small-button" data-report-student="${escapeHTML(r.reported_student_id)}" data-student-label="${escapeHTML(r.target_label||'Student')}">Moderate student</button>`:''}<button class="pm-admin-small-button" type="button" data-report-status="reviewing" data-report-id="${escapeHTML(r.id)}" data-report-kind="${escapeHTML(r.kind)}">In review</button><button class="pm-admin-small-button" type="button" data-report-status="resolved" data-report-id="${escapeHTML(r.id)}" data-report-kind="${escapeHTML(r.kind)}">Resolve</button><button class="pm-admin-small-button" type="button" data-report-status="dismissed" data-report-id="${escapeHTML(r.id)}" data-report-kind="${escapeHTML(r.kind)}">Dismiss</button></div>`;
  return el;
 }
 async function loadReports(){const data=await rpc('pm_admin_reports',{p_status:$('reportFilter').value,p_offset:state.offsets.reports,p_limit:state.limit});state.reports=data;
  const box=$('reportRows');box.replaceChildren();if(!data.items.length){box.innerHTML='<div class="pm-admin-empty">No reports in this category.</div>'}
  else data.items.forEach(r=>box.appendChild(reportCard(r)));paginate('reports',data.total);
 }
 function verificationCard(r){const el=document.createElement('article');el.className='pm-admin-card';
  el.innerHTML=`<div class="pm-admin-card-top"><div><span class="pm-admin-eyebrow">STUDENT VERIFICATION</span><h3>${escapeHTML(r.full_name||'Student')}</h3><div class="pm-admin-card-meta"><span>${escapeHTML(r.institution||r.institution_snapshot||'Not specified')}</span><span>Submitted ${escapeHTML(date(r.created_at))}</span>${r.discoverable===false?'<span>Hidden profile</span>':''}</div></div><span class="pm-admin-tag ${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></div>
   ${r.request_note?`<div class="pm-admin-card-note">${escapeHTML(r.request_note)}</div>`:''}
   ${r.reviewer_note?`<p>Review note: ${escapeHTML(r.reviewer_note)}</p>`:''}
   ${r.status==='pending'?`<div class="pm-admin-card-actions"><button class="pm-admin-small-button" type="button" data-verdict="approved" data-request-id="${escapeHTML(r.id)}">Approve verification</button><button class="pm-admin-small-button" type="button" data-verdict="rejected" data-request-id="${escapeHTML(r.id)}">Reject</button></div>`:''}`;
  return el;
 }
 async function loadVerification(){const data=await rpc('pm_admin_verification_requests',{p_status:$('verificationFilter').value,p_offset:state.offsets.verification,p_limit:state.limit});state.verification=data;
  const box=$('verificationRows');box.replaceChildren();if(!data.items.length){box.innerHTML='<div class="pm-admin-empty">No verification requests in this category.</div>'}
  else data.items.forEach(v=>box.appendChild(verificationCard(v)));paginate('verification',data.total);
 }
 async function loadTab(name){if(name==='overview')return refreshOverview();if(name==='students')return loadStudents();if(name==='reports')return loadReports();if(name==='verification')return loadVerification();if(name==='moderation')return loadModeration();}
 const modal=$('adminModal');const modalReason=$('adminModalReason');let priorFocus=null;
 function closeModal(){modal.hidden=true;state.modalAction=null;document.body.style.overflow='';if(priorFocus?.focus)priorFocus.focus()}
 function openModal({title,description,submit,run,days=false}){priorFocus=document.activeElement;$('adminModalTitle').textContent=title;$('adminModalDesc').textContent=description;$('adminModalSubmit').textContent=submit;
  modalReason.value='';$('adminModalDaysWrap').hidden=!days;$('adminModalDays').value='7';state.modalAction=run;modal.hidden=false;document.body.style.overflow='hidden';modalReason.focus();}
 async function showStudentAction(id){const s=state.students.items.find(x=>x.id===id);if(!s)return;
  openModal({title:s.is_verified?'Revoke verification':'Verify student',description:`${s.full_name||'Student'} · ${s.institution||'Unknown institution'}. ${s.discoverable===false?'This profile is hidden from Find Peers. ':' '}Only approve after independent evidence of enrolment has been reviewed.`,submit:s.is_verified?'Revoke badge':'Grant verified badge',
  run:async reason=>{await rpc('pm_admin_verify_student',{p_student_id:s.id,p_approve:!s.is_verified,p_reason:reason});toast('Verification updated and recorded.')}});
 }
 function showReportAction(id,kind,status){const current=state.reports.items.find(r=>r.id===id&&r.kind===kind);if(!current)return;
  openModal({title:`${status==='reviewing'?'Begin review':status==='resolved'?'Resolve':'Dismiss'} ${kind} report`,description:`${current.target_label||'Reported item'} · Record why this report is being marked ${status}. Review status does not itself change account or note access; use the moderation controls separately.`,submit:'Save review',
  run:async reason=>{await rpc('pm_admin_review_report',{p_kind:kind,p_report_id:id,p_status:status,p_admin_note:reason});toast('Report updated and audited.')}});
 }
 function showVerificationAction(id,decision){const current=state.verification.items.find(x=>x.id===id);if(!current)return;
  openModal({title:decision==='approved'?'Approve verification':'Reject verification request',description:`${current.full_name||'Student'} · ${current.institution||current.institution_snapshot}. Confirm enrolment independently before approving. This decision is stored in the audit history.`,submit:decision==='approved'?'Approve student':'Reject request',
  run:async reason=>{await rpc('pm_admin_decide_verification',{p_request_id:id,p_decision:decision,p_reason:reason});toast('Verification request reviewed.')}});
 }

 async function loadModeration(){const data=await rpc('pm_admin_moderation_history',{p_offset:state.offsets.moderation,p_limit:state.limit});state.moderation=data;const host=$('moderationRows');host.replaceChildren();if(!data.items.length){host.innerHTML='<div class="pm-admin-empty">No moderation actions recorded yet.</div>'}else for(const a of data.items){const el=document.createElement('article');el.className='pm-admin-card';el.innerHTML=`<div class="pm-admin-card-top"><div><span class="pm-admin-eyebrow">${escapeHTML(a.action.replace(/_/g,' ').toUpperCase())}</span><h3>${escapeHTML(a.target_type)} · ${escapeHTML(String(a.target_id).slice(0,8))}</h3><div class="pm-admin-card-meta">${escapeHTML(a.actor_name||'Administrator')} · ${escapeHTML(new Date(a.created_at).toLocaleString('en-ZA'))}</div></div></div><div class="pm-admin-card-note">${escapeHTML(a.details?.reason||'No reason shown')}${a.details?.days?' · '+escapeHTML(a.details.days)+' day(s)':''}</div>`;host.appendChild(el)}paginate('moderation',data.total)}
 async function moderateStudent(id,label){const s=state.students.items.find(x=>x.id===id);label=s?.full_name||label||'Student';
   const action=await PMDialogs.choose(`Moderate ${label}`,[
    {label:'Issue warning',value:'warning',description:'Send a formal community-guidelines warning.'},
    {label:'Suspend account',value:'suspend',description:'Temporarily restrict account access for 1–90 days.'},
    {label:'Disable account',value:'disable',description:'Apply a serious account restriction until reinstated.'},
    {label:'Reinstate account',value:'reinstate',description:'Restore access after a suspension, disablement, or successful appeal.'}
   ],'Choose the moderation action you want to apply.');if(!action)return;
   openModal({title:({warning:'Issue community warning',suspend:'Suspend student',disable:'Disable student account',reinstate:'Restore student access'})[action],description:`${label} · Explain the specific policy violation or appeal decision. The student will be notified and this decision logged.${action==='disable'?' This is a serious account restriction.':''}`,submit:({warning:'Send warning',suspend:'Confirm suspension',disable:'Disable account',reinstate:'Reinstate account'})[action],days:action==='suspend',run:async reason=>{const days=action==='suspend'?Number($('adminModalDays').value):null;if(action==='suspend'&&(!Number.isInteger(days)||days<1||days>90))throw new Error('Choose 1–90 suspension days');await rpc('pm_admin_moderate_student',{p_student_id:id,p_action:action,p_reason:reason,p_days:days});toast('Moderation action applied and recorded.')}});
 }
 function moderateNote(id,action){openModal({title:action==='remove'?'Remove reported note':'Restore removed note',description:action==='remove'?'The note will be hidden from student access, preserved for admin review, and its author notified.':'The note will be visible again according to its previous privacy settings. The author will be notified.',submit:action==='remove'?'Remove note':'Restore note',run:async reason=>{await rpc('pm_admin_moderate_note',{p_note_id:id,p_action:action,p_reason:reason});toast('Note moderation saved and recorded.')}})}
 function wire(){document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.scope){$('studentFilter').value=b.dataset.scope;state.offsets.students=0;}tab(b.dataset.go)}));
  $('adminRefresh').addEventListener('click',async()=>{try{await Promise.all([refreshOverview(),loadTab(state.tab)]);toast('Dashboard refreshed.')}catch(e){toast(e.message)}});
  $('studentFilter').addEventListener('change',()=>{state.offsets.students=0;loadStudents().catch(e=>toast(e.message))});
  let searchWait;$('studentSearch').addEventListener('input',()=>{clearTimeout(searchWait);searchWait=setTimeout(()=>{state.offsets.students=0;loadStudents().catch(e=>toast(e.message))},300)});
  $('reportFilter').addEventListener('change',()=>{state.offsets.reports=0;loadReports().catch(e=>toast(e.message))});
  $('verificationFilter').addEventListener('change',()=>{state.offsets.verification=0;loadVerification().catch(e=>toast(e.message))});
  [['students','students','students'],['reports','reports','reports'],['verification','verify','verification'],['moderation','moderation','moderation']].forEach(([kind,prefix,fn])=>{
    const load=()=>({students:loadStudents,reports:loadReports,verification:loadVerification,moderation:loadModeration})[fn]().catch(e=>toast(e.message));
    $(`${prefix}Prev`).addEventListener('click',()=>{state.offsets[kind]=Math.max(0,state.offsets[kind]-state.limit);load()});
    $(`${prefix}Next`).addEventListener('click',()=>{if(state.offsets[kind]+state.limit<state[kind].total){state.offsets[kind]+=state.limit;load()}});
  });
  $('adminApp').addEventListener('click',e=>{const manage=e.target.closest('[data-manage-student]');if(manage)return showStudentAction(manage.dataset.manageStudent);
    const studentModerate=e.target.closest('[data-moderate-student]');if(studentModerate)return moderateStudent(studentModerate.dataset.moderateStudent);const reportStudent=e.target.closest('[data-report-student]');if(reportStudent)return moderateStudent(reportStudent.dataset.reportStudent,reportStudent.dataset.studentLabel);const note=e.target.closest('[data-moderate-note]');if(note)return moderateNote(note.dataset.moderateNote,note.dataset.noteAction);const report=e.target.closest('[data-report-status]');if(report)return showReportAction(report.dataset.reportId,report.dataset.reportKind,report.dataset.reportStatus);
    const verdict=e.target.closest('[data-verdict]');if(verdict)return showVerificationAction(verdict.dataset.requestId,verdict.dataset.verdict);
  });
  $('adminModalCancel').addEventListener('click',closeModal);$('adminModalClose').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal();});
  $('adminModalForm').addEventListener('submit',async e=>{e.preventDefault();if(state.busy||!state.modalAction)return;
    const reason=modalReason.value.trim();if(reason.length<10){toast('Please record a reason of at least 10 characters.');modalReason.focus();return;}
    state.busy=true;$('adminModalSubmit').disabled=true;const act=state.modalAction;
    try{await act(reason);closeModal();await Promise.all([refreshOverview(),loadTab(state.tab)]);}catch(err){toast('Could not save decision: '+err.message)}finally{state.busy=false;$('adminModalSubmit').disabled=false}
  });
 }
 async function init(){wire();try{await PM.backend.init();client=PM.backend.requireClient();const {data:{user},error}=await client.auth.getUser();if(error||!user){setGate('Sign in required','Sign in with your authorised Peermigo administrator account to continue.',true);return;}
   if(!(await rpc('pm_admin_has_access'))){setGate('Access restricted','This account is not an authorised Peermigo administrator. Student accounts cannot view private moderation data.',false);return;}
   $('adminGate').hidden=true;$('adminApp').hidden=false;await refreshOverview();tab(['overview','students','reports','verification'].includes(location.hash.slice(1))?location.hash.slice(1):'overview');
  }catch(error){setGate('Unable to open admin console','Administrator access could not be verified. '+(error?.message||'Try signing in again.'),false)}
 }
 document.addEventListener('DOMContentLoaded',init);
})();
