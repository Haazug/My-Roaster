import type { RosterFlight } from '@/lib/roster-data'

const BOOKED_KEY = 'myroster.booked'

export function getBookedFlights(): RosterFlight[] {
  if (typeof window === 'undefined') return []
  try {
    const b = localStorage.getItem(BOOKED_KEY)
    return b ? JSON.parse(b) : []
  } catch {
    return []
  }
}

export function saveBookedFlight(flight: RosterFlight) {
  if (typeof window === 'undefined') return
  try {
    const booked = getBookedFlights()
    const existing = booked.findIndex(f => f.id === flight.id)
    if (existing >= 0) {
      booked[existing] = { ...flight, booked: true }
    } else {
      booked.push({ ...flight, booked: true })
    }
    localStorage.setItem(BOOKED_KEY, JSON.stringify(booked))
  } catch (e) {
    console.error('Failed to save booked flight:', e)
  }
}

export function removeBookedFlight(flightId: string) {
  if (typeof window === 'undefined') return
  try {
    const booked = getBookedFlights().filter(f => f.id !== flightId)
    localStorage.setItem(BOOKED_KEY, JSON.stringify(booked))
  } catch (e) {
    console.error('Failed to remove booked flight:', e)
  }
}
