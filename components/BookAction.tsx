'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import * as sound from '@/lib/sound'
import { useLocalStorage } from '@/lib/use-local-storage'
import type { PassData } from '@/components/BoardingPass'

export default function BookAction({ data }: { data: PassData }) {
  const pathname = usePathname()
  const rid = pathname?.match(/\/flights\/([^/]+)/)?.[1] || ''
  const [bookings, setBookings] = useLocalStorage<any[]>('myroster.bookings', [])
  const [done, setDone] = useState(false)

  const save = () => {
    sound.unlock()
    sound.play('ding')
    let seed: any = null
    try {
      const raw = localStorage.getItem('myroster.routeSeed')
      if (raw) {
        const s = JSON.parse(raw)
        if (String(s.id).toUpperCase() === rid.toUpperCase()) seed = s
      }
    } catch {}
    const same = !!seed && String(seed.orig).toUpperCase() === data.from.toUpperCase() && String(seed.dest).toUpperCase() === data.to.toUpperCase()
    const airlineIata = seed?.airlineIata || rid.split('-')[0].toUpperCase()
    const airlineName = seed?.airlineName || data.airline || airlineIata
    const hasNumber = /^[A-Za-z]{1,3}\d+$/.test(data.flight || '')
    const plan = {
      ...(same ? seed : { free: seed?.free, airlineIcao: seed?.airlineIcao }),
      id: rid,
      airlineIata,
      airlineName,
      flightNumber: hasNumber ? String(data.flight).replace(/^[A-Za-z]+/, '') : '',
      from: data.from,
      to: data.to,
      fromCity: data.fromCity || data.from,
      toCity: data.toCity || data.to,
      aircraft: data.aircraft || '',
      distanceNm: data.distanceNm || 0,
      durationMin: data.durationMin || 60,
    }
    const entry = {
      id: `bk-${Date.now()}`,
      airlineIata,
      airlineName,
      orig: data.from,
      dest: data.to,
      flightNumber: hasNumber ? data.flight : airlineIata,
      aircraft: data.aircraft || '',
      departure: new Date().toISOString(),
      distanceNm: plan.distanceNm,
      fromCity: plan.fromCity,
      toCity: plan.toCity,
      status: 'booked',
      bookedAt: Date.now(),
      plan,
    }
    setBookings([entry, ...bookings])
    setDone(true)
    toast.success('Flight booked')
  }

  return done ? (
    <div className="mt-6 text-center">
      <div className="w-full rounded-full bg-[#1f88ff]/20 py-4 text-base font-semibold text-[#55a7ff]">Booked ✓</div>
      <Link href="/logs" className="mt-3 inline-block text-sm text-[#55a7ff] underline">View in My Logs</Link>
    </div>
  ) : (
    <div className="mt-6">
      <button onClick={save} className="w-full rounded-full bg-white py-4 text-base font-semibold text-black shadow-lg">Book this flight</button>
      <p className="mt-2 text-center text-xs text-white/40">Your plan is saved. You tear the boarding pass later, from My Logs.</p>
    </div>
  )
}
