/* Peermigo — dedicated group inbox. Uses existing group_posts and pm_attachments.
   Membership is checked client-side for UX; Supabase RLS remains authoritative. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PM = window.PM;
  const db = PM?.backend;
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isUUID = x => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||'');
  const groupId = new URLSearchParams(location.search).get('group');
  let group=null,channel=null,refreshing=false,pendingRefresh=false,started=false,sendBusy=false;
  const history = $('pmGroupChatHistory');
  const field = $('pmGroupChatBody');
  const form = $('pmGroupChatForm');
  const filesInput = $('pmGroupChatFiles');
  const send = $('pmGroupChatSend');
  const status = $('pmGroupChatStatus');
  const layout = $('pmGroupChatLayout');
  if(!history||!field||!form||!db)return;

  const date = x => new Date(x).toLocaleString('en-ZA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  function inform(message,error=false){status.textContent=message||'';status.classList.toggle('pm-is-error',Boolean(error));}
  function fail(message){
    inform(message,true);
    history.innerHTML='<div class="pm-group-empty">'+esc(message)+'<p><a href="groups.html">Back to Study Groups →</a></p></div>';
    field.disabled=true;send.disabled=true;
  }
  function resizeInput(){
    field.style.height='52px';
    field.style.height=Math.min(148,Math.max(52,field.scrollHeight))+'px';
  }
  function adjustHeight(){
    if(window.innerWidth>720){layout?.style.removeProperty('--pm-group-chat-height');return;}
    const vv=window.visualViewport;
    const top=document.querySelector('.site-header')?.getBoundingClientRect().height||0;
    const usable=vv?.height||window.innerHeight;
    // The content remains within the visible viewport (above the Android/iOS keyboard).
    const available=Math.max(230,Math.floor(usable-top));
    layout?.style.setProperty('--pm-group-chat-height',available+'px');
  }
  const scrollBottom=()=>{history.scrollTop=history.scrollHeight;};

  async function showPosts(atBottom=false){
    if(refreshing){pendingRefresh=true;return;}
    refreshing=true;
    try{
      const wasNearBottom=history.scrollHeight-history.scrollTop-history.clientHeight<120;
      const posts=await db.groupPosts(groupId);
      const authorIds=[...new Set(posts.map(x=>x.author_id))];
      const profiles=authorIds.length?await db.profilesByIds(authorIds):[];
      const authors=new Map(profiles.map(x=>[x.id,x]));
      const mine=db.identity();
      history.innerHTML=posts.length?posts.map(post=>{
        const user=authors.get(post.author_id),name=PM.formatPersonName(user?.full_name||'Student');
        const isMine=post.author_id===mine;
        return `<article class="pm-group-bubble-row${isMine?' is-mine':''}" data-group-post="${esc(post.id)}">
           ${!isMine?`<a class="pm-group-msg-avatar" href="student.html?id=${encodeURIComponent(post.author_id)}" aria-label="View ${esc(name)} profile">${PM.ui.avatar(name,user?.avatar_path,'post-avatar')}</a>`:''}
           <div class="pm-group-msg-bubble">
             ${!isMine?`<a class="pm-group-msg-author" href="student.html?id=${encodeURIComponent(post.author_id)}">${esc(name)}</a>`:''}
             <p>${esc(post.body)}</p>
             <div class="pm-group-files" data-post-files="${esc(post.id)}"></div>
             <div class="pm-group-msg-meta"><time datetime="${esc(post.created_at)}">${esc(date(post.created_at))}</time>${group?.created_by===mine?`<button type="button" class="pm-group-delete" data-delete-post="${esc(post.id)}" aria-label="Remove message">Remove</button>`:''}</div>
           </div>
         </article>`;
      }).join(''):'<div class="pm-group-empty">No messages yet. Start the conversation with your group!</div>';
      await PM.ui?.decorateAvatars?.(history);
      const fileSpots=[...history.querySelectorAll('[data-post-files]')];
      if(fileSpots.length){
        try{
          const attachments=await db.attachmentsForMany('post',fileSpots.map(e=>e.dataset.postFiles));
          await Promise.all(fileSpots.map(e=>PM.ui.showFiles(e,'post',e.dataset.postFiles,false,attachments[e.dataset.postFiles]||[])));
        }catch(e){console.warn('Group attachments:',e.message);}
      }
      if(atBottom||wasNearBottom)requestAnimationFrame(scrollBottom);
    }catch(error){inform(error.message||'Unable to load group messages.',true);}
    finally{refreshing=false;if(pendingRefresh){pendingRefresh=false;showPosts();}}
  }

  async function start(){
    if(started||!db.user)return;
    started=true;
    if(!isUUID(groupId)){fail('This group link is invalid.');return;}
    if(!db.client){fail('Unable to connect to Supabase. Check your connection.');return;}
    try{
      const [groups,memberships]=await Promise.all([db.groups(),db.groupMemberships()]);
      group=groups.find(g=>g.id===groupId);
      if(!group){fail('This group is unavailable or has been deleted.');return;}
      const joined=memberships.some(m=>m.group_id===groupId);
      if(!joined){fail('Join this group before opening its discussion.');return;}
      $('pmGroupChatTitle').textContent=group.name;
      $('pmGroupChatMeta').textContent=[group.module,group.institution,group.campus].filter(Boolean).map(PM.formatStudyText).join(' · ') || 'Members-only study conversation';
      document.title=group.name+' | Peermigo';
      const list=$('pmGroupChatList');
      const available=groups.filter(g=>memberships.some(m=>m.group_id===g.id));
      list.innerHTML=available.map(g=>`<a class="pm-group-inbox-link${g.id===groupId?' is-active':''}" href="group-chat.html?group=${encodeURIComponent(g.id)}" ${g.id===groupId?'aria-current="page"':''}><span class="pm-group-inbox-mark">${PM.icon('users')}</span><span><strong>${esc(g.name)}</strong><small>${esc(PM.formatStudyText(g.module)||'Study group')}</small></span></a>`).join('');
      field.disabled=false;send.disabled=false;inform('');
      await showPosts(true);
      channel=db.client.channel('group-room-'+groupId)
        .on('postgres_changes',{event:'*',schema:'public',table:'group_posts',filter:'group_id=eq.'+groupId},()=>showPosts())
        .subscribe();
    }catch(error){fail(error.message||'Unable to open this group discussion.');}
  }

  field.addEventListener('input',resizeInput);
  field.addEventListener('focus',()=>{adjustHeight();resizeInput();setTimeout(()=>{adjustHeight();scrollBottom();},120);});
  field.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&window.innerWidth>720){e.preventDefault();form.requestSubmit();}
  });
  filesInput.addEventListener('change',()=>{
    const files=[...filesInput.files];
    $('pmGroupFilesChosen').textContent=files.length?files.length+' file'+(files.length===1?'':'s')+' selected: '+files.map(x=>x.name).slice(0,2).join(', ')+(files.length>2?'…':''):'';
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(sendBusy||!group||!db.user)return;
    const body=field.value.trim(),files=[...filesInput.files];
    if(!body&&!files.length)return;
    sendBusy=true;send.disabled=true;inform('Sending…');
    try{
      const saved=await db.addGroupPost(groupId,body||'Shared an attachment');
      // The post is saved at this point. Reset now so a failed upload is not sent twice.
      field.value='';filesInput.value='';$('pmGroupFilesChosen').textContent='';resizeInput();
      if(files.length){try{await db.uploadAttachments('post',saved.id,files)}catch(err){inform('Message sent, but attachment failed: '+err.message,true);await showPosts(true);return;}}
      inform('');await showPosts(true);field.focus({preventScroll:true});
    }catch(err){inform('Could not send the message: '+(err.message||'Please try again.'),true);}
    finally{sendBusy=false;send.disabled=false;}
  });
  history.addEventListener('click',async e=>{
    const button=e.target.closest('[data-delete-post]');
    if(!button||!group||group.created_by!==db.identity())return;
    if(!await PMDialogs.confirm('This message will be removed from the group discussion.',{title:'Delete message?',confirmText:'Delete',kind:'danger'}))return;
    button.disabled=true;
    try{await db.deleteGroupPost(groupId,button.dataset.deletePost);await showPosts();}
    catch(error){inform(error.message||'Unable to remove message.',true);button.disabled=false;}
  });
  const events=['resize','orientationchange'];
  for(const event of events)window.addEventListener(event,adjustHeight,{passive:true});
  window.visualViewport?.addEventListener('resize',()=>{adjustHeight();requestAnimationFrame(scrollBottom);},{passive:true});
  window.visualViewport?.addEventListener('scroll',adjustHeight,{passive:true});
  window.addEventListener('pm-ready',()=>{adjustHeight();start();});
  if(document.documentElement.classList.contains('pm-auth-ready')){adjustHeight();start();}
  window.addEventListener('pagehide',()=>{if(channel&&db.client)db.client.removeChannel(channel);});
  adjustHeight();resizeInput();
})();
