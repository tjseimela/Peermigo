-- Peermigo: require at least two letter characters in any supplied first name
-- and surname on profile creation / identity changes.
-- Existing legacy profiles with null given_names or surname are unaffected.
CREATE OR REPLACE FUNCTION private.pm_validate_person_name_parts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.given_names IS NOT NULL AND
     char_length(regexp_replace(btrim(NEW.given_names), '[^[:alpha:]]', '', 'g')) < 2 THEN
    RAISE EXCEPTION 'First name must have at least two letters.' USING ERRCODE='23514';
  END IF;
  IF NEW.surname IS NOT NULL AND
     char_length(regexp_replace(btrim(NEW.surname), '[^[:alpha:]]', '', 'g')) < 2 THEN
    RAISE EXCEPTION 'Surname must have at least two letters.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pm_validate_person_name_parts ON public.profiles;
CREATE TRIGGER pm_validate_person_name_parts
BEFORE INSERT OR UPDATE OF given_names, surname ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.pm_validate_person_name_parts();
