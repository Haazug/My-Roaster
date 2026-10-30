'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAircraftByHex, formatAltitude, formatSpeed, formatVerticalRate, formatTrack } from '@/lib/live-traffic'
import type { LiveAircraft } from '@/lib/live-traffic'
import { useT } from '@/lib/i18n'
import { flightIdentity } from '@/lib/live-model'
import { AirlineLogo } from '@/components/AirlineLogo'

export default function LiveAircraftPage() {
  const t=useT()
  const { hex } = useParams<{ hex: string }>()
  const [aircraft, setAircraft] = useState<LiveAircraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [fr, setFr] = useState<any>(null)
  useEffect(() => {
    const cs = aircraft?.callsign
    setFr(null)
    if (!cs) return
    const controller = new AbortController()
    fetch(`/api/live/flight/${encodeURIComponent(cs)}`, { signal: controller.signal }).then((r) => r.json()).then((j) => setFr(j?.data || null)).catch(() => {})
    return () => controller.abort()
  }, [aircraft?.callsign])

  useEffect(() => {
    const fetchAircraft = async () => {
      if (!hex) return
      setLoading(true)
      const data = await fetch(`/api/live/hex/${(hex as string).toUpperCase()}`).then((r) => r.json()).then((j) => { const a = j?.data?.[0]; return a ? ({ ...a, alt: a.altFt } as LiveAircraft) : null }).catch(() => null)
      setAircraft(data)
      setLastUpdate(new Date().toLocaleTimeString())
      setLoading(false)
    }

    fetchAircraft()

    if (autoRefresh) {
      const interval = setInterval(fetchAircraft, 5000)
      return () => clearInterval(interval)
    }
  }, [hex, autoRefresh])

  if (loading && !aircraft) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> {t('back')}
        </Link>
        <div className="mt-10 text-white/40">{t('live.loading')}</div>
      </section>
    )
  }

  if (!aircraft) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> {t('back')}
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          {String(hex).toUpperCase()} · {t('live.lost')}
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> {t('back')}
        </Link>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 rounded px-2 py-1 ${autoRefresh ? 'text-[#55a7ff]' : 'text-white/40'}`}
          >
            <RefreshCw className={`size-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {t(autoRefresh?'live.title':'live.paused')}
          </button>
          {lastUpdate && <span>{lastUpdate}</span>}
        </div>
      </div>

      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          {fr ? <AirlineLogo iata={fr.airlineIata} icao={fr.airlineIcao} name={fr.airlineName} size="lg" showText={false} /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#1f88ff]/15 text-sm font-bold text-[#1f88ff]">
            {aircraft.hex.substring(0, 3).toUpperCase()}
          </div>}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">{t('live.aircraft')}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight font-mono">
              {flightIdentity(aircraft.callsign, fr?.airlineIata, fr?.flightNumber) || aircraft.hex.toUpperCase()}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {aircraft.type || t('live.unknownType')} · {t(aircraft.onGround?'live.ground':'live.airborne')}
            </p>
          </div>
        </div>
      </header>

      {fr && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-4">
          <div className="min-w-0">
            <p className="text-xs text-white/40">{fr.airlineName}</p>
            <p className="truncate font-semibold">{fr.from} → {fr.to} <span className="font-normal text-white/45">{fr.fromCity} → {fr.toCity}</span></p>
          </div>
          <Link href={`/route/${fr.airlineIata || fr.airlineIcao}/${fr.from}-${fr.to}?flight=${encodeURIComponent(flightIdentity(aircraft.callsign, fr.airlineIata, fr.flightNumber))}`} className="shrink-0 rounded-full border border-white/15 px-4 py-3 text-sm font-medium">{t('live.flyRoute')}</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">{t('live.altitude')}</p>
          <p className="mt-3 font-bold text-white">{aircraft.onGround?t('live.ground'):aircraft.alt==null?t('live.unknownAltitude'):formatAltitude(aircraft.alt)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">{t('live.speed')}</p>
          <p className="mt-3 font-bold text-white">{formatSpeed(aircraft.gs)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">{t('live.heading')}</p>
          <p className="mt-3 font-bold text-white">{formatTrack(aircraft.track)}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <a
          href={`https://globe.airplanes.live/?icao=${aircraft.hex}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold transition hover:bg-white/[.08]"
        >
          {t('live.openMap')} <ExternalLink className="size-4" />
        </a>
      </div>
    </section>
  )
}
