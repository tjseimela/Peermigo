-- Peermigo Learning Support: confident subjects + subjects needing help.
-- Idempotent; maintains existing v3 compatibility algorithm and student profile RLS.
ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS confident_modules text[] NOT NULL DEFAULT '{}'::text[],
 ADD COLUMN IF NOT EXISTS help_modules text[] NOT NULL DEFAULT '{}'::text[];

-- Existing profiles use column-level grants; grant the new fields only.
GRANT SELECT(confident_modules,help_modules), UPDATE(confident_modules,help_modules),
 INSERT(confident_modules,help_modules) ON TABLE public.profiles TO authenticated;

-- Validate new selections against the modules actually listed on this profile.
CREATE OR REPLACE FUNCTION private.pm_validate_learning_subjects()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $function$
DECLARE
 topic text;
BEGIN
 IF cardinality(NEW.confident_modules)>10 OR cardinality(NEW.help_modules)>10 THEN
  RAISE EXCEPTION 'Choose up to 10 subjects per learning category.' USING ERRCODE='23514';
 END IF;
 FOREACH topic IN ARRAY NEW.confident_modules LOOP
  IF char_length(btrim(topic))<2 OR char_length(topic)>100 OR NOT EXISTS(
    SELECT 1 FROM unnest(NEW.modules) AS m(v) WHERE lower(btrim(m.v))=lower(btrim(topic))
  ) THEN RAISE EXCEPTION 'Confidence subjects must be among your listed modules.' USING ERRCODE='23514'; END IF;
 END LOOP;
 FOREACH topic IN ARRAY NEW.help_modules LOOP
  IF char_length(btrim(topic))<2 OR char_length(topic)>100 OR NOT EXISTS(
    SELECT 1 FROM unnest(NEW.modules) AS m(v) WHERE lower(btrim(m.v))=lower(btrim(topic))
  ) THEN RAISE EXCEPTION 'Help subjects must be among your listed modules.' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(NEW.confident_modules) AS c(v) WHERE lower(btrim(c.v))=lower(btrim(topic))) THEN
   RAISE EXCEPTION 'A subject cannot be in both learning categories.' USING ERRCODE='23514';
  END IF;
 END LOOP;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS pm_validate_learning_subjects ON public.profiles;
CREATE TRIGGER pm_validate_learning_subjects BEFORE INSERT OR UPDATE OF modules,confident_modules,help_modules
 ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.pm_validate_learning_subjects();

-- Auth/signup trigger: preserve the original profile creation and defaults,
-- adding only validated optional subject classifications from signup metadata.
CREATE OR REPLACE FUNCTION private.pm_initialize_student_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE
 raw jsonb := COALESCE(NEW.raw_user_meta_data,'{}'::jsonb);
 p_name text; p_type text; p_institution text; p_campus text; p_course text;
 p_modules text[] := ARRAY[]::text[]; p_study_method text;
 p_given_names text; p_surname text; p_discoverable boolean := true;
 p_confident text[] := ARRAY[]::text[]; p_help text[] := ARRAY[]::text[];
BEGIN
 p_name := left(btrim(COALESCE(raw->>'full_name','')),80);
 IF char_length(p_name)<2 THEN
  p_name := 'Student ' || upper(substr(replace(NEW.id::text,'-',''),1,6));
 END IF;
 p_type := btrim(COALESCE(raw->>'institution_type',''));
 IF p_type NOT IN ('university','college','school') THEN p_type := ''; END IF;
 p_institution := left(btrim(COALESCE(raw->>'institution','')),120);
 IF char_length(p_institution)<2 THEN p_institution := ''; END IF;
 p_campus := left(btrim(COALESCE(raw->>'campus','')),100);
 p_course := left(btrim(COALESCE(raw->>'course','')),100);
 p_given_names := nullif(left(btrim(COALESCE(raw->>'given_names','')),80),'');
 p_surname := nullif(left(btrim(COALESCE(raw->>'surname','')),80),'');
 IF jsonb_typeof(raw->'modules')='array' THEN
   SELECT COALESCE(array_agg(mod ORDER BY mod),ARRAY[]::text[]) INTO p_modules
   FROM (
     SELECT DISTINCT left(btrim(value),100) AS mod
     FROM jsonb_array_elements_text(raw->'modules') AS items(value)
     WHERE char_length(btrim(value))>=2
     LIMIT 10
   ) AS valid_modules;
 END IF;
 -- Only trust classifications that correspond to a listed subject.
 IF jsonb_typeof(raw->'confident_modules')='array' THEN
   SELECT COALESCE(array_agg(m ORDER BY m),ARRAY[]::text[]) INTO p_confident
   FROM unnest(p_modules) AS m
   WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(raw->'confident_modules') AS x(v)
    WHERE lower(btrim(x.v))=lower(btrim(m)));
 END IF;
 IF jsonb_typeof(raw->'help_modules')='array' THEN
   SELECT COALESCE(array_agg(m ORDER BY m),ARRAY[]::text[]) INTO p_help
   FROM unnest(p_modules) AS m
   WHERE NOT (m=ANY(p_confident))
    AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(raw->'help_modules') AS x(v)
     WHERE lower(btrim(x.v))=lower(btrim(m)));
 END IF;
 p_study_method := btrim(COALESCE(raw->>'study_method',''));
 IF p_study_method NOT IN ('virtual','hybrid','campus') THEN p_study_method := ''; END IF;
 IF raw->'discoverable'='false'::jsonb THEN p_discoverable := false; END IF;
 INSERT INTO public.profiles
  (id,full_name,institution_type,institution,campus,course,modules,
   availability,study_method,about,discoverable,given_names,surname,confident_modules,help_modules)
 VALUES
  (NEW.id,p_name,p_type,p_institution,p_campus,p_course,p_modules,
   '',p_study_method,'',p_discoverable,p_given_names,p_surname,p_confident,p_help)
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$function$;
