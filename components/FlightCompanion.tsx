'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {toast} from 'sonner'
import {supabase} from '@/lib/supabase'
import {useT} from '@/lib/i18n'
import {accountId,readCurrentFlight,flushEndedFlights,claimFlight,deviceId,saveLocalActive,type FlightRow} from '@/lib/active-flight'
export default function FlightCompanion(){
 const t=useT(),router=useRouter()
 const [incoming,setIncoming]=useState<FlightRow|null>(null),[busy,setBusy]=useState(false)
 useEffect(()=>{
  let live=true,checkId=0,uid:string|null=null
  const check=async(force=false)=>{const attempt=++checkId;try{
   uid=await accountId();if(!uid){setIncoming(null);return}
   const forUser=uid;await flushEndedFlights(forUser);const row=await readCurrentFlight(forUser);if(!live||await accountId()!==forUser||attempt!==checkId)return
   if(force&&row)sessionStorage.removeItem(`handoff.dismiss.${uid}.${row.value.runId}.${row.value.deviceId}`)
   if(row&&!row.value.finished&&row.value.deviceId!==deviceId()&&!sessionStorage.getItem(`handoff.dismiss.${uid}.${row.value.runId}.${row.value.deviceId}`))setIncoming(row)
   else setIncoming(null)
  }catch{if(live&&attempt===checkId)setIncoming(null)}}
  check();const timer=setInterval(()=>check(),10000)
  const request=()=>check(true),refresh=()=>check();window.addEventListener('myroster:request-handoff',request);window.addEventListener('myroster:active-flight',refresh);window.addEventListener('myroster:data-changed',refresh);window.addEventListener('online',refresh);window.addEventListener('focus',refresh)
  const {data}=supabase.auth.onAuthStateChange(()=>{setIncoming(null);setTimeout(()=>check(),0)})
  return()=>{live=false;clearInterval(timer);window.removeEventListener('myroster:request-handoff',request);window.removeEventListener('myroster:active-flight',refresh);window.removeEventListener('myroster:data-changed',refresh);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);data.subscription.unsubscribe()}
 },[])
 useEffect(()=>{
  const check=async()=>{
   const uid=await accountId().catch(()=>null)
   let bookings:any[]=[];try{bookings=JSON.parse(localStorage.getItem('myroster.bookings')||'[]')}catch{}
   for(const b of bookings){if((b.accountId&&b.accountId!==uid)||!b.scheduledAt||b.startedAt||b.endedAt||b.scheduledAt>Date.now())continue
    const key=`myroster.reminded.${b.id}`
    if(localStorage.getItem(key))continue
    localStorage.setItem(key,'1')
    toast(t('schedule.due'),{description:`${b.flightNumber||''} ${b.orig} → ${b.dest}`,action:{label:t('trip.open'),onClick:()=>router.push('/trips')}})
    try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification(t('schedule.due'),{body:`${b.flightNumber||''} ${b.orig} → ${b.dest}`,tag:b.id})}catch{}
   }
  }
  check();const timer=setInterval(check,15000);window.addEventListener('visibilitychange',check);window.addEventListener('myroster:data-changed',check)
  return()=>{clearInterval(timer);window.removeEventListener('visibilitychange',check);window.removeEventListener('myroster:data-changed',check)}
 },[t,router])
 const follow=async()=>{
  if(!incoming)return;setBusy(true)
  try{const uid=await accountId();const row=uid?await claimFlight(uid,incoming.value.runId):null;if(!row){setIncoming(null);toast(t('handoff.changed'));return}
   localStorage.setItem('myroster.activePlan',JSON.stringify(row.value.plan));saveLocalActive(row.value);setIncoming(null)
   router.push(`/flights/${encodeURIComponent(row.value.flightId)}/fly?resume=${encodeURIComponent(row.value.runId)}`)
   window.dispatchEvent(new Event('myroster:resume-flight'))
  }catch{toast(t('handoff.error'))}finally{setBusy(false)}
 }
 if(!incoming)return null
 return <div role="dialog" aria-modal="true" aria-label={t('handoff.title')} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"><section className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#101010] p-6"><h2 className="text-xl font-medium">{t('handoff.title')}</h2><p className="mt-3 text-sm text-white/55">{incoming.value.plan.from||incoming.value.plan.orig} → {incoming.value.plan.to||incoming.value.plan.dest} · {t(`device.${incoming.value.deviceKind}`)}</p><button disabled={busy} onClick={follow} className="mt-6 min-h-11 w-full rounded-full bg-white px-4 text-sm font-medium text-black disabled:opacity-40">{t('handoff.follow')}</button><button onClick={async()=>{const uid=await accountId();sessionStorage.setItem(`handoff.dismiss.${uid}.${incoming.value.runId}.${incoming.value.deviceId}`,'1');setIncoming(null)}} className="mt-2 min-h-11 w-full text-sm text-white/45">{t('handoff.stay')}</button></section></div>
}
