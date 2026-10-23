/* Expand the mobile message composer and keep it usable when the soft keyboard opens.
   No microphone, voice-note or call features are created. */
(() => {
  'use strict';
  const field=document.getElementById('messageBody');
  const chat=document.querySelector('.messaging-layout');
  if(!field||!chat)return;
  function resizeComposer(){
    field.style.height='54px';
    if(window.innerWidth<=720){field.style.height=Math.min(146,Math.max(54,field.scrollHeight))+'px';}
    else field.style.height='';
  }
  function updateViewport(){
    const viewport=window.visualViewport;
    // visualViewport.height reflects the available area above Android/iOS soft keyboards.
    const height=viewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--pm-visible-height',Math.round(height)+'px');
  }
  field.addEventListener('input',resizeComposer);
  field.addEventListener('focus',()=>{
    updateViewport();resizeComposer();
    if(window.innerWidth<=720){
      document.body.classList.add('pm-chat-keyboard');
      requestAnimationFrame(()=>chat.scrollIntoView({block:'start',behavior:'instant'}));
    }
  });
  field.addEventListener('blur',()=>document.body.classList.remove('pm-chat-keyboard'));
  field.addEventListener('keydown',event=>{
    // Desktop: Enter sends; Shift+Enter enters a new line.
    // Mobile: Enter inserts a line break, and the Send button sends the message.
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&window.innerWidth>720){
      event.preventDefault();field.form?.requestSubmit();
    }
  });
  window.addEventListener('resize',()=>{updateViewport();resizeComposer()},{passive:true});
  window.visualViewport?.addEventListener('resize',updateViewport,{passive:true});
  updateViewport();resizeComposer();
})();
