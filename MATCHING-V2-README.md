# Peermigo matching v2 — rules and deployment notes

## Purpose
This is a **transparent, deterministic heuristic** that ranks student study-partner compatibility from details the students voluntarily provided. A 90% match is NOT a probability that a partnership will work, nor does it prove subjects are equivalent.

## User-visible behaviour
- **Online ↔ online:** prioritize shared subjects/modules, related courses, schedule and format. Students can be recommended across institutions. No same-campus points.
- **On-campus ↔ on-campus:** prioritize academic relevance plus campus and institution proximity.
- **Hybrid:** compatible with online and on-campus; factor weights are the average of both preferences.
- **Online ↔ on-campus only:** incompatible; not recommended (users can still browse the directory).
- **Recommended:** needs an adequately specified profile, evidence of shared modules or course, compatible formats, and a score of at least **35/100**. Shows the top six and ranks the candidate pool globally.
- **Directory:** all discoverable/unblocked students remain browseable; "Highest match first" ranks globally before pagination. Scores below 30 indicate insufficient academic overlap. Profiles with too little detail have no numeric badge.
- **Match explanations:** appear in expanded Find Peers cards and badge tooltips.
- **Aliases:** VUT/full name, Waterberg/Waterbeg and other supported institution variants work with existing records. Established subject abbreviations such as "Web Dev"/"Web Development" and "IT"/"Information Technology" work; different module numbers do not automatically match.
- **School-level guardrail:** school and tertiary students are not recommended across study levels; different grades are not recommended to each other.

## Component weights (maximum, before evidence adjustments)
| Factor | Online | Hybrid | On-campus |
|---|---:|---:|---:|
| Shared modules / subjects | 50 | 43 | 34 |
| Same or equivalent course | 15 | 14 | 10 |
| Institution | 4 | 12 | 25 |
| Campus (within same institution) | 0 | 5 | 15 |
| Availability | 14 | 12 | 9 |
| Preferred study format | 17 | 14 | 7 |
| Total | 100 | 100 | 100 |

For two different but compatible formats, weights are averaged. Module similarity is a one-to-one overlap measure with level-number protection. Exact availability agreement scores fully; "flexible" indicates a partial, not guaranteed, match. Non-academic pairs are capped at 29%, and different school grades are capped at 19%.

## Privacy and security
No personal demographic attributes, verification badge, or activity status affect the score. Candidate retrieval respects existing RLS, discoverable flags and block lists. The JavaScript runs client-side on the already accessible student-profile fields. Do not assume that client-side ranking is an authorization layer: Supabase RLS remains authoritative. No database schema migration or changes to existing accounts.

## Tests and limitations
- 19 matcher/unit scenarios and 4 mocked Supabase integration scenarios passed.
- The live database schema was inspected read-only; live authenticated end-to-end testing was not possible in this environment.
- The catalog of equivalent subject/course names is intentionally conservative. Programme/module equivalence, academic levels, and actual calendar availability are not externally verified. Students may enter free-form subject names that do not match in wording.
- Recommendations currently scan up to 6,000 discoverable profiles (pagination of 300). For larger communities, move candidate selection/ranking into a server-side function/indexed matching service. This is a scale limit, not a promise of full-database matching beyond 6,000.
- Validate using two signed-in test accounts before production rollout: matching across institutions for online; exclusion for online vs on-campus; hybrid; blocked/hidden; alias names; and global directory ranking.

## Files changed
- **matching.js**: new isolated matching engine.
- **api.js**: uses matching engine; cross-institution recommendation candidates; global directory sorts; canonicalized same-course quick filter.
- **app.js**: recommendation eligibility and explanatory match score badges.
- **peermigo-clean-ui.css**: compact matching explanation styling.
- **HTML pages**: load matching.js after data.js and before api.js.

Deployment: extract the website ZIP in your existing GitHub repository root, commit and push; your current Vercel project deploys as before. No SQL scripts needed.
