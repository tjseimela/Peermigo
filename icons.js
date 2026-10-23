/* Consistent lightweight line icons; no third-party icon font or network dependency. */
(() => {
 const paths = {
  'paperclip':'<path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7L10 17.3a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  'search':'<circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 5 5"/>',
  'settings':'<path d="M10 2h4l.7 2.4a8.5 8.5 0 0 1 1.7 1L18.8 5l2 3.5-1.7 1.8a8.5 8.5 0 0 1 0 3.4l1.7 1.8-2 3.5-2.4-.5a8.5 8.5 0 0 1-1.7 1L14 22h-4l-.7-2.4a8.5 8.5 0 0 1-1.7-1l-2.4.5-2-3.5 1.7-1.8a8.5 8.5 0 0 1 0-3.4L3.2 8.5l2-3.5 2.4.5a8.5 8.5 0 0 1 1.7-1L10 2Z"/><circle cx="12" cy="12" r="3"/>',
  'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  'scale':'<path d="M12 3v18M5 6h14M4 20h16M6 6 3 13h6L6 6ZM18 6l-3 7h6l-3-7Z"/>',
  'shield-check':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',

  'sliders':'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>',
  'home':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  'more':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  'eye':'<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':'<path d="M3 3l18 18M10.6 5.1a11 11 0 0 1 1.4-.1c6.2 0 10 7 10 7a16 16 0 0 1-3.1 3.6M6.4 6.4C3.5 8.3 2 12 2 12s3.8 7 10 7a9.8 9.8 0 0 0 4-.8M10 10a3 3 0 0 0 4 4"/>',
  'mail':'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  'users-plus':'<circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M19 8v8m-4-4h8"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  'calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  'bookmark':'<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-4.6L5 22V4Z"/>',
  'book':'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  'shield':'<path d="m12 22 7-4V6l-7-4-7 4v12l7 4Z"/><path d="m9 12 2 2 4-4"/>',
  'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'logout':'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  'lock':'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  'globe':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  'share':'<circle cx="18" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5M7 13l9 5"/>',
  'link':'<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'pin':'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  'arrow-left':'<path d="m15 18-6-6 6-6M9 12h12"/>',
  'edit':'<path d="m16 4 4 4M4 20l4.5-.8L20 7.7a2.1 2.1 0 0 0-3-3L5.5 16.2 4 20Z"/>',
  'image':'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5.2-5.2L5 21"/>',
  'message':'<path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l1.4-5A9 9 0 0 1 4 11.5a8 8 0 0 1 16 0Z"/>',
  'check':'<path d="m5 12 4 4L19 6"/>',
  'alert':'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  'camera':'<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  'send':'<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  'sparkles':'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z"/>',
  'trash':'<path d="M4 7h16M10 11v7M14 11v7M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'
 };
 window.PM=window.PM||{};
 window.PM.icon=(name, label='') => `<svg class="pm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label?`role="img" aria-label="${label.replace(/"/g,'&quot;')}"`:'aria-hidden="true"'}>${paths[name]||paths.alert}</svg>`;
})();
