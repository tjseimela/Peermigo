# Peermigo — Context-aware module matching

- Matching module names alone no longer guarantee full module credit. Different courses and institutions lower the name evidence; matching **self-reported** module codes at the **same** institution restore strong evidence. Codes are optional.
- Existing weighted 70% Academic / 30% Study and 60% coverage rules remain unchanged. The 56-point module factor uses contextual name similarity.
- Registration Classes and Edit Profile display optional module-code fields for each listed subject. No extra registration step.
- Code pairs and academic context are shown in Why you match. Matching names/codes are not official proof of identical curriculum.
- Database: profiles.module_codes jsonb column, permissions, validation trigger, auth signup profile initialization update. These need to be applied in Supabase; see project SQL file.
- No existing profile rows need to be edited. Defaults are empty.
