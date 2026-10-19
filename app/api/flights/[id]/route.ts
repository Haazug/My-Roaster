import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parts = (id || '').toUpperCase().split('-')
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Invalid flight ID format' }, { status: 400 })
    }

    const [airline, from, to] = parts.length === 3 ? parts : [parts[0], parts[1], parts[2]]

    const db = await getDb()
    const airlineData = db.airlines.get(airline)
    const fromAirport = db.airports.get(from)
    const toAirport = db.airports.get(to)

    if (!airlineData || !fromAirport || !toAirport) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    // Find the route
    const routes = db.routesByAirline.get(airline) || []
    const route = routes.find((r) => r.from === from && r.to === to)

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Calculate distance
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(toAirport.lat - fromAirport.lat)
    const dLon = toRad(toAirport.lon - fromAirport.lon)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(fromAirport.lat)) * Math.cos(toRad(toAirport.lat)) * Math.sin(dLon / 2) ** 2
    const km = 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)))
    const distanceNm = Math.round(km / 1.852)

    // Generate flight number deterministically
    const seed = airline.charCodeAt(0) + from.charCodeAt(0) + to.charCodeAt(0)
    const flightNum = String(650 + (seed % 350)).padStart(3, '0')

    // Estimate times
    const durationMin = Math.round((distanceNm / 440 + 0.33) * 60)
    const depHour = 22
    const depMin = 45

    const aircraft = route.equip[0] || 'A320'
    const aircraftNames: Record<string, string> = {
      '320': 'Airbus A320',
      '321': 'Airbus A321',
      '32N': 'Airbus A320neo',
      '77W': 'Boeing 777-300ER',
      '788': 'Boeing 787-8',
      '789': 'Boeing 787-9',
    }

    return NextResponse.json({
      id: `${airline}-${from}-${to}`,
      airline: {
        id: airline,
        name: airlineData.name,
        iata: airlineData.iata,
        icao: airlineData.icao,
      },
      flight: {
        number: flightNum,
        aircraft: aircraftNames[aircraft] || aircraft,
        aircraftCode: aircraft,
      },
      route: {
        from: fromAirport,
        to: toAirport,
        distanceNm,
        distanceKm: Math.round(km),
      },
      schedule: {
        departure: { hour: depHour, minute: depMin, time: `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}` },
        duration: durationMin,
        estimatedArrival: {
          hour: (depHour + Math.floor(durationMin / 60)) % 24,
          minute: (depMin + durationMin) % 60,
        },
      },
      estimated: true,
    })
  } catch (error) {
    console.error('Flight detail error:', error)
    return NextResponse.json({ error: 'Failed to load flight' }, { status: 500 })
  }
}
