'use client'
import LiveFlights from '@/components/LiveFlights'
type P = { lat: number; lon: number; iata: string }
export function LiveNow({ airlineIcao, from, to }: { airlineIcao?: string; from: P; to: P; distanceNm: number }) {
  return <LiveFlights airline={airlineIcao} pair={[from.iata, to.iata]} />
}
