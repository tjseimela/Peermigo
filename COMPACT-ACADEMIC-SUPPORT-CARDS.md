# Peermigo — Compact Academic-Support Profile Cards

## What changed
- **Collapsed Find Peers card:** Shows a compact “Can help you with …” badge only if that peer is confident in a subject the signed-in viewer needs help with. If the peer can also receive help from the viewer, shows “Mutual learning”. Without a relevant match, neither a help badge nor an always-visible strengths/needs list appears.
- **Expanded card:** Continues to show that peer's complete self-reported strengths (Confident in / can help with) and learning needs (Needs help with), even if there is no personalised support match.
- **Full student profile:** Continues to display the Learning Support section, with full strengths and help-needs lists.
- **No changes** to registration, edit-profile persistence, matching algorithm or database configuration.

## Verified
- All 10 Node regression test suites passed.
- Browser-rendered Find Peers demonstration checked on desktop and mobile: conditional badges, expansion, and no horizontal overflow.
- Example screenshots are illustrative only, not real student profiles.

## Deploy
Replace the website files from the enclosed package in your GitHub project and commit the changes. Vercel can deploy the repository changes as usual.
