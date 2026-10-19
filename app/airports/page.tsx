'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight, RadioTower, Search } from 'lucide-react'
import { useMapStore } from '@/lib/map-store'

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes: number }
const fetcher = (url: string) => fetch(url).then((r) => r.json())
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function AirportsPage() {
  const { data, error } = useSWR<Airport[] | { error: string }>('/api/airports', fetcher)
  const [q, setQ] = useState('')
  const setView = useMapStore((s) => s.setView)
  const list = Array.isArray(data) ? data : []
  const rows = useMemo(() => {
    const n = norm(q.trim())
    return (n ? list.filter((a) => norm(`${a.iata} ${a.icao} ${a.city} ${a.name} ${a.country}`).includes(n)) : list).slice(0, 100)
  }, [list, q])

  useEffect(() => {
    if (rows.length) setView({ mode: 'airports', airports: rows })
  }, [rows, setView])
  useEffect(() => () => setView({ mode: 'idle' }), [setView])

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/50"><ArrowLeft className="size-4" />MyRoster</Link>
      <div className="mt-4 flex items-center gap-3">
        <RadioTower className="size-5 text-[#facc15]" aria-hidden="true" />
        <div>
          <h1 className="text-4xl font-semibold">Airports</h1>
          <p className="mt-2 text-white/45">{list.length ? `${list.length.toLocaleString('en-US')} airports with scheduled routes` : 'Browse worldwide airports'}</p>
        </div>
      </div>
      <label className="mt-8 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4">
        <Search className="size-5 text-white/40" aria-hidden="true" />
        <span className="sr-only">Filter airports</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search IATA / ICAO / city / country" className="min-h-12 w-full min-w-0 bg-transparent outline-none placeholder:text-white/35" />
      </label>
      {error || (data && !Array.isArray(data)) ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">Airport data is unavailable right now.</div>
      ) : !data ? (
        <p className="mt-6 text-white/40" aria-busy="true">Loading airports…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {rows.map((a) => (
            <Link href={`/airports/${a.iata}`} key={a.iata} className="flex min-h-14 items-center gap-4 rounded-2xl border border-white/10 bg-[#151619cc] p-4 hover:border-[#facc15]/50">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#facc15]/15 text-xs font-bold text-[#facc15]">{a.iata}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.city} · {a.name}</p>
                <p className="mt-1 text-sm text-white/45">{a.icao} · {a.country} · <span className="text-[#4caf50]">{a.routes} routes</span></p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-white/30" aria-hidden="true" />
            </Link>
          ))}
          {!rows.length && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/40">No airports match “{q}”.</p>}
        </div>
      )}
    </section>
  )
}
