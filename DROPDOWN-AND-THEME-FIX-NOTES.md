# Peermigo — Dark/Light Dropdown and Dialog UI Fix

This is the full Peermigo website, built on the Refined Light Mode Contrast Fix release.

## Changed
- Replaced the remaining device-native selection menus for all 13 existing dropdown controls across registration, editing profiles, finding peers, scheduling sessions and Notes with Peermigo-styled menu controls.
- Notes visibility: **Only me** and **On my profile**, with privacy icons and readable colours in both themes.
- Clicking **anywhere on the button, including the chevron arrow**, opens the menu.
- Responsive choice menus: small sheet on phones, anchored menu on desktop.
- Keyboard interactions: Tab focus, Enter/Space opens, arrow keys navigate, Escape cancels; a selected option is marked clearly.
- Preserved existing native select values in the DOM so Supabase/profile and notes code paths continue using the same fields and change events; required and disabled validation behaviour retained.
- Existing custom dialogs for reporting, blocking, deleting and other confirmations remain; no browser alert/confirm/prompt calls found in site JavaScript.
- Improved active mobile navigation icon colour on brand-purple backgrounds.

## Included files
- `peermigo-selects.js`
- `peermigo-selects.css`
- Link references added to all HTML pages. Existing scripts, database configuration, user data and matching algorithms unchanged.

## Checks
- JavaScript syntax checked, 44 matching scenarios and 15 matching-details validation scenarios still pass.
- Tested the actual Notes selector markup + styles in isolated Chromium previews at 390px and 1280px, in both light and dark mode.
- Verified clicking the chevron opens it, selecting On my profile updates the original select value, pressing Escape dismisses the menu, and the rendered Notes component has no horizontal overflow.
- Confirmed native required-select form validity and disabled-select behaviour in browser tests.
- Checked the existing report dialog opens and Cancel returns without proceeding, in both themes.

## Deployment
1. Extract this ZIP into your existing local GitHub Desktop repository, with `index.html` at the root.
2. Replace old files, commit and push to trigger Vercel.
3. Refresh live site (a hard refresh if needed to clear CSS/JS cache).
4. Verify Notes visibility in both themes and the dropdowns in registration, Edit Profile, Find Peers and Sessions. Also test report / block / cancellation actions with a test account.

No SQL migration required. Live authenticated behaviour still needs checking with real student accounts after deployment.
