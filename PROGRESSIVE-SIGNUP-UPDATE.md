# Peermigo progressive signup update

## Experience
- Screen 1: first name, surname, email, password, confirm password, age & legal agreement.
- Screen 2: seven compact required-profile stages: Type, Profile, Academic, Classes, Schedule, Preferences, Review.
- Clear numbered progress, Previous/Continue buttons, and a review summary.
- Students cannot advance past incomplete required sections.
- A school learner sees the grade selector; college/university students see course/programme instead.
- Campus is mandatory only for on-campus study at a college or university, as before.
- Enter at least one subject/module (1–10 permitted) and select study format.
- Privacy choice to show/hide the profile is preserved.
- The actual Supabase sign-up request is made **only at the end** of review, after every required matching detail is completed. No partial account is created at Screen 1.
- The existing backend, database, matching algorithm, and registration validation are unchanged.

## Files changed
- `account.html` — introduces the wizard UI and loads assets.
- `app.js` — delegates staged navigation to wizard while retaining existing signup logic.
- `registration-wizard.js` — controls wizard panels, validation, and review.
- `registration-wizard.css` — responsive light/dark styling.

## Launch check
Test with a fresh email address in a staging environment before rolling out registration changes to a live student audience. Confirm email verification, university, college, school, required modules, on-campus campus requirement, sign-in, and mobile layout. No live account was created during development.
