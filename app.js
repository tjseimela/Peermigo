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
 function rankPeer(p,me){if(!me||p.id===me.id||!me.institution||!p.institution)return 0;let n=0;
  if(PM.institutionKey(p.institution)===PM.institutionKey(me.institution))n+=45;
  if(p.campus&&me.campus&&PM.campusKey(p.campus)===PM.campusKey(me.campus)&&PM.institutionKey(p.institution)===PM.institutionKey(me.institution))n+=22;
  const myModules=new Set((me.modules||[]).map(PM.normalize));n+=Math.min(24,(p.modules||[]).filter(m=>myModules.has(PM.normalize(m))).length*12);
  if(p.availability===me.availability||p.availability==='flexible'||me.availability==='flexible')n+=6;
  if(p.study_method===me.study_method||p.study_method==='hybrid'||me.study_method==='hybrid')n+=3;
  return n;
 }
 const matchReason=(p,me)=>{if(!me||p.id===me.id)return 'Student profile';const s=rankPeer(p,me);if(s>=65)return 'Great campus fit';if(s>=45)return 'Same institution';if(s>=12)return 'Modules in common';return 'Explore profile';};
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
 <a class="nav-cta join-nav" href="account.html?mode=signup">Join Peer Match <span aria-hidden="true">↗</span></a>`;
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
  ['notifications.html','Notifications','bell']
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
  if(path==='settings.html'){const settings=topHub.querySelector('#pmTopSettingsLink');settings?.setAttribute('aria-current','page');}
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
  document.documentElement.classList.toggle('pm-member-header',Boolean(db.user));if(topHub)topHub.hidden=!db.user;const profileMenu=$('pmTopProfileMenu');if(profileMenu)profileMenu.hidden=!db.user;if(!db.user)closeTopProfileMenu();
  const nav=$('primaryNav'),foot=document.querySelector('.footer-nav');
  if(nav){nav.innerHTML=db.user?memberNav:guestNav;const file=location.pathname.split('/').pop()||'index.html';nav.querySelectorAll('[data-page]').forEach(a=>{if(a.dataset.page===file){a.classList.add('active');a.setAttribute('aria-current','page')}});}
  if(foot)foot.innerHTML=db.user?'<a href="matches.html">Find peers</a><a href="groups.html">Study groups</a><a href="sessions.html">Sessions</a><a href="notes.html">Notes</a><a href="saved.html">Saved items</a><a href="resources.html">Resources</a><a href="faq.html">FAQs</a><a href="student.html">My profile</a>':'<a href="about.html">About</a><a href="resources.html">Resources</a><a href="faq.html">FAQs</a><a href="contact.html">Contact</a><a href="guidelines.html">Guidelines</a>';
 }
 const privatePaths=new Set(['matches.html','groups.html','sessions.html','messages.html','notes.html','notifications.html','profile.html','student.html','saved.html','settings.html']);
 function safeNext(){
  const wanted=new URLSearchParams(location.search).get('next');if(!wanted||wanted.startsWith('//')||wanted.includes('\\'))return null;
  try{const u=new URL(wanted,location.href);const page=u.pathname.split('/').pop();if(u.pathname!=='/'+page||wanted.includes('..')||u.origin!==location.origin||!privatePaths.has(page)||u.username||u.password)return null;
   // Only return to known student pages and preserve benign query parameters.
   const safeQuery=new URLSearchParams();for(const key of (page==='student.html'?['id','note']:page==='messages.html'?['peer']:page==='groups.html'?['group']:page==='matches.html'?['institution']:[])){
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
 function subscribeNotifications(){if(!db.client||!db.user)return;db.client.channel('alerts-'+db.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+db.user.id},()=>{refreshBadge();refreshMessageBadge();if($('notificationsList'))renderNotifications()}).subscribe();}
 function setupInstitutionSuggestions(){const type=$('institutionType'),list=$('institutionSuggestions');if(!type||!list)return;const update=()=>{list.replaceChildren();for(const name of PM.INSTITUTIONS[type.value]||[]){const opt=document.createElement('option');opt.value=name;list.append(opt)}};type.addEventListener('change',update);update();return update;}
 async function initProfile(){const form=$('profileForm');if(!form)return;const suggestions=setupInstitutionSuggestions();
  $('studentName')?.addEventListener('blur',()=>{$('studentName').value=PM.formatPersonName($('studentName').value)});
  const schoolGrade=$('profileGrade'),courseInput=$('course'),typeInput=$('institutionType');
  const updateProfileCourseGrade=()=>{
   const school=typeInput.value==='school';
   $('profileCourseGroup').classList.toggle('hidden',school);
   $('profileGradeGroup').classList.toggle('hidden',!school);
   schoolGrade.disabled=!school;schoolGrade.required=school;
   courseInput.disabled=school;
  };
  typeInput.addEventListener('change',updateProfileCourseGrade);
  const my=await getMe();if(my){const obj={studentName:PM.formatPersonName(my.full_name),institutionType:my.institution_type,institutionName:PM.formatStudyText(my.institution),campus:PM.formatStudyText(my.campus),course:PM.formatStudyText(my.course),modules:(my.modules||[]).map(PM.formatStudyText).join(', '),availability:my.availability,studyMethod:my.study_method,about:my.about};for(const [key,value]of Object.entries(obj))if($(key))$(key).value=value||'';if(my.institution_type==='school'&&/^Grade (8|9|10|11|12)$/.test(my.course||''))schoolGrade.value=my.course;suggestions?.();}updateProfileCourseGrade();
  if(!db.user){feedback('profileFeedback','Sign in or create an account before saving your profile.');const link=document.createElement('a');link.href='account.html';link.textContent=' Open account →';$('profileFeedback').append(link);}
  if($('profilePrivacy'))$('profilePrivacy').textContent='Your profile is shared with signed-in members only. Your sign-in email is never published. Verification badges are awarded by an administrator.';
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity()||!requireSignedIn())return;
   const modules=val('modules').split(',').map(PM.formatStudyText).filter(Boolean).slice(0,10);
   const course=typeInput.value==='school'?schoolGrade.value:PM.formatStudyText(val('course'));
   const newName=clean(val('studentName'));
   if(!PM.validPersonName(newName)){feedback('profileFeedback','Use letters for your name (spaces, hyphens and apostrophes are fine). Avoid numbers, emojis and symbols.',true);$('studentName').focus();return;}
   const payload={full_name:PM.formatPersonName(newName),institution_type:val('institutionType'),institution:PM.formatStudyText(val('institutionName')),campus:PM.formatStudyText(val('campus')),course,modules,availability:val('availability'),study_method:val('studyMethod'),about:val('about')};
   try{await db.saveProfile(payload);window.dispatchEvent(new Event('pm-profile-saved'));feedback('profileFeedback','Your study profile is now available to signed-in students.');notify('Profile saved successfully!');}
   catch(e){feedback('profileFeedback',e.message,true);handleError(e)}
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
  if($('directoryBadge'))$('directoryBadge').textContent='STUDENT DIRECTORY';
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
   availability:val('timeFilter'),sameCampus:quickFilter==='campus',sameCourse:quickFilter==='course',sort:val('sortFilter')||'az',
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
    if(courseOnly&&(!meCache?.course||PM.normalize(p.course)!==PM.normalize(meCache.course)))return false;
    return rankPeer(p,meCache)>=12;
   }).sort((a,b)=>rankPeer(b,meCache)-rankPeer(a,meCache)).slice(0,6);
   grid.innerHTML=filtered.length?filtered.map(peerCard).join(''):'<div class="social-empty full-span"><h3>No close matches yet</h3><p>You can still browse every discoverable student below. Complete your study profile for better recommendations.</p></div>';
   $('resultCount').textContent=String(filtered.length);
   $('matchingDescription').textContent=meCache?.institution?'Suggested peers from your institution based on your study preferences.':'Complete your profile to unlock personalised recommendations.';
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
   quickFilter=next;
   if(next==='all'){for(const id of ['institutionFilter','methodFilter','timeFilter'])if($(id))$(id).value='';}
   if($('sameCampusOnly'))$('sameCampusOnly').checked=next==='campus';
   reload();
  }));
  $('sameCampusOnly')?.addEventListener('change',()=>{
   quickFilter=$('sameCampusOnly').checked?'campus':'all';reload();
  });
  const reset=()=>{for(const id of ['searchInput','institutionFilter','methodFilter','timeFilter'])if($(id))$(id).value='';quickFilter='all';if($('sameCampusOnly'))$('sameCampusOnly').checked=false;if($('sortFilter'))$('sortFilter').value='az';toggleAdvanced(false);toggleSort(false);reload();};
  $('clearFilters')?.addEventListener('click',reset);$('emptyReset')?.addEventListener('click',reset);
  $('prevPeers')?.addEventListener('click',()=>{if(page>0){page--;load(true)}});
  $('nextPeers')?.addEventListener('click',()=>{if((page+1)*PAGE_SIZE<count){page++;load(true)}});
  const handleCardAction=async e=>{
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
    const reason=prompt('Report this profile: briefly describe the problem (5–500 characters).');
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
  const score=complete?rankPeer(p,meCache):0;
  const subjectLabel=p.institution_type==='school'?'Subjects':'Subjects / modules';
  const courseLabel=p.institution_type==='school'?'Grade':'Course / programme';
  const formatLabels={campus:'On campus',virtual:'Online',hybrid:'Hybrid / both'};
  const timeLabels={mornings:'Mornings',afternoons:'Afternoons',evenings:'Evenings',weekends:'Weekends',flexible:'Flexible'};
  const studyFormat=formatLabels[p.study_method]||'Not set';
  const availability=timeLabels[p.availability]||'Not set';
  const matchKnown=complete&&Boolean(meCache?.institution);
  const matchTier=score>=70?'match-high':score>=45?'match-mid':'match-low';
  const relation=db.connectionWith(connectionRows,p.id);
  const connection=PM.connectionAction(relation,db.identity());
  return `<article class="peer-card peer-card-v2 directory-card">
   <div class="peer-card-top"><a href="student.html?id=${encodeURIComponent(p.id)}" class="directory-avatar-link" aria-label="View ${esc(name)} profile">${PM.ui.avatar(name,p.avatar_path,'card-avatar')}</a>${matchKnown?`<span class="directory-status match-score ${matchTier}" aria-label="${score} percent compatibility score"><span class="match-number">${score}%</span><span class="match-label">match</span></span>`:`<span class="directory-status ${complete?'is-complete':'is-new'}">${complete?'Student profile':'New to Peer Match'}</span>`}</div>
   <div class="directory-main"><h3><a class="profile-name-link" href="student.html?id=${encodeURIComponent(p.id)}">${esc(name)}</a>${p.is_verified?`<span class="verified-label" title="Institution reviewed by administrator">${PM.icon('shield')} Verified</span>`:''}</h3></div>
   <div class="directory-detail-grid">
     <div class="directory-detail"><p class="directory-field-label">${courseLabel}</p><p class="directory-detail-value${!p.course?' is-empty':''}">${esc(PM.formatStudyText(p.course)||'Not added yet')}</p></div>
     <div class="directory-detail"><p class="directory-field-label">Institution</p><p class="directory-detail-value directory-institution${!p.institution?' is-empty':''}">${esc(PM.formatStudyText(p.institution)||'Not added yet')}</p></div>
     ${p.campus?`<div class="directory-detail directory-campus"><p class="directory-field-label">Campus</p><p class="directory-detail-value">${esc(PM.formatStudyText(p.campus))}</p></div>`:''}
   </div>
   <div class="directory-subjects" aria-label="${esc(subjectLabel.toLowerCase())}">
     <p class="directory-field-label">${subjectLabel}</p>
     ${(p.modules||[]).length?`<div class="directory-topics">${(p.modules||[]).slice(0,3).map(x=>`<span>${esc(PM.formatStudyText(x))}</span>`).join('')}${(p.modules||[]).length>3?`<span>+${p.modules.length-3} more</span>`:''}</div>`:'<p class="directory-subjects-empty">Not added yet</p>'}
   </div>
   <div class="directory-preferences">
     <div class="directory-preference"><p class="directory-field-label">Study format</p><span class="directory-pref-value${!formatLabels[p.study_method]?' is-empty':''}">${esc(studyFormat)}</span></div>
     <div class="directory-preference"><p class="directory-field-label">Availability</p><span class="directory-pref-value${!timeLabels[p.availability]?' is-empty':''}">${esc(availability)}</span></div>
   </div>
   ${!complete?'<p class="directory-welcome">This student is getting started. You can still say hello!</p>':''}
   <div class="peer-card-actions"><a class="view-profile-btn" href="student.html?id=${encodeURIComponent(p.id)}">${PM.icon('user')} Profile</a><button type="button" class="connect-btn" data-connect="${esc(p.id)}" data-connect-state="${connection.state}" ${connection.disabled?'disabled':''}>${PM.icon(connection.state==='accepted'||connection.state==='pending'?'check':'users')} ${connection.label}</button><button type="button" class="small-ghost directory-share" data-share-profile="${esc(p.id)}" title="Share ${esc(name)}'s profile" aria-label="Share profile for ${esc(name)}">${PM.icon('share')}</button><button type="button" class="small-ghost directory-report" title="Report profile" aria-label="Report ${esc(name)}" data-report="${esc(p.id)}">${PM.icon('more')}</button></div>
  </article>`;
 }
 const loadFailure=(title)=>`<div class="empty-panel" style="grid-column:1/-1" role="alert"><h3>${esc(title)}</h3><p>Check your connection and try again. Your saved information has not been changed.</p><button type="button" class="btn btn-secondary" onclick="location.reload()">Retry loading</button></div>`;
 const gateMarkup=(title)=>`<div class="empty-panel" style="grid-column:1/-1"><h3>${esc(title)}</h3><p>This directory is available to authenticated students only.</p><a href="account.html" class="btn btn-primary">Sign in / Create account</a></div>`;
 let groupsCache=[],memberships=[],groupOpened=null,groupPeers=[],managingGroup=null;
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
    return `<article class="platform-card"><div class="platform-card-top"><span class="platform-card-icon">${PM.icon("users")}</span><span class="meta-badge ${byMe?'admin-owner-badge':''}">${byMe?'OWNER':joined?'JOINED':esc(g.module)}</span></div><h3>${esc(g.name)}</h3><p>${esc(g.description||'A friendly place to learn together.')}</p><small>⌂ ${esc(g.institution)}${g.campus?' · '+esc(g.campus):''}</small><div class="platform-card-meta"><span>◈ ${esc(g.module)}</span>${''}</div><div class="platform-card-bottom admin-card-actions">${byMe?`<button type="button" class="btn btn-secondary owner-button" disabled title="The group owner cannot leave; delete the group to close it.">Group owner</button>`:`<button type="button" class="btn ${joined?'btn-secondary':'btn-primary'}" data-join="${esc(g.id)}">${joined?'Leave group':'Join group'} ${joined?'↗':'+'}</button>`}${joined?`<button type="button" class="small-ghost" data-room="${esc(g.id)}">Discussion →</button>`:''}${byMe?`<button type="button" class="small-ghost manage-action" data-manage="${esc(g.id)}">${PM.icon("edit")} Manage</button>`:''}</div></article>`;
   }).join('');
   $('groupsEmpty').classList.toggle('hidden',display.length>0);
   $('groupCount').textContent=`${display.length} ${display.length===1?'group':'groups'} found`;
  };
  $('groupSearch')?.addEventListener('input',render);$('myGroupsOnly')?.addEventListener('input',render);
  $('groupsGrid').addEventListener('click',async e=>{
   const manage=e.target.closest('[data-manage]'),room=e.target.closest('[data-room]'),btn=e.target.closest('[data-join]');
   if(manage){await openAdmin(manage.dataset.manage);return;}
   if(room){await openRoom(room.dataset.room);return;}
   if(!btn||!requireSignedIn())return;
   const groupId=btn.dataset.join;
   if(ownsGroup(groupId)){notify('Group owners cannot leave their own group. Use Manage to delete it.');return;}
   try{if(memberships.some(m=>m.group_id===groupId))await db.leaveGroup(groupId);else await db.joinGroup(groupId);
     if(groupOpened===groupId){$('groupRoom').classList.add('hidden');groupOpened=null;}
     await load();notify('Group membership updated. ');}
   catch(err){handleError(err);}
  });
  f?.addEventListener('submit',async e=>{e.preventDefault();if(!f.reportValidity()||!requireSignedIn())return;
   const group={name:val('groupName'),module:val('groupModule'),institution:val('groupInstitution'),campus:val('groupCampus'),description:val('groupDescription')};
   try{await db.createGroup(group);f.reset();f.classList.add('hidden');await load();notify('Your study group is ready! ');}
   catch(err){handleError(err);}
  });
  $('closeGroupRoom')?.addEventListener('click',()=>{$('groupRoom').classList.add('hidden');groupOpened=null;});
  async function openRoom(id){
   groupOpened=id;const g=groupsCache.find(x=>x.id===id);
   if(!g||!memberships.some(m=>m.group_id===id)){groupOpened=null;return;}
   const room=$('groupRoom');room.classList.remove('hidden');$('roomTitle').textContent=g.name;
   await reloadPosts();room.scrollIntoView({block:'start',behavior:'smooth'});
  }
  async function reloadPosts(){
   if(!groupOpened)return;
   try{const posts=await db.groupPosts(groupOpened),owner=ownsGroup(groupOpened);
    groupPeers=await db.profilesByIds([...new Set(posts.map(x=>x.author_id))]);
    $('groupPostList').innerHTML=posts.length?posts.map(p=>{const author=groupPeers.find(x=>x.id===p.author_id);
     return `<div class="post-card"><div class="admin-post-head"><div class="post-author">${PM.ui.avatar(author?.full_name||'Student',author?.avatar_path,'post-avatar')}<strong><a href="student.html?id=${encodeURIComponent(p.author_id)}">${esc(PM.formatPersonName(author?.full_name)||'Group member')}</a></strong><small>${esc(prettyDate(p.created_at))}</small></div>${owner?`<button type="button" class="text-button post-remove" data-remove-post="${esc(p.id)}" aria-label="Remove this group post">Remove</button>`:''}</div><p>${esc(p.body)}</p><div class="post-files" data-post-files="${esc(p.id)}"></div></div>`;
    }).join(''):'<p class="loading-state">No posts yet. Start the conversation!</p>';
    const postContainers=[...$('groupPostList').querySelectorAll('[data-post-files]')];const postAttachments=await db.attachmentsForMany('post',postContainers.map(x=>x.dataset.postFiles));await Promise.all(postContainers.map(item=>PM.ui.showFiles(item,'post',item.dataset.postFiles,false,postAttachments[item.dataset.postFiles]||[])));
   }catch(err){handleError(err);}
  }
  $('groupPostList')?.addEventListener('click',async e=>{
   const btn=e.target.closest('[data-remove-post]');if(!btn||!groupOpened||!ownsGroup(groupOpened)||!requireSignedIn())return;
   if(!confirm('Remove this discussion post? This cannot be undone.'))return;
   try{await db.deleteGroupPost(groupOpened,btn.dataset.removePost);await reloadPosts();notify('Discussion post removed.');}catch(err){handleError(err);}
  });
  $('groupPostForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!groupOpened||!requireSignedIn())return;
   const body=val('groupPostBody');const files=$('groupPostFiles')?.files;if(!body&&!files?.length)return;
   const submit=$('groupPostForm').querySelector('button[type="submit"]');submit.disabled=true;
   try{const post=await db.addGroupPost(groupOpened,body||'Shared an attachment');
    if(files?.length){try{await db.uploadAttachments('post',post.id,files)}catch(err){await reloadPosts();handleError(new Error('Post saved, but the attachment failed: '+err.message));return}}
    $('groupPostBody').value='';if($('groupPostFiles'))$('groupPostFiles').value='';if($('groupFilesChosen'))$('groupFilesChosen').textContent='';await reloadPosts();
   }catch(err){handleError(err)}finally{submit.disabled=false}

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
   if(!confirm(`Remove ${name} from this group and prevent them rejoining? Their RSVPs in this group's sessions will also be cancelled. You can allow them back later.`))return;
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
   if(!confirm('Allow this student to join the group again?'))return;
   try{await db.unbanGroupMember(managingGroup,btn.dataset.unbanMember);await refreshBans();notify('Student can now rejoin the group.');}catch(err){handleError(err);}
  });
  $('editGroupForm')?.addEventListener('submit',async e=>{
   e.preventDefault();if(!managingGroup||!ownsGroup(managingGroup)||!e.currentTarget.reportValidity()||!requireSignedIn())return;
   const changes={name:val('adminGroupName'),module:val('adminGroupModule'),institution:val('adminGroupInstitution'),campus:val('adminGroupCampus'),description:val('adminGroupDescription')};
   try{await db.editGroup(managingGroup,changes);await load();$('manageGroupName').textContent=changes.name;if(groupOpened===managingGroup)$('roomTitle').textContent=changes.name;notify('Group details updated. ');}
   catch(err){handleError(err);}
  });
  $('deleteGroup')?.addEventListener('click',async()=>{
   if(!managingGroup||!ownsGroup(managingGroup)||!requireSignedIn())return;
   const g=groupsCache.find(x=>x.id===managingGroup);
   if(!confirm(`Permanently delete “${g?.name||'this group'}” and all its posts, study sessions and RSVPs? This cannot be undone.`))return;
   try{const id=managingGroup;await db.deleteGroup(id);managingGroup=null;admin.classList.add('hidden');
    if(groupOpened===id){groupOpened=null;$('groupRoom').classList.add('hidden');}
    await load();notify('Study group deleted. ');}
   catch(err){handleError(err);}
  });
  if(db.client&&db.user){db.client.channel('group-post-events').on('postgres_changes',{event:'INSERT',schema:'public',table:'group_posts'},()=>{if(groupOpened)reloadPosts();}).subscribe();}
  try{await load();const requested=new URLSearchParams(location.search).get('group');if(requested)await openRoom(requested);}catch(err){handleError(err);$('groupsGrid').innerHTML=loadFailure('Could not load study groups.');}
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
    if(!confirm(`Permanently cancel “${s.title}”? All RSVPs for this session will be removed.`))return;
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
  $('chatMobileBack')?.addEventListener('click',()=>{$('conversationList')?.closest('.messaging-layout')?.classList.remove('chat-open');selectedPeer=null;closeEmojiPicker();if($('emojiPickerToggle'))$('emojiPickerToggle').disabled=true;});
  function renderContacts(ids){$('conversationList').innerHTML=ids.map(id=>{const p=inboxPeers.find(x=>x.id===id);if(!p)return '';return `<button type="button" class="conversation-item ${id===selectedPeer?'selected':''}" data-peer="${esc(id)}">${PM.ui.avatar(p.full_name,p.avatar_path,'conversation-avatar')}<span><strong>${esc(PM.formatPersonName(p.full_name))}</strong><small>${esc(PM.formatStudyText(p.institution))}</small></span></button>`}).join('');$('conversationList').querySelectorAll('[data-peer]').forEach(btn=>btn.addEventListener('click',()=>openChat(btn.dataset.peer)))}
  async function openChat(id){const p=inboxPeers.find(x=>x.id===id);if(!p||blocked.includes(id))return;selectedPeer=id;const layout=$('conversationList').closest('.messaging-layout');layout?.classList.add('chat-open');if(matchMedia('(max-width:720px)').matches)requestAnimationFrame(()=>layout?.scrollIntoView({block:'start'}));
   $('conversationList').querySelectorAll('[data-peer]').forEach(el=>el.classList.toggle('selected',el.dataset.peer===id));$('chatHeader').innerHTML=`<a href="student.html?id=${encodeURIComponent(p.id)}" aria-label="Open ${esc(PM.formatPersonName(p.full_name))} profile">${PM.ui.avatar(p.full_name,p.avatar_path,'conversation-avatar')}</a><div><strong>${esc(PM.formatPersonName(p.full_name))} ${p.is_verified?'✓':''}</strong><small>${esc(PM.formatStudyText(p.institution))} · ${esc(PM.formatStudyText(p.campus)||'Campus not listed')}</small>${p.show_activity!==false?`<small class="activity-status" id="peerActivity">${esc(PM.ui.status(p))}</small>`:''}</div><a class="text-button" href="student.html?id=${encodeURIComponent(p.id)}">Profile ↗</a><button class="text-button" type="button" id="safetyOptions">Safety ⋯</button>`;
   $('messageBody').disabled=false;$('sendMessageBtn').disabled=false;$('emojiPickerToggle').disabled=false;
   $('safetyOptions').addEventListener('click',async()=>{const choice=prompt('Type BLOCK to stop future messages, or REPORT to flag abuse.');if(!choice)return;if(choice.toUpperCase()==='BLOCK'){if(!confirm('Block this account? You will no longer be able to message each other.'))return;try{await db.blockPeer(id);blocked.push(id);notify('Student blocked. ');location.href='messages.html'}catch(e){handleError(e)}}else if(choice.toUpperCase()==='REPORT'){const reason=prompt('Describe the issue (5–500 characters):');if(reason?.trim().length>=5&&reason.trim().length<=500)try{await db.reportPeer(id,reason.trim());notify('Report recorded. ')}catch(e){handleError(e)}else notify('Please enter a reason between 5 and 500 characters.')}});
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
    const btn=$('sendMessageBtn');btn.disabled=true;btn.textContent='Sending…';
    try{const message=await db.sendMessage(selectedPeer,body||'Shared an attachment');
      $('messageBody').value='';
      if(files?.length){try{await db.uploadAttachments('message',message.id,files)}catch(err){await reloadThread();handleError(new Error('Message sent, but the file was not attached: '+err.message));return}}
      if($('chatFileInput'))$('chatFileInput').value='';if($('chatFilesChosen'))$('chatFilesChosen').textContent='';
      await reloadThread();notify('Message sent!');
    }catch(err){handleError(err)}finally{btn.disabled=false;btn.textContent='Send ↗'}
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
    return `<div class="notification-item ${n.is_read?'':'unread'}"><span class="notification-symbol">${PM.icon(n.kind==='connect'?'users':n.kind==='message'?'mail':n.kind==='group'?'users':n.kind==='note'?'book':'calendar')}</span><div><h3>${esc(n.title)}</h3><p>${esc(n.description)}</p><small>${esc(prettyDate(n.created_at))}</small>${request?`<div class="pm-request-actions"><button type="button" data-request-action="accept" data-request-id="${esc(request.id)}">Accept request</button><button type="button" data-request-action="decline" data-request-id="${esc(request.id)}">Decline</button></div>`:''}</div><a href="${safeLink(n.link)}" class="text-button">${n.kind==='connect'?'View profile ↗':'Open ↗'}</a></div>`;
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
 const safeLink=link=>/^((messages|groups|sessions|notifications|student|notes)\.html)(\?[-a-zA-Z0-9_=%&.]*)?$/.test(link||'')?esc(link):'notifications.html';
 async function initAccount(){
  const form=$('authForm');if(!form)return;
  if(db.user){$('authLoggedIn').classList.remove('hidden');$('authLoggedOut').classList.add('hidden');$('authEmail').textContent=db.user.email||'';const target=safeNext();if(target){$('accountContinueLink').href=target;$('accountContinueLink').textContent='Continue where you left off →';}}
  $('signOutButton')?.addEventListener('click',async()=>{try{await db.signOut();location.href='account.html'}catch(e){handleError(e)}});
  const requiredFields=[...form.querySelectorAll('[data-signup-required]')];
  const institutionType=$('signupInstitutionType'),institutionName=$('signupInstitution'),suggestions=$('signupInstitutionSuggestions');
  const updateSuggestions=()=>{if(!suggestions||!institutionType)return;suggestions.replaceChildren();for(const name of PM.INSTITUTIONS[institutionType.value]||[]){const opt=document.createElement('option');opt.value=name;suggestions.append(opt)}};
  let create=false,submitting=false;
  const signupCourse=$('signupCourse'),signupGrade=$('signupGrade'),signupModules=$('signupModules'),signupCampus=$('signupCampus');
  const updateSignupCourseGrade=()=>{
   const school=institutionType?.value==='school';
   $('signupCourseGroup')?.classList.toggle('hidden',school);
   $('signupGradeGroup')?.classList.toggle('hidden',!school);
   $('signupCampusGroup')?.classList.toggle('hidden',school);
   $('signupInstitutionLabel').innerHTML=school?'School name <span aria-hidden="true">*</span>':'Institution name <span aria-hidden="true">*</span>';
   institutionName.placeholder=school?'e.g. Vaal High School':'Start typing your institution';
   $('signupModulesLabel').innerHTML=school?'School subjects <span class="pm-optional">Optional</span>':'Subjects or modules <span class="pm-optional">Optional</span>';
   $('signupModulesHint').textContent=school?'Optional for now. If added, separate school subjects with commas (up to 10). You can edit them later.':'Optional for now. If added, separate subjects or modules with commas (up to 10). You can edit them later.';
   signupModules.placeholder=school?'e.g. Mathematics, English, Physical Sciences':'e.g. Web Development, Business Analysis';
   if(signupCourse){signupCourse.required=create&&!school;signupCourse.disabled=!create||school;}
   if(signupGrade){signupGrade.required=create&&school;signupGrade.disabled=!create||!school;}
   if(signupCampus){signupCampus.disabled=!create||school;}
  };
  institutionType?.addEventListener('change',()=>{updateSuggestions();if(institutionName)institutionName.value='';updateSignupCourseGrade();});
  const toggle=v=>{
   create=v;
   document.documentElement.classList.toggle('pm-signup-active',v);
   $('tabSignIn').classList.toggle('active',!v);$('tabSignUp').classList.toggle('active',v);
   $('tabSignIn').setAttribute('aria-selected',String(!v));$('tabSignUp').setAttribute('aria-selected',String(v));
   $('authTitle').textContent=v?'Create your student account.':'Welcome back.';
   $('authSubtitle').textContent=v?'Start with the essentials so others can find and study with you.':'Sign in to continue growing together.';
   $('authSignupFields').classList.toggle('hidden',!v);
   $('authConfirmGroup').classList.toggle('hidden',!v);
   $('authLegalNote').classList.toggle('hidden',!v);
   $('forgotPasswordLink')?.classList.toggle('hidden',v);
   $('authAdult').classList.toggle('hidden',!v);
   $('authAdultCheck').required=v;
   $('authPasswordConfirm').required=v;
   $('authPasswordConfirm').disabled=!v;
   requiredFields.forEach(el=>{el.required=v;el.disabled=!v});
   // Optional study subjects must be enabled only during signup, never required.
   signupModules.disabled=!v;signupModules.required=false;
   updateSignupCourseGrade();
   $('authSubmit').textContent=v?'Create account →':'Sign in →';
   $('authPassword').autocomplete=v?'new-password':'current-password';
   $('authDemoNote').classList.toggle('hidden',!v);
   $('authFeedback').classList.add('hidden');
  };
  $('tabSignIn').addEventListener('click',()=>toggle(false));
  $('tabSignUp').addEventListener('click',()=>toggle(true));
  toggle(new URLSearchParams(location.search).get('mode')==='signup');
  for(const field of ['signupFirstName','signupSurname'])$(field)?.addEventListener('blur',()=>{$(field).value=PM.formatPersonName($(field).value)});
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(submitting)return;
   if(!db.client){feedback('authFeedback','Unable to connect to the service. Please try again shortly.',true);return;}
   if(!form.reportValidity())return;
   const email=val('authEmailInput'),password=$('authPassword').value;
   let details=null;
   if(create){
    if(password!==$('authPasswordConfirm').value){feedback('authFeedback','Your passwords do not match. Please check them and try again.',true);$('authPasswordConfirm').focus();return;}
    const school=institutionType.value==='school';
    const grade=signupGrade.value;
    const course=school?grade:PM.formatStudyText(val('signupCourse'));
    const firstName=PM.formatPersonName(val('signupFirstName')),surname=PM.formatPersonName(val('signupSurname'));
    const name=[firstName,surname].filter(Boolean).join(' ');
    const institution=PM.formatStudyText(val('signupInstitution'));
    const moduleInput=val('signupModules').trim();
    const modules=moduleInput?moduleInput.split(',').map(PM.formatStudyText).filter(Boolean):[];
    if(!firstName||!surname){
      feedback('authFeedback','Please enter your first name and surname.',true);
      (!firstName?$('signupFirstName'):$('signupSurname')).focus();return;
    }
    if(!PM.validPersonName(firstName)||!PM.validPersonName(surname)){
      feedback('authFeedback','Use letters for your first name and surname. Spaces, apostrophes and hyphens are fine; avoid numbers or symbols.',true);
      $('signupFirstName').focus();return;
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
    if(moduleInput&&(modules.length<1||modules.length>10||modules.some(x=>x.length<2||x.length>100))){
      feedback('authFeedback','If you add '+(school?'school subjects':'subjects or modules')+', enter up to 10 valid entries separated by commas, or leave the field empty.',true);
      signupModules.focus();return;
    }
    details={full_name:name,institution_type:institutionType.value,institution,campus:school?'':PM.formatStudyText(val('signupCampus')),course,modules,discoverable:$('signupDiscoverable').checked};
   }
   const submit=$('authSubmit');submitting=true;submit.disabled=true;submit.textContent=create?'Creating your account…':'Signing in…';
   try{
    if(create){
      const result=await db.signUp(email,password,details);
      if(result.session){location.href=safeNext()||'index.html';return;}
      feedback('authFeedback','Account request received. Check your email for a verification link (and Spam/Junk if needed), then sign in. Your student details will already be saved.');
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
   try{const me=await db.profile();const page=location.pathname.split('/').pop()||'index.html';
    if(me?.deactivated_at && page!=='settings.html' && page!=='account.html'){
     location.replace('settings.html#your-account');return;
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
