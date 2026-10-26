# First-time welcome and profile-completion reminder coordination

- On Home, the existing profile-completion reminder will wait for onboarding to check the account. This prevents async sign-in / auth event races.
- On the first Home visit, the Welcome to Peermigo guide takes precedence; the profile-completion popup is deferred to later visits rather than opening over the welcome.
- When the student has already seen the welcome (or it is unavailable), an incomplete-profile reminder may appear with the same original once-in-seven-days snooze rules.
- If a reminder is already open when onboarding starts, it is closed and its seven-day snooze timestamp is restored so no reminder is lost.
- Profile-completion cards and the guided onboarding checklist may coexist in Home content; only simultaneous modal overlays are prevented.
- No Supabase schema updates needed for this fix.
