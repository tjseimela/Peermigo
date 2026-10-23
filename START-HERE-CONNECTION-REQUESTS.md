# Peer Match — Match Score, Connect Requests and Dark Mode Fix

## Improvements
- Student profile cards display colourful compatibility percentages (green/high, purple/mid, blue/lower).
- The old Message button on cards is now a real **Connect** action.
- Profile pages show **Connect** and **Message** together; Message remains available.
- Connect stores a private request in Supabase, automatically notifies the recipient in-app, and prevents duplicates.
- Recipients can **Accept** or **Decline** the request in Notifications. Acceptance notifies the sender.
- Pending/connected request states are visible on cards and profile pages.
- Dark-mode group cards and group headings have explicit high-contrast colours.

## Required setup — IMPORTANT
1. In your Supabase Dashboard, open **SQL Editor** and run `supabase/upgrade-connection-requests.sql` from the **Complete Source ZIP** or the separate downloadable SQL file. Run it once before deploying the website. It relies on your previous Peer Match social/in-app notification migrations already being installed.
2. Upload **Peer-Match-Connect-Website.zip** into your **existing** Netlify Peer Match site. The ZIP contains site files at its root. **Do not upload the Complete Source ZIP to Netlify** (it also contains admin-only SQL and the original source folder).
3. Hard refresh to clear old cached scripts.
4. Test with two non-blocked, discoverable student accounts: account A clicks Connect; B sees a notification and chooses Accept/Decline; A sees Accepted notification after Accept. Check group cards in dark mode.

## Notes
- Existing account-safety SQL and Edge Function setup should remain installed. No additional paid service or Brevo setup is needed for these **in-app** connection notifications.
- A student cannot request a connection with themselves, a blocked student, or a student who has opted out of profile discoverability.
- Each ordered pair can request once; a declined request cannot be re-sent in that direction. This avoids repeat unwanted requests.
- Visual preview and local browser tests use mock accounts; live Supabase testing is needed after running the SQL migration.
- Existing private chat remains accessible from the profile regardless of connection status.
