# Peermigo Notes Feed + desktop message composer

- Renamed the Notes page title to **Notes Feed**, the Discover Notes tab to **Discover**, and the shortcut to **+ Create Note**. The navigation remains **Notes**, and the My Notes tab is unchanged.
- Added desktop-only composer styling to `desktop-message-composer.css`, linked last in `messages.html` to override bare textarea browser styles. Includes accessible focus indication and dark theme.
- Made the desktop composer textarea grow up to 144px as students type, without changing the already-implemented mobile resize behaviour.
- No changes to message sending, attachments, emoji selection, notes storage, Supabase, or match scoring.
