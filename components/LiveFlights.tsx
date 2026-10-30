'use client'

import Link from 'next/link'
import { useEffect, useState, useId } from 'react'
import useSWR from 'swr'
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { AirlineLogo } from '@/components/AirlineLogo'
import { currentFlights, liveRouteHref, airportDirection, type ResolvedFlight } from '@/lib/live-model'
import { cacheLiveFlights, mergeLiveHistory } from '@/lib/live-device-history'
import { useT, useLang } from '@/lib/i18n'

type Flight = ResolvedFlight & { kind?: 'departing' | 'arriving' }
type Result = { ok: boolean; data: Flight[]; retired?: ResolvedFlight[]; degraded?: boolean; availability?: { live: string }; globalFeed?: { unavailable?: boolean }; history?: { persistent: boolean }; timetable?: { configured: boolean; complete: boolean } }
const fetcher = async (url: string): Promise<Result> => {
 const response = await fetch(url)
 if (!response.ok) throw new Error('Live traffic unavailable')
 const json = await response.json()
 return { ...json, data: Array.isArray(json.data) ? json.data : json.data?.aircraft || [] }
}
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function LiveFlights({ airport, airline, pair, standalone = false }: { airport?: string; airline?: string; pair?: [string,string]; standalone?: boolean }) {
 const filtersId=useId()
 const t = useT(), lang = useLang(s => s.lang)
 const [tab,setTab] = useState('all'), [query,setQuery] = useState(''), [operator,setOperator] = useState(''), [status,setStatus] = useState('all')
 const [showFilters,setShowFilters] = useState(false), [clock,setClock] = useState(() => Date.now())
 const [cached,setCached] = useState<ResolvedFlight[]>([]), [device,setDevice] = useState<'loading'|'ready'|'session'>('loading')
 useEffect(() => { const timer = setInterval(() => setClock(Date.now()),30000); return () => clearInterval(timer) },[])
 const url = airport ? `/api/airports/${airport}/live` : pair && airline ? `/api/live/route?airline=${encodeURIComponent(airline)}&from=${pair[0]}&to=${pair[1]}` : '/api/live/now'
 const {data,error,isLoading,isValidating,mutate} = useSWR<Result>(url,fetcher,{ refreshInterval:60000,revalidateOnFocus:false,shouldRetryOnError:false })
 useEffect(() => {
  let active = true
  cacheLiveFlights([...(data?.data || []),...(data?.retired || [])]).then(rows => { if(active){setCached(rows);setDevice('ready')} }).catch(() => { if(active)setDevice('session') })
  return () => { active = false }
 },[data])
 const now = Math.max(clock,Date.now())
 const all = currentFlights(mergeLiveHistory(cached,[...(data?.data || []),...(data?.retired || [])],now),now)
  .filter(f => (!airport || airportDirection(f,airport)) && (!pair || (f.from===pair[0]&&f.to===pair[1]) || (f.from===pair[1]&&f.to===pair[0])) && (!airline || f.airlineIcao===airline || f.airlineIata===airline))
 const operators = [...new Map(all.map(f=>[f.airlineIcao || f.airlineIata || f.airlineName,f.airlineName])).entries()].sort((a,b)=>a[1].localeCompare(b[1]))
 const flights = all.filter(f => (tab==='all' || airportDirection(f,airport || '')===tab) && (!operator || (f.airlineIcao || f.airlineIata || f.airlineName)===operator) && (status==='all' || f.status===status) && norm([f.flightNumber,f.callsign,f.from,f.to,f.fromCity,f.toCity,f.airlineName,f.airlineIata,f.airlineIcao].join(' ')).includes(norm(query.trim())))
 const groups = new Map<string,ResolvedFlight[]>()
 for(const f of flights){const key=f.airlineIcao||f.airlineIata||f.airlineName;groups.set(key,[...(groups.get(key)||[]),f])}
 const failed = error || data?.ok===false || data?.availability?.live==='unavailable'
 const reset = () => {setQuery('');setOperator('');setStatus('all');setTab('all')}
 const time = (n:number) => new Date(n).toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'})
 return <section className={standalone ? 'mt-6' : 'mt-8'} aria-label={t('live.title')}>
  <div className="flex items-center justify-between gap-3">
   <h2 className="flex items-center gap-2 text-sm font-medium"><span className={`size-1.5 rounded-full ${failed?'bg-amber-300':'bg-green-400'}`} />{t('live.title')} <span className="text-white/35">{flights.length}</span></h2>
   <button onClick={()=>mutate()} disabled={isValidating} aria-label={t('live.refresh')} className="flex min-h-11 items-center gap-2 text-xs text-white/45 disabled:opacity-30"><RefreshCw className={`size-3.5 ${isValidating?'animate-spin':''}`} />{t('live.refresh')}</button>
  </div>
  <div className="mt-3 flex gap-2">
   <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/[.04] px-3"><Search className="size-4 shrink-0 text-white/35" /><span className="sr-only">{t('live.search')}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('live.searchHint')} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-white/30" /></label>
   <button onClick={()=>setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls={filtersId} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs ${showFilters||operator||status!=='all'?'border-white/40 text-white':'border-white/10 text-white/50'}`}><SlidersHorizontal className="size-4" />{t('live.filters')}</button>
  </div>
  {showFilters && <div id={filtersId} className="mt-3 grid grid-cols-2 gap-3">
   <label className="text-xs text-white/45">{t('live.airline')}<select aria-label={t('live.airline')} value={operator} onChange={e=>setOperator(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-2 text-sm text-white"><option value="">{t('live.allAirlines')}</option>{operators.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
   <label className="text-xs text-white/45">{t('live.status')}<select aria-label={t('live.status')} value={status} onChange={e=>setStatus(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#111] px-2 text-sm text-white">{['all','observed','estimated'].map(key=><option key={key} value={key}>{t(`live.${key}`)}</option>)}</select></label>
  </div>}
  {airport && <div className="mt-3 flex gap-5 border-b border-white/10" role="tablist" aria-label={t('live.title')}>{[['all','live.all'],['arriving','live.arrivals'],['departing','live.departures']].map(([key,label])=><button key={key} role="tab" aria-selected={tab===key} onClick={()=>setTab(key)} className={`min-h-11 border-b text-xs ${tab===key?'border-white text-white':'border-transparent text-white/40'}`}>{t(label)}</button>)}</div>}
  {isLoading && !all.length && <p role="status" className="mt-5 text-sm text-white/40">{t('live.loading')}</p>}
  {failed && <p role="status" className="mt-4 text-sm text-amber-200">{t('live.unavailable')}</p>}
  {!isLoading&&!flights.length&&<p className="py-8 text-sm text-white/40">{t(all.length?'live.noMatch':'live.empty')}</p>}
  {(query||operator||status!=='all'||tab!=='all')&&<button onClick={reset} className="min-h-11 text-xs text-white/50 underline">{t('live.clear')}</button>}
  {[...groups.entries()].sort((a,b)=>a[1][0].airlineName.localeCompare(b[1][0].airlineName)).map(([key,items])=><div key={key} className="mt-6">
   <h3 className="flex items-center gap-3 text-sm text-white/65"><AirlineLogo iata={items[0].airlineIata} icao={items[0].airlineIcao} name={items[0].airlineName} size="sm" showText={false}/><span className="min-w-0 flex-1">{items[0].airlineName}</span><span className="text-white/30">{items.length}</span></h3>
   <div className="mt-2 divide-y divide-white/[.06]">{items.sort((a,b)=>a.flightNumber.localeCompare(b.flightNumber)).map(f=><div key={f.id||f.hex} className="py-3">
    <Link href={liveRouteHref(f)||`/routes/${f.from}-${f.to}`} className="block min-h-11">
     <div className="flex items-center justify-between gap-3"><span className="font-mono font-medium tracking-wide">{f.from} → {f.to}</span><span className="font-mono text-sm text-white/65">{f.flightNumber||f.callsign}</span></div>
     <p className="mt-1 truncate text-xs text-white/40">{f.fromCity} → {f.toCity}</p>
     <p className="mt-2 text-xs text-white/45">{t(f.status==='estimated'?'live.estimateLabel':'live.airborne')}</p>
    </Link>
    <p className="mt-1 text-[11px] text-white/30">{t(f.source==='timetable'?'live.checked':'live.seen',{time:time(f.source==='timetable'?f.updatedAt||f.observedAt:f.observedAt)})}{/^[A-Z0-9~]{6,8}$/i.test(f.hex)&&<> · <Link className="underline" href={`/live/${f.hex}`}>{t('live.aircraft')}</Link></>} · <a href={`https://www.flightradar24.com/data/flights/${encodeURIComponent((f.flightNumber||f.callsign).toLowerCase())}`} target="_blank" rel="noopener noreferrer" className="underline">Flightradar24 ↗</a></p>
   </div>)}</div>
  </div>)}
  <details className="mt-8 border-t border-white/10 py-4 text-xs text-white/40"><summary className="min-h-8 cursor-pointer">{t('live.details')} · {t('live.partial')}</summary><div className="mt-3 space-y-2">
   <p>{t('live.note')}</p><p>{t(data?.history?.persistent?'live.historyServer':device==='ready'?'live.historyDevice':'live.historySession')}</p>
   {data?.history?.persistent===false&&<p>{t('live.sharedMissing')}</p>}
   {data?.globalFeed?.unavailable&&<p>{t('live.globalMissing')}</p>}
   {data?.timetable?.configured===false&&<p>{t('live.noTimetable')}</p>}
  </div></details>
 </section>
}
