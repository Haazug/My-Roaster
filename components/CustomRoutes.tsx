'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'

type Custom = { id: string; airlineKey: string; airlineName?: string; from: string; to: string; fromCity: string; toCity: string; distanceNm: number; flight?: string }

export function CustomRoutes({ airlineKey }: { airlineKey: string }) {
  const [all, setAll] = useLocalStorage<Custom[]>('myroster.customRoutes', [])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [flight, setFlight] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = all.filter((r) => r.airlineKey === airlineKey)

  const add = async () => {
    const a = from.trim().toUpperCase()
    const b = to.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b) || a === b) return setMsg('Use two different 3-letter IATA codes (e.g. NBJ and GRU).')
    if (mine.some((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a))) return setMsg('You already added this route.')
    setBusy(true)
    setMsg('')
    try {
      const d = await fetch(`/api/route/${airlineKey}/${a}-${b}`).then((r) => r.json())
      if (!d || d.error || !d.from || !d.to) setMsg('Airport not found.')
      else {
        setAll((cur) => [...cur, { id: `${airlineKey}-${a}-${b}`, airlineKey, airlineName: d.airline?.name, from: d.from.iata, to: d.to.iata, fromCity: d.from.city, toCity: d.to.city, distanceNm: d.distanceNm, flight: flight.trim().toUpperCase() || undefined }])
        setFrom(''); setTo(''); setFlight('')
      }
    } catch {
      setMsg('Could not check the airports. Try again.')
    }
    setBusy(false)
  }

  const inp = 'min-h-11 w-full rounded-xl bg-white/[.06] px-3 text-sm uppercase outline-none placeholder:normal-case placeholder:text-white/35 focus:bg-white/10'
  return (
    <div className="mt-7">
      <p className="text-xs font-medium text-white/40">Your routes</p>
      {mine.length > 0 && (
        <div className="mt-2 divide-y divide-white/[.06]">
          {mine.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2">
              <Link href={`/route/${r.airlineKey}/${r.from}-${r.to}`} className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{r.from} ↔ {r.to}</span>
                <span className="ml-2 text-xs text-white/45">{r.flight ? `${r.flight} · ` : ''}{r.fromCity} → {r.toCity} · {r.distanceNm.toLocaleString('en-US')} nm</span>
              </Link>
              <button aria-label="Delete route" onClick={() => setAll((cur) => cur.filter((x) => x.id !== r.id))} className="p-2 text-white/40 hover:text-white"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input className={inp} placeholder="From (NBJ)" maxLength={3} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={inp} placeholder="To (GRU)" maxLength={3} value={to} onChange={(e) => setTo(e.target.value)} />
        <input className={inp} placeholder="Flight no." value={flight} onChange={(e) => setFlight(e.target.value)} />
        <button onClick={add} disabled={busy || !from || !to} className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-black disabled:opacity-40"><Plus className="size-4" /></button>
      </div>
      {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
    </div>
  )
}
