# Globe rendering

Airport browsing keeps gentle rotation enabled. Selecting an airport focuses the camera and highlights the airport and rings in yellow. Airport points are merged into one geometry, list filtering is deferred while typing, and path/point/label transitions do not replay on every clock tick.

During a flight, the full gray route geometry stays stable and a green prefix grows with the same progress fraction as the timer. The prefix sits slightly above the base line to avoid depth conflicts. Imported waypoints remain part of the route. Labels and selection rings scale with the zoom; on desktop the globe is centered in the left column and the form side is shaded to preserve readability.

Globe initialization does not wait for textures. A failed optional background image previously kept the entire Three.js scene invisible because the library waits for its image-loaded callback without an error callback. Local assets and `waitForGlobeReady={false}` allow the globe and airport points to render even if a texture fails.

The bundled textures are the existing visual assets from the MIT-licensed [three-globe examples](https://github.com/vasturiano/three-globe/tree/master/example/img): `earth-blue-marble.jpg`, `earth-topology.png` and `night-sky.png`. They are served from `/globe/` to avoid an external CDN dependency at runtime. The appearance is preserved.

In v2.2.0, airport browsing uses the same rotation speed as the home view (0.5). Rotation and zoom controls remain enabled during a flight. “Explore globe” temporarily hides and makes the form inert without unmounting it, so the flight clock and plan survive; on mobile this exposes the canvas for touch gestures and provides zoom/recenter buttons. Leaving the mode restores the page. The background layer accepts pointer input in the desktop globe column.

In v2.2.1, discovery is enabled only when `pathname === '/'` and exploration is open. Country polygons and airport particles are not rendered or clickable on route/flight pages. Airport particles use point clouds to avoid thousands of draw calls. Opening a description does not navigate until the user chooses the airport or airline page. Leaving exploration clears the selection.

Country directories distinguish airline domicile from airlines operating at an airport. Descriptions use reference catalog facts (codes, city, country, destinations, hubs and alliance), not generated current schedules. The local `countries.geojson` comes from the public-domain [Natural Earth 1:110m admin-0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson); small islands omitted at that resolution remain selectable through airport markers and the country selector.

In v2.2.2, countries have transparent caps and restrained white outlines. Yellow is reserved for airport selection; route/flight paths and old view markers are suppressed during home discovery, so the green flown route cannot overlap country browsing. The green progress path remains available on the flight page.

Desktop PCs and Macs keep the globe centered. The lateral camera offset is reserved for iPad, detected through the iPad user agent or iPadOS desktop-mode Macintosh with multiple touch points; viewport width alone no longer shifts desktop computers. Exploration remains centered, with the existing small-screen selection offset.
