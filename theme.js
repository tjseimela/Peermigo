/* Peermigo appearance: apply before paint and persist across all pages. */
(() => {
  const storageKey = 'peer-match-theme';
  const readSavedTheme = () => {
    try { return localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light'; }
    catch (_) { return 'light'; }
  };

  let currentTheme = readSavedTheme();

  const applyTheme = (value) => {
    currentTheme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = currentTheme === 'dark' ? '#11162a' : '#f7f9fc';

    document.querySelectorAll('[data-theme-choice]').forEach((control) => {
      const selected = control.getAttribute('data-theme-choice') === currentTheme;
      control.setAttribute('aria-pressed', String(selected));
      control.classList.toggle('is-selected', selected);
    });
  };

  const setTheme = (value) => {
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(storageKey, nextTheme); } catch (_) {}
    applyTheme(nextTheme);
  };

  // Expose a small API for the Settings appearance controls.
  window.PeermigoTheme = Object.freeze({
    get: () => currentTheme,
    set: setTheme
  });

  applyTheme(currentTheme);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    document.querySelectorAll('[data-theme-choice]').forEach((control) => {
      control.addEventListener('click', () => setTheme(control.getAttribute('data-theme-choice')));
    });
  });
})();
