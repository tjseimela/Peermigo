/* Minimal image picker for notes. Original upload/save handlers remain unchanged. */
(() => {
  'use strict';
  function setup() {
    const open = document.getElementById('pmAddNoteImages');
    const input = document.getElementById('noteFiles');
    const previews = document.getElementById('pmNoteImagePreviews');
    if(!open || !input || !previews) return;
    const urls=[];
    function render() {
      for(const url of urls) URL.revokeObjectURL(url);
      urls.length=0;previews.replaceChildren();
      const files=Array.from(input.files || []);
      previews.hidden=files.length===0;
      for(const file of files.slice(0,5)) {
        if(!file.type.startsWith('image/'))continue;
        const box=document.createElement('div');box.className='pm-note-image-preview';
        const img=document.createElement('img');img.alt='Selected note image';img.src=URL.createObjectURL(file);urls.push(img.src);
        box.append(img);previews.append(box);
      }
      open.setAttribute('aria-label',files.length ? `Add or change note images. ${files.length} selected` : 'Add images');
    }
    open.addEventListener('click',()=>input.click());
    input.addEventListener('change',render);
    input.addEventListener('pm-upload-sync',render);
    input.form?.addEventListener('reset',()=>window.setTimeout(render,0));
    document.getElementById('notesCancelEdit')?.addEventListener('click',()=>window.setTimeout(render,0));
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
