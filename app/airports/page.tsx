'use client'
import {useT} from '@/lib/i18n'

import Link from 'next/link'
import { useEffect, useMemo, useState, useDeferredValue } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Search, Star } from 'lucide-react'
import { useMapStore } from '@/lib/map-store'
import { Flag } from '@/components/Flag'
import { useFavs } from '@/lib/use-favs'

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes: number }
const EMPTY_AIRPORTS:Airport[]=[]
const fetcher = (url: string) => fetch(url).then((r) => r.json())
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function AirportsPage() {
 const t=useT()
  const { data, error } = useSWR<Airport[] | { error: string }>('/api/airports', fetcher)
  const [q, setQ] = useState('')
  const deferredQ=useDeferredValue(q)
  const setView = useMapStore((s) => s.setView)
  const fav = useFavs('airport')
  const list = Array.isArray(data) ? data : EMPTY_AIRPORTS
  const rows = useMemo(() => {
    const n = norm(deferredQ.trim())
    const base = n ? list.filter((a) => norm(`${a.iata} ${a.icao} ${a.city} ${a.name} ${a.country}`).includes(n)) : list
    return [...base].sort((x, y) => Number(fav.has(y.iata)) - Number(fav.has(x.iata))).slice(0, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, deferredQ, fav.items])

  useEffect(() => {
    setView({ mode: 'airports', airports: rows })
  }, [rows, setView])
  useEffect(() => () => setView({ mode: 'idle' }), [setView])

  return (
    <section className="relative z-10 min-h-screen p-5 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/50"><ArrowLeft className="size-4" />MyRoster</Link>
      <div className="mt-4">
        <h1 className="text-4xl font-semibold">{t('airports.title')}</h1>
        <p className="mt-2 text-white/45">{list.length ? list.length.toLocaleString()+' · ' : ''}{t('airports.browse')}</p>
      </div>
      <label className="mt-8 flex min-h-12 items-center gap-3 rounded-2xl bg-white/[.06] px-4">
        <Search className="size-4 text-white/40" aria-hidden="true" />
        <span className="sr-only">{t('airports.search')}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('airports.search')} className="min-h-11 w-full min-w-0 bg-transparent outline-none placeholder:text-white/35" />
      </label>
      {error || (data && !Array.isArray(data)) ? (
        <div className="mt-6 rounded-2xl bg-red-400/10 p-5">{t('airports.error')}</div>
      ) : !data ? (
        <p className="mt-6 text-white/40" aria-busy="true">{t('airports.loading')}</p>
      ) : (
        <div className="mt-6 divide-y divide-white/[.06] departure-board">
          {rows.map((a) => (
            <Link key={a.iata} href={`/airports/${a.iata}`} className="flex min-h-16 items-center gap-4 py-3 transition hover:bg-white/[.03]">
              <span className="w-12 shrink-0 font-mono text-lg font-bold">{a.iata}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold board-code">{a.city} <span className="font-normal text-white/40">· {a.name}</span></span>
                <span className="mt-1 flex items-center gap-2 text-xs text-white/45"><Flag country={a.country} size={16} /><span className="truncate">{a.icao} · {a.country}</span></span>
              </span>
              {fav.has(a.iata) && <Star className="size-4 shrink-0 fill-[#facc15] text-[#facc15]" />}
              <span className="w-10 shrink-0 text-right text-sm text-white/50">{a.routes}</span>
            </Link>
          ))}
          {!rows.length && <p className="py-5 text-sm text-white/40">{t('airports.none')}</p>}
        </div>
      )}
    </section>
  )
}
