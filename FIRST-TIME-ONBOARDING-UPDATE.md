# Peermigo — first-time student welcome + getting started

- Main Home dashboard kept intact.
- First-time welcome dialog appears only once per signed-in student when they first visit Home and before the welcome timestamp is stored. Existing students who have never seen the guide will also be offered it.
- Dismissible dialogue; progress checklist is embedded at top of Home until dismissed or all steps are complete.
- Tracks opening Find Peers / student search, making a real connection request (or accepted connection), and visiting Notes Feed.
- On return to Home, verifies previous pending/accepted connections from Supabase.
- Progress belongs to the logged-in account in `public.pm_student_onboarding` (not localStorage), protected by self-only RLS.
- If few relevant students exist, Notes Feed is explicitly offered without claiming that matches are available.
- Added keyboard/focus-handling, dark theme and mobile layouts, and coordinated the profile-completion reminder with onboarding so both popups cannot overlap even with an early sign-in event.
- Database setup was already applied to connected Supabase project. See `PEERMIGO_STUDENT_ONBOARDING_SQL.sql` for reproducibility.
- No extra mandatory signup fields and no changes to academic matching.
