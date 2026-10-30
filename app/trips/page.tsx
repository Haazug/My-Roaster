'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {Trash2,CalendarPlus,Play} from 'lucide-react'
import {useLocalStorage} from '@/lib/use-local-storage'
import type {RosterFlight} from '@/lib/roster-data'
import {tripState,calendarEvent} from '@/lib/flight-workflow'
import {useT,useLang} from '@/lib/i18n'
export default function TripsPage(){
 const [bookings,setBookings]=useLocalStorage<RosterFlight[]>('myroster.bookings',[])
 const [now,setNow]=useState(Date.now()),t=useT(),lang=useLang(s=>s.lang)
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer)},[])
 const open=(f:RosterFlight)=>{if(tripState(f,now)==='completed')return;if(f.plan)localStorage.setItem('myroster.activePlan',JSON.stringify({...f.plan,id:f.planId||f.plan.id,scheduleId:f.scheduledAt?f.id:undefined}))}
 const href=(f:RosterFlight)=>tripState(f,now)==='completed'?'/logs':f.plan?`/flights/${encodeURIComponent(f.planId||f.plan.id||f.id)}/fly`:`/route/${f.airlineIata}/${f.orig}-${f.dest}`
 const calendar=(f:RosterFlight)=>{if(!f.scheduledAt)return;const body=calendarEvent(f.id,`${f.flightNumber} · ${f.orig} → ${f.dest}`,f.scheduledAt,f.plan?.durationMin||60,`${location.origin}/trips`);const url=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));const a=document.createElement('a');a.href=url;a.download=`myroster-${f.id}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section className="min-h-screen p-5 pb-40 sm:p-8"><h1 className="text-3xl font-semibold">{t('trip.title')}</h1><p className="mt-2 text-sm text-white/45">{t('trip.subtitle')}</p>
  <div className="mt-6 divide-y divide-white/[.08]">{bookings.map(f=>{const status=tripState(f,now);return <article key={f.id} className="py-5">
   <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-lg font-medium tracking-wide">{f.orig} <span className="text-white/30">→</span> {f.dest}</p><p className="mt-1 truncate text-xs text-white/45">{f.flightNumber} · {f.airlineName}</p></div><span className={`shrink-0 font-mono text-[10px] uppercase tracking-widest ${status==='delayed'?'text-amber-300':status==='running'?'text-green-300':'text-white/40'}`}>{t(`trip.${status}`)}</span></div>
   {f.scheduledAt&&<p className="mt-3 text-xs text-white/45">{new Date(f.scheduledAt).toLocaleString(lang,{dateStyle:'medium',timeStyle:'short'})}</p>}
   <div className="mt-3 flex flex-wrap items-center gap-4"><Link onClick={()=>open(f)} href={href(f)} className="flex min-h-11 items-center gap-2 text-sm"><Play className="size-3.5"/>{t(status==='scheduled'||status==='delayed'?'trip.start':'trip.open')}</Link>{f.scheduledAt&&<button onClick={()=>calendar(f)} className="flex min-h-11 items-center gap-2 text-xs text-white/45"><CalendarPlus className="size-4"/>{t('schedule.calendar')}</button>}<button aria-label={t('trip.remove')} onClick={()=>setBookings(bookings.filter(b=>b.id!==f.id))} className="ml-auto flex size-11 items-center justify-center text-white/30 hover:text-white"><Trash2 className="size-4"/></button></div>
  </article>})}</div>{!bookings.length&&<p className="py-8 text-sm text-white/40">{t('trip.empty')}</p>}
 </section>
}
