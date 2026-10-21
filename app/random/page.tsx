'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'
import { Shuffle } from 'lucide-react'
import { BoardingPass } from '@/components/BoardingPass'
import { estimateBlockMinutes } from '@/lib/flight-time'

type A = { id: string; name: string; iata: string; icao: string; active: boolean; numRoutes: number }
type Ap = { iata?: string; city?: string; name?: string; lat?: number; lon?: number }
type R = { from: string; to: string; fromAirport?: Ap; toAirport?: Ap; aircraft?: string[] }
type Result = { airline: A; route: R; nm: number; min: number }

const fetcher = (u: string) => fetch(u).then((r) => r.json())
const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const BUCKETS = [['any', 'Surprise me'], ['short', 'Under 2h'], ['medium', '2–5h'], ['long', '5h+']] as const

function nmBetween(a?: Ap, b?: Ap) {
  if (a?.lat == null || a?.lon == null || b?.lat == null || b?.lon == null) return 0
  const r = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2
  return Math.round(2 * 3440.07 * Math.asin(Math.sqrt(h)))
}

export default function RandomPage() {
  const { data } = useSWR<A[]>('/api/airlines', fetcher)
  const list = Array.isArray(data) ? data : []
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState<A | null>(null)
  const [airport, setAirport] = useState('')
  const [time, setTime] = useState<'any' | 'short' | 'medium' | 'long'>('any')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [res, setRes] = useState<Result | null>(null)

  const nq = norm(q.trim())
  const suggestions = nq && !chosen ? list.filter((a) => norm(`${a.name} ${a.iata} ${a.icao}`).includes(nq)).slice(0, 5) : []

  const generate = async () => {
    setBusy(true); setMsg(''); setRes(null)
    const airline = chosen || suggestions[0] || null
    const pool = airline ? [airline] : list.filter((a) => a.active && a.numRoutes > 0).sort(() => Math.random() - 0.5).slice(0, 15)
    const na = norm(airport.trim())
    for (const a of pool) {
      const d = await fetch(`/api/airlines/${a.id}`).then((r) => r.json()).catch(() => null)
      const routes: R[] = d?.routes || []
      const ok: Result[] = []
      for (const r of routes) {
        if (na && ![r.from, r.to, r.fromAirport?.city, r.toAirport?.city, r.fromAirport?.name, r.toAirport?.name].some((x) => norm(x || '').includes(na))) continue
        const nm = nmBetween(r.fromAirport, r.toAirport)
        const min = nm ? estimateBlockMinutes(nm, r.aircraft?.[0] || '') : 0
        if (time !== 'any' && min) {
          if (time === 'short' && min >= 120) continue
          if (time === 'medium' && (min < 120 || min > 300)) continue
          if (time === 'long' && min <= 300) continue
        }
        ok.push({ airline: a, route: r, nm, min })
      }
      if (ok.length) { setRes(pick(ok)); setBusy(false); return }
    }
    setMsg('No route matched. Loosen your choices and try again.')
    setBusy(false)
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#1f88ff]'

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Random</p>
      <h1 className="mt-2 text-4xl font-semibold">Pick a flight for me</h1>

      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-1 text-xs text-white/50">Airline</p>
          <input className={input} placeholder="Surprise me" value={chosen ? chosen.name : q} onChange={(e) => { setChosen(null); setQ(e.target.value) }} />
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((a) => (
                <button key={a.id} onClick={() => { setChosen(a); setQ(a.name) }} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs">{a.name}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-white/50">Airport or city</p>
          <input className={input} placeholder="Surprise me" value={airport} onChange={(e) => setAirport(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-white/50">Flight time</p>
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map(([k, label]) => (
              <button key={k} onClick={() => setTime(k)} className={`rounded-xl border px-3 py-2 text-sm ${time === k ? 'border-[#1f88ff] bg-[#1f88ff]/20' : 'border-white/10 bg-white/5'}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}

      {res && (
        <div className="mt-8">
          <BoardingPass
            data={{
              from: res.route.from, to: res.route.to, fromCity: res.route.fromAirport?.city, toCity: res.route.toAirport?.city,
              airline: res.airline.name, flight: res.airline.iata, aircraft: res.route.aircraft?.[0], distanceNm: res.nm,
              date: new Date().toISOString().slice(0, 10),
            }}
          />
          <Link href={`/route/${res.airline.iata || res.airline.id}/${res.route.from}-${res.route.to}`} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#1f88ff] font-medium">
            Open route
          </Link>
        </div>
      )}

      <button onClick={generate} disabled={busy || !list.length} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-black disabled:opacity-40">
        <Shuffle className="size-4" /> {busy ? 'Searching...' : res ? 'Generate another' : 'Generate route'}
      </button>
    </section>
  )
}