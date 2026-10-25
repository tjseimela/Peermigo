-- Peermigo: deliver moderation notices reliably (25 October 2026)
-- Keeps optional preferences for messages/groups/sessions/notes unchanged.
-- This migration is also applied to the connected production Supabase project.
CREATE OR REPLACE FUNCTION private.pm_set_in_app_visibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  enabled_groups boolean := true;
  enabled_sessions boolean := true;
  enabled_notes boolean := false;
BEGIN
  SELECT in_app_groups, in_app_sessions, in_app_notes
    INTO enabled_groups, enabled_sessions, enabled_notes
    FROM public.notification_preferences
   WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    enabled_groups := true;
    enabled_sessions := true;
    enabled_notes := false;
  END IF;
  NEW.in_app_visible := CASE NEW.kind
    WHEN 'message' THEN false
    WHEN 'connect' THEN true
    WHEN 'moderation' THEN true
    WHEN 'group' THEN enabled_groups
    WHEN 'session' THEN enabled_sessions
    WHEN 'note' THEN enabled_notes
    ELSE false
  END;
  RETURN NEW;
END;
$function$;

-- Historic records never had a chance to be displayed.
-- This does NOT resend old notifications or emails.
UPDATE public.notifications
   SET in_app_visible = true
 WHERE kind = 'moderation'
   AND in_app_visible IS DISTINCT FROM true;

-- Allow students to mark their own notices as read while existing owner-scoped
-- RLS policies remain in place. Never grant general UPDATE on notifications.
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
