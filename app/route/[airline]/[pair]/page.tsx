'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Check, Plane, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useLocalStorage } from '@/lib/use-local-storage'
import { useFavourites } from '@/lib/use-favourites'
import { useMapStore } from '@/lib/map-store'
import type { RosterFlight } from '@/lib/roster-data'
import { simbriefUrl, type ExportFlight } from '@/lib/export'
import { ExportMenu } from '@/components/export-menu'
import { AirlineLogo } from '@/components/AirlineLogo'
import { fixName } from '@/lib/airline-names'
import { estimateBlockMinutes } from '@/lib/flight-time'
import { useNow } from '@/lib/use-now'
import { useT } from '@/lib/i18n'
import { flightNumberPart } from '@/lib/live-model'
import LiveFlights from '@/components/LiveFlights'
import BookDialog from '@/components/BookDialog'
import FlyChoiceDialog, { openExternal, type FlyKind } from '@/components/FlyChoiceDialog'

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number }
type RouteData = {
  airline: { id: string; name: string; iata: string; icao: string; country: string }
  from: Airport
  to: Airport
  operated: boolean
  codeshare: boolean
  aircraft: { code: string; name: string; icao: string }[]
  distanceKm: number
  distanceNm: number
  legs?: { label: string; pair: string; from: string; to: string; active: boolean }[]
  error?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const hhmm = (m: number) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }

export default function RoutePage() {
  return <Suspense fallback={<p className="p-5 text-white/40">Loading route…</p>}><RouteContent /></Suspense>
}

