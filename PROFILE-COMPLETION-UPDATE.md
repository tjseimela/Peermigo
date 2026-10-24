# Peermigo — Compact Edit Profile progress (v2 matching website)

This package preserves Peermigo Smart Matching v2 and the existing institution-search / clean mobile updates.

## Changed
- `profile.html`: new compact progress bar just below the Edit Profile heading (replaces the location of the removed green banner).
- `edit-profile-completion.css`: small, responsive purple completion bar; supports light and dark mode.
- `edit-profile-completion.js`: fetches **saved** data through existing Supabase `PM.backend.profile()` and uses the existing `PM.profileCompletion()` eight-field calculation. Automatically refreshes after profile saves and photo uploads/removals.

Eight existing checks: full name, institution, course/grade, subjects/modules, preferred study format, availability, profile photo and about/bio.

The bar remains visible at 100%. It stays hidden until the signed-in account’s profile has loaded and never invents values from unsaved inputs. No database changes required.

## Deploy
Copy the ZIP contents to the root of the existing GitHub repository, replace older files, commit and push for Vercel. Test in an authenticated account: editing a field, adding/removing profile photo, viewing on phone in light/dark themes.
