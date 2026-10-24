'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { decodeShare, type Share } from '@/lib/share'
import { AirlineLogo } from '@/components/AirlineLogo'

export default function SharedRoutePage() {
  const [s, setS] = useState<Share | null | undefined>(undefined)
  useEffect(() => {
    setS(decodeShare(new URLSearchParams(window.location.search).get('d') || ''))
  }, [])

  if (s === undefined) return <section className="min-h-screen p-5 text-white/40 sm:p-8">Loading…</section>
  if (!s)
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <p className="mt-10 text-white/60">This route code is not valid.</p>
        <Link href="/scan" className="mt-4 inline-block text-[#55a7ff] underline">Scan another</Link>
      </section>
    )

  const when = s.s ? new Date(s.s) : null
  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">{s.m === 'duo' ? 'Duo flight' : 'Shared route'}</p>
      <div className="mt-4"><AirlineLogo iata={s.a} name={s.an || s.a} size="md" /></div>
      <h1 className="mt-4 text-4xl font-semibold">{s.f} → {s.t}</h1>
      <p className="mt-2 text-sm text-white/50">{[s.n, s.ac].filter(Boolean).join(' · ')}</p>
      {when && (
        <p className="mt-4 rounded-xl bg-white/[.06] p-3 text-sm text-white/70">
          Agreed departure: <strong className="text-white">{when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          {when.getTime() < Date.now() ? ' (already passed, start whenever you like)' : ' — both of you start the flight at this time.'}
        </p>
      )}
      <Link href={`/route/${s.a}/${s.f}-${s.t}`} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#1f88ff] font-semibold">
        Open route and fly
      </Link>
      <Link href="/scan" className="mt-3 block text-center text-sm text-white/50 underline">Scan another code</Link>
    </section>
  )
}
