'use client'
import {displayFlightNumber} from '@/lib/live-model'
import Link from 'next/link'
import {Trash2} from 'lucide-react'
import {useT,useLang} from '@/lib/i18n'
import {useLocalStorage} from '@/lib/use-local-storage'
import type {RosterFlight} from '@/lib/roster-data'
import {AirlineLogo} from '@/components/AirlineLogo'
export default function FlightHistory(){
 const [logs,setLogs]=useLocalStorage<RosterFlight[]>('myroster.logs',[]),t=useT(),lang=useLang(s=>s.lang)
 const nm=logs.reduce((sum,f)=>sum+(f.distanceNm||0),0)
 return <section className="mt-10 border-t border-white/10 pt-6"><h2 className="text-xl font-semibold">{t('logs.title')}</h2><p className="mt-2 font-mono text-xs text-white/40">{logs.length} · {nm.toLocaleString(lang)} NM</p><div className="flight-board mt-5">{logs.map(f=><article key={f.id} className="flight-board-row flex items-center gap-3"><Link href={'/logs/'+encodeURIComponent(f.id)} className="flex min-w-0 flex-1 items-center gap-3"><AirlineLogo iata={f.airlineIata} name={f.airlineName} size="sm" showText={false}/><div className="min-w-0"><p className="board-led text-xl">{f.orig} → {f.dest}</p><p className="mt-1 truncate text-xs text-white/50">{displayFlightNumber(f.flightNumber,f.airlineIata)||f.callsign||t('route.numberUnknown')} · {f.airlineName}</p><p className="mt-1 text-xs text-white/35">{new Date(f.departure).toLocaleDateString(lang)} · {f.distanceNm} NM</p></div></Link><button aria-label={t('logs.delete')} className="flex size-11 items-center justify-center text-white/35" onClick={()=>{if(confirm(t('logs.confirm')))setLogs(logs.filter(x=>x.id!==f.id))}}><Trash2 className="size-4"/></button></article>)}</div>{!logs.length&&<p className="py-6 text-sm text-white/40">{t('logs.empty')}</p>}</section>
}
