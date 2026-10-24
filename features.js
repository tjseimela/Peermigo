'use strict';
/* New social UI: profile photos, notes, attachments, presence, preferences. */
(() => {
 const PM=window.PM, db=PM.backend;
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=x=>x?new Date(x).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'}):'';
 const toast=t=>{const box=el('toast');if(box){box.textContent=t;box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),4400)}else PMDialogs.alert(t)};
 const validId=id=>/^[0-9a-f-]{36}$/i.test(id||'');
 const hasAuth=()=>Boolean(db.user);
 const gate=()=>`<div class="social-empty"><h3>Sign in to continue</h3><p>Student profiles and private files are available to signed-in members.</p><a class="btn btn-primary" href="account.html">Sign in →</a></div>`;
 const icon=(name)=>PM.icon?PM.icon(name):'';
 const avatar=(name,path,size='')=>`<span class="pm-avatar ${esc(size)}" ${path?`data-avatar-path="${esc(path)}"`:''}><span>${esc(PM.initials(name||'Student'))}</span></span>`;
 const status=p=>{
  if(!p?.show_activity||!p.last_seen_at)return 'Activity hidden';
  const min=(Date.now()-Date.parse(p.last_seen_at))/60000;
  if(min<0||!Number.isFinite(min))return 'Activity unavailable';
  if(min<2)return 'Online · recently active';
  if(min<60)return `Last seen ${Math.floor(min)} min ago`;
  return `Last seen ${date(p.last_seen_at)}`;
 };
 // Lazy-load signed avatar URLs only when visible; avoid one request per duplicate avatar.
 const pendingAvatars=new Set();
 const loadAvatar=async node=>{
  if(!node?.isConnected||node.dataset.avatarLoaded)return;
  node.dataset.avatarLoaded='pending';
  try{
   const path=node.dataset.avatarPath;
   const url=await db.avatarUrl(path);
   if(!url||!node.isConnected||node.dataset.avatarPath!==path)return;
   // A real image element is not reset by dark-mode background-color shorthand rules.
   const img=document.createElement('img');img.className='pm-avatar-photo';img.alt='';
   img.decoding='async';img.loading='eager';img.draggable=false;
   img.addEventListener('load',()=>{if(node.isConnected){node.classList.add('has-image');node.dataset.avatarLoaded='yes';}},{once:true});
   img.addEventListener('error',()=>{
    img.remove();node.classList.remove('has-image');node.dataset.avatarLoaded='failed';
    // Signed URLs may expire in a long-lived tab; ask Supabase for a fresh URL next time.
    if(db.avatarCache&&path)delete db.avatarCache[path];
    console.warn('Unable to load profile photo; showing initials instead.');
   },{once:true});
   node.querySelector('.pm-avatar-photo')?.remove();node.append(img);img.src=url;
  }catch(e){node.dataset.avatarLoaded='failed';console.warn('Avatar:',e.message)}
 };
 const avatarObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){avatarObserver.unobserve(entry.target);loadAvatar(entry.target)}
 },{rootMargin:'180px'}):null;
 const decorateAvatars=async(root=document)=>{
  if(!db.user)return;
  const nodes=[...root.querySelectorAll('[data-avatar-path]:not([data-avatar-loaded]):not([data-avatar-queued])')];
  for(const node of nodes){node.dataset.avatarQueued='yes';if(avatarObserver)avatarObserver.observe(node);else loadAvatar(node)}
 };
 PM.ui={avatar,status,decorateAvatars,escape:esc};
 let scheduled=false;
 const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorateAvatars()})});
 document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});decorateAvatars()});

 async function showFiles(container,kind,id,ownerMode=false,preloaded=null){
  if(!container||!id)return;
  container.textContent='';
  try{const items=preloaded??await db.attachments(kind,id);
   for(const f of items){const row=document.createElement('div');row.className='file-tile';
    const safeName=document.createElement('span');safeName.textContent=`${f.file_name} · ${(f.file_size/1024/1024).toFixed(1)} MB`;safeName.className='file-title';
    const link=document.createElement('button');link.type='button';link.className='text-button';link.textContent='Open ↗';link.onclick=async()=>{try{const url=await db.attachmentUrl(f.storage_path);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.click();}catch(e){toast(e.message)}};
    row.append(safeName,link);
    if(ownerMode&&f.owner_id===db.identity()){const remove=document.createElement('button');remove.type='button';remove.className='text-button danger-text';remove.textContent='Remove';remove.onclick=async()=>{if(!await PMDialogs.confirm(`Remove ${f.file_name}?`,{title:'Remove attachment?',confirmText:'Remove',kind:'danger'}))return;try{await db.removeAttachment(f);row.remove();toast('Attachment removed.')}catch(e){toast(e.message)}};row.append(remove)}
    if(f.mime_type.startsWith('image/')){const img=document.createElement('img');img.className='file-thumbnail';img.alt=f.file_name;img.loading='lazy';row.prepend(img);try{img.src=await db.attachmentUrl(f.storage_path)}catch{img.remove()}}
    container.append(row);
   }
  }catch(e){console.warn('Attachments:',e.message);container.textContent='Attachments unavailable: '+e.message}
 }
 PM.ui.showFiles=showFiles;

 function noteMarkup(n,owned=false,profileOwner=false){return `<article class="note-post" id="note-${esc(n.id)}" data-note-id="${esc(n.id)}">
 <div class="note-post-meta"><span class="note-visibility">${n.visibility==='public'?icon('globe')+' Public':icon('lock')+' Private'}</span><span class="pm-note-meta-actions"><span>${esc(date(n.created_at))}${n.edited_at?' · <b>Edited</b>':''}</span>${n.visibility==='public'&&!owned&&!profileOwner?`<button type="button" class="pm-save-btn pm-note-save" data-save-kind="note" data-save-key="${esc(n.id)}" aria-label="Save this public note" aria-pressed="false" title="Save note">${icon('bookmark')} <span>Save</span></button>`:''}</span></div>
 <h3>${esc(n.topic)}</h3><p class="note-post-body">${esc(n.body)}</p><div class="note-attachments" data-note-files="${esc(n.id)}"></div>
 ${owned?`<div class="note-actions"><button class="text-button" data-edit-note="${esc(n.id)}">Edit note</button><button class="text-button danger-text" data-delete-note="${esc(n.id)}">Delete</button></div>`:''}
 </article>`;}
 async function populateNoteFiles(root){const boxes=[...root.querySelectorAll('[data-note-files]')];const files=await db.attachmentsForMany('note',boxes.map(x=>x.dataset.noteFiles));await Promise.all(boxes.map(box=>showFiles(box,'note',box.dataset.noteFiles,!!root.closest('#myNotesList'),files[box.dataset.noteFiles]||[])))}
 async function initNotesEditor(){const form=el('notesForm');if(!form)return;if(!hasAuth()){el('notesLogin').innerHTML=gate();form.classList.add('hidden');return;}
  const list=el('myNotesList');let cache=[],editing=null;
  const reload=async()=>{cache=await db.notes(db.identity(),true);list.innerHTML=cache.length?cache.map(n=>noteMarkup(n,true)).join(''):'<div class="social-empty"><h3>Your study journal starts here.</h3><p>Write your first note, keep it private or publish it to your profile.</p></div>';await populateNoteFiles(list);el('notesTotal').textContent=String(cache.length)};
  const reset=()=>{editing=null;form.reset();el('notesSubmit').textContent='Publish note →';el('notesFormTitle').textContent='Create a study note';el('notesCancelEdit').hidden=true};
  el('notesCancelEdit').addEventListener('click',reset);
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity()||!hasAuth())return;
   const note={topic:el('noteTopic').value.trim(),body:el('noteBody').value.trim(),visibility:el('noteVisibility').value};
   if(note.topic.length<3||!note.body)return toast('Enter a topic and note content.');
   const files=el('noteFiles').files;
   if(files?.length>5)return toast('Select up to 5 images.');
   if(files && [...files].some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size===0))
     return toast('Only JPG, PNG or WebP images up to 10 MB each are allowed.');
   const btn=el('notesSubmit');btn.disabled=true;btn.textContent='Saving…';
   try{const saved=editing?await db.editNote(editing,note):await db.createNote(note);
    if(files?.length){try{await db.uploadAttachments('note',saved.id,files)}catch(err){await reload();toast('Note saved, but attachment failed: '+err.message);return}}
    reset();await reload();window.dispatchEvent(new Event('pm-note-updated'));toast('Note saved to your profile.');}
   catch(err){toast(err.message)}finally{btn.disabled=false;if(!editing)btn.textContent='Publish note →'}
  });
  list.addEventListener('click',async e=>{
   const edit=e.target.closest('[data-edit-note]'),del=e.target.closest('[data-delete-note]');if(edit){const n=cache.find(n=>n.id===edit.dataset.editNote);if(!n)return;
    editing=n.id;el('noteTopic').value=n.topic;el('noteBody').value=n.body;el('noteVisibility').value=n.visibility;el('notesFormTitle').textContent='Edit your note';el('notesSubmit').textContent='Save changes →';el('notesCancelEdit').hidden=false;el('noteFiles').value='';el('noteFiles').dispatchEvent(new Event('pm-upload-sync'));form.scrollIntoView({behavior:'smooth',block:'start'});
   }else if(del){const n=cache.find(n=>n.id===del.dataset.deleteNote);if(!n||!await PMDialogs.confirm(`This note and its images will be permanently deleted.`,{title:`Delete “${n.topic}”?`,confirmText:'Delete note',kind:'danger'}))return;
    try{await db.deleteNote(n.id);if(editing===n.id)reset();await reload();toast('Note deleted.')}catch(err){toast(err.message)}
   }
  });
  try{await reload()}catch(e){list.textContent='Unable to load notes: '+e.message}
 }
 async function renderMyNotes(){const list=el('profileNotesList');if(!list)return;if(!hasAuth()){list.innerHTML=gate();return;}
  try{const notes=(await db.notes(db.identity(),true)).slice(0,3);list.innerHTML=notes.length?notes.map(n=>noteMarkup(n)).join(''):'<div class="social-empty"><p>No notes yet. Start with a private study note or share a public post.</p></div>';await populateNoteFiles(list)}catch(e){list.textContent=e.message}
 }
 async function initProfileExtras(){const photoForm=el('avatarForm');if(!photoForm)return;if(!hasAuth()){el('photoHelp').textContent='Sign in to update your profile photo.';return;}
  let me=await db.profile();const photo=el('photoCurrent');const paint=async()=>{photo.innerHTML=avatar(me?.full_name,me?.avatar_path,'large');await decorateAvatars(photo)};
  await paint();
  photoForm.addEventListener('submit',async e=>{e.preventDefault();const selected=el('avatarFile').files[0];if(!selected)return toast('Select a photo first.');const file=PM.cropper?.file();if(!file)return toast('Position your photo and choose Use this photo before uploading.');const saveBtn=el('savePhotoButton');if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Uploading…'}
   try{const path=await db.uploadAvatar(file);me={...me,avatar_path:path};await paint();window.dispatchEvent(new Event('pm-profile-photo-changed'));el('avatarFile').value='';el('avatarFile').dispatchEvent(new Event('pm-upload-sync'));PM.cropper?.reset();toast('Profile photo updated.')}catch(err){toast(err.message)}finally{if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Save profile photo'}}
  });
  el('removePhoto').addEventListener('click',async()=>{if(!me?.avatar_path)return;try{await db.removeAvatar();me={...me,avatar_path:null};await paint();window.dispatchEvent(new Event('pm-profile-photo-changed'));PM.cropper?.reset();toast('Photo removed.')}catch(e){toast(e.message)}});
  await renderMyNotes();
 }
 async function initPrivacySettings(){
  const form=el('privacyForm');if(!form)return;
  if(!hasAuth())return;
  try{const me=await db.profile();
   el('discoverableSetting').checked=me?.discoverable!==false;
   el('activitySetting').checked=me?.show_activity!==false;
  }catch(e){console.warn('Could not load privacy preferences:',e.message);return;}
  form.addEventListener('submit',async e=>{e.preventDefault();
   const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
   try{await db.saveDiscoverability(el('discoverableSetting').checked,el('activitySetting').checked);toast('Privacy settings updated.');}
   catch(e){toast(e.message)}finally{if(button)button.disabled=false;}
  });
 }
 async function initPublicProfile(){
  const root=el('studentPage');if(!root)return;
  if(!hasAuth()){root.innerHTML=gate();return;}
  const params=new URLSearchParams(location.search);
  const requestedId=params.get('id');
  const id=requestedId||db.identity();
  if(!validId(id)){
   root.innerHTML='<div class="social-empty"><h3>Profile not found</h3><a href="matches.html">Find students →</a></div>';
   return;
  }
  try{
   const p=await db.studentProfile(id);
   if(!p){
    root.innerHTML='<div class="social-empty"><h3>Profile unavailable</h3><p>This student may have turned off profile discovery.</p><a href="matches.html">Back to Find Peers →</a></div>';
    return;
   }
   const self=p.id===db.identity();
   let connection=null;
   if(!self)try{connection=db.connectionWith(await db.connectionRequests(),p.id)}catch(error){console.warn('Connection setup:',error.message)}
   const connect=PM.connectionAction(connection,db.identity());
   const name=PM.formatPersonName(p.full_name)||'Student';
   const firstName=name.split(/\s+/)[0];
   const bio=String(p.about||'').trim();
   const hasBio=Boolean(bio);
   const modules=Array.isArray(p.modules)?p.modules:[];
   const aboutBody=self
    ?(hasBio?`<p class="pm-profile-bio">${esc(bio)}</p>`:`<div class="pm-owner-prompt"><p>Introduce yourself to other students. Add a short bio about your study goals and interests.</p><a class="btn btn-secondary" href="profile.html">${icon('edit')} Add a bio</a></div>`)
    :`<p class="pm-profile-bio">${esc(bio||'This student has not added a bio yet.')}</p>`;
   const modulesContent=modules.length
    ?modules.map(x=>`<span>${esc(PM.formatStudyText(x))}</span>`).join('')
    :self?'<span>No subjects or modules added</span>':'<span>Not listed</span>';
   const aboutLinks=self?`<a class="pm-owner-inline-link" href="profile.html">${icon('edit')} Edit profile details</a>`:'';
   const notesIntro=self
    ?'<p>All your notes are shown here, including private notes that only you can see.</p>'
    :'<p>Study ideas and resources this student has chosen to share.</p>';
   const notesLinks=self?`<a href="notes.html" class="pm-owner-inline-link">${icon('book')} Manage notes</a>`:'';
   root.innerHTML=`<div class="student-cover${self?' pm-own-profile-cover':''}"><div class="student-profile-main">${avatar(name,p.avatar_path,'xl')}<div><div class="student-overline">${self?'MY PROFILE':'STUDENT PROFILE'} ${p.is_verified?'· ✓ VERIFIED':''}</div><h1>${esc(name)}</h1><p>${esc(PM.formatStudyText(p.course)||'Studying · profile in progress')} · ${esc(PM.formatStudyText(p.institution)||'Institution not added')}</p><div class="student-meta">${p.campus?icon('pin')+' '+esc(PM.formatStudyText(p.campus))+' · ':''}${esc(p.study_method||'Study partner')} ${p.show_activity?`· ${esc(status(p))}`:''}</div></div></div><div class="student-actions">${self?'<a class="btn btn-primary" href="profile.html">Edit my profile →</a>':`<button class="btn btn-primary pm-connect-profile" type="button" data-connect-profile="${esc(p.id)}" data-connect-state="${connect.state}" ${connect.disabled?'disabled':''}>${icon(connect.state==='pending'||connect.state==='accepted'?'check':'users')} ${connect.label}</button><a class="btn btn-primary pm-message-student" href="messages.html?peer=${encodeURIComponent(p.id)}">${icon('message')} Message student ↗</a>`}<button type="button" class="btn btn-secondary" data-share-profile="${esc(p.id)}" title="Share this student’s profile">${icon('share')} Share</button>${self?`<a class="btn btn-secondary pm-create-note-link" href="notes.html#notesForm">${icon('edit')} Create Note/Post</a>`:''}</div></div>
   <div class="student-profile-info${self?' pm-profile-owner-view':''}">
    <section class="social-panel" aria-label="${self?'About me':'About the student'}">
     <div class="pm-profile-panel-head"><div><span class="social-eyebrow">${self?'YOUR PROFILE':'ABOUT'}</span><h2>${self?'About me':'Get to know '+esc(firstName)}</h2></div>${aboutLinks}</div>
     ${aboutBody}
     <div class="pm-profile-facts">
       <div class="pm-fact pm-fact-full"><span class="pm-fact-label">${esc(p.institution_type==='school'?'SCHOOL':'INSTITUTION')}</span><strong class="pm-fact-text">${esc(PM.formatStudyText(p.institution)||'Not added')}</strong></div>
       ${p.campus?`<div class="pm-fact pm-fact-full"><span class="pm-fact-label">CAMPUS</span><strong class="pm-fact-text">${esc(PM.formatStudyText(p.campus))}</strong></div>`:''}
       <div class="pm-fact pm-fact-full"><span class="pm-fact-label">${esc(p.institution_type==='school'?'SUBJECTS':'SUBJECTS / MODULES')}</span><div class="pm-fact-tags">${modulesContent}</div></div>
       <div class="pm-fact"><span class="pm-fact-label">STUDY FORMAT</span><span class="pm-fact-pill">${esc(({campus:'On campus',virtual:'Online',hybrid:'Hybrid / both'})[p.study_method]||'Not specified')}</span></div>
       <div class="pm-fact"><span class="pm-fact-label">AVAILABILITY</span><span class="pm-fact-pill">${esc(({mornings:'Mornings',afternoons:'Afternoons',evenings:'Evenings',weekends:'Weekends',flexible:'Flexible'})[p.availability]||'Not specified')}</span></div>
     </div>
     ${self&&!modules.length?'<a class="pm-owner-inline-link" href="profile.html">Add subjects or modules →</a>':''}
    </section>
    <section class="social-panel" aria-label="${self?'My notes and posts':'Public notes and posts'}">
     <div class="pm-profile-panel-head"><div><span class="social-eyebrow">${self?'YOUR STUDY JOURNAL':'STUDY NOTES'}</span><h2>${self?'My notes &amp; posts':'Public posts &amp; notes'}</h2></div>${notesLinks}</div>
     ${notesIntro}
     <div id="studentNotesFeed" class="pm-profile-note-list"></div>
    </section>
   </div>`;
   const connectButton=root.querySelector('[data-connect-profile]');
   if(connectButton)connectButton.addEventListener('click',async()=>{
    if(connectButton.disabled)return;
    if(connection?.recipient_id===db.identity()&&connection.status==='pending'){
     location.href='notifications.html';return;
    }
    connectButton.disabled=true;const previous=connectButton.innerHTML;
    connectButton.textContent='Sending…';
    try{
     connection=await db.sendConnectionRequest(p.id);
     connectButton.dataset.connectState='pending';connectButton.innerHTML=`${icon('check')} Requested`;
     toast('Connection request sent. This student will receive a notification.');
    }catch(error){connectButton.disabled=false;connectButton.innerHTML=previous;toast(error.message)}
   });
   await decorateAvatars(root);
   // Owner sees both public and private notes. Other students see ONLY public notes.
   const notes=await db.notes(id,self);
   const visibleNotes=self?notes:notes.filter(x=>x.visibility==='public');
   const feed=el('studentNotesFeed');
   feed.innerHTML=visibleNotes.length
    ?visibleNotes.map(n=>noteMarkup(n,false,self)).join('')
    :self
     ?`<div class="social-empty pm-owner-empty">${icon('book')}<h3>Start your study journal</h3><p>You haven't created any notes yet. Write a private note or share something useful with other students.</p><a href="notes.html#notesForm" class="btn btn-primary">${icon('edit')} Create a note →</a></div>`
     :'<div class="social-empty"><p>No public notes shared yet.</p></div>';
   await populateNoteFiles(feed);
   const requestedNote=params.get('note')||'';
   if(validId(requestedNote)){
    const card=[...feed.querySelectorAll('[data-note-id]')].find(x=>x.dataset.noteId===requestedNote);
    if(card){card.classList.add('pm-bookmark-target');requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'center'}));}
   }
  }catch(e){root.innerHTML=`<div class="social-empty"><h3>Couldn't load this profile</h3><p>${esc(e.message)}</p></div>`;}
 }
 async function initEmailSettings(){const form=el('emailPrefsForm');if(!form)return;if(!hasAuth()){form.innerHTML=gate();return;}
  const updateDeliveryTip=()=>{const tip=el('emailDeliveryTip');if(!tip)return;tip.hidden=!['messages','groups','sessions','notes'].some(k=>el('email_'+k)?.checked);};
  for(const key of ['messages','groups','sessions','notes'])el('email_'+key)?.addEventListener('change',updateDeliveryTip);
  try{const prefs=await db.getEmailPreferences();for(const key of ['messages','groups','sessions','notes'])el('email_'+key).checked=!!prefs[key];updateDeliveryTip();}
  catch(e){toast(e.message)}
  form.addEventListener('submit',async e=>{e.preventDefault();const prefs={};for(const key of ['messages','groups','sessions','notes'])prefs[key]=el('email_'+key).checked;
   try{await db.setEmailPreferences(prefs);el('emailSaved').textContent='✓ Preferences saved';updateDeliveryTip();toast('Email preferences saved.')}catch(err){toast(err.message)}});
 }
 async function initAppNotificationSettings(){
  const form=el('appPrefsForm');if(!form)return;
  if(!hasAuth()){form.innerHTML=gate();return;}
  const fields=['groups','sessions','notes'];
  const save=form.querySelector('button[type="submit"]');
  try{
    const prefs=await db.getAppPreferences(true);
    for(const key of fields)el('app_'+key).checked=!!prefs[key];
  }catch(error){
    toast('In-app settings could not be loaded: '+error.message);
    save.disabled=true;
    return;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();save.disabled=true;
    el('appSaved').textContent='Saving…';
    const prefs={};for(const key of fields)prefs[key]=el('app_'+key).checked;
    try{
      await db.setAppPreferences(prefs);
      el('appSaved').textContent='✓ In-app settings saved';
      window.dispatchEvent(new Event('pm-app-prefs-changed'));
      toast('In-app notification preferences saved.');
    }catch(error){
      el('appSaved').textContent='Could not save; try again.';
      toast(error.message||'Unable to save in-app preferences.');
    }finally{save.disabled=false;}
  });
 }
 function initFileIndicators(){
  for(const [inputId,outputId] of [['groupPostFiles','groupFilesChosen'],['chatFileInput','chatFilesChosen']]){
    const file=el(inputId),out=el(outputId);if(!file||!out)continue;
    file.addEventListener('change',()=>{const files=[...file.files];out.textContent=files.length?`${files.length} file${files.length===1?'':'s'} selected: ${files.map(f=>f.name).slice(0,2).join(', ')}${files.length>2?'…':''}`:''});
  }
}
async function startPresence(){if(!db.user)return;
  let show=false;try{const profile=await db.profile();show=profile?.show_activity!==false}catch{return;}
  const touch=()=>{if(show&&document.visibilityState==='visible')db.touchPresence()};touch();
  document.addEventListener('visibilitychange',touch);window.addEventListener('focus',touch);setInterval(touch,75000);
  // Privacy-setting updates should affect heartbeats immediately.
  el('privacyForm')?.addEventListener('submit',()=>{show=el('activitySetting').checked});
 }
 const isValidProfileId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'');
 function studentProfileUrl(id){if(!isValidProfileId(id))throw new Error('Invalid student profile.');return new URL('student.html?id='+encodeURIComponent(id),location.href).href;}
 async function copyProfileUrl(url){
  if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(url);return true;}catch{/* Fall back to manual copy. */}}
  const field=document.createElement('textarea');field.value=url;field.style.position='fixed';field.style.top='-1000px';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();if(ok)return true;
  await PMDialogs.prompt('Select the link below to copy it manually.',{title:'Share student profile',label:'Profile link',value:url,minLength:0,maxLength:2048,multiline:false,confirmText:'Close'});return false;
 }
 document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-copy-profile],[data-share-profile]');if(!btn)return;
  const id=btn.dataset.copyProfile||btn.dataset.shareProfile;if(!isValidProfileId(id))return;
  try{const url=studentProfileUrl(id);if(btn.hasAttribute('data-share-profile')&&navigator.share){
    try{await navigator.share({title:'Student profile on Peermigo',text:'View this student on Peermigo. Sign in to see their profile.',url});return;}
    catch(err){if(err?.name==='AbortError')return;}
   }
   const copied=await copyProfileUrl(url);if(copied){toast('Profile link copied! Only authorized signed-in students can view it.');const original=btn.textContent;btn.textContent='✓ Copied';setTimeout(()=>{if(btn.isConnected)btn.textContent=original;},1800);}
  }catch(err){toast(err.message||'Unable to copy profile link.');}
 });
 window.addEventListener('pm-ready',async()=>{
  initFileIndicators();await Promise.allSettled([initProfileExtras(),initPrivacySettings(),initNotesEditor(),initPublicProfile(),initEmailSettings(),initAppNotificationSettings(),startPresence()]);
  decorateAvatars();
 });
})();
