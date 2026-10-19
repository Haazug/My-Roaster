'use client'

import Link from 'next/link'
import { Search, Sparkles, MapPin, Globe } from 'lucide-react'

export default function Home() {
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
          Your roster
        </p>

        <h1 className="mt-8 text-5xl sm:text-7xl font-bold tracking-[-.05em] bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Ready for takeoff.
        </h1>

        <p className="mt-6 text-lg text-white/50">
          Explore real airline networks, plan your flights with SimBrief, and keep your next route close.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 min-h-14 rounded-2xl border border-[#1f88ff] bg-[#1f88ff]/10 hover:bg-[#1f88ff]/20 px-8 font-semibold text-white transition"
          >
            <Search className="size-5" />
            Search Flights
          </Link>

          <Link
            href="/airlines"
            className="flex items-center justify-center gap-2 min-h-14 rounded-2xl border border-white/10 bg-white/[.08] hover:bg-white/[.12] px-8 font-semibold text-white transition"
          >
            <Globe className="size-5" />
            Browse Airlines
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Globe, label: 'Real Networks', desc: 'Explore actual airline routes' },
            { icon: MapPin, label: 'Flight Plans', desc: 'Import your SimBrief data' },
            { icon: Sparkles, label: 'Live Tracking', desc: 'Monitor your flight phases' },
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
            Add an upcoming flight to your roster. Browse airline rosters to find your next route, or import your SimBrief flight plan for a complete monitoring experience.
          </p>
        </div>
      </div>
    </section>
  )
}
