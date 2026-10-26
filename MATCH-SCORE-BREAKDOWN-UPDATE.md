# Peermigo Match Score Breakdown — Update

The Find Peers page now displays each visible match score as a clickable button.

- Works for both Recommended Peers and Explore All Students cards.
- Opens an accessible, mobile-responsive, light/dark Peermigo modal.
- Reads the existing PM.matchDetails() results and PM.MatchingV3.weights without altering the algorithm, score or ranking.
- Displays actual weighted point contributions for subjects, course, institution, campus (if weighted), study format and availability.
- Explains any score cap applied by the matching algorithm.
- Uses score details only from students already loaded for the signed-in user's directory; makes no extra backend requests.
- The score is an estimate, not a probability or guarantee.

## Files changed
- app.js (score buttons and click handler)
- matches.html (loads breakdown CSS and JS)

## Added
- match-breakdown.js
- match-breakdown.css
- tests/match-breakdown.test.cjs

No Supabase database changes are required.
