/* Accessible, promise-based Peermigo dialogs. Never depend on native browser prompt/confirm. */
(() => {
  'use strict';
  let active = null;
  const escape = value => String(value ?? '');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = escape(text);
    return node;
  };
  const icon = (name) => name === 'warning'
    ? '<path d="M12 3.5 22 20.5H2L12 3.5Z"/><path d="M12 9v5m0 3h.01"/>'
    : name === 'report'
      ? '<path d="M5 4h14v16H5zM8 9h8M8 13h8"/>'
      : '<path d="M12 3v10m-4-4 4 4 4-4M4 17v3h16v-3"/>';
  function show({ title = 'Confirm action', message = '', kind = 'normal', confirmText = 'Continue', cancelText = 'Cancel', type = 'confirm', placeholder = '', value = '', minLength = 0, maxLength = 500, multiline = false, inputLabel = '', choices = [] } = {}) {
    if (active) return Promise.resolve(null);
    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    return new Promise(resolve => {
      const overlay = el('div','pm-dialog-overlay');
      const card = el('section','pm-dialog-card');
      card.setAttribute('role','dialog');
      card.setAttribute('aria-modal','true');
      const headingId = 'pm-dialog-heading';
      card.setAttribute('aria-labelledby',headingId);
      const badge = el('span','pm-dialog-mark');
      badge.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon(kind === 'danger' ? 'warning' : type === 'prompt' ? 'report' : '')}</svg>`;
      const closeIcon = el('button','pm-dialog-close','×');
      closeIcon.type = 'button';closeIcon.setAttribute('aria-label','Close dialog');
      const head = el('div','pm-dialog-top');head.append(badge,closeIcon);
      const h = el('h2','pm-dialog-heading',title);h.id = headingId;
      const messageNode = el('p','pm-dialog-description',message);
      const footer = el('div','pm-dialog-actions');
      const cancel = el('button','pm-dialog-button pm-dialog-cancel',cancelText);cancel.type = 'button';
      const primary = el('button',`pm-dialog-button pm-dialog-primary${kind === 'danger' ? ' pm-dialog-danger' : ''}`,confirmText);primary.type = 'button';
      let input = null, error = null;
      function finish(result) {
        if (active !== overlay) return;
        active = null;
        overlay.remove();
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', keydown, true);
        if (previouslyFocused?.isConnected) previouslyFocused.focus({preventScroll:true});
        resolve(result);
      }
      function submit() {
        if(type === 'prompt') {
          const result = input.value.trim();
          if(result.length < minLength || result.length > maxLength) {
            error.textContent = `Enter ${minLength}–${maxLength} characters.`;
            input.setAttribute('aria-invalid','true');input.focus();return;
          }
          finish(result);return;
        }
        finish(true);
      }
      function keydown(e) {
        if (e.key === 'Escape') {e.preventDefault();finish(type === 'confirm' ? false : null);return;}
        if (e.key === 'Tab') {
          const targets = [...card.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(x=>x.offsetParent !== null);
          if (!targets.length) return;
          const first = targets[0], last = targets[targets.length-1];
          if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
          else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
        }
        if(e.key === 'Enter' && document.activeElement === input && !multiline) {e.preventDefault();submit();}
      }
      closeIcon.addEventListener('click',()=>finish(type === 'confirm' ? false : null));
      cancel.addEventListener('click',()=>finish(type === 'confirm' ? false : null));
      primary.addEventListener('click',submit);
      overlay.addEventListener('click',e=>{if(e.target===overlay)finish(type === 'confirm' ? false : null);});
      card.append(head,h);
      if(message) card.append(messageNode);
      if(type==='prompt') {
        const label = el('label','pm-dialog-label',inputLabel || 'Description');
        label.htmlFor='pm-dialog-field';
        input = el(multiline ? 'textarea' : 'input','pm-dialog-input');input.id='pm-dialog-field';
        if(!multiline)input.type='text';else input.rows=4;
        input.placeholder=placeholder;input.maxLength=maxLength;input.value=value;
        input.setAttribute('autocomplete','off');
        error=el('small','pm-dialog-error');error.setAttribute('aria-live','polite');
        input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');error.textContent='';});
        card.append(label,input,error);
      }
      if(type==='choose') {
        const choicesBox=el('div','pm-dialog-choices');
        choices.forEach(item=>{
          const button=el('button','pm-dialog-choice');button.type='button';
          const titleEl=el('strong','',item.label);
          const detailsEl=el('small','',item.description||'');
          button.append(titleEl,detailsEl);
          button.addEventListener('click',()=>finish(item.value));
          choicesBox.append(button);
        });
        card.append(choicesBox);
        footer.append(cancel);
      } else if(type==='alert') {
        primary.textContent='Got it';footer.append(primary);
      } else { footer.append(cancel,primary); }
      card.append(footer);overlay.append(card);document.body.append(overlay);
      active=overlay;document.body.style.overflow='hidden';document.addEventListener('keydown',keydown,true);
      requestAnimationFrame(()=>{(input || card.querySelector('.pm-dialog-choice') || (type==='alert'?primary:cancel)).focus();});
    });
  }
  window.PMDialogs = {
    confirm: (message,opts={})=>show({type:'confirm',title:opts.title||'Please confirm',message,confirmText:opts.confirmText||'Confirm',kind:opts.kind||'normal'}),
    prompt: (message,opts={})=>show({type:'prompt',title:opts.title||'Report',message,inputLabel:opts.label||'Details',placeholder:opts.placeholder||'Write a short description…',minLength:opts.minLength ?? 5,maxLength:opts.maxLength ?? 500,multiline:opts.multiline ?? true,confirmText:opts.confirmText||'Submit',value:opts.value||''}),
    alert: (message,opts={})=>show({type:'alert',title:opts.title||'Peermigo',message}),
    choose: (title,choices,message='')=>show({type:'choose',title,message,choices}),
    isOpen:()=>Boolean(active)
  };
})();
