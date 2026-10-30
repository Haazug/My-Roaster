# Live now

Open `/live`, or search for `live now`, `live`, or `ao vivo`. Results are grouped by airline. An airline's page filters this same feed. Route pages filter by both actual endpoints and airline, rather than aircraft proximity or heading.

Airport scans are detection points. An aircraft detected over Luanda whose callsign resolves to JNB–LHR appears under JNB departures and LHR arrivals, never NBJ. Unknown routes are omitted from airport boards. Airport boards offer All, In flight / arrivals, and Departures; departures here means observed airborne flights departing that airport, not scheduled future departures. Ground aircraft are excluded.

The feed scans NBJ, LIS, JNB, DXB, LHR, JFK, GRU and HND, plus the requested airport. It rotates through at most 20 aircraft per station per 45-second scan to bound callsign-provider traffic. Results are partial; this is not a worldwide census. Airport endpoints scan the shared stations themselves, so their coverage does not depend on a different serverless instance having handled a prior request. A resolved callsign is provider route data, not independent confirmation of the aircraft's current flight plan.

`lib/live-discovery.ts` keeps up to 5,000 aircraft observations per server process. After 90 seconds without a fresh observation, a previously airborne resolved flight is labelled **Estimated · unknown stage**, with no time remaining. After 20 minutes it expires. A ground observation or newly unresolved route replaces its previous association. The browser also ages retained results when refreshes fail. History is lost on process restart and is not shared across workers. Reliable longer-term estimates require a durable database and a real departures/arrivals feed; no timetable or flight completion is inferred from the static OpenFlights route network.

Published IATA flight numbers take precedence. Numeric ICAO callsigns can display the airline's IATA prefix and numeric suffix (DTA653 → DT653). Operational callsigns such as DTA6AB are preserved when the provider does not publish a passenger number. Links carry the complete identity to route pages; known numeric portions are retained in exports and flight-plan seeds. A generic route without a flight identity displays “Flight number unavailable”.

## Development and checks

Use Node.js 24+, `npm ci`, then `NODE_USE_ENV_PROXY=1 npm run dev -- --webpack`. Webpack avoids this environment's Turbopack local-port restriction. Retain inherited proxy and CA configuration. External dependencies are `api.adsb.lol`, `api.airplanes.live`, `api.adsbdb.com` and `raw.githubusercontent.com`; logo images use `cdn.jsdelivr.net`. Activate required domain access in cloud environment settings. No new API key is required by this implementation. Supabase is used by the existing account/flight-plan workflow.

Run:

```sh
npm test
npx tsc --noEmit --incremental false
npm run build -- --webpack
```

Tests exercise overflight exclusion, cross-airport assignment through real route handlers with controlled provider adapters, complete flight identity, source failure reporting, expiry, ground observations, route changes, bounded history and route links. The live-source access check in the cloud onboarding instance returned proxy 403; actual live coverage remains unverified until the saved domain changes are activated. Do not confuse fixture tests with a successful real-provider check.
