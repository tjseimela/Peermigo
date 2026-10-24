/* Peermigo theme: apply before paint and persist locally across pages. */
(() => {
  const key = 'peer-match-theme';
  let theme = 'light';
  try { theme = localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; } catch (_) {}
  const apply = (value) => {
    theme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#11162a' : '#f7f9fc';
    const button = document.getElementById('themeToggle');
    if (button) {
      button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(theme);
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, next); } catch (_) {}
      apply(next);
    });
  });
})();
