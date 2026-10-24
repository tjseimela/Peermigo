(function(){
  function bindUpload(inputId, statusId, emptyText, activeTextBuilder, resetSelectors = []) {
    const input = document.getElementById(inputId);
    const status = document.getElementById(statusId);
    if (!input || !status) return;
    const meta = status.closest('.pm-upload-meta');
    const render = () => {
      const files = input.files ? Array.from(input.files) : [];
      if (!files.length) {
        status.textContent = emptyText;
        if(inputId==='noteFiles')status.hidden=true;
        meta?.classList.remove('is-active');
        return;
      }
      status.textContent = activeTextBuilder(files);
      status.hidden = false;
      meta?.classList.add('is-active');
    };
    input.addEventListener('change', render);
    input.addEventListener('pm-upload-sync', render);
    input.form?.addEventListener('reset', () => window.setTimeout(render, 0));
    resetSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        const eventName = element.tagName === 'FORM' ? 'reset' : 'click';
        element.addEventListener(eventName, () => {
          window.setTimeout(() => {
            if (eventName === 'click' && selector === '#removePhoto') {
              input.value = '';
            }
            render();
          }, 30);
        });
      });
    });
    render();
  }

  function initializeUploadIndicators(){
    bindUpload(
      'avatarFile',
      'avatarFileStatus',
      'Choose a profile picture',
      (files) => files[0]?.name || '1 photo selected',
      ['#removePhoto', '#avatarForm']
    );
    bindUpload(
      'noteFiles',
      'noteFilesStatus',
      '',
      (files) => `${files.length} image${files.length === 1 ? '' : 's'} selected`,
      ['#notesCancelEdit']
    );
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeUploadIndicators);
  else initializeUploadIndicators();
})();