function RouteContent() {
  const params = useParams<{ airline: string; pair: string }>()
  const { data, error, isLoading } = useSWR<RouteData>(`/api/route/${params.airline}/${params.pair}`, fetcher, { keepPreviousData: true })
  const [bookings, setBookings] = useLocalStorage<RosterFlight[]>('myroster.bookings', [])
  const { has, toggle } = useFavourites()
  const setView = useMapStore((s) => s.setView)
  const [bookOpen, setBookOpen] = useState(false)
  const [flyOpen, setFlyOpen] = useState(false)
  const search = useSearchParams()
  const candidate = search.get('flight') || ''
  const flightCode = /^[A-Z0-9]{2,3}\d[A-Z0-9]{0,5}$/.test(candidate) ? candidate : ''
  const router = useRouter()
  const now = useNow()
  const t = useT()

  // the globe zooms once; switching between outbound and return does not zoom again
  useEffect(() => {
    if (data && !data.error) setView({ mode: 'route', from: data.from, to: data.to })
  }, [data, setView])
  useEffect(() => () => setView({ mode: 'idle' }), [setView])

  if (isLoading) return <section className="min-h-screen p-5 text-white/50 sm:p-8" aria-busy="true">{t('route.loading')}</section>
  if (error || !data || data.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55"><ArrowLeft className="size-4" />{t('route.airlines')}</Link>
        <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">{t('route.notFound')}</div>
      </section>
    )
  }

  const type = data.aircraft[0]
  const flight: RosterFlight = {
    id: `${data.airline.iata || data.airline.id}-${data.from.iata}-${data.to.iata}`,
    airlineIata: data.airline.iata || data.airline.icao,
    airlineName: fixName(data.airline.name),
    orig: data.from.iata,
    dest: data.to.iata,
    flightNumber: flightCode,
    aircraft: type?.name ?? 'Not listed',
    departure: '',
    distanceNm: data.distanceNm,
    fromCity: data.from.city,
    toCity: data.to.city,
  }
  const exportFlight: ExportFlight = {
    airlineIcao: data.airline.icao || undefined,
    airlineIata: data.airline.iata,
    airlineName: fixName(data.airline.name),
    flightNumber: flightNumberPart(flightCode, data.airline.iata, data.airline.icao),
    origin: data.from,
    dest: data.to,
    aircraftIcao: type?.icao ?? '',
    aircraftName: type?.name ?? 'Not listed',
    depHour: now ? now.getHours() : 12,
    depMin: now ? now.getMinutes() : 0,
    durationMin: estimateBlockMinutes(data.distanceNm, type?.name ?? ''),
    distanceNm: data.distanceNm,
  }

  const saveSeed = () => {
    try {
      localStorage.setItem('myroster.routeSeed', JSON.stringify({
        free: new URLSearchParams(window.location.search).has('free'),
        id: `${params.airline}-${params.pair}`,
        flightNumber: exportFlight.flightNumber,
        airlineName: data?.airline.name, airlineIata: data?.airline.iata, airlineIcao: data?.airline.icao,
        orig: data?.from.iata, dest: data?.to.iata, fromIcao: data?.from.icao, toIcao: data?.to.icao,
        fromCity: data?.from.city, toCity: data?.to.city,
        fromLat: data?.from.lat, fromLon: data?.from.lon, toLat: data?.to.lat, toLon: data?.to.lon,
        distanceNm: data?.distanceNm, durationMin: exportFlight.durationMin,
        aircraft: data?.aircraft?.[0]?.icao || '',
      }))
    } catch {}
  }
  const flyWith = (kind: FlyKind) => {
    saveSeed()
    setFlyOpen(false)
    openExternal(kind, exportFlight)
    router.push(`/flights/${params.airline}-${params.pair}/flight-plan`)
  }

  function book() {
    if (bookings.some((b) => b.id === flight.id)) {
      toast(t('route.alreadyBooked'))
      return
    }
    setBookings([...bookings, { ...flight, departure: new Date().toISOString() }])
    toast.success(t('route.booked'), { action: { label: t('route.viewTrips'), onClick: () => { window.location.href = '/trips' } } })
  }

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href={`/airlines/${data.airline.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" />{fixName(data.airline.name)}
      </Link>
      <header className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">
            {data.operated ? (data.codeshare ? t('route.codeshare') : t('route.operated')) : t('route.notListed')}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold sm:text-4xl">{t('route.title', { from: data.from.city, to: data.to.city })}</h1>
          <p className="mt-2 text-sm text-white/45">{fixName(data.airline.name)} · {flightCode || 'Flight number unavailable'}</p>
        </div>
        <button
          aria-label={has(flight.id) ? t('route.favRemove') : t('route.favAdd')}
          aria-pressed={has(flight.id)}
          onClick={() => toggle(flight)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          <Star className={`size-5 ${has(flight.id) ? 'fill-[#55a7ff] text-[#55a7ff]' : 'text-white/70'}`} />
        </button>
      </header>

      {data.legs && data.legs.length === 2 && (
        <div className="mt-5 flex gap-2">
          {data.legs.map((l) => (
            <Link
              key={l.label}
              href={`/route/${params.airline}/${l.pair}`}
              replace
              aria-current={l.active ? 'page' : undefined}
              className={`flex-1 border-b px-4 py-2 text-center text-sm font-semibold transition ${l.active ? 'border-white text-white' : 'border-white/10 text-white/40 hover:text-white'}`}
            >
              <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">{l.label}</span>
              {l.from} → {l.to}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e12f2]">
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <AirlineLogo iata={data.airline.iata} icao={data.airline.icao} name={fixName(data.airline.name)} size="md" showText={false} />
          <div className="min-w-0">
            <p className="text-sm text-white/50">{flightCode || 'Flight number unavailable'} · {data.from.icao} → {data.to.icao}</p>
            <p className="truncate text-xl font-semibold">{t('route.title', { from: data.from.city, to: data.to.city })}</p>
          </div>
        </div>
        <div className="p-5 text-center">
          <div className="mx-auto mb-3 max-w-sm"></div>
          <p className="text-sm text-white/70">{type?.name ?? t('route.noAircraft')}</p>
          <div className="mt-6 flex items-center justify-between text-lg font-semibold"><span>{data.from.icao}</span><span>{data.to.icao}</span></div>
          <div className="mt-2 flex items-center gap-2"><span className="size-2 rounded-full bg-white/30" /><span className="h-px flex-1 bg-white/15" /><span className="size-2 rounded-full bg-white/30" /></div>
          <p className="mt-3 text-sm text-white/60">{data.distanceNm.toLocaleString('en-US')} nm</p>
          <p className="mt-4 text-xs text-white/35">Simulation timing estimate</p>
          <div className="mt-2 grid grid-cols-3 rounded-2xl bg-white/[.04] p-4 text-center">
            <div><p className="text-[11px] uppercase text-white/40">{t('route.dep')}</p><p className="mt-1 text-xl font-semibold">{now ? hhmm(exportFlight.depHour * 60 + exportFlight.depMin) : '--:--'}</p></div>
            <div><p className="text-[11px] uppercase text-white/40">{t('route.dur')}</p><p className="mt-1 text-xl font-semibold">{Math.floor(exportFlight.durationMin / 60)}h {String(exportFlight.durationMin % 60).padStart(2, '0')}m</p></div>
            <div><p className="text-[11px] uppercase text-white/40">{t('route.arr')}</p><p className="mt-1 text-xl font-semibold">{now ? hhmm(exportFlight.depHour * 60 + exportFlight.depMin + exportFlight.durationMin) : '--:--'}{now && exportFlight.depHour * 60 + exportFlight.depMin + exportFlight.durationMin >= 1440 && <sup className="ml-1 text-xs text-white/40">+1</sup>}</p></div>
          </div>
          <a href={`https://www.flightaware.com/live/findflight?origin=${data.from.icao}&destination=${data.to.icao}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs text-[#55a7ff]">{t('route.verify')}</a>
        </div>
      </div>
      <LiveFlights airline={data.airline.icao || data.airline.iata} pair={[data.from.iata, data.to.iata]} />
      <p className="mt-3 text-xs text-white/35">{t('route.note')}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setFlyOpen(true)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white font-medium text-black hover:bg-white/90">
          <Plane className="size-4" />{t('route.fly')}
        </button>
        <button onClick={() => setBookOpen(true)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 font-medium hover:bg-white/5">
          <Check className="size-4" />{t('route.book')}
        </button>
        <ExportMenu flight={exportFlight} />
      </div>
    <FlyChoiceDialog open={flyOpen} onClose={() => setFlyOpen(false)} onPick={flyWith} />
    <BookDialog open={bookOpen} onClose={() => setBookOpen(false)} onSaveRoute={book} onPlan={saveSeed} planHref={`/flights/${params.airline}-${params.pair}/flight-plan?book=1`} />
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}
