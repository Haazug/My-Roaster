'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { Plane } from 'lucide-react'
import { fixName } from '@/lib/airline-names'

type A = { id: string; name: string; iata: string; icao: string }
const fetcher = (u: string) => fetch(u).then((r) => r.json())
const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function FreeFlightPage() {
  const router = useRouter()
  const { data } = useSWR<A[]>('/api/airlines', fetcher)
  const list = Array.isArray(data) ? data : []
  const [q, setQ] = useState('')
  const [airline, setAirline] = useState<A | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const nq = norm(q.trim())
  const options = nq && !airline ? list.filter((a) => norm(`${fixName(a.name)} ${a.name} ${a.iata} ${a.icao}`).includes(nq)).slice(0, 6) : []

  const go = async () => {
    const a = from.trim().toUpperCase()
    const b = to.trim().toUpperCase()
    if (!airline) return setMsg('Choose an airline.')
    if (!/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b) || a === b) return setMsg('Use two different 3-letter IATA codes (e.g. LAD and GRU).')
    setBusy(true)
    setMsg('')
    const key = airline.iata || airline.id
    try {
      const d = await fetch(`/api/route/${key}/${a}-${b}`).then((r) => r.json())
      if (!d || d.error) {
        setMsg('Airport not found.')
        setBusy(false)
        return
      }
      router.push(`/route/${key}/${a}-${b}`)
    } catch {
      setMsg('Could not check the airports. Try again.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#1f88ff]'

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Free flight</p>
      <h1 className="mt-2 text-4xl font-semibold">Fly any route</h1>
      <p className="mt-2 text-sm text-white/45">Pick an airline and any two airports, even if the airline does not list that route.</p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-1 text-xs text-white/50">Airline</p>
          <input className={input} placeholder="Search an airline" value={airline ? fixName(airline.name) : q} onChange={(e) => { setAirline(null); setQ(e.target.value) }} />
          {options.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((a) => (
                <button key={a.id} onClick={() => { setAirline(a); setQ(fixName(a.name)) }} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs">{fixName(a.name)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-1 text-xs text-white/50">From (IATA)</p><input className={`${input} uppercase`} maxLength={3} placeholder="LAD" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><p className="mb-1 text-xs text-white/50">To (IATA)</p><input className={`${input} uppercase`} maxLength={3} placeholder="GRU" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>

      {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}
      <button onClick={go} disabled={busy} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f88ff] font-semibold disabled:opacity-40">
        <Plane className="size-4" /> {busy ? 'Checking...' : 'Continue'}
      </button>
    </section>
  )
}