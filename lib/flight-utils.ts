import type { RosterFlight } from '@/lib/roster-data'

export function distanceFromNm(nm: number) {
  return { km: Math.round(nm * 1.852), nm: Math.round(nm), mi: Math.round(nm * 1.15078) }
}

export function flightTitle(flight: Pick<RosterFlight, 'fromCity' | 'toCity' | 'orig' | 'dest'>) {
  return `${flight.fromCity || flight.orig} to ${flight.toCity || flight.dest}`
}
