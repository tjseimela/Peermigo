# Peermigo — Smart Subject/Module Matching (v3.1)

This update recognises common naming variations and awards conservative partial module points when the same subject title has missing or differing submodule numbers.

## Behaviour

- **Exact or known equivalent names:** `Maths` / `Mathematics`, `Web Dev 3.2` / `Web Development 3.2`, and `IT` / `Information Technology` receive full *name-similarity* credit. The overall module points still account for how many subjects both students list, as before.
- **Unspecified module numbers:** `Web Development 3.2` / `Web Development` receives partial name-similarity credit (68%). `Web Development 3` / `Web Development 3.2` receives partial credit (62%).
- **Different submodules in the same year:** `Web Development 3.1` / `Web Development 3.2` receives low partial name-similarity credit (26%), without being treated as the same module.
- **Different major levels:** `Programming 1` / `Programming 2` and `Web Development 2.2` / `Web Development 3.2` do not match.
- **Avoid false positives:** `Maths Literacy` / `Mathematics`, `Data Science` / `Computer Science` and unrelated subject titles do not match.
- **No double-counting:** each student subject can contribute to at most one paired subject; duplicates and aliases are de-duplicated.

These name-similarity factors are *not* raw points. The existing algorithm still calculates shared-topic overlap, breadth of the listed subjects and unchanged on-campus/hybrid/online weights, caps and eligibility rules.

## “Why you match”

The clickable match-score dialog now displays the student-entered names side by side with the reason for full or partial name credit, so `Web Development 3.2 ↔ Web Development` is never labelled an exact match. It is still an estimate, not a guarantee the course material is identical.

## Files changed

- `matching.js` — v3.1 subject comparison; unchanged score weights, non-module factors and ranking API.
- `match-breakdown.js` — transparent list of paired subjects and their reasons.
- `match-breakdown.css` — pair labels with light/dark theme support.
- `tests/match-breakdown.test.cjs` — updated UI coverage.
- `tests/smart-subject-matching.test.cjs` — new regression tests for equivalent, partial and nonmatching subjects.

No registration page, profile editor, Supabase schema, or database migration is required. The update works with existing saved subject lists automatically after redeployment.

## Test checklist after deploying

1. View a matching student whose module is listed as `Web Development` rather than `Web Development 3.2` and open their percentage badge.
2. Confirm the module section shows **partial** points and the actual entered names.
3. Check a known synonym like `Maths` / `Mathematics`.
4. Check that unrelated modules do not get points.
5. Confirm Find Peers and expanded profile cards still operate normally on desktop and mobile.
