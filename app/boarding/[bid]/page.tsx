'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'
import { BoardingPass } from '@/components/BoardingPass'

export default function BoardingPage() {
  const { bid } = useParams<{ bid: string }>()
  const router = useRouter()
  const [bookings, setBookings, hydrated] = useLocalStorage<any[]>('myroster.bookings', [])
  const key = (() => { try { return decodeURIComponent(String(bid)) } catch { return String(bid) } })()
  const b = bookings.find((x) => x.id === key)

  const back = (
    <Link href="/logs" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
      <ArrowLeft className="size-4" /> My Logs
    </Link>
  )

  if (!hydrated) return <section className="min-h-screen p-5 text-white/40 sm:p-8">Loading…</section>
  if (!b || !b.plan) return <section className="min-h-screen p-5 sm:p-8">{back}<p className="mt-8 text-white/50">This booking has no saved plan.</p></section>

  const p = b.plan
  const go = () => {
    try { localStorage.setItem('myroster.activePlan', JSON.stringify(p)) } catch {}
    setBookings(bookings.filter((x) => x.id !== b.id))
    router.push(`/flights/${p.id}/fly`)
  }

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      {back}
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-[#facc15]">Booked</p>
      <h1 className="mb-6 mt-2 text-3xl font-semibold">Ready to board</h1>
      <BoardingPass
        tear
        data={{
          from: p.from,
          to: p.to,
          fromCity: p.fromCity,
          toCity: p.toCity,
          airline: p.airlineName,
          airlineIata: p.airlineIata || String(p.id || '').split('-')[0],
          flight: b.flightNumber,
          aircraft: p.aircraft,
          distanceNm: p.distanceNm,
          durationMin: p.durationMin,
          date: new Date().toISOString().slice(0, 10),
        }}
        onBoard={go}
      />
    </section>
  )
}
