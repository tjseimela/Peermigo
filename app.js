'use strict';
(() => {
 const PM=window.PM;const db=PM.backend;
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clean=s=>String(s||'').trim().replace(/\s+/g,' ');
 const val=id=>$(id)?.value?.trim()||'';
 const prettyDate=x=>new Date(x).toLocaleString('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
 const fmtTime=x=>new Date(x).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
 const colors=['avatar-peach','avatar-lilac','avatar-mint','avatar-blue'];
 let toastTimer;
 const notify=s=>{const box=$('toast');if(!box)return;box.textContent=s;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),4200)};
 const feedback=(id,text,error=false)=>{const el=$(id);if(!el)return;el.textContent=text;el.classList.remove('hidden');el.classList.toggle('is-error',error)};
 const handleError=e=>{console.error(e);notify(e?.message||'Something went wrong. Please try again.')};
 const getMe=async()=>{try{return await db.profile()}catch(e){handleError(e);return null}};
 const requireSignedIn=()=>{if(!db.user){notify('Please sign in first.');location.href='account.html';return false}if(!db.client){notify('Check your Supabase connection.');return false}return true};
 const rankPeer=(p,me)=>PM.scoreStudentMatch(p,me);
 const matchReason=(p,me)=>PM.matchDetails(p,me).reason;
 const memberNav = `<a class="nav-link" data-page="index.html" href="index.html">Dashboard</a>
 <a class="nav-link" data-page="search.html" href="search.html">Search students & groups</a>
 <a class="nav-link" data-page="matches.html" href="matches.html">Find peers</a>
 <a class="nav-link" data-page="groups.html" href="groups.html">Groups</a>
 <a class="nav-link" data-page="sessions.html" href="sessions.html">Sessions</a>
 <a class="nav-link nav-messages-link" id="messagesNavLink" data-page="messages.html" href="messages.html">Messages <span class="nav-unread-badge" id="messageUnreadBadge" aria-hidden="true" hidden></span></a>
 <a class="nav-link" data-page="notes.html" href="notes.html">Notes</a>
 <a class="nav-link" data-page="resources.html" href="resources.html">Resources</a>
 <a aria-label="Notifications" class="nav-icon-link" data-page="notifications.html" href="notifications.html" title="Notifications"><svg aria-hidden="true" fill="none" height="19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24" width="19"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg><span class="alert-dot" hidden id="alertDot"></span></a>
 <a class="nav-cta" data-page="student.html" href="student.html">My profile <span aria-hidden="true">↗</span></a>
 <button class="nav-menu-signout" id="pmMenuSignOut" type="button">${PM.icon('logout')}<span>Sign Out</span></button>`;
 const guestNav = `<a class="nav-link" data-page="index.html" href="index.html">Home</a>
 <a class="nav-link" data-page="about.html" href="about.html">About</a>
 <a class="nav-link" data-page="contact.html" href="contact.html">Contact</a>
 <a class="nav-account" data-page="account.html" id="authNavLink" href="account.html">Sign in</a>
 <a class="nav-cta join-nav" href="account.html?mode=signup">Join Peermigo <span aria-hidden="true">↗</span></a>`;
 function setupNav(){
  const menu=$('menuToggle'),nav=$('primaryNav');if(!menu||!nav)return;
  const setOpen=(open)=>{nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');document.querySelector('.site-header')?.classList.remove('pm-header-hidden');};
  menu.addEventListener('click',()=>setOpen(!nav.classList.contains('open')));
  nav.addEventListener('click',async(event)=>{
   const signOut=event.target.closest('#pmMenuSignOut');
   if(signOut){
    event.preventDefault();if(!db.user||signOut.disabled)return;
    signOut.disabled=true;const label=signOut.querySelector('span');if(label)label.textContent='Signing out…';
    try{await db.signOut();window.location.replace('account.html');}
    catch(error){signOut.disabled=false;if(label)label.textContent='Sign Out';handleError(error);}
    return;
   }
   if(event.target.closest('a'))setOpen(false);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){setOpen(false);menu.focus();}});
  document.addEventListener('pointerdown',event=>{if(nav.classList.contains('open')&&!event.target.closest('#primaryNav,#menuToggle'))setOpen(false);});
 }
 const quickLinks=[
  ['index.html','Home','home'],['matches.html','Find peers','user'],
  ['groups.html','Groups','users'],['messages.html','Messages','message'],
  ['notes.html','Notes','book'],['notifications.html','Notifications','bell']
 ];
 let topHub=null;
 function setupTopHub(){
  if(topHub)return;
  const brand=document.querySelector('.site-header .nav-shell > .brand');
  if(!brand)return;
  topHub=document.createElement('div');topHub.id='pmTopHub';topHub.className='pm-top-hub';topHub.hidden=true;
  const items=quickLinks.map(([href,label,kind])=>`<a href="${href}" class="pm-top-link" data-page="${href}" aria-label="${label}" title="${label}">${PM.icon(kind)}<span class="pm-top-label">${label}</span>${href==='messages.html'?'<span class="pm-top-count" id="pmTopMessagesCount" hidden aria-hidden="true"></span>':href==='notifications.html'?'<span class="pm-top-count" id="pmTopNotificationsCount" hidden aria-hidden="true"></span>':''}</a>`).join('');
  topHub.innerHTML=`<form class="pm-global-search" id="pmGlobalSearchForm" role="search" autocomplete="off">
    <label class="pm-search-input-wrap" for="pmGlobalSearchInput">${PM.icon('search')}<input id="pmGlobalSearchInput" type="search" enterkeyhint="search" autocomplete="off" maxlength="64" placeholder="Search students or study groups..." aria-label="Search students or public study groups by name, course, module or institution" aria-controls="pmGlobalSearchResults" aria-expanded="false"/><span class="pm-search-shortcut" aria-hidden="true">/</span></label>
    <div class="pm-search-popover" id="pmGlobalSearchResults" aria-live="polite" hidden></div>
   </form><nav aria-label="Student shortcuts" class="pm-top-quicknav">${items}</nav><div class="pm-top-profile-wrap" id="pmTopProfileMenu"><button type="button" class="pm-top-profile" id="pmTopProfileToggle" aria-label="Open account menu" aria-controls="pmTopProfileDropdown" aria-expanded="false"><span class="pm-top-profile-avatar-wrap" id="pmTopProfileAvatar">${PM.ui.avatar('Student',null,'pm-top-profile-avatar')}</span><span class="pm-top-profile-copy"><strong id="pmTopProfileName">My profile</strong><small id="pmTopProfileMeta">Student account</small></span><span class="pm-top-profile-caret" aria-hidden="true">▾</span></button><div class="pm-top-profile-dropdown" id="pmTopProfileDropdown" aria-label="Account options" hidden><a href="student.html" class="pm-profile-menu-item" id="pmTopProfileGo">${PM.icon('user')}<span>My Profile</span></a><a href="settings.html" class="pm-profile-menu-item" id="pmTopSettingsLink">${PM.icon('settings')}<span>Settings</span></a><div class="pm-profile-menu-divider" aria-hidden="true"></div><button type="button" class="pm-profile-menu-item pm-profile-signout" id="pmTopSignOut">${PM.icon('logout')}<span>Sign Out</span></button></div></div><div class="pm-mobile-filter-wrap" id="pmMobileFilterWrap"><button type="button" class="pm-mobile-filter" id="pmMobileFilterButton" aria-label="Search filters: all results" title="Filter student and group results" aria-expanded="false" aria-controls="pmMobileFilterPanel">${PM.icon('sliders')}</button><div class="pm-mobile-filter-panel" id="pmMobileFilterPanel" hidden><div class="pm-filter-title">Search in</div><button type="button" class="pm-filter-option is-selected" data-search-scope="all" aria-pressed="true">All results <span aria-hidden="true">✓</span></button><button type="button" class="pm-filter-option" data-search-scope="students" aria-pressed="false">Students <span aria-hidden="true">✓</span></button><button type="button" class="pm-filter-option" data-search-scope="groups" aria-pressed="false">Study groups <span aria-hidden="true">✓</span></button><a class="pm-filter-advanced" href="matches.html">Advanced peer filters ↗</a></div></div>`;
  brand.insertAdjacentElement('afterend',topHub);
  const form=topHub.querySelector('#pmGlobalSearchForm');
  const input=topHub.querySelector('#pmGlobalSearchInput');
  const panel=topHub.querySelector('#pmGlobalSearchResults');
  let requestId=0,timer=null,blockedIds=null,searchScope='all';
  const close=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false')};
  const show=html=>{panel.innerHTML=html;panel.hidden=false;input.setAttribute('aria-expanded','true')};
  const searchUrl=(type=searchScope)=>`search.html?q=${encodeURIComponent(input.value.trim())}&type=${encodeURIComponent(type)}`;
  const actionLinks=()=>`<div class="pm-search-actions"><a class="pm-search-view-all" href="${searchUrl('all')}">See all search results <span aria-hidden="true">→</span></a></div>`;
  const search=async()=>{
    const q=input.value.trim();const current=++requestId;
    if(q.length<2){show('<div class="pm-search-help">Type at least 2 characters to search students and study groups.</div>');return}
    if(!PM.backend?.user){close();return;}
    show('<div class="pm-search-help" role="status">Searching students and study groups…</div>');
    try{
      const searchingStudents=searchScope!=='groups',searchingGroups=searchScope!=='students';
      const [rows,groupRows,blockedRows]=await Promise.all([
        searchingStudents?PM.backend.searchStudents(q):Promise.resolve([]),
        searchingGroups?PM.backend.searchStudyGroups(q):Promise.resolve([]),
        searchingStudents&&!blockedIds?PM.backend.blockedPeers():Promise.resolve(null)
      ]);
      if(blockedRows)blockedIds=new Set(blockedRows);
      if(current!==requestId||input.value.trim()!==q||!PM.backend.user)return;
      const students=rows.filter(student=>!blockedIds?.has(student.id));
      const groups=groupRows||[];
      if(!students.length&&!groups.length){show('<div class="pm-search-help">No matching students or study groups found. Try a name, course, module, campus, or institution.</div>'+actionLinks());return}
      const studentList=students.slice(0,6).map(student=>{
       const subtitle=[student.course,student.institution].filter(Boolean).join(' · ');
       return `<a class="pm-search-result" href="student.html?id=${encodeURIComponent(student.id)}">${PM.ui.avatar(student.full_name,student.avatar_path,'pm-search-avatar')}<span class="pm-search-result-text"><strong>${esc(PM.formatPersonName(student.full_name)||'Student')}</strong><small>${esc(subtitle||'Student profile')}</small></span>${student.is_verified?'<span class="pm-search-verified" title="Verified student">✓</span>':''}</a>`;
      }).join('');
      const groupList=groups.slice(0,4).map(group=>{
       const subtitle=[group.module,[group.institution,group.campus].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
       return `<a class="pm-search-result pm-search-group" href="groups.html?q=${encodeURIComponent(group.name||q)}&group=${encodeURIComponent(group.id)}"><span class="pm-search-group-icon">${PM.icon('users')}</span><span class="pm-search-result-text"><strong>${esc(group.name||'Study group')}</strong><small>${esc(subtitle||group.description||'Study group')}</small></span><span class="pm-search-group-label">Group</span></a>`;
      }).join('');
      const sections=[];
      if(studentList)sections.push('<div class="pm-search-heading">STUDENT PROFILES</div>'+studentList);
      if(groupList)sections.push('<div class="pm-search-heading">PUBLIC STUDY GROUPS</div>'+groupList);
      show(sections.join('')+actionLinks());
      PM.ui?.decorateAvatars?.();
    }catch(error){if(current===requestId)show('<div class="pm-search-help" role="alert">Search is temporarily unavailable. Please try again.</div>'+actionLinks());console.warn('Student/group search:',error.message)}
  };
  input.addEventListener('input',()=>{clearTimeout(timer);requestId++;if(!input.value.trim()){close();return;}timer=setTimeout(search,280)});
  input.addEventListener('focus',()=>{if(input.value.trim())search();else show('<div class="pm-search-help">Search by student name, course, campus, institution, or study-group name.</div>'+actionLinks())});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();input.blur();return;}
    if(event.key==='ArrowDown'&&!panel.hidden){event.preventDefault();panel.querySelector('a')?.focus();}
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){close();input.focus()}});
  form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim().length>=2)location.href=searchUrl();});
  document.addEventListener('pointerdown',event=>{if(!form.contains(event.target))close()});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&PM.backend?.user&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){event.preventDefault();input.focus()}});
  const filterWrap=$('pmMobileFilterWrap'),filterButton=$('pmMobileFilterButton'),filterPanel=$('pmMobileFilterPanel');
  const closeFilter=()=>{if(!filterPanel)return;filterPanel.hidden=true;filterButton.setAttribute('aria-expanded','false')};
  if(filterWrap&&filterButton&&filterPanel){
    filterButton.addEventListener('click',()=>{
      const open=filterPanel.hidden;
      filterPanel.hidden=!open;filterButton.setAttribute('aria-expanded',String(open));
      document.querySelector('.site-header')?.classList.remove('pm-header-hidden');
      if(open)closeTopProfileMenu();
    });
    filterPanel.addEventListener('click',event=>{
      const option=event.target.closest('[data-search-scope]');if(!option)return;
      searchScope=option.dataset.searchScope;
      filterPanel.querySelectorAll('[data-search-scope]').forEach(btn=>{
        const selected=btn===option;btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-pressed',String(selected));
      });
      const category=searchScope==='all'?'all results':searchScope;
      filterButton.setAttribute('aria-label','Search filters: '+category);
      filterButton.classList.toggle('has-filter',searchScope!=='all');
      closeFilter();if(input.value.trim().length>=2){clearTimeout(timer);search();}
      else if(document.activeElement===input)input.focus();
    });
    document.addEventListener('pointerdown',event=>{if(!filterWrap.contains(event.target))closeFilter()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!filterPanel.hidden){closeFilter();filterButton.focus();}});
  }
  const path=location.pathname.split('/').pop()||'index.html';
  topHub.querySelectorAll('.pm-top-link').forEach(a=>{if(a.dataset.page===path){a.classList.add('is-active');a.setAttribute('aria-current','page')}});
  if(path==='settings.html'||path.startsWith('settings-')){const settings=topHub.querySelector('#pmTopSettingsLink');settings?.setAttribute('aria-current','page');}
 }
 function setupSmartMobileHeader(){
  const header=document.querySelector('.site-header');if(!header)return;
  let prevY=Math.max(0,window.scrollY),scheduled=false;
  const reset=()=>header.classList.remove('pm-header-hidden');
  const update=()=>{
   scheduled=false;const y=Math.max(0,window.scrollY),difference=y-prevY;prevY=y;
   if(window.innerWidth>720||!db.user||y<96){reset();return;}
   const menuOpen=$('primaryNav')?.classList.contains('open');
   const profileOpen=$('pmTopProfileDropdown')&&!$('pmTopProfileDropdown').hidden;
   const filtersOpen=$('pmMobileFilterPanel')&&!$('pmMobileFilterPanel').hidden;
   const focused=document.activeElement;
   const insideFocus=Boolean(focused&&(focused.id==='pmGlobalSearchInput'||focused.closest?.('#pmGlobalSearchResults')));
   if(menuOpen||profileOpen||filtersOpen||insideFocus){reset();return;}
   if(difference>5&&y>160)header.classList.add('pm-header-hidden');
   else if(difference< -4)reset();
  };
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
  window.addEventListener('resize',()=>{prevY=Math.max(0,window.scrollY);if(window.innerWidth>720)reset()},{passive:true});
  header.addEventListener('focusin',reset);
  header.addEventListener('pointerdown',reset);
  window.addEventListener('pm-auth-changed',reset);
 }
 let signingOutFromTopMenu=false;
 function closeTopProfileMenu(restoreFocus=false){
  const button=$('pmTopProfileToggle'),panel=$('pmTopProfileDropdown');
  if(!button||!panel)return;
  panel.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open account menu');
  if(restoreFocus)button.focus();
 }
 function setupTopProfileDropdown(){
  const button=$('pmTopProfileToggle'),panel=$('pmTopProfileDropdown'),wrapper=$('pmTopProfileMenu'),signOut=$('pmTopSignOut');
  if(!button||!panel||!wrapper||!signOut)return;
  button.addEventListener('click',()=>{
   if(!db.user)return;
   const open=panel.hidden;
   panel.hidden=!open;
   button.setAttribute('aria-expanded',String(open));
   button.setAttribute('aria-label',open?'Close account menu':'Open account menu');
  });
  button.addEventListener('keydown',event=>{
   if((event.key==='ArrowDown'||event.key==='Enter'&&panel.hidden)&&db.user){
    event.preventDefault();panel.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Close account menu');panel.querySelector('a,button')?.focus();
   }
  });
  document.addEventListener('pointerdown',event=>{if(!wrapper.contains(event.target))closeTopProfileMenu()});
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!panel.hidden){event.preventDefault();closeTopProfileMenu(true)}
  });
  wrapper.addEventListener('focusout',event=>{if(!wrapper.contains(event.relatedTarget))closeTopProfileMenu()});
  signOut.addEventListener('click',async()=>{
   if(!db.user||signingOutFromTopMenu)return;
   signingOutFromTopMenu=true;signOut.disabled=true;
   const label=signOut.querySelector('span');if(label)label.textContent='Signing out…';
   try{await db.signOut();window.location.replace('account.html');}
   catch(error){signingOutFromTopMenu=false;signOut.disabled=false;if(label)label.textContent='Sign Out';closeTopProfileMenu();handleError(error);}
  });
 }
 async function refreshTopProfile(){
  const menu=$('pmTopProfileMenu'),avatarBox=$('pmTopProfileAvatar'),name=$('pmTopProfileName'),meta=$('pmTopProfileMeta');
  if(!menu||!avatarBox||!name||!meta)return;
  if(!db.user){menu.hidden=true;return;}
  menu.hidden=false;
  try{
   const me=await db.profile();
   const fullName=PM.formatPersonName(me?.full_name)||((db.user.email||'Student').split('@')[0].replace(/[._-]+/g,' '))||'Student';
   const firstName=fullName.trim().split(/\s+/)[0]||'Student';
   name.textContent=firstName;
   meta.textContent=me?.institution||'My profile';
   avatarBox.innerHTML=PM.ui.avatar(fullName,me?.avatar_path||null,'pm-top-profile-avatar');
   await PM.ui?.decorateAvatars?.(avatarBox);
  }catch(error){
   const fallback=(db.user.email||'Student').split('@')[0]||'Student';
   name.textContent=fallback;
   meta.textContent='My profile';
   avatarBox.innerHTML=PM.ui.avatar(fallback,null,'pm-top-profile-avatar');
  }
 }
 function updateMode(){
  const currentPage=location.pathname.split('/').pop()||'index.html';
  document.documentElement.classList.toggle('pm-member-header',Boolean(db.user));
  document.documentElement.classList.toggle('pm-mobile-home-search',currentPage==='index.html');
  if(topHub)topHub.hidden=!db.user;const profileMenu=$('pmTopProfileMenu');if(profileMenu)profileMenu.hidden=!db.user;if(!db.user)closeTopProfileMenu();
  const nav=$('primaryNav'),foot=document.querySelector('.footer-nav');
  if(nav){nav.innerHTML=db.user?memberNav:guestNav;const file=location.pathname.split('/').pop()||'index.html';nav.querySelectorAll('[data-page]').forEach(a=>{if(a.dataset.page===file){a.classList.add('active');a.setAttribute('aria-current','page')}});}
  if(foot)foot.innerHTML=db.user?'<a href="matches.html">Find peers</a><a href="groups.html">Study groups</a><a href="sessions.html">Sessions</a><a href="notes.html">Notes</a><a href="saved.html">Saved items</a><a href="resources.html">Resources</a><a href="faq.html">FAQs</a><a href="student.html">My profile</a>':'<a href="about.html">About</a><a href="resources.html">Resources</a><a href="faq.html">FAQs</a><a href="contact.html">Contact</a><a href="guidelines.html">Guidelines</a>';
 }
 const privatePaths=new Set(['matches.html','groups.html','sessions.html','messages.html','group-chat.html','notes.html','notifications.html','profile.html','student.html','saved.html','settings.html','settings-account.html','settings-blocking.html','settings-notifications.html','settings-privacy.html']);
 function safeNext(){
  const wanted=new URLSearchParams(location.search).get('next');if(!wanted||wanted.startsWith('//')||wanted.includes('\\'))return null;
  try{const u=new URL(wanted,location.href);const page=u.pathname.split('/').pop();if(u.pathname!=='/'+page||wanted.includes('..')||u.origin!==location.origin||!privatePaths.has(page)||u.username||u.password)return null;
   // Only return to known student pages and preserve benign query parameters.
   const safeQuery=new URLSearchParams();for(const key of (page==='student.html'?['id','note']:page==='messages.html'?['peer']:page==='groups.html'||page==='group-chat.html'?['group']:page==='matches.html'?['institution']:[])){
    const value=u.searchParams.get(key);if(value&&value.length<=150&&/^[a-zA-Z0-9_ .-]+$/.test(value))safeQuery.set(key,value);
   }
   return page+(safeQuery.size?'?'+safeQuery.toString():'');
  }catch{return null;}
 }
 async function initMemberHome(){
  const guest=$('visitorHome'),member=$('memberHome');if(!guest||!member)return;
  if(!db.user){guest.hidden=false;member.hidden=true;return;}
  guest.hidden=true;member.hidden=false;
  const first=$('memberFirstName'),institution=$('memberInstitution'),desc=$('memberDescription');
  try{const p=await db.profile();if(p?.full_name){first.textContent=PM.formatPersonName(p.full_name).split(/\s+/)[0];}else{first.textContent='student';desc.textContent='Complete your student profile to start finding compatible peers and study groups.';}
   institution.textContent=p?.institution?[p.institution,p.campus].filter(Boolean).join(' · '):'Your student community';}
  catch{first.textContent='student';institution.textContent='Your student community';}
  const items=[['memberGroupCount',()=>db.groupMemberships(),x=>x.length],['memberSessionCount',()=>db.sessions(),x=>x.filter(s=>new Date(s.starts_at)>new Date()).length],['memberAlertCount',()=>db.notifications(),x=>x.filter(n=>!n.is_read).length],['memberNoteCount',()=>db.notes(db.identity(),true),x=>x.length],['memberSavedCount',()=>db.savedItemCount(),x=>x]];
  await Promise.allSettled(items.map(async([id,query,count])=>{try{$(id).textContent=String(count(await query()));}catch{$(id).textContent='—';}}));
 }
 let unreadBadgeRequest=0;
 let unreadBadgeSubscribedFor=null;
 async function refreshMessageBadge(){
  const badge=$('messageUnreadBadge'),link=$('messagesNavLink'),menuDot=$('mobileUnreadDot');
  if(!badge&&!menuDot)return;
  const userId=db.identity();const request=++unreadBadgeRequest;
  if(!userId||!db.client){if(badge)badge.hidden=true;if(menuDot)menuDot.hidden=true;if($('pmTopMessagesCount'))$('pmTopMessagesCount').hidden=true;window.dispatchEvent(new CustomEvent('pm-unread-updated',{detail:{count:0}}));return;}
  try{
   const count=await db.unreadMessageCount();
   if(request!==unreadBadgeRequest||db.identity()!==userId)return;
   const hasUnread=count>0;
   if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=!hasUnread;}
   if(menuDot)menuDot.hidden=!hasUnread;
   const topCount=$('pmTopMessagesCount');if(topCount){topCount.textContent=count>99?'99+':String(count);topCount.hidden=!hasUnread;}
   const topLink=topHub?.querySelector('[data-page="messages.html"]');if(topLink)topLink.setAttribute('aria-label',hasUnread?`Messages, ${count} unread`:'Messages');
   window.dispatchEvent(new CustomEvent('pm-unread-updated',{detail:{count}}));
   if(link)link.setAttribute('aria-label',hasUnread?`Messages, ${count} unread message${count===1?'':'s'}`:'Messages');
  }catch(error){console.warn('Unable to refresh unread message count:',error.message);}
 }
 function subscribeMessageBadge(){
  if(!db.client||!db.user||unreadBadgeSubscribedFor===db.identity())return;
  unreadBadgeSubscribedFor=db.identity();
  db.client.channel('unread-message-badge-'+db.identity())
   .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'recipient_id=eq.'+db.identity()},()=>refreshMessageBadge())
   .subscribe();
 }
 // Reconcile when returning to the tab, even if Supabase Realtime isn't enabled for this table.
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshMessageBadge()});
 window.addEventListener('focus',()=>refreshMessageBadge());
 window.addEventListener('pm-messages-read',()=>refreshMessageBadge());
 window.setInterval(()=>{if(document.visibilityState==='visible'&&db.user)refreshMessageBadge()},45000);
 async function refreshBadge(){if(!db.user||!db.client)return;try{const all=await db.notifications(),count=all.filter(n=>!n.is_read).length;const dot=$('alertDot'),badge=$('pmTopNotificationsCount');if(dot)dot.hidden=!count;if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=!count;}const link=topHub?.querySelector('[data-page="notifications.html"]');if(link)link.setAttribute('aria-label',count?`Notifications, ${count} unread`:'Notifications')}catch(e){console.warn(e.message)}}
 window.addEventListener('pm-app-prefs-changed',()=>{refreshBadge().catch(console.warn);if($('notificationsList'))renderNotifications().catch(console.warn);});
 function subscribeNotifications(){if(!db.client||!db.user)return;db.client.channel('alerts-'+db.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+db.user.id},payload=>{
   refreshBadge();refreshMessageBadge();if($('notificationsList'))renderNotifications();
   if(payload.new?.kind==='moderation'){
    notify('Important account notice: '+String(payload.new.title||'Please check your notifications.').slice(0,120));
    if(['Account suspended','Account disabled'].includes(payload.new.title))location.replace('account-status.html');
   }
  }).subscribe();}
 // Recover missed realtime events when the tab becomes active again.
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&db.user){refreshBadge();if($('notificationsList'))renderNotifications();}});
 window.addEventListener('focus',()=>{if(db.user)refreshBadge()});
 window.setInterval(()=>{if(db.user&&document.visibilityState==='visible')refreshBadge()},60000);
 function setupInstitutionSuggestions(){const type=$('institutionType'),list=$('institutionSuggestions');if(!type||!list)return;const update=()=>{list.replaceChildren();for(const name of PM.INSTITUTIONS[type.value]||[]){const opt=document.createElement('option');opt.value=name;list.append(opt)}};type.addEventListener('change',update);update();return update;}
 async function initProfile(){const form=$('profileForm');if(!form)return;const suggestions=setupInstitutionSuggestions();
  const learning=PM.SubjectSupport?.mount('modules','profileLearningSelector',{typeId:'institutionType'});
  for(const field of ['studentFirstName','studentSurname'])$(field)?.addEventListener('blur',()=>{$(field).value=PM.formatPersonName($(field).value)});
  const schoolGrade=$('profileGrade'),courseInput=$('course'),typeInput=$('institutionType');
  const updateProfileCourseGrade=()=>{
   const school=typeInput.value==='school';
   $('profileCourseGroup').classList.toggle('hidden',school);
   $('profileGradeGroup').classList.toggle('hidden',!school);
   schoolGrade.disabled=!school;schoolGrade.required=school;
   courseInput.disabled=school;courseInput.required=!school;
   updateProfileCampusRequirement();
  };
  const updateProfileCampusRequirement=()=>{
   const required=typeInput.value!=='school'&&$('studyMethod')?.value==='campus';
   const input=$('campus'),label=$('profileCampusRequiredText');
   if(input)input.required=required;
   if(label){label.textContent=required?'*':'Optional';label.classList.toggle('pm-optional',!required);label.classList.toggle('pm-required-symbol',required);}
  };
  typeInput.addEventListener('change',updateProfileCourseGrade);
  $('studyMethod')?.addEventListener('change',updateProfileCampusRequirement);
  const my=await getMe();if(my){const parts=PM.formatPersonName(my.full_name).split(/\s+/).filter(Boolean);const obj={studentFirstName:my.given_names||parts.slice(0,-1).join(' ')||parts[0]||'',studentSurname:my.surname||(parts.length>1?parts[parts.length-1]:''),institutionType:my.institution_type,institutionName:PM.formatStudyText(my.institution),campus:PM.formatStudyText(my.campus),course:PM.formatStudyText(my.course),modules:(my.modules||[]).map(PM.formatStudyText).join(', '),availability:my.availability,studyMethod:my.study_method,about:my.about};for(const [key,value]of Object.entries(obj))if($(key))$(key).value=value||'';if(my.institution_type==='school'&&/^Grade (8|9|10|11|12)$/.test(my.course||''))schoolGrade.value=my.course;suggestions?.();learning?.set(my);}updateProfileCourseGrade();updateProfileCampusRequirement();
  if(!db.user){feedback('profileFeedback','Sign in or create an account before saving your profile.');const link=document.createElement('a');link.href='account.html';link.textContent=' Open account →';$('profileFeedback').append(link);}
  if($('profilePrivacy'))$('profilePrivacy').textContent='Your profile is shared with signed-in members only. Your sign-in email is never published. Verification badges are awarded by an administrator.';
  form.addEventListener('submit',async e=>{e.preventDefault();if(!requireSignedIn())return;
   const notice=$('profileFeedback'),submit=$('saveProfileChanges');
   const modules=val('modules').split(',').map(PM.formatStudyText).filter(Boolean);
   const course=typeInput.value==='school'?schoolGrade.value:PM.formatStudyText(val('course'));
   const firstName=PM.formatPersonName(val('studentFirstName'));
   const surname=PM.formatPersonName(val('studentSurname'));
   const newName=[firstName,surname].filter(Boolean).join(' ');
   if(!firstName||!surname||!PM.validPersonName(firstName)||!PM.validPersonName(surname)||newName.length>80){
    feedback('profileFeedback','First name and surname must each contain at least 2 letters (80 characters maximum combined).',true);
    (!firstName?$('studentFirstName'):$('studentSurname')).focus();return;
   }
   const payload={full_name:PM.formatPersonName(newName),given_names:firstName,surname,institution_type:val('institutionType'),institution:PM.canonicalInstitution(val('institutionName'),val('institutionType')),campus:PM.formatStudyText(val('campus')),course,modules,availability:val('availability'),study_method:val('studyMethod'),about:val('about'),...learning?.get()};
   const issue=PM.matchEssentialsValidation(payload);
   if(issue){
    const fieldMap={institution_type:'institutionType',institution:'institutionName',course:typeInput.value==='school'?'profileGrade':'course',campus:'campus',modules:'modules',study_method:'studyMethod'};
    feedback('profileFeedback',issue.message,true);notice.scrollIntoView({behavior:'smooth',block:'nearest'});$(fieldMap[issue.field])?.focus();return;
   }
   if(!form.reportValidity())return;
   submit.disabled=true;submit.textContent='Saving changes…';notice.classList.add('hidden');
   try{
    await db.saveProfile(payload);
    window.dispatchEvent(new Event('pm-profile-saved'));
    feedback('profileFeedback','✓ Changes saved! Your student profile has been updated.');
    notice.scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(error){
    feedback('profileFeedback',error.message||'Unable to save your changes. Please try again.',true);
    notice.scrollIntoView({behavior:'smooth',block:'nearest'});
    console.error('Profile:',error);
   }finally{submit.disabled=false;submit.textContent='Save changes →';}
  });
 }
 let peersCache=[],meCache=null,blocked=[],connectionRows=[];
 const validPeerId=id=>/^[0-9a-f-]{36}$/i.test(id||'')&&id!==db.identity()&&!blocked.includes(id);
 async function initMatches(){
  const grid=$('matchesGrid'),directory=$('allPeersGrid');if(!grid||!directory)return;
  if(!db.user){grid.innerHTML=gateMarkup('Sign in to discover study partners');return;}
  meCache=null;blocked=[];connectionRows=[];let suggested=[];
  try{[meCache,blocked]=await Promise.all([db.profile(),db.blockedPeers()]);
   try{connectionRows=await db.connectionRequests();}catch(error){console.warn('Connection setup:',error.message);}}
  catch(error){handleError(error);grid.innerHTML=loadFailure('Unable to load the student directory.');directory.innerHTML='';return;}
  if($('matchProfileHint')){
   $('matchProfileHint').textContent=meCache?.institution?
      `${meCache.institution}${meCache.campus?' · '+meCache.campus:''} · Personalised matches`:
      'Complete your profile to see personalised matches';
  }
  // Directory badge removed for a cleaner interface.
  // A typeable institution filter works for institutions not in a fixed dropdown.
  const inst=$('institutionFilter');
  if(inst){
   const names=[...new Set([meCache?.institution,...Object.values(PM.INSTITUTIONS||{}).flat()].filter(Boolean))].sort((a,b)=>a.localeCompare(b));
   const datalist=$('peerInstitutionSuggestions');
   if(datalist)datalist.innerHTML=names.map(name=>`<option value="${esc(name)}"></option>`).join('');
  }
  const params=new URLSearchParams(location.search);
  if(params.get('q')&&$('searchInput'))$('searchInput').value=params.get('q').trim().slice(0,64);
  if(params.get('institution')&&inst)inst.value=params.get('institution').trim().slice(0,120);
  const PAGE_SIZE=window.matchMedia('(max-width: 660px)').matches?9:18;let page=0,count=0,generation=0,debounceTimer=null,quickFilter='all';
  const advancedPanel=$('peerAdvancedFilters'),sortPanel=$('peerSortOptions');
  const filterButtons=[$('openPeerFilters'),$('peerMoreFilters')].filter(Boolean);
  const updateFilterDisplay=()=>{
   document.querySelectorAll('[data-peer-quick]').forEach(button=>{
    const selected=button.dataset.peerQuick===quickFilter;
    button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));
   });
   const active=!!val('institutionFilter')||!!val('methodFilter')||!!val('timeFilter')||quickFilter!=='all';
   if($('activePeerFilterDot'))$('activePeerFilterDot').hidden=!active;
   if($('peerFilterStatus')){
    const bits=[];
    if(quickFilter==='campus')bits.push('Same campus');
    if(quickFilter==='course')bits.push('Same course');
    if(quickFilter==='help')bits.push('Can help with my subjects');
    if(val('institutionFilter'))bits.push('Institution: '+val('institutionFilter'));
    if(val('methodFilter'))bits.push('Study format filtered');
    if(val('timeFilter'))bits.push('Availability filtered');
    $('peerFilterStatus').textContent=bits.length?'Active filters: '+bits.join(' · '):'';
    $('peerFilterStatus').hidden=!bits.length;
   }
  };
  const toggleAdvanced=open=>{
   if(!advancedPanel)return;
   advancedPanel.hidden=!open;
   filterButtons.forEach(button=>button.setAttribute('aria-expanded',String(open)));
   $('peerMoreFilters')?.classList.toggle('is-open',open);
   if(open)toggleSort(false);
  };
  const toggleSort=open=>{
   if(!sortPanel)return;
   sortPanel.hidden=!open;
   $('openPeerSort')?.setAttribute('aria-expanded',String(open));
   if(open)toggleAdvanced(false);
  };
  filterButtons.forEach(button=>button.addEventListener('click',()=>toggleAdvanced(advancedPanel.hidden)));
  $('closePeerFilters')?.addEventListener('click',()=>toggleAdvanced(false));
  $('openPeerSort')?.addEventListener('click',()=>toggleSort(sortPanel.hidden));
  document.addEventListener('pointerdown',event=>{
   if(advancedPanel&&!advancedPanel.hidden&&!event.target.closest('#peerAdvancedFilters,#openPeerFilters,#peerMoreFilters'))toggleAdvanced(false);
   if(sortPanel&&!sortPanel.hidden&&!event.target.closest('#peerSortOptions,#openPeerSort'))toggleSort(false);
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    if(advancedPanel&&!advancedPanel.hidden){toggleAdvanced(false);$('openPeerFilters')?.focus();}
    if(sortPanel&&!sortPanel.hidden){toggleSort(false);$('openPeerSort')?.focus();}
   }
  });
  const currentFilters=()=>({
   search:val('searchInput'),institution:val('institutionFilter'),method:val('methodFilter'),
   availability:val('timeFilter'),sameCampus:quickFilter==='campus',sameCourse:quickFilter==='course',supportOnly:quickFilter==='help',sort:val('sortFilter')||'match',
   me:meCache,excludedIds:blocked,page,pageSize:PAGE_SIZE
  });
  const paintSuggestions=()=>{
   const search=PM.normalize(val('searchInput')),instFilter=PM.institutionKey(val('institutionFilter'));
   const m=val('methodFilter'),t=val('timeFilter'),same=quickFilter==='campus',courseOnly=quickFilter==='course';
   const filtered=suggested.filter(p=>{
    if(search&&!PM.normalize([p.full_name,p.course,p.institution,p.campus,(p.modules||[]).join(' ')].join(' ')).includes(search))return false;
    if(instFilter&&PM.institutionKey(p.institution)!==instFilter)return false;
    if(m&&p.study_method!==m)return false;
    if(t&&p.availability!==t)return false;
    if(same&&(!meCache?.campus||PM.campusKey(p.campus)!==PM.campusKey(meCache.campus)||PM.institutionKey(p.institution)!==PM.institutionKey(meCache.institution)))return false;
    if(courseOnly&&(!meCache?.course||PM.MatchingV2.courseKey(p.course)!==PM.MatchingV2.courseKey(meCache.course)))return false;
    if(quickFilter==='help'&&!PM.SubjectSupport.support(p,meCache).canHelp.length)return false;
    return PM.matchDetails(p,meCache).eligible || PM.SubjectSupport.support(p,meCache).canHelp.length>0;
   }).sort((a,b)=>rankPeer(b,meCache)-rankPeer(a,meCache)).slice(0,6);
   grid.innerHTML=filtered.length?filtered.map(peerCard).join(''):'<p class="pm-compact-no-match full-span">No recommended peers yet.</p>';
   $('resultCount').textContent=String(filtered.length);
   // A separate recommendation description is unnecessary on a compact directory page.
   PM.ui?.decorateAvatars?.(grid);
  };
  const updatePager=()=>{
   const pageCount=Math.max(1,Math.ceil(count/PAGE_SIZE));
   if($('directoryPageLabel'))$('directoryPageLabel').textContent=count?`Page ${page+1} of ${pageCount}`:'No students to display';
   if($('directoryRange'))$('directoryRange').textContent=count?`Showing ${page*PAGE_SIZE+1}–${Math.min((page+1)*PAGE_SIZE,count)} of ${count.toLocaleString('en-ZA')} students`:'';
   if($('prevPeers'))$('prevPeers').disabled=page===0;
   if($('nextPeers'))$('nextPeers').disabled=(page+1)*PAGE_SIZE>=count;
   if($('directoryPagination'))$('directoryPagination').hidden=count<=PAGE_SIZE;
   if($('allPeersCount'))$('allPeersCount').textContent=count.toLocaleString('en-ZA');
   if($('directorySingleRange'))$('directorySingleRange').textContent=count<=PAGE_SIZE&&count>0?`Showing ${count.toLocaleString('en-ZA')} student${count===1?'':'s'}`:'';
  };
  const load=async(scroll=false)=>{
   const request=++generation;
   const filters=currentFilters();
   directory.setAttribute('aria-busy','true');
   directory.innerHTML='<div class="peer-directory-loading full-span" role="status"><span class="access-spinner" aria-hidden="true"></span> Loading student profiles…</div>';
   try{
    const result=await db.directoryPage(filters);
    if(request!==generation)return;
    count=result.count;
    // Handle a deleted final page without leaving users on an empty page.
    if(!result.rows.length&&page>0&&count>0){page=Math.max(0,Math.ceil(count/PAGE_SIZE)-1);load(scroll);return;}
    peersCache=result.rows;
    directory.innerHTML=peersCache.length?peersCache.map(peerCard).join(''):'<div class="social-empty full-span"><h3>No students found</h3><p>Try a broader search or clear your filters.</p></div>';
    if($('noResults'))$('noResults').classList.toggle('hidden',count>0);
    updatePager();PM.ui?.decorateAvatars?.(directory);
    if(scroll)$('directoryResultsHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
   }catch(error){if(request!==generation)return;console.warn('Student directory:',error);
    directory.innerHTML=loadFailure('Unable to load student profiles.');
    if($('directoryRange'))$('directoryRange').textContent='The directory could not be loaded.';
   }finally{if(request===generation)directory.removeAttribute('aria-busy');}
  };
  const reload=()=>{page=0;updateFilterDisplay();paintSuggestions();load(false)};
  const debounce=()=>{clearTimeout(debounceTimer);debounceTimer=setTimeout(reload,250)};
  for(const id of ['searchInput','institutionFilter'])$(id)?.addEventListener('input',debounce);
  for(const id of ['methodFilter','timeFilter'])$(id)?.addEventListener('change',reload);
  $('sortFilter')?.addEventListener('change',()=>{toggleSort(false);reload()});
  document.querySelectorAll('[data-peer-quick]').forEach(button=>button.addEventListener('click',()=>{
   const next=button.dataset.peerQuick;
   if(next==='campus'&&(!meCache?.institution||!meCache?.campus)){notify('Add your campus in Edit Profile to use this filter.');return;}
   if(next==='course'&&!meCache?.course){notify('Add your course or grade in Edit Profile to use this filter.');return;}
   if(next==='help'&&!meCache?.help_modules?.length){notify('Select at least one “Need help” subject in Edit Profile first.');return;}
   quickFilter=next;
   if(next==='all'){for(const id of ['institutionFilter','methodFilter','timeFilter'])if($(id))$(id).value='';}
   if($('sameCampusOnly'))$('sameCampusOnly').checked=next==='campus';
   reload();
  }));
  $('sameCampusOnly')?.addEventListener('change',()=>{
   quickFilter=$('sameCampusOnly').checked?'campus':'all';reload();
  });
  const reset=()=>{for(const id of ['searchInput','institutionFilter','methodFilter','timeFilter'])if($(id))$(id).value='';quickFilter='all';if($('sameCampusOnly'))$('sameCampusOnly').checked=false;if($('sortFilter'))$('sortFilter').value='match';toggleAdvanced(false);toggleSort(false);reload();};
  $('clearFilters')?.addEventListener('click',reset);$('emptyReset')?.addEventListener('click',reset);
  $('prevPeers')?.addEventListener('click',()=>{if(page>0){page--;load(true)}});
  $('nextPeers')?.addEventListener('click',()=>{if((page+1)*PAGE_SIZE<count){page++;load(true)}});
  const handleCardAction=async e=>{
   const matchButton=e.target.closest('[data-match-breakdown]');
   if(matchButton){
    const id=matchButton.dataset.matchBreakdown;
    const profile=[...suggested,...peersCache].find(p=>p.id===id);
    if(profile&&meCache)window.PMMatchBreakdown?.open(profile,meCache);
    return;
   }
   const expand=e.target.closest('[data-peer-expand]');
   if(expand){
    const card=expand.closest('.directory-card');
    if(!card)return;
    const open=!card.classList.contains('is-expanded');
    card.classList.toggle('is-expanded',open);
    for(const button of card.querySelectorAll('[data-peer-expand]')){
     button.setAttribute('aria-expanded',String(open));
     button.setAttribute('aria-label',open?'Hide student details':'Show student details');
     button.title=open?'Hide student details':'Show student details';
     const label=button.querySelector('.directory-desktop-toggle-label');
     if(label)label.textContent=open?'Hide details':'Show details';
    }
    return;
   }
   const connect=e.target.closest('[data-connect]'),report=e.target.closest('[data-report]');
   if(connect){
    const id=connect.dataset.connect;if(!validPeerId(id)||connect.disabled)return;
    const existing=db.connectionWith(connectionRows,id);
    if(existing?.recipient_id===db.identity()&&existing.status==='pending'){
     location.href='notifications.html';return;
    }
    connect.disabled=true;const previous=connect.innerHTML;
    connect.textContent='Sending…';
    try{
     const request=await db.sendConnectionRequest(id);
     connectionRows.unshift({...request,sender_id:db.identity(),recipient_id:id});
     for(const button of document.querySelectorAll('[data-connect]')){
      if(button.dataset.connect!==id)continue;
      button.dataset.connectState='pending';button.disabled=true;
      button.innerHTML=`${PM.icon('check')} Requested`;
     }
     notify('Connection request sent. The student will be notified.');
    }catch(error){connect.disabled=false;connect.innerHTML=previous;handleError(error)}
    return;
   }
   if(report){const id=report.dataset.report;if(!validPeerId(id))return;
    const reason=await PMDialogs.prompt('Briefly describe the issue (5–500 characters).',{title:'Report profile',confirmText:'Submit report',minLength:5,maxLength:500});
    if(!reason)return;if(reason.trim().length<5||reason.trim().length>500){notify('Please enter 5–500 characters.');return;}
    try{if(!requireSignedIn())return;await db.reportPeer(id,reason.trim());notify('Report submitted.');}catch(error){handleError(error)}
   }
  };
  grid.addEventListener('click',handleCardAction);
  directory.addEventListener('click',handleCardAction);
  try{suggested=await db.recommendedDirectoryPeers(meCache,blocked);}catch(error){console.warn('Recommendations:',error.message)}
  if(!meCache?.course){const button=document.querySelector('[data-peer-quick="course"]');if(button){button.disabled=true;button.title='Add your course or grade in Edit Profile to enable this filter';}}
  if(!meCache?.institution||!meCache?.campus){const button=document.querySelector('[data-peer-quick="campus"]');if(button){button.disabled=true;button.title='Add your institution and campus in Edit Profile to enable this filter';}}
  updateFilterDisplay();paintSuggestions();await load();
 }
 function peerCard(p){
  const name=PM.formatPersonName(p.full_name)||'New student';
  const complete=Boolean(p.institution&&p.course&&p.full_name&&!/^Student [0-9A-F]{6}$/.test(p.full_name));
  const scoreDetails=PM.matchDetails(p,meCache);
  const score=scoreDetails.score;
  const subjectLabel=p.institution_type==='school'?'Subjects':'Subjects / modules';
  const courseLabel=p.institution_type==='school'?'Grade':'Course / programme';
  const formatLabels={campus:'On campus',virtual:'Online',hybrid:'Hybrid / both'};
  const timeLabels={mornings:'Mornings',afternoons:'Afternoons',evenings:'Evenings',weekends:'Weekends',flexible:'Flexible'};
  const studyFormat=formatLabels[p.study_method]||'Not set';
  const availability=timeLabels[p.availability]||'Not set';
  const matchKnown=complete&&scoreDetails.showScore;
  const matchTier=score>=75?'match-high':score>=50?'match-mid':'match-low';
  const support=PM.SubjectSupport.support(p,meCache);
  const supportNotice=support.canHelp.length?`<div class="pm-support-badge ${support.mutual?'is-mutual':''}">${support.mutual?'↔ Mutual learning':'✓ Can help you with'}: ${esc(support.canHelp.slice(0,2).map(PM.formatStudyText).join(', '))}${support.canHelp.length>2?' +more':''}</div>`:'';
  const relation=db.connectionWith(connectionRows,p.id);
  const connection=PM.connectionAction(relation,db.identity());
  return `<article class="peer-card peer-card-v2 directory-card">
   <div class="peer-card-top"><a href="student.html?id=${encodeURIComponent(p.id)}" class="directory-avatar-link" aria-label="View ${esc(name)} profile">${PM.ui.avatar(name,p.avatar_path,'card-avatar')}</a>${matchKnown?`<button type="button" class="directory-status match-score ${matchTier}" data-match-breakdown="${esc(p.id)}" aria-label="${score}% match with ${esc(name)}. View score breakdown" title="View why you match with ${esc(name)}"><span class="match-number">${score}%</span><span class="match-label">match</span></button>`:`<span class="directory-status ${complete?'is-complete':'is-new'}">${complete?'Student profile':'New to Peermigo'}</span>`}</div>
   <div class="directory-main"><h3><a class="profile-name-link" href="student.html?id=${encodeURIComponent(p.id)}">${esc(name)}</a>${p.is_verified?`<span class="verified-label" title="Institution reviewed by administrator">${PM.icon('shield')} Verified</span>`:''}</h3></div>
   <div class="directory-desktop-summary" aria-label="Student summary">
     <p class="directory-desktop-summary-line"><span>${esc(PM.formatStudyText(p.course)||'Course not listed')}</span><span class="directory-summary-dot" aria-hidden="true"> · </span><span class="directory-summary-institution">${esc(PM.formatStudyText(p.institution)||'Institution not listed')}</span></p>
     <p class="directory-desktop-bio">${esc(String(p.about||'').trim()||'No introduction added yet.')}</p>
   </div>
   <div class="directory-expandable" id="peer-details-${esc(p.id)}"><div class="directory-detail-grid">
     <div class="directory-detail"><p class="directory-field-label">${courseLabel}</p><p class="directory-detail-value${!p.course?' is-empty':''}">${esc(PM.formatStudyText(p.course)||'Not added yet')}</p></div>
     <div class="directory-detail"><p class="directory-field-label">Institution</p><p class="directory-detail-value directory-institution${!p.institution?' is-empty':''}">${esc(PM.formatStudyText(p.institution)||'Not added yet')}</p></div>
     ${p.campus?`<div class="directory-detail directory-campus"><p class="directory-field-label">Campus</p><p class="directory-detail-value">${esc(PM.formatStudyText(p.campus))}</p></div>`:''}
   </div>
   <div class="directory-subjects" aria-label="${esc(subjectLabel.toLowerCase())}">
     <p class="directory-field-label">${subjectLabel}</p>
     ${(p.modules||[]).length?`<div class="directory-topics">${(p.modules||[]).slice(0,3).map(x=>`<span>${esc(PM.formatStudyText(x))}</span>`).join('')}${(p.modules||[]).length>3?`<span>+${p.modules.length-3} more</span>`:''}</div>`:'<p class="directory-subjects-empty">Not added yet</p>'}
   </div>
   ${supportNotice}
   <div class="directory-preferences">
     <div class="directory-preference"><p class="directory-field-label">Study format</p><span class="directory-pref-value${!formatLabels[p.study_method]?' is-empty':''}">${esc(studyFormat)}</span></div>
     <div class="directory-preference"><p class="directory-field-label">Availability</p><span class="directory-pref-value${!timeLabels[p.availability]?' is-empty':''}">${esc(availability)}</span></div>
   </div>
   ${matchKnown&&scoreDetails.signals.length?`<p class="directory-match-explanation" title="Study compatibility estimate">${esc(scoreDetails.signals.slice(0,3).join(' · '))}</p>`:''}
   ${!complete?'<p class="directory-welcome">This student is getting started. You can still say hello!</p>':''}
   </div>
   <div class="peer-card-actions"><a class="view-profile-btn" href="student.html?id=${encodeURIComponent(p.id)}">${PM.icon('user')} Profile</a><button type="button" class="connect-btn" data-connect="${esc(p.id)}" data-connect-state="${connection.state}" ${connection.disabled?'disabled':''}>${PM.icon(connection.state==='accepted'||connection.state==='pending'?'check':'users')} ${connection.label}</button><button type="button" class="directory-expand-button" data-peer-expand aria-controls="peer-details-${esc(p.id)}" aria-label="Show student details" aria-expanded="false" title="Show more student details">${PM.icon('chevron-down')}</button><button type="button" class="small-ghost directory-share" data-share-profile="${esc(p.id)}" title="Share ${esc(name)}'s profile" aria-label="Share profile for ${esc(name)}">${PM.icon('share')}</button><button type="button" class="small-ghost directory-report" title="Report profile" aria-label="Report ${esc(name)}" data-report="${esc(p.id)}">${PM.icon('more')}</button></div>
   <button type="button" class="directory-desktop-toggle" data-peer-expand aria-controls="peer-details-${esc(p.id)}" aria-expanded="false" aria-label="Show student details" title="Show student details"><span class="directory-desktop-toggle-label">Show details</span>${PM.icon('chevron-down')}</button>
  </article>`;
 }
 const loadFailure=(title)=>`<div class="empty-panel" style="grid-column:1/-1" role="alert"><h3>${esc(title)}</h3><p>Check your connection and try again. Your saved information has not been changed.</p><button type="button" class="btn btn-secondary" onclick="location.reload()">Retry loading</button></div>`;
 const gateMarkup=(title)=>`<div class="empty-panel" style="grid-column:1/-1"><h3>${esc(title)}</h3><p>This directory is available to authenticated students only.</p><a href="account.html" class="btn btn-primary">Sign in / Create account</a></div>`;
 let groupsCache=[],memberships=[],managingGroup=null;
 async function initGroups(){
  if(!$('groupsGrid'))return;
  if(!db.user){$('groupsGrid').innerHTML=gateMarkup('Sign in to join study groups');return;}
  const f=$('groupForm'),admin=$('groupAdminPanel');
  $('openGroupForm')?.addEventListener('click',()=>{if(!requireSignedIn())return;f.classList.toggle('hidden');if(!f.classList.contains('hidden'))f.scrollIntoView({behavior:'smooth',block:'start'});});
  $('closeGroupForm')?.addEventListener('click',()=>f.classList.add('hidden'));
  const my=await getMe();if(my){$('groupInstitution').value=my.institution||'';$('groupCampus').value=my.campus||'';}
  const ownsGroup=id=>groupsCache.some(g=>g.id===id&&g.created_by===db.identity());
  const load=async()=>{[groupsCache,memberships]=await Promise.all([db.groups(),db.groupMemberships()]);render();};
  const incomingQ=(new URLSearchParams(location.search).get('q')||'').trim().slice(0,64);if(incomingQ&&$('groupSearch'))$('groupSearch').value=incomingQ;
  const render=()=>{
   const q=PM.normalize(val('groupSearch')),only=$('myGroupsOnly').checked;
   const display=groupsCache.filter(g=>[g.name,g.description,g.module,g.institution,g.campus].some(x=>PM.normalize(x).includes(q))&&(!only||memberships.some(m=>m.group_id===g.id)||g.created_by===db.identity()));
   $('groupsGrid').innerHTML=display.map(g=>{
    const joined=memberships.some(m=>m.group_id===g.id),byMe=g.created_by===db.identity();
    const badge=byMe?'OWNER':joined?'JOINED':PM.formatStudyText(g.module)||'Study group';
    const location=[PM.formatStudyText(g.institution),PM.formatStudyText(g.campus)].filter(Boolean).join(' · ');
    return `<article class="platform-card group-directory-card">
      <div class="group-card-summary">
        <div class="platform-card-top group-card-top"><span class="platform-card-icon">${PM.icon("users")}</span><span class="meta-badge ${byMe?'admin-owner-badge':''}">${esc(badge)}</span></div>
        <h3>${esc(g.name)}</h3>
        <p class="group-card-summary-line">${esc(PM.formatStudyText(g.module)||'Study group')} · ${esc(location||'Campus community')}</p>
        <p class="group-card-description-preview">${esc(g.description||'A friendly place to learn together.')}</p>
      </div>
      <div class="group-card-expandable" id="group-details-${esc(g.id)}">
        <p>${esc(g.description||'A friendly place to learn together.')}</p>
        <div class="platform-card-meta group-card-meta"><span class="pm-group-fact"><small>MODULE</small><b>${esc(PM.formatStudyText(g.module)||'Not set')}</b></span>${g.institution?`<span class="pm-group-fact"><small>INSTITUTION</small><b>${esc(PM.formatStudyText(g.institution))}</b></span>`:''}${g.campus?`<span class="pm-group-fact"><small>CAMPUS</small><b>${esc(PM.formatStudyText(g.campus))}</b></span>`:''}</div>
      </div>
      <div class="platform-card-bottom admin-card-actions group-card-actions">${byMe?`<button type="button" class="btn btn-secondary owner-button" disabled title="The group owner cannot leave; delete the group to close it.">Group owner</button>`:`<button type="button" class="btn ${joined?'btn-secondary':'btn-primary'}" data-join="${esc(g.id)}">${joined?'Leave group':'Join group'} ${joined?'↗':'+'}</button>`}${joined?`<button type="button" class="small-ghost" data-room="${esc(g.id)}">Open chat →</button>`:''}${byMe?`<button type="button" class="small-ghost manage-action" data-manage="${esc(g.id)}">${PM.icon("edit")} Manage</button>`:''}<button type="button" class="small-ghost group-card-toggle" data-group-expand aria-controls="group-details-${esc(g.id)}" aria-expanded="false" aria-label="Show group details"><span class="group-toggle-label">Show details</span>${PM.icon('chevron-down')}</button></div>
    </article>`;
   }).join('');
   $('groupsEmpty').classList.toggle('hidden',display.length>0);
   $('groupCount').textContent=`${display.length} ${display.length===1?'group':'groups'} found`;
  };
  $('groupSearch')?.addEventListener('input',render);$('myGroupsOnly')?.addEventListener('input',render);
  $('groupsGrid').addEventListener('click',async e=>{
   const manage=e.target.closest('[data-manage]'),room=e.target.closest('[data-room]'),toggle=e.target.closest('[data-group-expand]'),btn=e.target.closest('[data-join]');
   if(manage){await openAdmin(manage.dataset.manage);return;}
   if(room){location.href='group-chat.html?group='+encodeURIComponent(room.dataset.room);return;}
   if(toggle){
     const card=toggle.closest('.group-directory-card');
     const expanded=card?.classList.toggle('is-expanded');
     toggle.setAttribute('aria-expanded',String(Boolean(expanded)));
     toggle.setAttribute('aria-label',expanded?'Hide group details':'Show group details');
     const label=toggle.querySelector('.group-toggle-label');
     if(label)label.textContent=expanded?'Hide details':'Show details';
     return;
   }
   if(!btn||!requireSignedIn())return;
   const groupId=btn.dataset.join;
   if(ownsGroup(groupId)){notify('Group owners cannot leave their own group. Use Manage to delete it.');return;}
   try{if(memberships.some(m=>m.group_id===groupId))await db.leaveGroup(groupId);else await db.joinGroup(groupId);
     await load();notify('Group membership updated. ');}
   catch(err){handleError(err);}
  });
  f?.addEventListener('submit',async e=>{e.preventDefault();if(!f.reportValidity()||!requireSignedIn())return;
   const group={name:val('groupName'),module:val('groupModule'),institution:val('groupInstitution'),campus:val('groupCampus'),description:val('groupDescription')};
   try{await db.createGroup(group);f.reset();f.classList.add('hidden');await load();notify('Your study group is ready! ');}
   catch(err){handleError(err);}
  });
  $('closeGroupAdmin')?.addEventListener('click',()=>{admin.classList.add('hidden');managingGroup=null;});
  async function openAdmin(id){
   if(!requireSignedIn()||!ownsGroup(id))return;
   managingGroup=id;const g=groupsCache.find(x=>x.id===id);
   $('manageGroupName').textContent=g.name;
   const fields={adminGroupName:g.name,adminGroupModule:g.module,adminGroupInstitution:g.institution,adminGroupCampus:g.campus,adminGroupDescription:g.description};
   for(const [input,value]of Object.entries(fields))$(input).value=value||'';
   admin.classList.remove('hidden');admin.scrollIntoView({behavior:'smooth',block:'start'});
   await refreshRoster();await refreshBans();
  }
  async function refreshRoster(){
   if(!managingGroup)return;
   const target=managingGroup;
   $('adminMemberList').innerHTML='<p class="loading-state">Loading group members…</p>';
   try{const members=await db.groupRoster(target);
    if(managingGroup!==target)return;
    $('adminMemberCount').textContent=`${members.length}`;
    $('adminMemberList').innerHTML=members.length?members.map(m=>{
      const owner=m.user_id===db.identity();
      return `<div class="admin-member-row"><span class="admin-member-avatar">${esc(PM.initials(PM.formatPersonName(m.full_name)||'Student'))}</span><div class="admin-member-info"><strong>${esc(PM.formatPersonName(m.full_name))}</strong><small>${owner?'Group owner':'Member'}${m.joined_at?' · Joined '+esc(new Date(m.joined_at).toLocaleDateString('en-ZA')):''}</small></div>${owner?'<span class="admin-owner-pill">Owner</span>':`<button type="button" class="admin-remove-member" data-remove-member="${esc(m.user_id)}" aria-label="Remove ${esc(PM.formatPersonName(m.full_name))} from this group">Remove</button>`}</div>`;
    }).join(''):'<p class="loading-state">No members found.</p>';
   }catch(err){$('adminMemberList').innerHTML='<p class="loading-state">Unable to load members. Apply the group-admin SQL upgrade and retry.</p>';handleError(err);}
  }
  $('adminMemberList')?.addEventListener('click',async e=>{
   const btn=e.target.closest('[data-remove-member]');if(!btn||!managingGroup||!ownsGroup(managingGroup)||!requireSignedIn())return;
   const id=btn.dataset.removeMember;if(id===db.identity())return;
   const name=btn.closest('.admin-member-row')?.querySelector('strong')?.textContent||'this member';
   if(!await PMDialogs.confirm(`Their RSVPs will be cancelled and they will be prevented from rejoining until allowed back.`,{title:`Remove ${name}?`,confirmText:'Remove member',kind:'danger'}))return;
   try{await db.removeGroupMember(managingGroup,id);await refreshRoster();await refreshBans();notify('Member removed and restricted from rejoining.');}
   catch(err){handleError(err);}
  });
  async function refreshBans(){
   if(!managingGroup)return;
   const groupId=managingGroup;
   try{const bans=await db.groupBans(groupId);if(managingGroup!==groupId)return;
    $('adminBanCount').textContent=String(bans.length);
    $('adminBanSection').classList.toggle('hidden',bans.length===0);
    $('adminBanList').innerHTML=bans.map(m=>`<div class="admin-member-row"><span class="admin-member-avatar">${esc(PM.initials(m.full_name))}</span><div class="admin-member-info"><strong>${esc(PM.formatPersonName(m.full_name))}</strong><small>Cannot rejoin group</small></div><button type="button" class="admin-unban-member" data-unban-member="${esc(m.user_id)}">Allow rejoin</button></div>`).join('');
   }catch(err){handleError(err);$('adminBanSection').classList.remove('hidden');$('adminBanList').textContent='Unable to load restrictions. Check the SQL upgrade.';}
  }
  $('adminBanList')?.addEventListener('click',async e=>{
   const btn=e.target.closest('[data-unban-member]');if(!btn||!managingGroup||!ownsGroup(managingGroup)||!requireSignedIn())return;
   if(!await PMDialogs.confirm('This student will be able to rejoin the group.',{title:'Allow student back?',confirmText:'Allow rejoining'}))return;
   try{await db.unbanGroupMember(managingGroup,btn.dataset.unbanMember);await refreshBans();notify('Student can now rejoin the group.');}catch(err){handleError(err);}
  });
  $('editGroupForm')?.addEventListener('submit',async e=>{
   e.preventDefault();if(!managingGroup||!ownsGroup(managingGroup)||!e.currentTarget.reportValidity()||!requireSignedIn())return;
   const changes={name:val('adminGroupName'),module:val('adminGroupModule'),institution:val('adminGroupInstitution'),campus:val('adminGroupCampus'),description:val('adminGroupDescription')};
   try{await db.editGroup(managingGroup,changes);await load();$('manageGroupName').textContent=changes.name;notify('Group details updated. ');}
   catch(err){handleError(err);}
  });
  $('deleteGroup')?.addEventListener('click',async()=>{
   if(!managingGroup||!ownsGroup(managingGroup)||!requireSignedIn())return;
   const g=groupsCache.find(x=>x.id===managingGroup);
   if(!await PMDialogs.confirm('All group posts, sessions and RSVPs will be removed. This cannot be undone.',{title:`Delete “${g?.name||'this group'}”?`,confirmText:'Delete group',kind:'danger'}))return;
   try{const id=managingGroup;await db.deleteGroup(id);managingGroup=null;admin.classList.add('hidden');
    await load();notify('Study group deleted. ');}
   catch(err){handleError(err);}
  });
  try{await load();const requested=new URLSearchParams(location.search).get('group');if(requested && /^[0-9a-f-]{36}$/i.test(requested))location.replace('group-chat.html?group='+encodeURIComponent(requested));}catch(err){handleError(err);$('groupsGrid').innerHTML=loadFailure('Could not load study groups.');}
 }
 async function initSessions(){
  if(!$('sessionsGrid'))return;
  if(!db.user){$('sessionsGrid').innerHTML=gateMarkup('Sign in to plan study sessions');return;}
  const f=$('sessionForm'),select=$('sessionGroup');
  let sessions=[],groups=[],member=[],rsvps=[];
  const toInputDate=iso=>{const d=new Date(iso),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;};
  function resetSessionForm(){
   f.reset();$('editingSessionId').value='';$('sessionFormHeading').textContent='Schedule a study session';$('sessionSubmitLabel').textContent='Publish session →';select.disabled=false;
  }
  $('openSessionForm')?.addEventListener('click',()=>{if(!requireSignedIn())return;
   if(f.classList.contains('hidden')){resetSessionForm();f.classList.remove('hidden');f.scrollIntoView({block:'start',behavior:'smooth'});}else{f.classList.add('hidden');resetSessionForm();}
  });
  $('closeSessionForm')?.addEventListener('click',()=>{f.classList.add('hidden');resetSessionForm();});
  const load=async()=>{
   [sessions,groups,member,rsvps]=await Promise.all([db.sessions(),db.groups(),db.groupMemberships(),db.sessionRsvps()]);
   const prior=select.value;
   select.innerHTML='<option value="">Select a group you joined</option>'+groups.filter(g=>member.some(m=>m.group_id===g.id)).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
   if(prior&&[...select.options].some(x=>x.value===prior))select.value=prior;
   render();
  };
  const canManage=s=>s.creator_id===db.identity()||groups.some(g=>g.id===s.group_id&&g.created_by===db.identity());
  const render=()=>{
   const now=Date.now(),future=sessions.filter(s=>new Date(s.ends_at).getTime()>now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
   $('sessionsGrid').innerHTML=future.map(s=>{
    const g=groups.find(g=>g.id===s.group_id),joined=member.some(m=>m.group_id===s.group_id),going=rsvps.some(x=>x.session_id===s.id),owner=canManage(s),upcoming=new Date(s.starts_at).getTime()>now;
    return `<article class="platform-card"><div class="platform-card-top"><span class="platform-card-icon">▦</span><span class="meta-badge">${s.is_online?'ONLINE':'ON CAMPUS'}</span></div><h3>${esc(s.title)}</h3><p>${esc(g?.name||'Study group')}</p><small>◷ ${esc(prettyDate(s.starts_at))} – ${esc(fmtTime(s.ends_at))}</small><small style="margin-top:7px">⌂ ${esc(s.location_label)}</small><div class="platform-card-meta"><span>${Number(s.capacity)} places max</span>${going?'<span>✓ Your RSVP</span>':''}${owner?'<span class="admin-ownership-meta">♛ You can manage</span>':''}</div><div class="platform-card-bottom session-card-actions"><button type="button" class="btn ${going?'btn-secondary':'btn-primary'}" data-rsvp="${esc(s.id)}" ${!joined?'title="Join this study group to RSVP"':''}>${going?'Cancel RSVP':joined?'RSVP — save my spot':'Join group first'} →</button>${!joined&&g?`<a href="groups.html" class="small-ghost">Groups ↗</a>`:''}${owner?`<div class="session-admin-actions">${upcoming?`<button class="small-ghost" type="button" data-edit-session="${esc(s.id)}">✎ Edit</button>`:''}<button class="small-ghost session-delete" type="button" data-delete-session="${esc(s.id)}">Delete</button></div>`:''}</div></article>`;
   }).join('');
   $('sessionsEmpty').classList.toggle('hidden',future.length>0);
  };
  $('sessionsGrid').addEventListener('click',async e=>{
   const edit=e.target.closest('[data-edit-session]'),remove=e.target.closest('[data-delete-session]'),rsvp=e.target.closest('[data-rsvp]');
   if(edit){
    const s=sessions.find(x=>x.id===edit.dataset.editSession);if(!s||!canManage(s)||!requireSignedIn())return;
    if(new Date(s.starts_at)<=new Date()){notify('Sessions cannot be edited after they start.');return;}
    resetSessionForm();$('editingSessionId').value=s.id;
    select.value=s.group_id;select.disabled=true;
    $('sessionTitle').value=s.title;$('sessionCapacity').value=s.capacity;
    $('sessionStart').value=toInputDate(s.starts_at);$('sessionEnd').value=toInputDate(s.ends_at);
    $('sessionLocation').value=s.location_label;$('sessionFormat').value=s.is_online?'online':'campus';
    $('sessionFormHeading').textContent='Edit study session';$('sessionSubmitLabel').textContent='Save session changes →';
    f.classList.remove('hidden');f.scrollIntoView({block:'start',behavior:'smooth'});return;
   }
   if(remove){
    const s=sessions.find(x=>x.id===remove.dataset.deleteSession);if(!s||!canManage(s)||!requireSignedIn())return;
    if(!await PMDialogs.confirm('All RSVPs for this study session will be removed.',{title:`Cancel “${s.title}”?`,confirmText:'Cancel session',kind:'danger'}))return;
    try{await db.deleteSession(s.id);if($('editingSessionId').value===s.id){resetSessionForm();f.classList.add('hidden');}await load();notify('Session cancelled. ');}catch(err){handleError(err);}return;
   }
   if(!rsvp||!requireSignedIn())return;
   const id=rsvp.dataset.rsvp,s=sessions.find(x=>x.id===id);if(!s)return;
   if(!member.some(m=>m.group_id===s.group_id)){notify('Join the study group before reserving your place.');return;}
   try{if(rsvps.some(x=>x.session_id===id))await db.cancelRsvp(id);else await db.rsvp(id);await load();notify('RSVP updated. ');}catch(err){handleError(err);}
  });
  f?.addEventListener('submit',async e=>{
   e.preventDefault();if(!f.reportValidity()||!requireSignedIn())return;
   const start=new Date(val('sessionStart')),end=new Date(val('sessionEnd'));
   if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start.getTime()<=Date.now()||end<=start||end-start>8*3600*1000){notify('Choose a future session lasting between 1 minute and 8 hours.');return;}
   const details={title:val('sessionTitle'),starts_at:start.toISOString(),ends_at:end.toISOString(),location_label:val('sessionLocation'),is_online:val('sessionFormat')==='online',capacity:Number(val('sessionCapacity'))};
   const editing=$('editingSessionId').value;
   try{if(editing){await db.editSession(editing,details);}else{await db.createSession({...details,group_id:select.value});}
    f.classList.add('hidden');resetSessionForm();await load();notify(editing?'Session updated successfully.':'Study session scheduled! ');
   }catch(err){handleError(err);}
  });
  try{await load();}catch(err){handleError(err);if($('sessionsGrid'))$('sessionsGrid').innerHTML=loadFailure('Could not load study sessions.');}
 }
 let selectedPeer=null,thread=[],inboxPeers=[];
 async function initMessages(){if(!$('conversationList'))return;if(!db.user){$('conversationList').innerHTML='<a class="conversation-item" href="account.html">Sign in for private conversations →</a>';return;}
  try{blocked=await db.blockedPeers();const msgs=await db.inbox();const partners=[...new Set(msgs.map(x=>x.sender_id===db.identity()?x.recipient_id:x.sender_id))].filter(id=>id!==db.identity()&&!blocked.includes(id));const requested=new URLSearchParams(location.search).get('peer');if(requested&&/^[0-9a-f-]{36}$/i.test(requested)&&!blocked.includes(requested))partners.unshift(requested);
   const unique=[...new Set(partners)];inboxPeers=await db.profilesByIds(unique);renderContacts(unique);if(requested&&unique.includes(requested))await openChat(requested);else if(unique.length&&!matchMedia('(max-width:720px)').matches)await openChat(unique[0]);else if(!unique.length)$('conversationList').innerHTML='<p class="loading-state">Your inbox is empty. Find a peer to start a conversation.</p>';
  }catch(err){handleError(err);$('conversationList').innerHTML=loadFailure('Could not load your conversations.')}
  const leaveChat=()=>{$('conversationList')?.closest('.messaging-layout')?.classList.remove('chat-open');document.body.classList.remove('pm-private-chat-open');selectedPeer=null;closeEmojiPicker();if($('emojiPickerToggle'))$('emojiPickerToggle').disabled=true;};
  $('chatHeader')?.addEventListener('click',event=>{if(event.target.closest('#chatMobileBack'))leaveChat();});
  function renderContacts(ids){$('conversationList').innerHTML=ids.map(id=>{const p=inboxPeers.find(x=>x.id===id);if(!p)return '';return `<button type="button" class="conversation-item ${id===selectedPeer?'selected':''}" data-peer="${esc(id)}">${PM.ui.avatar(p.full_name,p.avatar_path,'conversation-avatar')}<span><strong>${esc(PM.formatPersonName(p.full_name))}</strong><small>${esc(PM.formatStudyText(p.institution))}</small></span></button>`}).join('');$('conversationList').querySelectorAll('[data-peer]').forEach(btn=>btn.addEventListener('click',()=>openChat(btn.dataset.peer)))}
  async function openChat(id){const p=inboxPeers.find(x=>x.id===id);if(!p||blocked.includes(id))return;selectedPeer=id;const layout=$('conversationList').closest('.messaging-layout');layout?.classList.add('chat-open');document.body.classList.add('pm-private-chat-open');
   $('conversationList').querySelectorAll('[data-peer]').forEach(el=>el.classList.toggle('selected',el.dataset.peer===id));$('chatHeader').innerHTML=`<button class="pm-chat-back-button" id="chatMobileBack" type="button" aria-label="Back to all conversations">←</button><a href="student.html?id=${encodeURIComponent(p.id)}" class="pm-chat-header-avatar-link" aria-label="Open ${esc(PM.formatPersonName(p.full_name))} profile">${PM.ui.avatar(p.full_name,p.avatar_path,'conversation-avatar')}</a><div class="pm-chat-header-main"><strong class="pm-chat-peer-name">${esc(PM.formatPersonName(p.full_name))}${p.is_verified?` <span class="pm-chat-verified" title="Verified student" aria-label="Verified student">${PM.icon('shield')}<span class="sr-only">Verified</span></span>`:''}</strong>${p.show_activity!==false?`<small class="activity-status" id="peerActivity">${esc(PM.ui.status(p))}</small>`:'<small class="pm-chat-private-status">Last seen hidden</small>'}</div><button class="text-button pm-chat-safety-control" type="button" id="safetyOptions" aria-label="Safety options: block or report" title="Block or report this account"><span aria-hidden="true">⋯</span></button>`;
   $('messageBody').disabled=false;$('sendMessageBtn').disabled=false;$('emojiPickerToggle').disabled=false;
   $('safetyOptions').addEventListener('click',async()=>{const choice=await PMDialogs.choose('Safety options',[{label:'Block student',value:'BLOCK',description:'Stop messages and connections.'},{label:'Report student',value:'REPORT',description:'Tell us about a concern.'}]);if(!choice)return;if(choice==='BLOCK'){if(!await PMDialogs.confirm('You will no longer be able to message each other.',{title:'Block this student?',confirmText:'Block student',kind:'danger'}))return;try{await db.blockPeer(id);blocked.push(id);notify('Student blocked.');location.href='messages.html'}catch(e){handleError(e)}}else if(choice==='REPORT'){const reason=await PMDialogs.prompt('Briefly describe the issue (5–500 characters).',{title:'Report student',confirmText:'Submit report',minLength:5,maxLength:500});if(reason)try{await db.reportPeer(id,reason.trim());notify('Report submitted.')}catch(e){handleError(e)}}});
   await reloadThread();
  }
  async function reloadThread(){if(!selectedPeer)return;const peerAtStart=selectedPeer;try{const result=await db.messagesWith(peerAtStart);if(peerAtStart!==selectedPeer)return;thread=result;const chat=$('chatMessages');chat.innerHTML=thread.length?thread.map(x=>`<div class="chat-bubble ${x.sender_id===db.identity()?'mine':''}"><p>${esc(x.body)}</p><div class="bubble-attachments" data-message-files="${esc(x.id)}"></div><small>${esc(prettyDate(x.created_at))}</small></div>`).join(''):`<div class="chat-placeholder"><div class="placeholder-art">${PM.icon("mail")}</div><h3>Say hello first.</h3><p>${'Introduce yourself, your module, and what you would like to work on together.'}</p></div>`;
    const messageContainers=[...chat.querySelectorAll('[data-message-files]')];const messageAttachments=await db.attachmentsForMany('message',messageContainers.map(x=>x.dataset.messageFiles));await Promise.all(messageContainers.map(node=>PM.ui.showFiles(node,'message',node.dataset.messageFiles,false,messageAttachments[node.dataset.messageFiles]||[])));
    
    chat.scrollTop=chat.scrollHeight;
    const unread=thread.filter(m=>m.recipient_id===db.identity()&&!m.read_at).map(m=>m.id);if(unread.length){await db.markMessageRead(unread);window.dispatchEvent(new Event('pm-messages-read'));}
   }catch(err){handleError(err)}}
  // Accessible emoji picker: append at the insertion point without replacing typed text.
  const emojiToggle=$('emojiPickerToggle'), emojiPanel=$('emojiPickerPanel'), messageInput=$('messageBody');
  const emojiChoices=['😀','😄','😂','🤣','😊','😍','🥰','😎','🤩','🥳','😅','🥹','🙂','🙃','😉','🤔','😮','😢','😭','😴','😇','😌','😤','🫶','❤️','💜','💙','💚','💯','🔥','✨','⭐','🎉','👍','👎','👏','🙌','🙏','👋','🤝','💪','💡','📚','📖','✍️','🎓','💻','✅','🚀'];
  const closeEmojiPicker=(returnFocus=false)=>{if(!emojiPanel||!emojiToggle)return;emojiPanel.hidden=true;emojiToggle.setAttribute('aria-expanded','false');if(returnFocus)emojiToggle.focus();};
  // Called above by the mobile Back button once the student leaves a conversation.
  if(emojiToggle&&emojiPanel&&messageInput){
   // The chat window clips overflow; place the fixed tray at document level so it stays visible.
   document.body.appendChild(emojiPanel);
   emojiPanel.innerHTML='<div class="pm-emoji-title">Add an emoji</div><div class="pm-emoji-grid">'+emojiChoices.map(emoji=>`<button type="button" class="pm-emoji-choice" data-emoji="${emoji}" aria-label="Insert ${emoji}">${emoji}</button>`).join('')+'</div>';
   const positionEmojiPanel=()=>{
    const box=emojiToggle.getBoundingClientRect();const width=Math.min(304,window.innerWidth-24);
    const left=Math.min(Math.max(12,box.right-width),window.innerWidth-width-12);
    emojiPanel.style.width=width+'px';emojiPanel.style.left=left+'px';
    const height=emojiPanel.offsetHeight||276;
    emojiPanel.style.top=(box.top-height-8>=8?box.top-height-8:Math.min(window.innerHeight-height-8,box.bottom+8))+'px';
   };
   emojiToggle.addEventListener('click',()=>{
    if(emojiToggle.disabled||messageInput.disabled||!selectedPeer)return;
    const open=emojiPanel.hidden;emojiPanel.hidden=!open;emojiToggle.setAttribute('aria-expanded',String(open));
    if(open){positionEmojiPanel();emojiPanel.querySelector('.pm-emoji-choice')?.focus();}
   });
   emojiPanel.addEventListener('click',event=>{
    const choice=event.target.closest('[data-emoji]');if(!choice||!selectedPeer)return;
    const emoji=choice.dataset.emoji;
    const start=messageInput.selectionStart??messageInput.value.length,end=messageInput.selectionEnd??start;
    if(messageInput.value.length-(end-start)+emoji.length>messageInput.maxLength){notify('Your message is too long to add another emoji.');return;}
    messageInput.setRangeText(emoji,start,end,'end');messageInput.dispatchEvent(new Event('input',{bubbles:true}));
    closeEmojiPicker();messageInput.focus();
   });
   document.addEventListener('pointerdown',event=>{if(!emojiPanel.hidden&&!emojiPanel.contains(event.target)&&!emojiToggle.contains(event.target))closeEmojiPicker();});
   document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!emojiPanel.hidden){event.preventDefault();closeEmojiPicker(true);}});
   window.addEventListener('resize',()=>{if(!emojiPanel.hidden)positionEmojiPanel();});
  }
  $('messageForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!selectedPeer||!requireSignedIn())return;
    const body=val('messageBody'),files=$('chatFileInput')?.files;if(!body&&!files?.length)return;
    const btn=$('sendMessageBtn'),originalSendMarkup=btn.innerHTML;btn.disabled=true;btn.textContent='Sending…';
    try{const message=await db.sendMessage(selectedPeer,body||'Shared an attachment');
      $('messageBody').value='';$('messageBody').dispatchEvent(new Event('input',{bubbles:true}));
      if(files?.length){try{await db.uploadAttachments('message',message.id,files)}catch(err){await reloadThread();handleError(new Error('Message sent, but the file was not attached: '+err.message));return}}
      if($('chatFileInput'))$('chatFileInput').value='';if($('chatFilesChosen'))$('chatFilesChosen').textContent='';
      await reloadThread();notify('Message sent!');
    }catch(err){handleError(err)}finally{btn.disabled=false;btn.innerHTML=originalSendMarkup}
  });
  if(db.client&&db.user)setInterval(async()=>{
    if(!selectedPeer||document.visibilityState!=='visible')return;
    try{const {data,error}=await db.client.from('profiles').select('show_activity,last_seen_at').eq('id',selectedPeer).maybeSingle();
      if(error)return;const parent=$('chatHeader')?.querySelector('div');if(!parent)return;
      let status=$('peerActivity');if(data?.show_activity===false){status?.remove();return;}
      if(!status){status=document.createElement('small');status.className='activity-status';status.id='peerActivity';parent.append(status)}
      status.textContent=PM.ui.status(data);
    }catch(e){console.warn('Activity refresh:',e.message)}
  },45000);
  if(db.client&&db.user){db.client.channel('dm-incoming-'+db.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{if(selectedPeer&&(payload.new.sender_id===selectedPeer||payload.new.recipient_id===selectedPeer))reloadThread()}).subscribe()}
 }
 async function renderNotifications(){
  const list=$('notificationsList');if(!list)return;
  if(!db.user){list.innerHTML=gateMarkup('Sign in to see notifications');return;}
  try{
   const [notifications,connections]=await Promise.all([db.notifications(),db.connectionRequests()]);
   const received=new Map(connections.filter(r=>r.recipient_id===db.identity()&&r.status==='pending').map(r=>[r.sender_id,r]));
   list.innerHTML=notifications.map(n=>{
    const sender=n.kind==='connect'&&n.title==='New connection request'&&/^student\.html\?id=([0-9a-f-]{36})$/i.test(n.link||'')?n.link.split('=')[1]:null;
    const request=sender?received.get(sender):null;
    return `<div class="notification-item ${n.is_read?'':'unread'} ${n.kind==='moderation'?'pm-moderation-notification':''}"><span class="notification-symbol">${PM.icon(n.kind==='moderation'?'shield':n.kind==='connect'?'users':n.kind==='message'?'mail':n.kind==='group'?'users':n.kind==='note'?'book':'calendar')}</span><div>${n.kind==='moderation'?'<span class="pm-moderation-label">Important account notice</span>':''}<h3>${esc(n.title)}</h3><p>${esc(n.description)}</p><small>${esc(prettyDate(n.created_at))}</small>${request?`<div class="pm-request-actions"><button type="button" data-request-action="accept" data-request-id="${esc(request.id)}">Accept request</button><button type="button" data-request-action="decline" data-request-id="${esc(request.id)}">Decline</button></div>`:''}</div><a href="${safeLink(n.link)}" class="text-button">${n.kind==='moderation'?'View details ↗':n.kind==='connect'?'View profile ↗':'Open ↗'}</a></div>`;
   }).join('');
   $('notificationsEmpty').classList.toggle('hidden',notifications.length>0);
   $('markAllRead').disabled=!notifications.some(n=>!n.is_read);
   $('markAllRead').onclick=async()=>{try{await db.markNotificationRead(notifications.filter(n=>!n.is_read).map(n=>n.id));await renderNotifications();await refreshBadge();notify('All notifications marked as read.')}catch(e){handleError(e)}};
  }catch(err){handleError(err);list.innerHTML='<div class="social-empty">Notifications are unavailable. Check your connection and Supabase connection-request setup.</div>'}
 }
 $('notificationsList')?.addEventListener('click',async(event)=>{
  const button=event.target.closest('[data-request-action]');if(!button||button.disabled)return;
  const accept=button.dataset.requestAction==='accept';
  const actions=button.closest('.pm-request-actions');const buttons=[...actions.querySelectorAll('button')];
  buttons.forEach(b=>b.disabled=true);
  try{
   await db.respondConnectionRequest(button.dataset.requestId,accept);
   notify(accept?'Connection accepted. You can now message this student.':'Connection request declined.');
   await renderNotifications();await refreshBadge();
  }catch(error){buttons.forEach(b=>b.disabled=false);handleError(error)}
 });
 const safeLink=link=>/^((messages|groups|sessions|notifications|student|notes|account-status|verification)\.html)(\?[-a-zA-Z0-9_=%&.]*)?$/.test(link||'')?esc(link):'notifications.html';
 async function initAccount(){
  const form=$('authForm');if(!form)return;
  if(db.user){$('authLoggedIn').classList.remove('hidden');$('authLoggedOut').classList.add('hidden');$('authEmail').textContent=db.user.email||'';const target=safeNext();if(target){$('accountContinueLink').href=target;$('accountContinueLink').textContent='Continue where you left off →';}}
  $('signOutButton')?.addEventListener('click',async()=>{try{await db.signOut();location.href='account.html'}catch(e){handleError(e)}});
  const requiredFields=[...form.querySelectorAll('[data-signup-required]')];
  PM.signupWizard?.init();
  PM.signupLearning=PM.SubjectSupport?.mount('signupModules','signupLearningSelector',{typeId:'signupInstitutionType'});
  const institutionType=$('signupInstitutionType'),institutionName=$('signupInstitution'),suggestions=$('signupInstitutionSuggestions');
  const updateSuggestions=()=>{if(!suggestions||!institutionType)return;suggestions.replaceChildren();for(const name of PM.INSTITUTIONS[institutionType.value]||[]){const opt=document.createElement('option');opt.value=name;suggestions.append(opt)}};
  let create=false,submitting=false;
  const signupCourse=$('signupCourse'),signupGrade=$('signupGrade'),signupModules=$('signupModules'),signupCampus=$('signupCampus'),signupStudyMethod=$('signupStudyMethod');
  const updateSignupCourseGrade=()=>{
   const school=institutionType?.value==='school';
   $('signupCourseGroup')?.classList.toggle('hidden',school);
   $('signupGradeGroup')?.classList.toggle('hidden',!school);
   $('signupCampusGroup')?.classList.toggle('hidden',school);
   $('signupInstitutionLabel').innerHTML=school?'School name <span aria-hidden="true">*</span>':'Institution name <span aria-hidden="true">*</span>';
   institutionName.placeholder=school?'e.g. Vaal High School':'Start typing your institution';
   $('signupModulesLabel').innerHTML=school?'School subjects <span aria-hidden="true">*</span>':'Subjects or modules <span aria-hidden="true">*</span>';
   $('signupModulesHint').textContent='Enter at least one '+(school?'school subject':'subject or module')+'. Separate multiple entries with commas (up to 10).';
   signupModules.placeholder=school?'e.g. Mathematics, English, Physical Sciences':'e.g. Web Development, Business Analysis';
   if(signupCourse){signupCourse.required=create&&!school;signupCourse.disabled=!create||school;}
   if(signupGrade){signupGrade.required=create&&school;signupGrade.disabled=!create||!school;}
   updateSignupCampusRequirement();
  };
  const updateSignupCampusRequirement=()=>{
   const school=institutionType?.value==='school';
   const required=create&&!school&&signupStudyMethod?.value==='campus';
   const label=$('signupCampusRequiredText');
   if(signupCampus){signupCampus.disabled=!create||school;signupCampus.required=required;}
   if(label){label.textContent=required?'*':'Optional';label.classList.toggle('pm-optional',!required);label.classList.toggle('pm-required-symbol',required);}
  };
  signupStudyMethod?.addEventListener('change',updateSignupCampusRequirement);
  institutionType?.addEventListener('change',()=>{updateSuggestions();if(institutionName)institutionName.value='';updateSignupCourseGrade();});
  const toggle=v=>{
   create=v;
   document.documentElement.classList.toggle('pm-signup-active',v);
   $('tabSignIn').classList.toggle('active',!v);$('tabSignUp').classList.toggle('active',v);
   $('tabSignIn').setAttribute('aria-selected',String(!v));$('tabSignUp').setAttribute('aria-selected',String(v));
   $('authTitle').textContent=v?'Create your student account.':'Welcome back.';
   $('authSubtitle').textContent=v?'Find your ideal study partner on Peermigo.':'Sign in to continue growing together.';
   $('authSignupFields').classList.toggle('hidden',!v);
   $('authConfirmGroup').classList.toggle('hidden',!v);
   $('authLegalNote').classList.toggle('hidden',!v);
   $('forgotPasswordLink')?.classList.toggle('hidden',v);
   $('authAdult').classList.toggle('hidden',!v);
   $('authAdultCheck').required=v;
   $('authPasswordConfirm').required=v;
   $('authPasswordConfirm').disabled=!v;
   requiredFields.forEach(el=>{el.required=v;el.disabled=!v});
   // Subjects are required for reliable matching.
   signupModules.disabled=!v;signupModules.required=v;
   updateSignupCourseGrade();
   PM.signupWizard?.sync(v);
   $('authSubmit').textContent=v?'Create account →':'Sign in →';
   $('authPassword').autocomplete=v?'new-password':'current-password';
   $('authDemoNote').classList.toggle('hidden',!v);
   $('authFeedback').classList.add('hidden');
  };
  $('signupSuccessSignIn')?.addEventListener('click',()=>{
    $('signupSuccess')?.classList.add('hidden');
    document.documentElement.classList.remove('pm-signup-success-active');
    $('authTabs')?.classList.remove('hidden');
    $('authForm').classList.remove('hidden');
    $('authPassword').value='';$('authPasswordConfirm').value='';
    toggle(false);
    $('authEmailInput').focus();
  });
  $('tabSignIn').addEventListener('click',()=>toggle(false));
  $('tabSignUp').addEventListener('click',()=>toggle(true));
  toggle(new URLSearchParams(location.search).get('mode')==='signup');
  for(const field of ['signupFirstName','signupSurname'])$(field)?.addEventListener('blur',()=>{$(field).value=PM.formatPersonName($(field).value)});
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(submitting)return;
   if(create && PM.signupWizard && !PM.signupWizard.ready()){
    PM.signupWizard.advance();return;
   }
   if(!db.client){feedback('authFeedback','Unable to connect to the service. Please try again shortly.',true);return;}
   if(!create&&!form.reportValidity())return;
   const email=val('authEmailInput'),password=$('authPassword').value;
   let details=null;
   if(create){
    if(password!==$('authPasswordConfirm').value){feedback('authFeedback','Your passwords do not match. Please check them and try again.',true);$('authPasswordConfirm').focus();return;}
    const school=institutionType.value==='school';
    const grade=signupGrade.value;
    const course=school?grade:PM.formatStudyText(val('signupCourse'));
    const firstName=PM.formatPersonName(val('signupFirstName')),surname=PM.formatPersonName(val('signupSurname'));
    const name=[firstName,surname].filter(Boolean).join(' ');
    const institution=PM.canonicalInstitution(val('signupInstitution'),institutionType.value);
    const moduleInput=val('signupModules').trim();
    const modules=moduleInput?moduleInput.split(',').map(PM.formatStudyText).filter(Boolean):[];
    if(!firstName||!surname){
      feedback('authFeedback','Please enter your first name and surname.',true);
      (!firstName?$('signupFirstName'):$('signupSurname')).focus();return;
    }
    if(!PM.validPersonName(firstName)||!PM.validPersonName(surname)){
      feedback('authFeedback','First name and surname must each contain at least 2 letters. Spaces, apostrophes and hyphens are allowed.',true);
      (!PM.validPersonName(firstName)?$('signupFirstName'):$('signupSurname')).focus();return;
    }
    if(name.length>80){
      feedback('authFeedback','Your first name and surname together must be 80 characters or fewer. Please use a shorter form of your name.',true);
      $('signupFirstName').focus();return;
    }
    if(school&&!/^Grade (8|9|10|11|12)$/.test(grade)){
      feedback('authFeedback','Please select your school grade.',true);signupGrade.focus();return;
    }
    if(name.length<3||name.length>80||institution.length<2||institution.length>120||course.length<2||course.length>100){
      feedback('authFeedback','Please complete your name, institution and '+(school?'grade':'course or programme')+' using valid details.',true);return;
    }
    const detailsForCheck={institution_type:institutionType.value,institution,campus:school?'':PM.formatStudyText(val('signupCampus')),course,modules,study_method:signupStudyMethod.value};
    const issue=PM.matchEssentialsValidation(detailsForCheck);
    if(issue){
      const fieldMap={institution_type:'signupInstitutionType',institution:'signupInstitution',course:school?'signupGrade':'signupCourse',campus:'signupCampus',modules:'signupModules',study_method:'signupStudyMethod'};
      feedback('authFeedback',issue.message,true);$(fieldMap[issue.field])?.focus();return;
    }
    details={full_name:name,given_names:firstName,surname,...detailsForCheck,...PM.signupLearning?.get(),discoverable:true};
    if(!form.reportValidity())return;
   }
   const submit=$('authSubmit');submitting=true;submit.disabled=true;submit.textContent=create?'Creating your account…':'Signing in…';
   try{
    if(create){
      const result=await db.signUp(email,password,details);
      if(result.session){location.href=safeNext()||'index.html';return;}
      // Hide the long signup form instead of showing its confirmation above the viewport.
      // The email check message is the only screen users see after successful signup.
      const success=$('signupSuccess');
      $('signupSuccessEmail').textContent=email;
      $('authTabs')?.classList.add('hidden');
      $('authForm').classList.add('hidden');
      $('authDemoNote')?.classList.add('hidden');
      $('authFeedback')?.classList.add('hidden');
      $('authTitle').textContent='You’re almost there.';
      $('authSubtitle').textContent='Your registration was received successfully.';
      success.classList.remove('hidden');
      document.documentElement.classList.add('pm-signup-success-active');
      requestAnimationFrame(()=>{success.scrollIntoView({behavior:'smooth',block:'center'});success.focus({preventScroll:true});});
    }else{await db.signIn(email,password);location.href=safeNext()||'index.html';}
   }catch(err){feedback('authFeedback',err.message||'Account request failed. Please try again.',true);console.warn('Account:',err.message);}
   finally{submitting=false;submit.disabled=false;submit.textContent=create?'Create account →':'Sign in →';}
  });
 }
 async function initRecovery(){
  const forgotForm=$('forgotForm');
  if(forgotForm){
    if(db.mode!=='live'||!db.client){feedback('forgotFeedback','Password recovery needs a working Supabase connection.',true);$('forgotSubmit').disabled=true;}
    forgotForm.addEventListener('submit',async e=>{
      e.preventDefault();if(!forgotForm.reportValidity()||!db.client)return;
      const submit=$('forgotSubmit');submit.disabled=true;submit.textContent='Sending…';
      try{
        await db.sendPasswordReset(val('forgotEmail'));
        feedback('forgotFeedback','If this email belongs to an account, a password-reset link will arrive shortly. Please check your inbox and spam folder.');
        forgotForm.reset();
      }catch(err){feedback('forgotFeedback',err.message||'Could not send a reset link. Please try again.',true);}
      finally{submit.disabled=false;submit.textContent='Send reset link →';}
    });
  }
  const resetForm=$('resetForm');
  if(resetForm){
    // A recovery email establishes an authenticated session through Supabase Auth.
    // Never accept credentials or tokens pasted into a form here.
    $('resetLoading').classList.remove('hidden');
    let valid=false;
    if(db.client){
      try{
        const {data,error}=await db.client.auth.getUser();
        if(error)throw error;
        valid=Boolean(data?.user && (window.__pmRecoveryLink || db.recoveryEvent));
        if(valid){$('resetAccountEmail').textContent='Updating password for '+(data.user.email||'your account');}
      }catch(err){console.warn('Recovery session:',err.message);}
    }
    $('resetLoading').classList.add('hidden');
    (valid?$('resetForm'):$('resetInvalid')).classList.remove('hidden');
    resetForm.addEventListener('submit',async e=>{
      e.preventDefault();if(!resetForm.reportValidity()||!db.client)return;
      const password=$('resetPassword').value;
      if(password!==$('resetPasswordConfirm').value){feedback('resetFeedback','Passwords do not match. Please try again.',true);return;}
      const btn=$('resetSubmit');btn.disabled=true;btn.textContent='Updating…';
      try{
        const {data,error}=await db.client.auth.getUser();if(error||!data?.user)throw new Error('Session expired. Request a fresh password-reset link.');
        await db.updatePassword(password);
        await db.signOut();
        resetForm.reset();resetForm.classList.add('hidden');$('resetSuccess').classList.remove('hidden');
        feedback('resetFeedback','Password updated successfully. Sign in again with your new password.');
      }catch(err){feedback('resetFeedback',err.message||'Could not update password. Request a new link and try again.',true);}
      finally{btn.disabled=false;btn.textContent='Update password →';}
    });
  }
 }
 
 async function init(){setupNav();await db.init();setupTopHub();setupTopProfileDropdown();setupSmartMobileHeader();
  // A paused member may sign in to reactivate, but cannot browse the student area.
  // The SQL migration also restricts direct database access during deactivation.
  if(db.user){
   // Read the user's own account status. Restricted students may review and appeal.
   try {
    const {data:moderation,error:moderationError}=await db.requireClient().rpc('pm_my_moderation_status');
    if(moderationError)throw moderationError;
    if(['suspended','disabled'].includes(moderation?.status)){
     location.replace('account-status.html');return;
    }
   }catch(error){console.warn('Moderation status could not be checked:',error.message);}
   try{const me=await db.profile();const page=location.pathname.split('/').pop()||'index.html';
    if(me?.deactivated_at && page!=='settings.html' && page!=='settings-account.html' && page!=='account.html'){
     location.replace('settings-account.html');return;
    }
   }catch(error){console.warn('Account status could not be checked:',error.message);}
  }
  if(document.documentElement.dataset.access==='student'){
   if(!db.client){const box=$('accessCheck');if(box){box.innerHTML='<h2>We could not check your account</h2><p>Check your internet connection, then try again.</p><button class="btn btn-primary" type="button" id="accessRetry">Try again ↗</button>';box.querySelector('#accessRetry').addEventListener('click',()=>location.reload());}return;}
   if(!db.user){const path=location.pathname.split('/').pop()||'index.html';location.replace('account.html?next='+encodeURIComponent(path+location.search));return;}
   document.documentElement.classList.add('pm-access-ok');
  }
  updateMode();document.documentElement.classList.add('pm-auth-ready');refreshTopProfile().catch(console.warn);initMemberHome().catch(console.warn);refreshBadge().catch(console.warn);refreshMessageBadge();subscribeNotifications();subscribeMessageBadge();if($('profileForm'))await initProfile();if($('matchesGrid'))await initMatches();if($('groupsGrid'))await initGroups();if($('sessionsGrid'))await initSessions();if($('conversationList'))await initMessages();if($('notificationsList'))await renderNotifications();if($('authForm'))await initAccount();if($('forgotForm')||$('resetForm'))await initRecovery();window.dispatchEvent(new Event('pm-ready'));}
 window.addEventListener('pm-profile-photo-changed',()=>refreshTopProfile().catch(console.warn));
 window.addEventListener('pm-profile-saved',()=>refreshTopProfile().catch(console.warn));
 window.addEventListener('pm-auth-changed',()=>{
  if(signingOutFromTopMenu)return;
  if(document.documentElement.dataset.access==='student'&&!db.user){const path=location.pathname.split('/').pop()||'index.html';location.replace('account.html?next='+encodeURIComponent(path+location.search));return;}
  if(document.documentElement.classList.contains('pm-auth-ready')){updateMode();refreshTopProfile().catch(console.warn);refreshMessageBadge();subscribeMessageBadge();initMemberHome().catch(console.warn);}
 });
 document.addEventListener('DOMContentLoaded',()=>init().catch(handleError));
})();
