'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { Radio } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
type Ac = { hex: string; callsign: string; altFt: number | null; onGround: boolean }

export default function LiveTraffic({ getCenter }: { getCenter: () => { lat: number; lng: number } | undefined }) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const { data, error } = useSWR(
    center ? `/api/live/near?lat=${center.lat.toFixed(2)}&lon=${center.lng.toFixed(2)}&r=250` : null,
    fetcher,
    { refreshInterval: 15000 },
  )
  const aircraft: Ac[] = data?.data ?? []

  return (
    <div className="pointer-events-auto absolute right-4 top-20 z-10 flex max-w-[60vw] flex-col items-end gap-2">
      <button
        aria-pressed={Boolean(center)}
        onClick={() => setCenter(center ? null : (getCenter() ?? { lat: 38.7, lng: -9.1 }))}
        className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 text-sm text-white backdrop-blur"
      >
        <Radio className="size-4" />Live traffic
      </button>
      {center && (
        <p className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/70 backdrop-blur" aria-live="polite">
          {error || data?.ok === false ? 'Live traffic unavailable' : data ? `${aircraft.length} aircraft within 250 nm of view` : 'Loading live traffic…'}
        </p>
      )}
      {center && aircraft.slice(0, 8).map((a) => (
        <Link key={a.hex} href={`/live/${a.hex}`} className="flex min-h-11 items-center gap-2 rounded-lg bg-black/70 px-3 text-xs text-white">
          <span className="size-2 rounded-full bg-cyan-300" aria-hidden="true" />
          {a.callsign || a.hex} · {a.onGround || a.altFt == null ? 'ground' : `FL${Math.round(a.altFt / 100)}`}
        </Link>
      ))}
    </div>
  )
}
