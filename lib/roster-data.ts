export type RosterFlight = {
  id: string
  airlineIata: string
  airlineName: string
  orig: string
  dest: string
  flightNumber: string
  aircraft: string
  registration?: string
  departure: string
  distanceNm: number
  fromCity: string
  toCity: string
}
