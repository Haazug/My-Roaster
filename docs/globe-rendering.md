# Globe rendering

Airport browsing keeps gentle rotation enabled. Selecting an airport focuses the camera and highlights the airport and rings in yellow. Airport points are merged into one geometry, list filtering is deferred while typing, and path/point/label transitions do not replay on every clock tick.

During a flight, the full gray route geometry stays stable and a green prefix grows with the same progress fraction as the timer. The prefix sits slightly above the base line to avoid depth conflicts. Imported waypoints remain part of the route. Labels and selection rings scale with the zoom; on desktop the globe is centered in the left column and the form side is shaded to preserve readability.

Globe initialization does not wait for textures. A failed optional background image previously kept the entire Three.js scene invisible because the library waits for its image-loaded callback without an error callback. Local assets and `waitForGlobeReady={false}` allow the globe and airport points to render even if a texture fails.

The bundled textures are the existing visual assets from the MIT-licensed [three-globe examples](https://github.com/vasturiano/three-globe/tree/master/example/img): `earth-blue-marble.jpg`, `earth-topology.png` and `night-sky.png`. They are served from `/globe/` to avoid an external CDN dependency at runtime. The appearance is preserved.

In v2.2.0, airport browsing uses the same rotation speed as the home view (0.5). Rotation and zoom controls remain enabled during a flight. “Explore globe” temporarily hides and makes the form inert without unmounting it, so the flight clock and plan survive; on mobile this exposes the canvas for touch gestures and provides zoom/recenter buttons. Leaving the mode restores the page. The background layer accepts pointer input in the desktop globe column.
