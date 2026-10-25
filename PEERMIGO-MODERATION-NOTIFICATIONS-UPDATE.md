# Peermigo — Moderation & Account Notifications Fix
Date: 25 October 2026

## What was fixed
- Supabase's `pm_set_in_app_visibility` trigger now makes `moderation` notifications always visible, regardless of optional activity preferences.
- Previously hidden moderation notifications were restored in-app (older emails were not resent).
- Students can mark their own notifications as read. The database grant allows updating **only** `is_read`, under the existing row-level security rules.
- The website's notifications query now includes moderation notices, with a distinct shield style, safe account-status links, unread badges, a Realtime refresh, and background-tab reconciliation.
- Students suspended or disabled by an administrator are redirected to a dedicated account-status page where they can read their notice and submit an appeal.
- A database audit trigger now notifies students when verification decisions or appeal reviews are finalized. Existing admin authorization and decision functions were not changed.
- The deployed `send-activity-email` Supabase Edge Function now supports essential moderation/account emails, using the existing Brevo configuration. It still respects existing opt-in settings for optional activity emails. The email link allowlist includes account-status and verification pages.

## Database and email deployment
**Already applied to the connected Peermigo Supabase project**:
- `fix_moderation_notification_visibility_and_read_privileges` migration
- `send_student_notices_for_verification_and_appeal_reviews` migration
- `send-activity-email` Edge Function, version 4

The two `.sql` files in this ZIP are **reference copies** of the applied migrations. You do **not** need to paste them into the SQL Editor again.

## Website deployment
1. Copy the extracted ZIP contents into the existing Peermigo GitHub repository; do not create a new Supabase project.
2. In GitHub Desktop, use summary: **Fix moderation and account notifications**.
3. Commit and click **Push origin**. Vercel can deploy from the linked branch.
4. Reload the Peermigo website and sign in with a test student account to verify.

## Recommended checks (using a test account)
- Send a Community Guidelines warning in the admin console: it should appear in Notifications and the unread badge, including reason/details.
- Remove and restore a test note: the author should see each notice.
- Suspend the test student: their next page load should open account-status.html, displaying the reason and appeal form.
- Reinstate the student: a notice should appear and normal access should return.
- Approve or reject a test verification request: a notification should appear.
- Complete a test appeal review: a notification should appear.
- Mark notifications read: the unread badge should update.
- Check the relevant student's confirmed email for a new moderation event; test delivery depends on Brevo and email-domain configuration.

### Notes
Existing matching, chat, study groups, study sessions and notes functionality are unchanged. Only moderation notification delivery, display, related account status handling and account-review alerts were updated.
No real student was warned, suspended, or had notes removed for testing as part of this update. Live email receipt and logged-in student journeys should be verified with designated test accounts after deployment.
