# Peermigo institution matching update

This build adds the official 26 South African public universities (Universities South Africa 2026) and 50 public TVET colleges (NSFAS directory). These are NOT all private universities or colleges. Unknown/private institutions and schools can still be typed manually.

Registration and Edit Profile use a compact searchable dropdown with typo suggestions. Students can select an official canonical name. Known short names and legacy data (e.g. VUT, UNISA, Westcol, Waterberg, Waterbeg) normalize for score and recommendation queries. Backend recommendation and directory filters use the same mapping; database schema and existing records have not been changed.

Known aliases are canonicalized on future signup/profile saves, but existing records remain unchanged. Unrecognized typo suggestions require student selection to avoid incorrect institution assignment.

Sources: https://usaf.ac.za/prospective-students/ and https://www.nsfas.org.za/content/institutions.html

Deployment: Unzip into existing Github repo root (index.html alongside data.js and app.js), commit and push to Vercel. Test real registration, edit profile, recommendation search and filters with your existing Supabase accounts.
