export type RosterFlight = {
  booked?: boolean;
  scheduledAt?: number;startedAt?: number;endedAt?: number;status?: string;planId?: string;plan?: any;
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
