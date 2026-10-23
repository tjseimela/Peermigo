/* Show/hide passwords without sending or storing their values. */
(() => {
  'use strict';
  function init(){
    if(!window.PM?.icon)return;
    document.querySelectorAll('input[type="password"]').forEach(input=>{
      if(input.closest('.pm-password-field'))return;
      const wrapper=document.createElement('div');wrapper.className='pm-password-field';
      input.parentNode.insertBefore(wrapper,input);wrapper.append(input);
      const button=document.createElement('button');button.type='button';
      button.className='pm-password-toggle';button.setAttribute('aria-controls',input.id);
      button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Show password');
      button.title='Show password';button.innerHTML=window.PM.icon('eye');wrapper.append(button);
      button.addEventListener('click',()=>{
        const revealed=input.type==='password';
        input.type=revealed?'text':'password';button.setAttribute('aria-pressed',String(revealed));
        button.setAttribute('aria-label',revealed?'Hide password':'Show password');
        button.title=revealed?'Hide password':'Show password';
        button.innerHTML=window.PM.icon(revealed?'eye-off':'eye');
        input.focus({preventScroll:true});
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
