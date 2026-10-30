# Live now and durable flight history

Open `/live`, or search for `live now` / `ao vivo`. Airport boards only assign identified routes to their origin (Departures) and destination (In flight / arrivals). Detection near a third airport never assigns a flight there. The lists represent airborne observations and explicitly uncertain estimates, not future scheduled departures.

## Existing free sources

The site still works without a new account or a paid API:

- Current airport scans use ADSB.lol / airplanes.live and ADSBDB callsign lookup.
- Discovery also attempts ADSB.lol's public global ReAPI feed, beyond the eight fixed stations. The public example is in [the provider's source](https://github.com/adsblol/api/blob/main/src/adsb_api/utils/reapi.py): `https://re-api.adsb.lol/re-api/?all&jv2`. `/v2/all` is not a supported endpoint.
- Existing identified flights refresh from global positions; new/expired route identities are resolved in bounded batches (20 per foreground request, 100 per background sync), with a persistent cursor. This avoids issuing thousands of callsign lookups in one request. A cycle completion refers to processing that provider feed, not complete worldwide flight coverage.
- Provider failures are reported as degraded coverage. Missing routes, receiver gaps and the lookup providers' accuracy remain limits. Positions and callsign routes do **not** constitute a complete airport timetable.

ADSB.lol data is available under [ODbL](https://opendatacommons.org/licenses/odbl/summary/); retain attribution when redistributing it. The application's existing OpenFlights dataset is also ODbL.

## Persistent storage

On a long-lived Node.js 24 host, SQLite is the default. Its database is `.local/live-history.sqlite` (ignored by Git); set `LIVE_HISTORY_PATH` to a file on a **persistent volume** in production. State, synchronisation cursors and a seven-day service/phase-change event history survive worker/process restarts. Repeated position refreshes update current state without duplicating identical service events. SQLite's WAL, transactions and timestamp guards protect concurrent writes. Preserve the database, `-wal` and `-shm` files during live backups, or use a proper SQLite backup.

For Vercel/serverless or multiple machines, a local disk is insufficient. The implementation requires `LIVE_HISTORY_DRIVER=supabase`, the existing `NEXT_PUBLIC_SUPABASE_URL`, and **server-only** `SUPABASE_SERVICE_ROLE_KEY`. Apply `supabase/migrations/202610300001_live_history.sql` in that project's SQL editor/CLI. The migration enables RLS, denies browser/anon access, and grants the server access to atomic state/event updates. Never put the service-role key in a NEXT_PUBLIC variable or send it to the browser. Missing storage configuration produces a visible history warning and current-detection fallback, never a claim of durable storage.

After 90 seconds without an observation, a flight becomes **Estimated · unknown stage** with no displayed remaining time. Where destination coordinates and plausible ground speed exist, the uncertainty window uses distance/speed plus a one-hour margin, capped at 18 hours. Without that evidence it is 20 minutes. Expiry removes an uncertain estimate; it does not assert the aircraft landed. Ground observations supersede airborne state. A new callsign/route replaces the same aircraft's association. Terminal timetable updates suppress the old service, without suppressing a different flight using that aircraft.

## Continuous synchronisation

Requests refresh data while the site is being used. For updates without visitors, run a worker under your host's process supervisor, or call `/api/live/sync` from a scheduler with `Authorization: Bearer <LIVE_SYNC_TOKEN>`. Use the same strong, randomly generated `LIVE_SYNC_TOKEN` on the server and scheduler. The endpoint is disabled without the token. Do not put the token in a URL. Requests are coalesced per worker; use one scheduler to avoid duplicate upstream work across machines.

```sh
# Server and worker must share the configured database and token.
NODE_USE_ENV_PROXY=1 npm run dev -- --webpack
# In another process; reads .env.local on Node 24:
npm run live:worker
```

The worker requires `LIVE_SITE_URL` and `LIVE_SYNC_TOKEN`. It makes one sync request at a time, then waits one minute. Background processes need restarting after deployment/cloud snapshot restoration. No scheduler has been provisioned or deployed automatically.

## Optional real departure/arrival boards

An Aviationstack adapter is included but **disabled unless `AVIATIONSTACK_API_KEY` is supplied**. This is optional and was not activated: the user has no provider account. If enabled, allow `api.aviationstack.com`, check that the chosen plan supports HTTPS, airport filters, real-time status and sufficient quota. Foreground airport requests ingest both `dep_iata` and `arr_iata`; global sync ingests active flights. Pagination checkpoints are persistent and successful pages are cached for five minutes to limit metered usage. The adapter processes at most three pages per scope per refresh and explicitly reports incomplete pagination. No completeness guarantee extends beyond the provider's own coverage.

Only provider-active status or an actual departure can create an uncertain airborne estimate. Merely passing a scheduled departure time cannot. Landed/cancelled/diverted/incident updates and actual arrivals terminate that service. Responses with missing/ambiguous timezones, malformed endpoints, or source errors are not accepted as successful flight evidence. The adapter is fixture-tested; actual provider access is **unverified** without credentials.

## Checks and current limitations

```sh
npm test
npx tsc --noEmit --incremental false
npm run build -- --webpack
```

Tests include opening the same SQLite file from another Node process, timestamp ordering, service termination, cross-airport assignment, source failures, pagination/cache/cursor behaviour, and expiry after loss of long-haul coverage. A successful fixture or disk test is not proof of live upstream coverage.

The cloud instance's network policy returned 403 for the real live feed. `re-api.adsb.lol` has been added to the environment draft alongside the existing providers, but the user must activate those settings. No real timetable credentials or production shared database are configured here. Full airport boards and guaranteed worldwide coverage cannot be supplied by the current free sources alone.
