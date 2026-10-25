-- Peermigo: deliver important verification and appeal review decisions.
-- Attach notification delivery to the existing admin audit trail. This preserves
-- the security and business logic of the existing admin RPC functions.
CREATE OR REPLACE FUNCTION private.pm_emit_admin_review_notices()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  v_student uuid;
  v_title text;
  v_description text;
  v_link text := 'account-status.html';
BEGIN
  IF NEW.action IN ('verify','revoke_verification') AND NEW.target_type = 'student' THEN
    IF (NEW.details->>'from')::boolean IS NOT DISTINCT FROM (NEW.details->>'to')::boolean THEN
      RETURN NEW; -- No badge change.
    END IF;
    v_student := NEW.target_id;
    v_title := CASE WHEN NEW.action = 'verify' THEN 'Verified badge approved' ELSE 'Verified badge removed' END;
    v_description := LEFT(COALESCE(NEW.details->>'reason','Your verification status has changed.'),300);
    v_link := 'verification.html';
  ELSIF NEW.action IN ('verification_request_approved','verification_request_rejected')
        AND NEW.target_type = 'verification_request' THEN
    v_student := NULLIF(NEW.details->>'student_id','')::uuid;
    v_title := CASE WHEN NEW.action = 'verification_request_approved'
       THEN 'Verification request approved' ELSE 'Verification request declined' END;
    v_description := LEFT(COALESCE(NEW.details->>'reason','Your verification request has been reviewed.'),300);
    v_link := 'verification.html';
  ELSIF NEW.action='report_review' AND NEW.target_type='appeal'
        AND NEW.details->>'to' IN ('resolved','dismissed')
        AND (NEW.details->>'from') IS DISTINCT FROM (NEW.details->>'to') THEN
    SELECT a.student_id INTO v_student FROM private.pm_moderation_appeals a WHERE a.id=NEW.target_id;
    v_title := CASE WHEN NEW.details->>'to'='resolved' THEN 'Appeal review completed' ELSE 'Appeal review closed' END;
    v_description := LEFT('Your appeal has been reviewed. Check your account status for the outcome. '||COALESCE(NEW.details->>'note',''),300);
    v_link := 'account-status.html';
  END IF;

  IF v_student IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,kind,title,description,link,is_read,in_app_visible)
    VALUES(v_student,'moderation',v_title,v_description,v_link,false,true);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pm_emit_review_notices ON private.pm_platform_admin_audit;
CREATE TRIGGER pm_emit_review_notices AFTER INSERT ON private.pm_platform_admin_audit
FOR EACH ROW EXECUTE FUNCTION private.pm_emit_admin_review_notices();
