# Peermigo matching v4.1 — Missing data & coverage

## Implemented behavior

- Keep Academic Match at 70% of overall and Study Compatibility at 30%.
- A factor is only *known* when **both** student profiles provide the details needed to compare it. Missing modules/course, institution, campus, study format and availability are not scored as incompatibility.
- For each category, calculate **weighted data coverage**: (sum of eligible factor weights with evidence) / (sum of category factor weights). Only show a category percentage if coverage is **at least 60%**.
- When coverage meets 60%, compute compatibility over known weights only: (known factor points) / (known factor maximum). Show the percentage and the category's separate coverage percentage.
- When either category has less than 60% coverage, show **Not enough data** for that category and the overall match; no false zero or 100% match badge is shown. In Find Peers a compact clickable "Not enough data" indicator opens the breakdown when the card has the profile essentials.
- Eligibility for recommendations requires a supported overall score. Results with missing/insufficient coverage have numeric sorting value zero for compatibility and remain discoverable through the directory, provided profile visibility allows it. Academic-help connections can still be recommended independently.
- Preserve the existing safeguards for incompatible formats, unverified on-campus locations, different school grades and genuinely unrelated courses/modules.
- For equal overall compatibility percentages, rank the pair with more weighted data coverage first.
- School location: where both learners are at the same school, institution identity substitutes for campus rather than treating an absent school campus as unknown.

## Important distinction

- A **known mismatch** earns 0 factor points and counts as known coverage.
- An **unknown factor** earns no points but is excluded from the factor denominator; it reduces data coverage.
- A student missing modules while the course matches has 20% Academic coverage, so an academic percentage cannot be calculated (the modules factor accounts for 80% of Academic Match).
- Missing study availability does not reduce a compatible Study Match score; it reduces its evidence coverage instead.

## Files changed

- `matching.js` (v4.1 matching and coverage calculation)
- `match-breakdown.js`, `match-breakdown.css` (explanations, coverage, unknown factors, responsive styling)
- `app.js` (compact clickable "Not enough data" card indication and ranking tie-break)
- `api.js` (server-fed directory and recommendations sorting tie-break)
- `tests/two-pillar-matching.test.cjs` and `tests/smart-subject-matching.test.cjs` (updated previous expectations)
- `tests/missing-data-coverage.test.cjs` (new test cases)

## Validation performed

- 13 Node test suites passed.
- Rendered desktop 1200px and mobile 390px using the actual component CSS/JavaScript; checked missing-data category status, missing-factor states and absence of horizontal overflow.
- No Supabase schema changes needed.

## Deployment

Commit the complete website to your GitHub repository and deploy through Vercel. Refresh the Find Peers page to see the recalculated scores.

Suggested GitHub Desktop commit summary: `Handle missing match data with coverage thresholds`

## Release caution

Live Supabase end-to-end registration and directory integration have not been exercised in the production project in this build. Test with two real student accounts after deployment.
