'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { AirlineLogo } from '@/components/AirlineLogo'

export default function AirportLiveNow({ code }: { code?: string }) {
  const [hidden, setHidden] = useState(true)
  const { data } = useSWR(hidden || !code ? null : `/api/airports/${code}/live`, (u) => fetch(u).then((r) => r.json()))

  const flights = data?.data || []
  if (!flights.length) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0a0a0acc] p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setHidden(!hidden)}
        className="mb-4 flex items-center justify-between w-full"
      >
        <h2 className="text-lg font-semibold">Live now</h2>
        <div className="text-sm text-white/50">{hidden ? '▼' : '▲'}</div>
      </button>

      {!hidden && (
        <div className="space-y-2 mt-2">
          {flights.slice(0, 10).map((f: any, i: number) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {f.airline && <AirlineLogo iata={f.airline?.iata} icao={f.airline?.icao} name={f.airline?.name} size="sm" showText={false} />}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {f.from} → {f.to} <span className="text-white/50 font-normal">{f.callsign}</span>
                    </p>
                    <p className="text-xs text-white/40 truncate">{f.airlineName}</p>
                  </div>
                </div>
                <p className="text-[#1f88ff] font-semibold shrink-0">{f.flightLevel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
