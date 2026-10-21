'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'

type Custom = { id: string; airlineKey: string; from: string; to: string; fromCity: string; toCity: string; distanceNm: number }

export function CustomRoutes({ airlineKey }: { airlineKey: string }) {
  const [all, setAll] = useLocalStorage<Custom[]>('myroster.customRoutes', [])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = all.filter((r) => r.airlineKey === airlineKey)

  const add = async () => {
    const a = from.trim().toUpperCase()
    const b = to.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b) || a === b) return setMsg('Use two different 3-letter IATA codes (e.g. LAD and GRU).')
    if (mine.some((r) => r.from === a && r.to === b)) return setMsg('You already added this route.')
    setBusy(true)
    setMsg('')
    try {
      const d = await fetch(`/api/route/${airlineKey}/${a}-${b}`).then((r) => r.json())
      if (!d || d.error || !d.from || !d.to) {
        setMsg('Airport not found.')
      } else {
        const item: Custom = { id: `${airlineKey}-${a}-${b}`, airlineKey, from: d.from.iata, to: d.to.iata, fromCity: d.from.city, toCity: d.to.city, distanceNm: d.distanceNm }
        setAll((cur) => [...cur, item])
        setFrom('')
        setTo('')
      }
    } catch {
      setMsg('Could not check the airports. Try again.')
    }
    setBusy(false)
  }

  const input = 'min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm uppercase outline-none placeholder:normal-case placeholder:text-white/35 focus:border-[#1f88ff]'

  return (
    <div className="mt-7 rounded-2xl border border-white/10 bg-[#111217cc] p-4">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Your routes</p>
      {mine.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {mine.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <Link href={`/route/${r.airlineKey}/${r.from}-${r.to}`} className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.04] px-3 hover:border-[#1f88ff]/60">
                <span className="font-semibold">{r.from} → {r.to}</span>
                <span className="truncate text-xs text-white/45">{r.fromCity} → {r.toCity} · {r.distanceNm.toLocaleString('en-US')} nm</span>
                <span className="rounded bg-[#1f88ff]/20 px-1.5 py-0.5 text-[10px] text-[#55a7ff]">Custom</span>
              </Link>
              <button aria-label="Delete route" onClick={() => setAll((cur) => cur.filter((x) => x.id !== r.id))} className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/5">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input className={input} placeholder="From (e.g. LAD)" maxLength={3} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={input} placeholder="To (e.g. GRU)" maxLength={3} value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={add} disabled={busy || !from || !to} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-[#1f88ff] px-4 text-sm font-medium disabled:opacity-40">
          <Plus className="size-4" /> Add
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
    </div>
  )
}