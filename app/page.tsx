'use client'

import Link from 'next/link'
import { Search, Sparkles, MapPin, Globe } from 'lucide-react'
import { useT } from '@/lib/i18n'

export default function Home() {
  const t = useT()
  return (
    <section className="min-h-screen flex flex-col items-center justify-center p-5 pt-8 sm:p-8 sm:pt-12 relative">
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 rounded-full border border-[#1f88ff]/30 animate-spin" style={{ animationDuration: '20s' }}>
            <div className="absolute inset-0 rounded-full border border-[#1f88ff]/20" style={{ borderWidth: '2px' }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">
          <Sparkles className="size-3.5" />
          {t('home.kicker')}
        </p>

        <h1 className="mt-8 text-5xl sm:text-7xl font-bold tracking-[-.05em] bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          {t('home.title')}
        </h1>

        <p className="mt-6 text-lg text-white/50">
          {t('home.sub')}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 min-h-14 rounded-2xl border border-[#1f88ff] bg-[#1f88ff]/10 hover:bg-[#1f88ff]/20 px-8 font-semibold text-white transition"
          >
            <Search className="size-5" />
            {t('home.search')}
          </Link>

          <Link
            href="/airlines"
            className="flex items-center justify-center gap-2 min-h-14 rounded-2xl border border-white/10 bg-white/[.08] hover:bg-white/[.12] px-8 font-semibold text-white transition"
          >
            <Globe className="size-5" />
            {t('home.airlines')}
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Globe, label: t('home.f1'), desc: t('home.f1d') },
            { icon: MapPin, label: t('home.f2'), desc: t('home.f2d') },
            { icon: Sparkles, label: t('home.f3'), desc: t('home.f3d') },
          ].map((feature, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[.02] p-6 text-center hover:border-[#1f88ff]/40 transition">
              <feature.icon className="mx-auto size-6 text-[#1f88ff] mb-3" />
              <p className="font-semibold">{feature.label}</p>
              <p className="text-xs text-white/40 mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[.02] p-6">
          <p className="text-sm text-white/60">
            {t('home.note')}
          </p>
        </div>
      </div>
    </section>
  )
}
