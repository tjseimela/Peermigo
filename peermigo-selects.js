/* Peermigo styled select controls: progressive enhancement; original native <select>
   remains the source of truth for validation, profile settings and form submissions. */
(() => {
  'use strict';
  let active = null;
  let nextId = 0;
  const create = (name, cls = '', text) => {
    const item = document.createElement(name);
    if (cls) item.className = cls;
    if (text != null) item.textContent = text;
    return item;
  };
  const desktopSize = () => window.matchMedia('(min-width: 661px)').matches;

  function dismiss({ restoreFocus = false } = {}) {
    if (!active) return;
    const { button, menu, backdrop, originalParent } = active;
    active = null;
    menu.hidden = true;
    originalParent.append(menu);
    backdrop.remove();
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus({preventScroll: true});
  }

  function enhance(select) {
    if (!select || select.dataset.pmEnhancedSelect) return;
    select.dataset.pmEnhancedSelect = 'true';
    const shell = create('span','pm-choice-shell');
    const parent = select.parentNode;
    parent.insertBefore(shell, select);
    shell.append(select);
    select.classList.add('pm-choice-native');
    // Keep the real field available to native form validation and its existing JS.
    const button = create('button','pm-choice-button');
    button.type = 'button';
    button.setAttribute('aria-haspopup','listbox');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label',select.getAttribute('aria-label') || document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.textContent.trim() || 'Choose an option');
    button.setAttribute('aria-controls',`pm-choice-menu-${++nextId}`);
    const leading = select.id === 'noteVisibility' ? create('span','pm-choice-leading') : null;
    if (leading) { leading.setAttribute('aria-hidden','true'); button.append(leading); }
    const caption = create('span','pm-choice-caption');
    const chev = create('span','pm-choice-chevron');
    chev.setAttribute('aria-hidden','true');
    chev.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    button.append(caption,chev);
    const menu = create('div','pm-choice-menu');
    menu.id=button.getAttribute('aria-controls');
    menu.setAttribute('role','listbox');
    menu.setAttribute('aria-label',button.getAttribute('aria-label'));
    menu.hidden = true;
    shell.append(button, menu);

    const options = () => [...select.options].filter(o=>!o.hidden && !o.disabled);
    const selected = () => select.selectedOptions[0];
    function sync() {
      const value=selected();
      caption.textContent = value?.textContent.trim() || 'Select an option';
      if(leading)leading.innerHTML = select.value === 'public' ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>' : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'; 
      button.classList.toggle('pm-choice-placeholder',!select.value);
      button.disabled = !!select.disabled;
      button.setAttribute('aria-disabled',String(!!select.disabled));
      if (menu.hidden) return;
      menu.querySelectorAll('[data-pm-value]').forEach(o=>{
        const isSelected=o.dataset.pmValue===select.value;
        o.setAttribute('aria-selected',String(isSelected));
        o.classList.toggle('is-selected',isSelected);
      });
    }
    function renderOptions() {
      menu.replaceChildren();
      const all = options();
      all.forEach((option, i) => {
        const entry = create('button','pm-choice-option',option.textContent.trim());
        entry.type='button';
        entry.setAttribute('role','option');
        entry.setAttribute('aria-selected',String(option.selected));
        entry.dataset.pmValue=option.value;
        entry.dataset.pmIndex=String(i);
        if (option.selected) entry.classList.add('is-selected');
        entry.addEventListener('click',(event)=>{
          event.preventDefault();
          if(select.disabled)return;
          select.value=option.value;
          select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
          sync();
          dismiss({restoreFocus:true});
        });
        menu.append(entry);
      });
      if (!all.length) menu.append(create('span','pm-choice-empty','No options available'));
    }
    function place() {
      // Use the body as the menu's parent to escape overflow:hidden/card clipping.
      if (!desktopSize()) return;
      const rect=button.getBoundingClientRect();
      const height=Math.min(320,window.innerHeight*.48);
      const spaceBelow=window.innerHeight-rect.bottom;
      const above=spaceBelow<height+12 && rect.top>spaceBelow;
      const maxAvailable=above?Math.max(120,rect.top-14):Math.max(120,spaceBelow-14);
      Object.assign(menu.style,{
        position:'fixed',
        left:`${Math.min(rect.left,Math.max(12,window.innerWidth-rect.width-12))}px`,
        width:`${Math.min(Math.max(rect.width,170),window.innerWidth-24)}px`,
        right:'auto',
        bottom:above?`${window.innerHeight-rect.top+7}px`:'auto',
        top:above?'auto':`${rect.bottom+7}px`,
        maxHeight:`${Math.min(320,maxAvailable)}px`
      });
    }
    function open() {
      if(select.disabled)return;
      if(active){ if(active.button===button){dismiss();return;}dismiss(); }
      renderOptions();
      const backdrop=create('div','pm-choice-backdrop');
      backdrop.addEventListener('click',()=>dismiss());
      document.body.append(backdrop,menu);
      menu.hidden=false;
      active={button,menu,backdrop,originalParent:shell};
      button.setAttribute('aria-expanded','true');
      place();
      // Open near the selected option; keyboard and touch behave the same.
      const chosen=menu.querySelector('.is-selected') || menu.querySelector('[role="option"]');
      chosen?.focus({preventScroll:true});
    }
    button.addEventListener('click',open);
    button.addEventListener('keydown',e=>{
      if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){
        e.preventDefault();open();
      }
    });
    select.addEventListener('change',sync);
    select.addEventListener('input',sync);
    select.addEventListener('invalid',()=>{
      dismiss();
      button.classList.add('pm-choice-invalid');
      button.focus({preventScroll:true});
    });
    button.addEventListener('click',()=>button.classList.remove('pm-choice-invalid'));
    button.addEventListener('focus',sync);
    // Track dynamically added/disabled options (e.g., groups and school grades).
    const observer=new MutationObserver(sync);
    observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','label']});
    // Editing a note or loading a profile sets .value programmatically without firing
    // a change event. Mirror those assignments so the displayed privacy is never stale.
    const nativeValue=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    if(nativeValue?.get && nativeValue?.set){
      Object.defineProperty(select,'value',{
        configurable:true,
        get(){return nativeValue.get.call(this)},
        set(next){nativeValue.set.call(this,next);sync()}
      });
    }
    // Native form reset updates the field after the reset event has fired.
    select.form?.addEventListener('reset',()=>window.setTimeout(sync,0));
    sync();
  }

  document.addEventListener('keydown', e=>{
    if(!active)return;
    if(e.key==='Escape') {e.preventDefault();dismiss({restoreFocus:true});return;}
    const items=[...active.menu.querySelectorAll('[role="option"]')];
    if(!items.length)return;
    const index=items.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
    }else if(e.key==='Home'||e.key==='End'){
      e.preventDefault();items[e.key==='Home'?0:items.length-1].focus();
    }else if(e.key==='Tab'){
      dismiss();
    }
  });
  window.addEventListener('resize',()=>{if(active) {if(desktopSize()) {active.menu.style.removeProperty('bottom');place();}else {active.menu.removeAttribute('style');}}});
  window.addEventListener('scroll',()=>{if(active && desktopSize()) place();},true);
  function init() {document.querySelectorAll('select:not([multiple])').forEach(enhance);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
