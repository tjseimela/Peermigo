# Peermigo — Display learning strengths and needs on student profile cards

**What was wrong:** Find Peers cards only showed a conditional *personalised support match* badge. If the viewer wasn't looking for a subject the other student felt confident in, saved strengths and help needs were omitted from the profile card, even though they existed in Supabase.

**Fixed**

- A collapsed student card now visibly displays self-reported **Can help with** and **Needs help with** subjects whenever those selections exist, regardless of the viewer's profile.
- Expanding the student card shows all the student's selected strengths and needs as labeled subject tags.
- The standalone full student profile now has an explicit **Learning Support** section; if no selections exist, a clear explanatory empty state is shown.
- Responsive desktop/mobile layout, color contrast and very small phone screens were checked. No horizontal scrolling.
- Preserved the current personalised academic-support badge *in addition* to the permanent self-reported lists, and retained the existing matching algorithm.
- No database migration was needed; both columns and their saved values already exist. The database inspection confirmed that at least one profile has values in both lists.
- Subjects are self-reported, not verified qualifications.

**Source files changed:** `app.js`, `features.js`, `subject-support.css`.

**Added:** `tests/profile-card-learning-visibility.test.cjs` (checks visible folded summaries, expanded full lists, empty profiles, one-way selections, and HTML escaping).

**Tests:** Ten Node regression suites passed; browser layout tested at 1200 px, 390 px and 320 px using sample student data (not live logged-in student accounts). Live authenticated deployment still requires verification.

**GitHub Desktop commit:** `Show learning strengths and help needs on student cards`
