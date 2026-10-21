export interface ParsedFlightPlan {
  departure: string
  arrival: string
  aircraft: string
  cruiseAltitude: number
  distance: number
  estimatedTime: number
  waypoints: Array<{ id: string; latitude: number; longitude: number }>
  flightNumber?: string
  airline?: string
}

type WP = ParsedFlightPlan['waypoints'][number]

// MSFS/SimBrief positions look like: N38° 46' 52.00",W9° 8' 3.00",+000374.00
function dms(str: string) {
  const m = Array.from(str.matchAll(/([NSEW])\s*(\d+)°\s*(\d+)'\s*([\d.]+)"/g))
  if (m.length < 2) return null
  const conv = (x: RegExpMatchArray) => {
    const v = Number(x[2]) + Number(x[3]) / 60 + Number(x[4]) / 3600
    return x[1] === 'S' || x[1] === 'W' ? -v : v
  }
  return { lat: conv(m[0]), lon: conv(m[1]) }
}

function nm(a: WP, b: WP) {
  const r = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * r
  const dLon = (b.longitude - a.longitude) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLon / 2) ** 2
  return 2 * 3440.07 * Math.asin(Math.sqrt(h))
}

export function parsePLNFile(xmlContent: string): ParsedFlightPlan {
  const doc = new DOMParser().parseFromString(xmlContent, 'text/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid .pln file')
  const first = (tag: string, root: Document | Element = doc) =>
    root.getElementsByTagName(tag)[0]?.textContent?.trim() || ''

  const waypoints: WP[] = []
  Array.from(doc.getElementsByTagName('ATCWaypoint')).forEach((el, i) => {
    const pos = dms(first('WorldPosition', el))
    if (!pos) return
    waypoints.push({ id: el.getAttribute('id') || `WP${i}`, latitude: pos.lat, longitude: pos.lon })
  })

  const departure = first('DepartureID') || waypoints[0]?.id || ''
  const arrival = first('DestinationID') || waypoints[waypoints.length - 1]?.id || ''
  if (!departure || !arrival) throw new Error('Invalid .pln file')

  let distance = 0
  for (let i = 0; i < waypoints.length - 1; i++) distance += nm(waypoints[i], waypoints[i + 1])
  distance = Math.round(distance)

  return {
    departure,
    arrival,
    aircraft: '',
    cruiseAltitude: Math.round(parseFloat(first('CruisingAlt'))) || 35000,
    distance,
    estimatedTime: distance ? Math.round((distance / 450) * 60) + 15 : 0,
    waypoints,
  }
}

export function createManualFlightPlan(data: {
  departure: string
  arrival: string
  aircraft: string
  altitude: number
  passengers: number
  blockTime: string
  rules: 'IFR' | 'VFR'
}): ParsedFlightPlan {
  return {
    departure: data.departure.trim().toUpperCase(),
    arrival: data.arrival.trim().toUpperCase(),
    aircraft: data.aircraft,
    cruiseAltitude: data.altitude,
    distance: 0,
    estimatedTime: 0,
    waypoints: [],
  }
}