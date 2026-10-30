'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useT } from '@/lib/i18n'
import { Menu, Plane, Radio, Search } from 'lucide-react'

const links = [['/airlines', 'nav.airlines'], ['/airports', 'nav.airports'], ['/logs', 'nav.logs'], ['/favourites', 'search.favourites'], ['/random', 'nav.random'], ['/free', 'nav.free'], ['/scan', 'nav.scan'], ['/profile', 'nav.profile'], ['/settings', 'settings.title']] as const
export default function BottomNav() {
  const t = useT()
  const path = usePathname()
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => { if (menu.current) menu.current.open = false }, [path])
  return <nav aria-label={t('nav.main')} className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/90 p-2 shadow-xl backdrop-blur-xl lg:bottom-6 lg:left-6 lg:translate-x-0">
    {([['/', 'nav.myroster', Plane], ['/search', 'nav.search', Search], ['/live', 'live.title', Radio]] as const).map(([href, label, Icon]) =>
      <Link key={href} href={href} aria-label={t(label)} title={t(label)} aria-current={path === href ? 'page' : undefined} className={`flex size-11 items-center justify-center rounded-full transition ${path === href ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}><Icon className="size-5" /></Link>)}
    <details ref={menu} className="relative" onKeyDown={e => { if (e.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }}>
      <summary aria-label={t('nav.more')} title={t('nav.more')} className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-white/50 hover:bg-white/10 [&::-webkit-details-marker]:hidden"><Menu className="size-5" /></summary>
      <div className="absolute bottom-full right-0 mb-4 w-48 rounded-2xl border border-white/10 bg-[#101010] p-2 shadow-xl">
        {links.map(([href, label]) => <Link onClick={() => { if (menu.current) menu.current.open = false }} key={href} href={href} aria-current={path.startsWith(href) ? 'page' : undefined} className="block rounded-lg px-3 py-2.5 text-sm text-white/65 hover:bg-white/5 hover:text-white">{t(label)}</Link>)}
      </div>
    </details>
  </nav>
}
