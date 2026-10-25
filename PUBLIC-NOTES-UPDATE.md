# Peermigo — Public Notes and hidden profiles

## Behaviour
- Discover Notes shows all public notes returned by Supabase Row Level Security, whether or not their author appears in Find Peers.
- Public notes from hidden authors appear with the generic label “Peermigo student” and no author-profile link. This prevents the feed from revealing a hidden profile via a profile join.
- Your own public notes can also appear in the feed.
- Private notes are never fetched by Discover Notes.
- Notes from authors you have blocked remain excluded.
- “My institution” requires a visible, permitted institution value; hidden authors' notes remain available in “For you”, “Recent” and search.
- Existing bookmarks, image attachments, report controls and pagination are preserved.

## Backend
No Supabase migration is necessary: existing RLS on `student_notes` authorises public notes from active members without requiring profile discoverability. `profiles` RLS still protects hidden profiles.

## Deployment
Copy this ZIP into your existing GitHub repository and push. No Supabase SQL required.
