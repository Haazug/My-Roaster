'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {distNm} from '@/lib/live-geo'
import {estimateBlockMinutes} from '@/lib/flight-time'
import BackLink from '@/components/BackLink'
import useSWR from 'swr'
import {BRASILEIRINHO,brasileirinhoLegs} from '@/lib/brasileirinho'
import {useMapStore} from '@/lib/map-store'
import {useT,useLang} from '@/lib/i18n'
export default function Brasileirinho(){
 const router=useRouter(),t=useT(),lang=useLang(s=>s.lang),setView=useMapStore(s=>s.setView)
 const [selected,select]=useState('01'),[aircraft,setAircraft]=useState('F33A Bonanza')
 const leg=brasileirinhoLegs.find(l=>l.id===selected)!
 const {data,error,isValidating,mutate}=useSWR('/api/special/brasileirinho',async url=>{const r=await fetch(url);if(!r.ok)throw Error('Unavailable');return r.json()},{refreshInterval:30000,revalidateOnFocus:false,shouldRetryOnError:false})
 useEffect(()=>{setView({mode:'route',from:leg.from,to:leg.to});return()=>setView({mode:'idle'})},[leg,setView])
 const simulate=()=>{const id=`BRASILEIRINHO-${leg.id}`,distance=distNm(leg.from,leg.to);localStorage.setItem('myroster.activePlan',JSON.stringify({id,createdAt:Date.now(),airlineName:BRASILEIRINHO.name,airlineIata:'',airlineIcao:'',flightNumber:'',callsign:'PSBZR',registration:'PS-BZR',from:leg.from.iata,to:leg.to.iata,fromCity:leg.from.city,toCity:leg.to.city,fromLat:leg.from.lat,fromLon:leg.from.lon,toLat:leg.to.lat,toLon:leg.to.lon,aircraft,distanceNm:Math.round(distance),durationMin:estimateBlockMinutes(distance,aircraft),free:true}));router.push(`/flights/${id}/fly`)}
 const active=(data?.data||[]).filter((a:any)=>!a.onGround)
 return <section className="min-h-screen p-5 pb-40 sm:p-8"><BackLink href="/airlines" className="text-sm text-white/45">← {t('back')}</BackLink>
  <h1 className="mt-6 text-4xl">Brasileirinho</h1><p className="board-heading mt-3">PS-BZR · F33A Bonanza · {t('special.fleet')}</p>
  <p className="mt-3 text-sm leading-relaxed text-white/55">{t('special.description')}</p><p className="mt-2 text-xs leading-relaxed text-white/40">{t('special.reference')}</p>
  <div className="mt-6 border-y border-white/10 py-4"><div className="flex items-center justify-between gap-4"><h2 className="board-heading">{t('live.title')}</h2><button onClick={()=>mutate()} disabled={isValidating} className="min-h-11 text-xs text-white/55">{t('live.refresh')}</button></div>
   {error?<p className="text-xs text-white/45">{t('special.unavailable')}</p>:!data?<p>{t('live.loading')}</p>:!active.length?<p className="text-xs text-white/45">{t('special.notObserved')}</p>:active.map((a:any)=><Link key={a.hex} href={`/live/${a.hex}`} className="mt-3 block rounded-xl border border-green-300/20 p-4"><span className="text-green-300">● PS-BZR · {a.type||'BE33'}</span><p className="mt-2 text-xs text-white/50">{t('special.follow')} · {new Date(data.observedAt).toLocaleTimeString(lang)} · {a.lat.toFixed(3)}, {a.lon.toFixed(3)}</p><p className="mt-2 text-xs text-white/40">{t('live.etaUnknown')}</p></Link>)}
  </div>
  <h2 className="board-heading mt-6">{t('special.itinerary')} · 30/10/2026</h2><div className="flight-board mt-4"><div className="flight-board-head"><span>#</span><span>{t('route.boardRoute')}</span><span>PS-BZR</span></div>{brasileirinhoLegs.map(l=><button key={l.id} onClick={()=>select(l.id)} aria-pressed={selected===l.id} className={`flight-board-row block w-full text-left ${selected===l.id?'bg-yellow-300/10':''}`}><span className="board-led text-lg">{l.id} · {l.from.iata} → {l.to.iata}</span><span className="mt-1 block text-xs text-white/50">{l.from.city} → {l.to.city}</span></button>)}</div>
  <div className="mt-6 rounded-xl border border-white/10 p-4"><p className="board-led text-xl">{leg.from.iata} → {leg.to.iata}</p><p className="mt-2 text-xs text-white/50">{leg.from.name} → {leg.to.name}</p><label className="mt-4 block text-xs text-white/50">{t('special.simAircraft')}<select value={aircraft} onChange={e=>setAircraft(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg bg-[#151515] px-3 text-sm text-white"><option>F33A Bonanza</option><option>Cessna 182 Skylane</option><option>Cessna 172 Skyhawk</option></select></label><p className="mt-3 text-xs text-white/40">{t('special.simNote')}</p><button onClick={simulate} className="mt-4 min-h-11 rounded-full bg-white px-5 text-sm text-black">{t('special.simulate')}</button></div>
 </section>
}
