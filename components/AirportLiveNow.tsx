'use client'
import LiveFlights from '@/components/LiveFlights'
export default function AirportLiveNow({ code }: { code?: string }) {
  return code ? <LiveFlights airport={code} /> : null
}
