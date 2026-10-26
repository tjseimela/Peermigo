-- Optional module codes for context-aware student matching.
-- Existing students retain their profiles: codes are empty by default.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS module_codes jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT SELECT(module_codes), INSERT(module_codes), UPDATE(module_codes)
 ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION private.pm_validate_module_codes()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $function$
DECLARE item record;
BEGIN
 IF jsonb_typeof(NEW.module_codes) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Module codes must be a subject-to-code object.' USING ERRCODE='23514';
 END IF;
 IF (SELECT count(*) FROM jsonb_each(NEW.module_codes))>10 THEN
  RAISE EXCEPTION 'No more than ten module codes can be saved.' USING ERRCODE='23514';
 END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(NEW.module_codes) LOOP
  IF char_length(item.key)>100 OR item.key<>lower(regexp_replace(btrim(item.key),'\s+',' ','g'))
    OR NOT EXISTS(SELECT 1 FROM unnest(NEW.modules) AS module(name)
      WHERE lower(regexp_replace(btrim(module.name),'\s+',' ','g'))=item.key)
    OR item.value !~ '^[[:alnum:]][[:alnum:] ._/-]{0,23}$' THEN
    RAISE EXCEPTION 'Module codes must correspond to your listed subjects and contain 1–24 valid characters.' USING ERRCODE='23514';
  END IF;
 END LOOP;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS pm_validate_module_codes ON public.profiles;
CREATE TRIGGER pm_validate_module_codes BEFORE INSERT OR UPDATE OF modules,module_codes
 ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.pm_validate_module_codes();

-- Use this project's existing sign-up profile trigger, keeping its prior behaviour
-- and adding only optional module_codes from student signup metadata.
CREATE OR REPLACE FUNCTION private.pm_initialize_student_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE
 raw jsonb := COALESCE(NEW.raw_user_meta_data,'{}'::jsonb);
 p_name text; p_type text; p_institution text; p_campus text; p_course text;
 p_modules text[] := ARRAY[]::text[]; p_study_method text;
 p_given_names text; p_surname text; p_discoverable boolean := true;
 p_confident text[] := ARRAY[]::text[]; p_help text[] := ARRAY[]::text[];
 p_codes jsonb := '{}'::jsonb; p_module text; p_key text; p_code text;
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
 IF jsonb_typeof(raw->'module_codes')='object' THEN
   FOREACH p_module IN ARRAY p_modules LOOP
     p_key := lower(regexp_replace(btrim(p_module),'\s+',' ','g'));
     p_code := btrim(COALESCE(raw->'module_codes'->>p_key,''));
     IF p_code ~ '^[[:alnum:]][[:alnum:] ._/-]{0,23}$' THEN
       p_codes := p_codes || jsonb_build_object(p_key,p_code);
     END IF;
   END LOOP;
 END IF;
 p_study_method := btrim(COALESCE(raw->>'study_method',''));
 IF p_study_method NOT IN ('virtual','hybrid','campus') THEN p_study_method := ''; END IF;
 IF raw->'discoverable'='false'::jsonb THEN p_discoverable := false; END IF;
 INSERT INTO public.profiles
  (id,full_name,institution_type,institution,campus,course,modules,
   availability,study_method,about,discoverable,given_names,surname,confident_modules,help_modules,module_codes)
 VALUES
  (NEW.id,p_name,p_type,p_institution,p_campus,p_course,p_modules,
   '',p_study_method,'',p_discoverable,p_given_names,p_surname,p_confident,p_help,p_codes)
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$function$;
