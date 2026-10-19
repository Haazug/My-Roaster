export interface ParsedFlightPlan {
  departure: string;
  arrival: string;
  aircraft: string;
  cruiseAltitude: number;
  distance: number;
  estimatedTime: number;
  waypoints: Array<{id: string; latitude: number; longitude: number}>;
  flightNumber?: string;
  airline?: string;
}

export function parsePLNFile(xmlContent: string): ParsedFlightPlan {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    const departure = xmlDoc.querySelector("Departure CallSign")?.textContent || "";
    const arrival = xmlDoc.querySelector("Arrival CallSign")?.textContent || "";
    const aircraft = xmlDoc.querySelector("Aircraft Type")?.textContent || "A320";
    const cruiseAltitude = parseInt(xmlDoc.querySelector("CruisingAlt")?.textContent || "35000");
    const waypoints: ParsedFlightPlan["waypoints"] = [];
    const flightPlan = xmlDoc.querySelector("FlightPlan");

    if (flightPlan) {
      const wayPointsElements = flightPlan.querySelectorAll("ATCWaypoint");
      wayPointsElements.forEach((wp, index) => {
        const id = wp.querySelector("ATCWaypointID")?.textContent || `WP${index}`;
        const lat = parseFloat(wp.querySelector("WorldPosition Latitude")?.textContent || "0");
        const lon = parseFloat(wp.querySelector("WorldPosition Longitude")?.textContent || "0");
        waypoints.push({id, latitude: lat, longitude: lon});
      });
    }

    if (waypoints.length === 0 && departure && arrival) {
      waypoints.push({id: departure, latitude: 0, longitude: 0});
      waypoints.push({id: arrival, latitude: 0, longitude: 0});
    }

    const distance = calculateDistance(waypoints);
    const estimatedTime = Math.round((distance / 450) * 60);

    return {departure, arrival, aircraft, cruiseAltitude, distance, estimatedTime, waypoints};
  } catch (error) {
    console.error("Erro ao fazer parse do .pln:", error);
    throw new Error("Ficheiro .pln inválido");
  }
}

function calculateDistance(waypoints: Array<{latitude: number; longitude: number}>): number {
  if (waypoints.length < 2) return 0;
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const point1 = waypoints[i];
    const point2 = waypoints[i + 1];
    const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
    const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(point1.latitude * (Math.PI / 180)) * Math.cos(point2.latitude * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    const R = 3440.07;
    totalDistance += R * c;
  }
  return Math.round(totalDistance);
}

export function createManualFlightPlan(data: {departure: string; arrival: string; aircraft: string; altitude: number; passengers: number; blockTime: string; rules: "IFR" | "VFR"}): ParsedFlightPlan {
  return {
    departure: data.departure.toUpperCase(),
    arrival: data.arrival.toUpperCase(),
    aircraft: data.aircraft.toUpperCase(),
    cruiseAltitude: data.altitude,
    distance: 0,
    estimatedTime: 0,
    waypoints: [{id: data.departure, latitude: 0, longitude: 0}, {id: data.arrival, latitude: 0, longitude: 0}],
  };
}