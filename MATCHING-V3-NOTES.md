# Peermigo Matching v3 — deployment and verification

This release restores the desktop Edit Profile sidebar, simplifies Notes visibility and image uploads, and updates the matching rules. **No Supabase schema change is required.** The existing discoverability and blocked-user exclusions in directory/recommendation queries are preserved.

## Scoring weights

The algorithm selects context from **both students' study formats**; the values below total 100 per context.

| Factor | Both online / online+hybrid | Both hybrid | At least one on-campus (other hybrid or on-campus) |
|---|---:|---:|---:|
| Shared subjects/modules | 54 | 47 | 36 |
| Same/related course | 30 | 30 | 30 |
| Same institution | 4 | 8 | 8 |
| Same campus (at the same institution) | 0 | 6 | 20 |
| Compatible study format | 8 | 5 | 2 |
| Availability | 4 | 4 | 4 |

## Candidate eligibility and safeguards

- To be recommended, the students must have academic overlap (at least one shared module or same/related course), compatible known study formats, meaningful profile details, and at least a 45% heuristic score.
- When **either** student is on-campus-only, recommendations additionally require the **same institution AND the same confirmed campus** for university/college students; for school learners, the same school is sufficient because campuses may not be entered.
- Same institution with a different or missing campus yields at most 44%, not a campus recommendation. The student remains discoverable in the general directory if their privacy settings permit it.
- A shared institution/campus with unrelated academics never creates a recommendation. Unrelated academic profiles are capped at 29%.
- Online/online and online/hybrid combinations do **not** require the same institution or campus. Both hybrid students may connect online across institutions.
- Online-only and on-campus-only preferences are incompatible. School-versus-tertiary matches and different school grades are excluded from recommendations.
- Availability only contributes 0–4 points and never disqualifies a candidate on its own. Unspecified availability is treated as unknown, not as a conflict.
- Repeated subjects cannot inflate the score; different subject module levels (Programming 1 versus 2) stay distinct.
- The score is an **explainable heuristic, not a probability** that the students will make good partners. Institutional names still rely on the application's verified alias list; school campus labels and unrecognized subject synonyms may be imperfect.

## Notes changes

- Visibility options are now **Only me** and **On my profile** (database values remain `private` and `public`).
- Notes use a single image icon and accept only JPG/PNG/WebP uploads. A selection counter appears when students select images; a client-side check enforces five images and 10 MB per image. Previously uploaded note documents remain in old notes (nothing is deleted). Server-side MIME policy is unchanged.
- Existing profile photo, private-message and group-message upload controls are preserved.

## Validation

- `node tests/matching.test.cjs` — original scoring regressions
- `node tests/recommendations.test.cjs` — simulated database ranking and privacy filters
- `node tests/matching-v3.test.cjs` — on-campus logistics, academic overlap, online/hybrid, missing data, small availability weight, grade levels and symmetry
- Browser layout inspection at 320, 360, 390, 430, 768, 1024 and 1280 px in both themes found no horizontal overflow; image-picker interaction verified.

**Before wider release:** Test with real signed-in profiles, including different campuses of one institution, under the actual deployed Vercel site. Do not treat automated scenarios as proof of live network/auth behaviour. Matching is client-side and the existing 6,000-profile safety scan limit still applies.
