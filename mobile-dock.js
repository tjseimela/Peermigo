/* Peermigo: mobile-only navigation, shown only after Supabase authentication. */
(() => {
  'use strict';
  const destinations = [
    ['index.html', 'Home', 'home'],
    ['matches.html', 'Find Peers', 'users-plus'],
    ['groups.html', 'Study groups', 'users'],
    ['messages.html', 'Messages', 'message'],
    ['notes.html', 'Notes', 'book']
  ];
  const additional = [
    ['sessions.html','Study sessions','calendar'],
    ['notifications.html','Notifications','bell'],
    ['student.html','My profile','user'],
    ['saved.html','Saved items','bookmark'],
    ['resources.html','Study resources','book']
  ];
  let dock, moreButton, morePanel;
  const currentPage = () => location.pathname.split('/').pop() || 'index.html';
  function icon(kind){return window.PM.icon(kind);}
  function create(){
    if (dock || !window.PM?.icon) return;
    dock=document.createElement('nav');
    dock.className='pm-student-dock';dock.id='pmStudentDock';
    dock.setAttribute('aria-label','Student quick navigation');
    dock.hidden=true;
    const row=document.createElement('div');row.className='pm-dock-row';
    destinations.forEach(([href,label,kind])=>{
      const a=document.createElement('a');a.href=href;a.className='pm-dock-item';
      a.dataset.page=href;a.setAttribute('aria-label',label);a.title=label;
      a.innerHTML=icon(kind)+(href==='messages.html'?'<span class="pm-dock-message-count" aria-hidden="true" hidden></span>':'');
      row.append(a);
    });
    const moreWrap=document.createElement('div');moreWrap.className='pm-dock-more-wrap';
    moreButton=document.createElement('button');moreButton.type='button';
    moreButton.className='pm-dock-item pm-dock-more-btn';
    moreButton.setAttribute('aria-controls','pmDockMore');moreButton.setAttribute('aria-expanded','false');
    moreButton.setAttribute('aria-label','More student pages');moreButton.title='More';
    moreButton.innerHTML=icon('more');
    morePanel=document.createElement('div');morePanel.id='pmDockMore';morePanel.className='pm-dock-more-panel';morePanel.hidden=true;
    additional.forEach(([href,label,kind])=>{
      const a=document.createElement('a');a.href=href;a.className='pm-dock-more-link';a.dataset.page=href;
      a.innerHTML=icon(kind)+'<span>'+label+'</span>';
      morePanel.append(a);
    });
    moreWrap.append(moreButton,morePanel);row.append(moreWrap);dock.append(row);
    document.body.append(dock);
    moreButton.addEventListener('click',()=>setMore(morePanel.hidden));
    document.addEventListener('pointerdown',e=>{if(!morePanel.hidden&&!dock.contains(e.target))setMore(false)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!morePanel.hidden){setMore(false);moreButton.focus()}});
    document.addEventListener('focusin',e=>{
      const target=e.target;
      const typing=target.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      if(typing){document.body.classList.add('pm-dock-typing');setMore(false)}
    });
    document.addEventListener('focusout',()=>{
      // Deferred one microtask so switching between text inputs does not flash the dock.
      queueMicrotask(()=>{const focused=document.activeElement;
        if(!focused?.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'))document.body.classList.remove('pm-dock-typing');
      });
    });
  }
  function setMore(open){if(!morePanel)return;morePanel.hidden=!open;moreButton.setAttribute('aria-expanded',String(open));moreButton.classList.toggle('is-open',open);}
  function sync(){
    create();if(!dock)return;
    const signedIn=Boolean(window.PM?.backend?.user);
    dock.hidden=!signedIn;
    document.body.classList.toggle('pm-dock-visible',signedIn);
    if(!signedIn)setMore(false);
    const page=currentPage();
    dock.querySelectorAll('[data-page]').forEach(a=>{
      const selected=a.dataset.page===page;
      a.classList.toggle('is-active',selected);
      if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    moreButton.classList.toggle('is-active',additional.some(([href])=>href===page));
  }
  function updateUnread(count){
    const badge=dock?.querySelector('.pm-dock-message-count');
    if(!badge)return;
    const n=Math.max(0,Number(count)||0);badge.hidden=n===0;
    badge.textContent=n>99?'99+':String(n);
    const a=dock.querySelector('[data-page="messages.html"]');
    a.setAttribute('aria-label',n?`Messages, ${n} unread`:'Messages');
  }
  window.addEventListener('pm-ready',sync);
  window.addEventListener('pm-auth-changed',()=>queueMicrotask(sync));
  window.addEventListener('pm-unread-updated',e=>updateUnread(e.detail?.count||0));
  document.addEventListener('DOMContentLoaded',()=>{
    // The actual logged-in state is established by Supabase in app.js.
    create();
    if(document.documentElement.classList.contains('pm-auth-ready'))sync();
  });
})();
