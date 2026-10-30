'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n'
import { Home,Search,Radio,Globe2,MapPin,Ticket,BookOpen,Star,Shuffle,PlaneTakeoff,QrCode,UserRound,Settings } from 'lucide-react'
const links=[['/','nav.myroster',Home],['/search','nav.search',Search],['/live','live.title',Radio],['/airlines','nav.airlines',Globe2],['/airports','nav.airports',MapPin],['/trips','trip.title',Ticket],['/logs','nav.logs',BookOpen],['/favourites','search.favourites',Star],['/random','nav.random',Shuffle],['/free','nav.free',PlaneTakeoff],['/scan','nav.scan',QrCode],['/profile','nav.profile',UserRound],['/settings','settings.title',Settings]] as const
export default function BottomNav(){
 const t=useT(),path=usePathname()
 return <nav aria-label={t('nav.main')} className="fixed bottom-0 left-0 z-40 grid w-full grid-cols-7 gap-0.5 border-t border-white/10 bg-black/95 px-1 pt-2 backdrop-blur-xl sm:left-1/2 sm:bottom-3 sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-2xl sm:border lg:left-6 lg:max-w-[560px] lg:translate-x-0" style={{paddingBottom:'max(8px, env(safe-area-inset-bottom))'}}>
  {links.map(([href,key,Icon])=>{const active=path===href||(href!=='/'&&path.startsWith(href+'/'));return <Link key={href} href={href} aria-label={t(key)} aria-current={active?'page':undefined} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0 sm:px-0.5 text-center text-[9px] sm:text-[10px] transition ${active?'bg-white/[.08] text-white':'text-white/40 hover:text-white'}`}><Icon className="size-[18px] shrink-0"/><span className="max-w-full break-words leading-tight tracking-tight">{t(key)}</span></Link>})}
 </nav>
}
