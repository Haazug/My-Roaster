# Changelog

## v2.2.1 — 2026-10-31

- Discover countries and clickable airport markers while exploring the globe on the home page.
- Inspect airport and airline descriptions, country directories, operating airlines and hubs before opening their pages.
- Keep discovery layers, data fetching and selection panels disabled on route and flight pages.
- Bundle low-resolution Natural Earth country boundaries locally; airport and airline descriptions use the existing sanitized reference catalog.

## v2.2.0 — 2026-10-31

- Use the supplied MyRoster logo as a monochrome transparent PNG in the app and a black mark on a white background for PWA, Apple and favicon icons.
- Keep the same globe rotation speed in airport browsing and the home view. Enable drag and zoom during flights, with a mobile-friendly exploration mode, zoom buttons and a recenter control.
- Back controls return to the previous internal page. Deep links have a safe fallback, and search queries stay in the history entry so Back restores the results.
- Offer commercial flight numbers observed on the exact airline and direction, including recent device history. Keep the selected or manually entered number through planning and flight. Do not infer a commercial number from an alphanumeric operational callsign or invent a number for a static catalog route.

Flight-number availability still depends on observed provider data; the historical route catalog does not contain schedules or flight numbers. User-entered numbers belong to simulation plans.
