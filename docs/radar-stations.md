# Radar sampling stations

The radar uses all valid airport coordinates in the source OpenFlights airport file, including entries without IATA codes or any route in the site catalog. `getRadarAirports()` shares the existing cached source download but maintains a separate sampling registry. These coordinates do not add airports, companies or routes to the visible catalog.

Foreground live requests sample six additional stations per 45-second batch; the existing authenticated background worker samples 24. Each rotating station enriches at most five aircraft, while existing fixed satellites and global-feed behavior remain. The cursor is stored in the configured live-history sync store, with an in-memory fallback on Vercel instances without persistent history credentials. Cold starts choose their initial batch from the current time slot, so they do not repeatedly restart at the first airport. Sampling proceeds when live requests or the existing worker run; it is not a claim that every station is queried simultaneously or continuously. Failed batches report degraded coverage and are revisited in the next sweep. Provider geographic coverage and limits still apply.

Stations only discover aircraft. Flights are assigned to their actual resolved origin/destination; proximity never adds an overflight to an airport's arrivals or departures.
