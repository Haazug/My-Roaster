'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Map, Search, UserRound, Plane, Star, Shuffle } from 'lucide-react'
import { useT } from '@/lib/i18n'

const items = [
  ['/', 'nav.myroster', Plane],
  ['/logs', 'nav.logs', BookOpen],
  ['/airports', 'nav.airports', Map],
  ['/favourites', 'nav.favs', Star],
  ['/random', 'nav.random', Shuffle],
  ['/profile', 'nav.profile', UserRound],
] as const

export default function BottomNav() {
  const path = usePathname()
  const t = useT()
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-xl -translate-x-1/2 items-center justify-around rounded-2xl border border-white/10 bg-[#111217eF] p-2 shadow-2xl backdrop-blur-xl lg:left-6 lg:bottom-6 lg:w-[420px] lg:translate-x-0">
      <Link href="/search" aria-label={t('nav.search')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#1f88ff] text-white">
        <Search />
      </Link>
      {items.map(([href, key, Icon]) => (
        <Link key={href} href={href} className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] ${path === href ? 'text-[#1f88ff]' : 'text-white/45'}`}>
          <Icon className="size-4" />
          <span>{t(key)}</span>
        </Link>
      ))}
    </nav>
  )
}
