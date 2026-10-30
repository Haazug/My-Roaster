'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {useState} from 'react'
import { useT } from '@/lib/i18n'
import { Home,Search,Radio,Globe2,MapPin,Ticket,Star,Shuffle,PlaneTakeoff,QrCode,UserRound,Menu,X } from 'lucide-react'
const links=[['/','nav.myroster',Home],['/search','nav.search',Search],['/live','live.title',Radio],['/airlines','nav.airlines',Globe2],['/airports','nav.airports',MapPin],['/trips','trip.title',Ticket],['/favourites','search.favourites',Star],['/random','nav.random',Shuffle],['/free','nav.free',PlaneTakeoff],['/scan','nav.scan',QrCode],['/profile','nav.profile',UserRound]] as const
export default function BottomNav(){
 const t=useT(),path=usePathname(),[open,setOpen]=useState(false)
 const mobile=['/','/search','/live','/trips']
 return <>
 {open&&<div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden" onClick={()=>setOpen(false)}><div id="navigation-more" role="dialog" aria-label={t('nav.more')} className="absolute inset-x-3 bottom-24 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#121212] p-3" onClick={e=>e.stopPropagation()}>{links.filter(([href])=>!mobile.includes(href)).map(([href,key,Icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl text-center text-xs text-white/75 hover:bg-white/5"><Icon className="size-5"/>{t(key)}</Link>)}</div></div>}
 <nav aria-label={t('nav.main')} className="fixed bottom-0 left-0 z-40 flex w-full border-t border-white/10 bg-black/90 px-1 pt-1 backdrop-blur-xl sm:left-1/2 sm:bottom-3 sm:grid sm:max-w-2xl sm:-translate-x-1/2 sm:grid-cols-6 sm:rounded-2xl sm:border lg:left-6 lg:max-w-[560px] lg:translate-x-0" style={{paddingBottom:'max(5px, env(safe-area-inset-bottom))'}}>
 {links.map(([href,key,Icon])=>{const active=path===href||(href!=='/'&&path.startsWith(href+'/'))||(href==='/trips'&&path.startsWith('/logs'))||(href==='/profile'&&path==='/settings');return <Link key={href} href={href} onClick={()=>setOpen(false)} aria-label={t(key)} aria-current={active?'page':undefined} className={`${mobile.includes(href)?'flex':'hidden sm:flex'} min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[10px] transition ${active?'bg-white/[.08] text-white':'text-white/45 hover:text-white'}`}><Icon className="size-[18px] shrink-0"/><span className="leading-tight">{t(key)}</span></Link>})}
 <button aria-label={t('nav.more')} aria-expanded={open} aria-controls="navigation-more" onClick={()=>setOpen(v=>!v)} className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] text-white/65 sm:hidden">{open?<X className="size-[18px]"/>:<Menu className="size-[18px]"/>}{t('nav.more')}</button>
 </nav></>
}
