# Peer Match — Profile Completion and Name Formatting Update

## What changed

- Adds a **Complete your study profile** pop-up on the signed-in student's dashboard when any of the eight profile details are missing: full name, institution, course/grade, subjects/modules, study format, availability, profile photo, and about/bio.
- **Subjects / Modules count as incomplete**, even though registration still allows students to add them later. This also works when that is the only missing item.
- Shows an eight-item progress indicator in the pop-up, with an explicit list of missing details and a button that opens the relevant field in Edit Profile.
- Adds a small progress card to the dashboard that the student can dismiss for the current browser tab.
- The pop-up can be dismissed using **Remind me later**, the X icon, Escape, or clicking outside it. It will reappear after **seven days** in the same browser if the profile remains incomplete.
- Once a profile is complete, both the pop-up and progress card are hidden.
- Standardizes personal names when registering and editing a profile, validates away digits/emojis/unusual symbols, and makes existing stored names display in consistent capitalization without needing to rewrite the underlying database rows.
- Normalizes the visible case of institution, course, campus, and subjects/modules, preserving common acronyms such as IT, AI, TVET, HTML, CSS, SQL, EDCR, BPCP. New profile saves also persist these formatted values.

## Install

1. If you're using the previous Account Safety release, keep its SQL migration and Edge Function setup in place. They remain part of this complete source package.
2. Drag the **Peer-Match-Profile-Completion-Website.zip** into your existing Peer Match site on Netlify.
3. Reload the website; if the previous files are cached in the browser, hard-refresh.
4. Sign in using a test account with no subjects/modules, then visit the dashboard. The reminder should show.
5. Click **Remind me later**, then confirm the dashboard's profile-progress card remains visible. Open **Edit Profile**, save the missing fields, and visit the dashboard again. A completed profile should not show the reminder.
6. Try registering or editing a test profile with irregular capitalization (e.g. `MPHO mAMpa`) and confirm that `Mpho Mampa` appears on the student card. Try digits in a name and confirm submission is rejected.

## Notes

- No new Supabase SQL, database column, Brevo, paid push notification service, or Edge Function is required **for this update**.
- Reminder snoozing uses **local browser storage per account**; it is **not synchronized between devices or browsers**. The actual completion state is checked from the student's Supabase profile each time the dashboard loads.
- This is a personal on-site prompt; it does not add an item to the Notifications inbox and does not send an email.
- Profile picture and bio count toward 100% progress, but they remain optional in the profile editor. The reminder is gentle, not a block on using the site.
- Capitalization is a convenience formatting policy, not a verification of legal names. Students with unusually capitalized names may need an individual exception in future releases.
- Visual QA was completed in local Chromium using a mocked Supabase backend; no live database was edited during testing. Live integration should be verified with disposable test accounts after deployment.
