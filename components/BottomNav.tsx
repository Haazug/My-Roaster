'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Map, Search, UserRound, Plane, Star, Shuffle, QrCode } from 'lucide-react'
import { useT } from '@/lib/i18n'

const items = [
  ['/', 'nav.myroster', Plane],
  ['/logs', 'nav.logs', BookOpen],
  ['/airports', 'nav.airports', Map],
  ['/favourites', 'nav.favs', Star],
  ['/random', 'nav.random', Shuffle],
  ['/scan', 'Scan', QrCode],
  ['/profile', 'nav.profile', UserRound],
] as const

export default function BottomNav() {
  const path = usePathname()
  const t = useT()
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-xl -translate-x-1/2 items-center justify-around rounded-full border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:left-6 lg:w-[480px] lg:translate-x-0">
      <Link href="/search" aria-label={t('nav.search')} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
        <Search className="size-5" />
      </Link>
      {items.map(([href, key, Icon]) => {
        const on = path === href
        return (
          <Link key={href} href={href} className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[9px] transition ${on ? 'text-white' : 'text-white/35 hover:text-white/70'}`}>
            <Icon className="size-4" />
            <span>{t(key)}</span>
            {on && <span className="absolute bottom-0.5 size-1 rounded-full bg-[#1f88ff]" />}
          </Link>
        )
      })}
    </nav>
  )
}
