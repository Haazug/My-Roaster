import type { RosterFlight } from '@/lib/roster-data'

export function distanceFromNm(nm: number) {
  return { km: Math.round(nm * 1.852), nm: Math.round(nm), mi: Math.round(nm * 1.15078) }
}

export function flightTitle(flight: Pick<RosterFlight, 'fromCity' | 'toCity' | 'orig' | 'dest'>) {
  return `${flight.fromCity || flight.orig} to ${flight.toCity || flight.dest}`
}

export function flightNumber(airlineIata: string, from: string, to: string, offset = 0): string {
  const seed = airlineIata.charCodeAt(0) + from.charCodeAt(0) + to.charCodeAt(0) + offset * 7
  const num = String(650 + (seed % 350)).padStart(3, '0')
  return `${airlineIata} ${num}`
}
