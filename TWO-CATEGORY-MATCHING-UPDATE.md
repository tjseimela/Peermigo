# Peermigo — Two-category student matching (v4.0)

## What changed

The overall percentage shown on Find Peers cards and used to rank recommendations is now composed of:

- **Academic Match — 70% of the overall score.** Subjects/modules account for 80% of this category (56 overall points), and course/grade similarity accounts for 20% (14 overall points).
- **Study Compatibility — 30% of the overall score.** It considers institution, verified campus for in-person matching, format, and availability. Each context (online, hybrid, on-campus) retains relative emphasis on study feasibility, with availability capped at 4 overall points.

`matching.js` provides `PM.matchDetails(peer, me)` with the existing `score`, `parts`, `signals`, `eligible` and `showScore` fields, plus `academicScore`, `studyScore`, `academicWeight`, `studyWeight`, and `subjectEvidence` (`overlap`, `none`, or `unknown`). All scores are **compatibility estimates, not probabilities**.

The existing one-to-one smart subject matching still recognises aliases (`Maths`/`Mathematics`) and limited credit when module parts/levels differ (`Web Development 3.2`/`Web Development`). The scoring no longer rewards the same course and campus so generously that it appears to indicate shared modules: an illustrative pair with the same course, institution and campus but **no matching modules** gets **20% academic, 93% study, 42% overall**.

The "Why you match" popup in `match-breakdown.js` now shows the two percentages and their 70/30 contribution, followed by detailed points and explanations for each factor. Ranking automatically follows the recalculated overall score because Find Peers uses `PM.matchDetails`.

## Safeguards maintained

- Do not present incompatible school vs. tertiary levels as matches.
- No in-person recommendation without verified matching campus/institution (schools use their school).
- Students with unknown module lists are marked as unknown rather than presumed academically incompatible.
- Course similarity alone cannot produce a strong overall recommendation.
- Unrelated course and subjects cap the overall score at 29%; school grade conflicts cap it at 19%; unverified on-campus location caps at 44%.
- Incompatible study formats are still excluded.
- No database schema updates or existing student profile edits are needed.

## Files changed

- `matching.js` — new weighted two-category scoring, version 4.0.0.
- `match-breakdown.js` and `match-breakdown.css` — transparent two-category popup.
- `tests/match-breakdown.test.cjs` and `tests/smart-subject-matching.test.cjs` — updated regression expectations.
- `tests/two-pillar-matching.test.cjs` — new detailed scoring safeguards.

The full website ZIP retains all unrelated files. Run `node tests/two-pillar-matching.test.cjs` or all `node tests/*.test.cjs` individually. Test signed-in Find Peers scores after deployment (including a student with no shared modules).
