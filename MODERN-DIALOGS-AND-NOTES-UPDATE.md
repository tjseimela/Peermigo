# Peermigo — modern dialogs and streamlined Notes editor

## Updated
- Replaced native browser alert/confirm/prompt dialogs in application JS (report, block, group admin, account actions, deleting notes/attachments, photo validation, group messages, and manual copy fallback).
- Custom accessible Peermigo dialog supports confirmation, report-text entry, action selection, and notices. Mobile bottom sheet, desktop card, light/dark themes, Escape/Cancel, focus management and text validation.
- Notes editor redesigned with compact privacy selector (Only me / On my profile), image-only icon picker, optional selected-image thumbnails, and action button in one footer toolbar.
- Original note saving, Supabase privacy policies, upload limits, and other backend workflows unchanged.

## Testing
- All JavaScript passed `node --check`.
- Existing automated matching/registration tests passed.
- Browser screenshot checks done for Notes toolbar at phone and desktop widths, dialog cancel/report validation, and light/dark theme.
- Image selection/reset checked at 320, 375, 430 and 820px with no horizontal overflow.
- Live authenticated account, report, block and Supabase upload tests still required after deploying.

## Deployment
Unzip the contents into the root of your existing GitHub repository, commit and push to Vercel. No SQL migration is required for this update.
