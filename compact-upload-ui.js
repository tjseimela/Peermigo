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
        meta?.classList.remove('is-active');
        return;
      }
      status.textContent = activeTextBuilder(files);
      meta?.classList.add('is-active');
    };
    input.addEventListener('change', render);
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

  document.addEventListener('DOMContentLoaded', () => {
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
      'No files selected',
      (files) => `${files.length} file${files.length === 1 ? '' : 's'} selected`,
      ['#notesCancelEdit']
    );
  });
})();
