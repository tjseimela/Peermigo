# Peermigo Refined — Website Release

Date: 25 October 2026

## What's new
- A calmer, neutral light-mode palette: near-white canvas, white surfaces, graphite text, restrained purple for actions and selections.
- A dark-mode palette built around charcoal instead of purple-tinted backgrounds.
- Cleaner cards, borders and less decorative glow/gradient styling.
- Shared styles applied after existing page styles through `peermigo-refined.css`, included on every website page.
- All previous features, including Matching v3, Notes Feed, profile completion, surname editing and security dialogs, are preserved.

## Supabase Edit Profile fix (already applied to your connected live project)
Existing `profiles.given_names` and `profiles.surname` columns were readable but lacked INSERT/UPDATE grants for the `authenticated` role, so saving names failed with `permission denied for table profiles`.
We granted only INSERT and UPDATE on those two columns to `authenticated`.  RLS still restricts students to their own profile. `is_verified` and `deactivated_at` remain unwritable.
No SQL migration is needed when deploying these files.

## Verification performed
- 84 layout checks, covering 14 pages × light/dark × 320, 390, 1280 widths, with zero horizontal overflows.
- Existing JavaScript syntax and matching / registration test suites passed.
- Supabase name-column grants were verified via SQL without modifying any student data.

## Deploy
1. Extract this ZIP into your local existing `peer-match` GitHub repository. `index.html` should be at its root.
2. Commit the changes through GitHub Desktop.
3. Push origin and confirm the deployment is Ready in Vercel.
4. On the live website, refresh and test Edit Profile name editing with a signed-in test account, Notes, Find Peers, and light/dark mode.

No new site, Vercel project, Supabase database, or configuration keys are needed. Browser and authenticated end-to-end testing on your live domain still needs verification.
