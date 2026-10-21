'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { fixName } from '@/lib/airline-names'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { AirlineLogo } from '@/components/AirlineLogo'

type Airline = { id: string; name: string; iata: string; icao: string; country: string; active: boolean; numRoutes: number }
const fetcher = (u: string) => fetch(u).then((r) => r.json())
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Airlines() {
  const { data, error, mutate } = useSWR<Airline[] | { error: string }>('/api/airlines', fetcher)
  const [q, setQ] = useState('')
  const list = Array.isArray(data) ? data : []
  const rows = useMemo(() => {
    const n = norm(q.trim())
    return n ? list.filter((a) => norm(`${fixName(a.name)} ${a.name} ${a.iata} ${a.icao} ${a.country}`).includes(n)) : list
  }, [list, q])

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Network directory</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Airline Rosters</h1>
        <p className="mt-2 text-white/45">Every carrier with a route in OpenFlights.</p>
        <Link href="/free" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-medium">Free flight: any route</Link>
      </header>
      <label className="mb-5 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4">
        <Search className="size-4 text-white/40" aria-hidden="true" />
        <span className="sr-only">Filter airlines</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 w-full min-w-0 bg-transparent outline-none placeholder:text-white/35" placeholder="Filter airlines" />
      </label>
      {error || (data && !Array.isArray(data)) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          Could not load OpenFlights data.
          <button onClick={() => mutate()} className="min-h-11 rounded-lg bg-white px-4 text-sm text-black">Retry</button>
        </div>
      ) : !data ? (
        <p className="text-white/40" aria-busy="true">Loading airline rosters…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((a) => (
            <Link href={`/airlines/${a.id}`} key={a.id} className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-white/10 bg-[#111217cc] p-3 transition hover:border-[#1f88ff]/60">
              <AirlineLogo iata={a.iata} icao={a.icao} name={fixName(a.name)} size="md" showText={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{fixName(a.name)}</p>
                <p className="text-sm text-[#4caf50]">Available Routes: {a.numRoutes}{!a.active && <span className="ml-2 text-xs text-amber-300">Historical</span>}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-white/30" aria-hidden="true" />
            </Link>
          ))}
          {!rows.length && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/40">No airlines match “{q}”.</p>}
        </div>
      )}
    </section>
  )
}
