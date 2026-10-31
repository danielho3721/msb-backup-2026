# MSB Backup 2026

Standalone, browser-only MSB for the 2026 event backup. The index page preserves the source MSB DOM, three-column scoreboard, styling, and scoring/side-mapping logic, with local match setup and per-end time selection.

## Use at the venue

1. Keep index.html and the assets folder together.
2. Open index.html in Windows Chrome.
3. Press F11 for full screen.
4. Choose the two teams, 4 or 6 ends, and 3, 4, 5, or a custom 1–30 minute duration before starting the match.

The regular match uses the selected number of ends (4 by default, or 6). The selected end count and duration are locked once the match starts; the duration is reused each end and restored after a refresh. Scores, progress, and local reports stay in that Chrome profile’s browser storage. Do not clear Chrome site data during the event.

The page makes no Firebase or formal-event database connection. All libraries and configuration files are included locally; there is no build step or runtime CDN dependency.
