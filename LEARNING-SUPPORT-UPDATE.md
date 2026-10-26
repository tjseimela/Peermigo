# Peermigo — Learning Strengths, Help Needs & Subject Autocomplete

Updated October 26, 2026.

## Changes

- Registration Step 2 → Classes: common school/university subject name suggestions appear as students type each comma-separated subject. Custom names are always allowed.
- Each listed subject has two optional choices: **Confident** or **Need help**, with neither selected by default. Choosing one unselects the other for the same subject. Students can request help even if they select no strengths.
- Edit Profile: the same subject picker and options, including loading previously saved selections.
- Student Profile: show reported strengths and help needs.
- Find Peers: display “Can help you with …” on matching peer cards; “Can help me” filters to peers confident in a subject the viewer needs help with. Mutual learning is labelled when two-way support exists.
- Existing compatibility percentage algorithm (matching.js) stays unchanged. A separate academic-help signal is used; support is based on students' own statements, not qualifications.
- School versus tertiary, physically incompatible study formats, and differing schools/grades are excluded from help matches, consistent with matching context.

## Supabase

- Added columns `public.profiles.confident_modules` and `public.profiles.help_modules`, each a text array with a default empty value.
- Added column-scoped SELECT/INSERT/UPDATE grants for authenticated users; existing owner-scoped RLS still applies.
- New `private.pm_validate_learning_subjects` trigger verifies selections belong to the students' declared modules and do not overlap.
- Updated existing `private.pm_initialize_student_profile()` to read selections from signup metadata when email-confirmation-based registration is initiated.
- **Supabase changes were already applied to the connected project. Do not need to run the included SQL again.** The SQL file is included for documentation/reproducibility.
- Existing student profiles are unchanged (new fields default to empty arrays).

## Files changed

`account.html`, `profile.html`, `matches.html`, `student.html`, `app.js`, `api.js`, `features.js` and `registration-wizard.js`.

## Files added

`subject-support.js`, `subject-support.css`, `tests/learning-support.test.cjs`, `PEERMIGO_LEARNING_SUPPORT_SQL.sql`, and this document.

## Tests and deployment

- Node syntax checks passed; 13 test suites passed, including one-way and mutual help matches.
- Standalone interactive browser tests passed at desktop and mobile widths; subject autocomplete selection and no horizontal overflow were checked.
- Full actual website end-to-end login/signup and saving to Supabase were **not** browser-tested; check with a new email and an existing student after deploying.
- Upload this updated website to GitHub and push to Vercel. As Supabase is already updated, the new UI should then be able to write and read support selections.
- Suggested GitHub commit summary: `Add learning strengths, support matching and subject suggestions`.
