'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AirlineLogo } from '@/components/AirlineLogo'
import { useLocalStorage } from '@/lib/use-local-storage'
import { useRecents } from '@/lib/use-favs'

export const looksLikeFlight = (q: string) => {
  const t = q.trim()
  return /^[A-Za-z0-9]{2,3}[\s-]?\d{1,4}[A-Za-z]?$/.test(t) && /[A-Za-z]/.test(t) && /\d/.test(t)
}
const squash = (s: string) => s.replace(/[\s-]/g, '').toUpperCase()

export default function FlightNumberHit({ q }: { q: string }) {
  const [hit, setHit] = useState<any>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'none'>('idle')
  const [custom] = useLocalStorage<any[]>('myroster.customRoutes', [])
  const rec = useRecents()
  const mine = looksLikeFlight(q) ? custom.find((c) => c.flight && squash(c.flight) === squash(q)) : null

  useEffect(() => {
    setHit(null)
    if (!looksLikeFlight(q)) { setState('idle'); return }
    setState('loading')
    let alive = true
    const timer = setTimeout(() => {
      fetch(`/api/flightno/${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((j) => { if (!alive) return; if (j?.ok) { setHit(j); setState('idle') } else setState('none') })
        .catch(() => alive && setState('none'))
    }, 450)
    return () => { alive = false; clearTimeout(timer) }
  }, [q])

  if (!looksLikeFlight(q)) return null

  if (mine) {
    return (
      <Link href={`/route/${mine.airlineKey}/${mine.from}-${mine.to}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[.04] p-4">
        <AirlineLogo iata={mine.airlineKey} name={mine.airlineName || mine.airlineKey} size="sm" showText={false} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{mine.flight} · {mine.from} → {mine.to}</p>
          <p className="truncate text-xs text-white/45">{mine.airlineName || mine.airlineKey} · {mine.fromCity} → {mine.toCity}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">Yours</span>
      </Link>
    )
  }

  if (hit) {
    const r = hit.route
    const al = hit.airline
    const code = r?.airlineIata || r?.airlineIcao || al.iata || al.icao
    const href = r ? `/route/${code}/${r.from}-${r.to}` : hit.live ? `/live/${hit.live.hex}` : `/airlines/${al.id}`
    return (
      <div className="mt-3 rounded-2xl bg-white/[.04] p-4">
        <Link
          href={href}
          onClick={() => rec.add({ id: `flight:${hit.number}`, kind: 'flight', label: hit.number, sub: r ? `${r.from} → ${r.to}` : al.name, href })}
          className="flex items-center gap-3"
        >
          <AirlineLogo iata={al.iata} icao={al.icao} name={al.name} size="sm" showText={false} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{hit.number}{r ? ` · ${r.from} → ${r.to}` : ''}</p>
            <p className="truncate text-xs text-white/45">{al.name}{r ? ` · ${r.fromCity} → ${r.toCity}` : ''}</p>
          </div>
          {hit.live && <span className="shrink-0 rounded-full bg-[#4caf50]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4caf50]">Live</span>}
        </Link>
        {hit.live && r && <Link href={`/live/${hit.live.hex}`} className="mt-3 inline-block text-xs text-[#55a7ff]">Track this aircraft</Link>}
      </div>
    )
  }
  if (state === 'loading') return <p className="mt-3 text-xs text-white/35">Looking up {q.trim().toUpperCase()}…</p>
  if (state === 'none') return <p className="mt-3 text-xs text-white/35">No route data for {q.trim().toUpperCase()}. You can add it to an airline with Add route.</p>
  return null
}
