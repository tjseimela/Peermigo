# Peermigo — Discover Notes and editable surnames

## Pages

- `notes.html`: Discover Notes (public note feed, search, For you, Recent and My institution) and My Notes (existing create/edit/delete workflow), plus a full-note reader and image attachments.
- `profile.html`: Edit Profile now has separate First name and Surname fields. A student's display name is still saved in `profiles.full_name`, keeping existing messaging, matching and profile links compatible.

## Privacy and safety

- Discover only retrieves notes whose `visibility` is `public` through Supabase RLS.
- The feed excludes the current user's notes, blocked authors and authors with non-discoverable/inaccessible profiles.
- Authors continue to control private/public visibility in My Notes.
- The reader includes Report note. Reports use `public.pm_note_reports`, with authenticated INSERT-only access and RLS.
- Search is limited to title/content matching. “For you” prioritises terms from the current student's modules/course within each fetched batch; it is not a semantic recommendation engine.

## Supabase already updated

- `profiles.given_names` and `profiles.surname` (nullable, preserves old records), and the auth signup trigger to save both for future signups.
- `pm_note_reports` new RLS-protected insert-only reporting table.
- Existing `student_notes` and `pm_attachments` RLS read policies were verified as restrictive/author-controlled; no change needed.

No further database SQL is required before deploying this ZIP.

## Tests

- Existing matching and required-fields automated tests pass.
- Headless browser mock exercises discover tabs, exclusion of private/hidden/blocked authors, reader, and report form.
- Mobile 390px and desktop 1280px previews checked for horizontal overflow.
- Actual live Supabase interactions with student accounts still require confirmation after deployment.

## Deployment

Copy all website files from the ZIP root into the existing `peer-match` repository, replace older files, commit, and push. Vercel will deploy. Preserve your existing Supabase project and email settings.
