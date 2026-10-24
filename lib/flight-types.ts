export type RosterFlight = {
  id: string
  from: string
  to: string
  fromCity?: string
  toCity?: string
  airline?: string
  flight?: string
  aircraft?: string
  distanceNm?: number
  durationMin?: number
  seat?: string
  date?: string
  booked?: boolean
  cancelled?: boolean
  holding?: boolean
  goAround?: boolean
  completedAt?: number
}
