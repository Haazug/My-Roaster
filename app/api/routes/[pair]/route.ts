import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ pair: string }> }) {
  try {
    const { pair } = await params
    const [from, to] = (pair || '').toUpperCase().split('-')
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Invalid pair format' }, { status: 400 })
    }

    const db = await getDb()
    const fromAirport = db.airports.get(from)
    const toAirport = db.airports.get(to)

    if (!fromAirport || !toAirport) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Find all airlines flying this route
    const flights = []
    for (const [airlineId, routes] of db.routesByAirline) {
      const airline = db.airlines.get(airlineId)
      if (!airline) continue

      // LAD-LIS e LIS-LAD são a mesma rota: aceita os dois sentidos
      const routeFound = routes.find((r) => r.from === from && r.to === to) ?? routes.find((r) => r.from === to && r.to === from)
      if (!routeFound) continue

        flights.push({
          airlineId,
          airlineIata: airline.iata || airlineId,
          airlineName: airline.name,
          flightNumber: null,
          from,
          to,
          aircraftIcao: routeFound.equip[0],
          aircraftName: routeFound.equip[0] ? getAircraftName(routeFound.equip[0]) : undefined,
          days: null,
          estimated: true,
        })
    }

    const distance = calculateDistance(fromAirport, toAirport)

    return NextResponse.json({
      fromAirport,
      toAirport,
      flights,
      distance,
    })
  } catch (error) {
    console.error('Route detail error:', error)
    return NextResponse.json({ error: 'Failed to load route' }, { status: 500 })
  }
}

function calculateDistance(from: any, to: any) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLon = toRad(to.lon - from.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2
  const km = 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)))
  return Math.round(km / 1.852) // Convert to nautical miles
}

function getAircraftName(code: string): string {
  const aircraft: Record<string, string> = {
    '320': 'Airbus A320',
    '321': 'Airbus A321',
    '319': 'Airbus A319',
    '32N': 'Airbus A320neo',
    '32Q': 'Airbus A321neo',
    '332': 'Airbus A330-200',
    '333': 'Airbus A330-300',
    '359': 'Airbus A350-900',
    '388': 'Airbus A380-800',
    '738': 'Boeing 737-800',
    '73H': 'Boeing 737-800',
    '7M8': 'Boeing 737 MAX 8',
    '777': 'Boeing 777-200',
    '77W': 'Boeing 777-300ER',
    '787': 'Boeing 787-8',
    '788': 'Boeing 787-8',
    '789': 'Boeing 787-9',
    '744': 'Boeing 747-400',
  }
  return aircraft[code] || code
}
