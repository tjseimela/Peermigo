-- SQL already applied to the connected Peermigo Supabase project.
-- Suitable for fresh environments; never disable RLS.
CREATE TABLE IF NOT EXISTS public.pm_student_onboarding (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 welcome_seen_at timestamptz,
 discovered_peers_at timestamptz,
 opened_notes_at timestamptz,
 connected_at timestamptz,
 dismissed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pm_student_onboarding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pm_student_onboarding FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.pm_student_onboarding TO authenticated;
DROP POLICY IF EXISTS "Students read their own onboarding" ON public.pm_student_onboarding;
CREATE POLICY "Students read their own onboarding" ON public.pm_student_onboarding FOR SELECT TO authenticated USING ((select auth.uid())=user_id);
DROP POLICY IF EXISTS "Students create their own onboarding" ON public.pm_student_onboarding;
CREATE POLICY "Students create their own onboarding" ON public.pm_student_onboarding FOR INSERT TO authenticated WITH CHECK ((select auth.uid())=user_id);
DROP POLICY IF EXISTS "Students update their own onboarding" ON public.pm_student_onboarding;
CREATE POLICY "Students update their own onboarding" ON public.pm_student_onboarding FOR UPDATE TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
