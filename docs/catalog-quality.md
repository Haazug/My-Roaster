# Route catalog quality

The base route dataset is OpenFlights (2014). It is a **historical reference**, not a current schedule or proof that a particular flight number operates today. Curated supplementary routes are also reference data. Live observations remain separately sourced and labelled.

Every airline, airport, search, random-route and route-detail endpoint uses the same sanitized database:

- Require the route's airline ID and published IATA/ICAO code to agree. Never assign missing IDs by reused codes.
- Exclude marketing codeshares and services with stops from the direct operating route catalog.
- Exclude inactive operators and missing/self airport pairs.
- Conservatively require a home-country endpoint. An explicit list of European multi-base carriers may use other European bases. This deliberately omits legitimate but unverified fifth-freedom routes.
- Exclude explicitly retired airline identities, closed passenger airports, Ukrainian endpoints and suspended EU/UK/Swiss/Norwegian operator networks with Russia/Belarus. Closed airports are omitted rather than silently moved to new airports. This is a maintained exclusion list, not a worldwide current timetable.
- Count an unordered airport pair once; both directions are not two separate routes.
- Use explicit primary bases where maintained; otherwise infer only from home-country airports. The globe and About page share those bases.
- Do not generate flight numbers, operating weekdays, or departure times from hashes or sample records. Legacy flight URLs use a real callsign lookup. A missing number remains unknown; user-entered numbers belong to simulation plans.

The alliance directory is maintained separately from historical route membership. Current membership must be maintained as airline identities change; it is not inferred from shared routes.

Full-source audit, 30 October 2026:

| Airline | Historical airport pairs | Countries | Primary bases |
| --- | ---: | ---: | --- |
| KLM | 96 | 56 | AMS |
| Ryanair | 1,236 | 29 | DUB, STN |
| Air France | 205 | 84 | CDG, ORY |
| Lufthansa | 224 | 64 | FRA, MUC |
| British Airways | 169 | 69 | LHR, LGW |
| TAAG | 35 | 12 | NBJ |

The Ryanair count is plausible for a multi-base network and is not artificially capped. None of these counts claims a current operating schedule. Filters removed 12,092 further directed legs after codeshare/ID/stop validation, leaving 39,490 reference legs across all operators.

`npm test` covers synthetic contaminated records, cross-endpoint indexing, European bases, alliances, and flight-number preservation. To repeat the full-source audit, download the three upstream `.dat` files into a directory and run `CATALOG_DIR=/path/to/data node tests/catalog.test.cjs`.

Operational callsigns such as `KLM4XY` survive the route → plan → flight → history flow with their own label, without being presented as a passenger flight number. Background audio starts off; sound effects use a separate control and request ambient mixing on supporting browsers. Mixing with other apps still depends on the browser/device.

The airline directory now shows departures from declared primary hubs, with the return selectable on the route page. It is a subset of the full reference network counted above. A route that does not touch a primary hub remains available under its airports; it is never reassigned to a different origin. A hub departure must exist in the source, including between two hubs. Directory counters and About statistics use the same subset.
