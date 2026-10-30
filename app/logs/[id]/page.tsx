'use client'

import {displayFlightNumber} from '@/lib/live-model'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, SkipForward, Star } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'
import { AirlineLogo } from '@/components/AirlineLogo'
import { useLang, useT } from '@/lib/i18n'
import { SUM } from '@/lib/extra-i18n'

const ORDER = ['Boarding', 'Pushback', 'Taxi out', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Taxi in', 'At gate']
const hm = (t?: number | null) => (t ? new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—')
const dur = (ms?: number | null) => {
  if (ms == null || ms < 0) return '—'
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

export default function LogSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const [logs, setLogs, hydrated] = useLocalStorage<any[]>('myroster.logs', [])
  const lang = useLang((s) => s.lang)
  const t = SUM[lang] || SUM.en
  const tr = useT()
  const key = (() => { try { return decodeURIComponent(String(id)) } catch { return String(id) } })()
  const f = logs.find((l) => l.id === key)

  const back = (
    <Link href="/trips#history" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
      <ArrowLeft className="size-4" /> {t.back}
    </Link>
  )

  if (!hydrated) return <section className="min-h-screen p-5 text-white/40 sm:p-8">{t.loading}</section>
  if (!f) return <section className="min-h-screen p-5 sm:p-8">{back}<p className="mt-8 text-white/50">{t.notFound}</p></section>

  const s = f.summary
  const airborne = s?.takeoffAt && s?.landingAt ? s.landingAt - s.takeoffAt : null
  const plannedAir = s?.airborneMin ? s.airborneMin * 60000 : null
  const diffMin = airborne != null && plannedAir != null ? Math.round((airborne - plannedAir) / 60000) : null
  const rate = (n: number) => {
    const v = n === f.rating ? 0 : n
    setLogs(logs.map((l) => (l.id === f.id ? { ...l, rating: v } : l)))
  }
  const row = (label: string, value: React.ReactNode) => (
    <div className="rounded-xl bg-white/[.04] p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-mono text-sm font-semibold">{value}</p></div>
  )

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      {back}
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">{t.title}</p>
      <div className="mt-3"><AirlineLogo iata={f.airlineIata} name={f.airlineName} size="md" /></div>
      <h1 className="mt-4 text-3xl font-semibold">
        {displayFlightNumber(f.flightNumber,f.airlineIata)||f.callsign||tr('route.numberUnknown')} · {f.orig} → {f.dest}
        {f.free && <span className="ml-3 rounded bg-[#1f88ff]/20 px-2 py-0.5 align-middle text-xs font-normal text-[#55a7ff]">{t.free}</span>}
      </h1>
      <p className="mt-1 text-sm text-white/50">{f.fromCity} → {f.toCity} · {new Date(f.departure).toLocaleDateString()}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {row(t.distance, `${Math.round(f.distanceNm * 1.852).toLocaleString('en-US')} km · ${f.distanceNm} nm`)}
        {row(t.aircraft, f.aircraft || '—')}
        {s && row(t.started, hm(s.startedAt))}
        {s && row(t.takeoff, hm(s.takeoffAt))}
        {s && row(t.landing, hm(s.landingAt))}
        {s && row(t.finished, hm(s.endedAt))}
        {s && row(t.planned, `${s.plannedMin} min`)}
        {s && row(t.airborne, `${dur(airborne)}${diffMin != null ? ` (${diffMin >= 0 ? '+' : ''}${diffMin} min ${t.diff})` : ''}`)}
        {s && row(t.total, dur(s.endedAt - s.startedAt))}
        {s?.altitude ? row(t.level, `FL${Math.round(s.altitude / 100)}`) : null}
        {s && row(tr('summary.taxiOut'),dur((s.takeoffAt||0)-(s.steps?.['Taxi out']?.at||s.takeoffAt||0)))}
        {s && row(tr('summary.taxiIn'),dur((s.steps?.['At gate']?.at||0)-(s.steps?.['Taxi in']?.at||s.steps?.['At gate']?.at||0)))}
        {s && row(tr('summary.holdings'),`${s.holdings||0} · ${s.holdingMin||0} min`)}
        {s && row(tr('summary.goArounds'),s.goArounds||0)}
        {airborne && airborne>60000 ? row(tr('summary.average'),`${Math.round(f.distanceNm/(airborne/3600000))} kt`) : null}
      </div>

      {!s && <p className="mt-4 text-sm text-white/40">{t.noDetails}</p>}

      <p className="mt-8 text-sm text-white/60">{t.rating}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => rate(n)} aria-label={`${n}`} className="p-1">
            <Star className={`size-8 ${n <= (f.rating || 0) ? 'fill-white text-white' : 'text-white/30'}`} />
          </button>
        ))}
      </div>

      {s?.steps && (
        <>
          <h2 className="mt-8 text-lg font-semibold">{t.checklist}</h2>
          <ul className="mt-3 space-y-2">
            {ORDER.map((k) => {
              const st = s.steps[k]
              return (
                <li key={k} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-3 text-sm">
                  {st?.status === 'done' ? <Check className="size-5 text-[#55a7ff]" /> : <SkipForward className="size-4 text-white/30" />}
                  <span className={`flex-1 ${st?.status === 'done' ? '' : 'text-white/40 line-through'}`}>{tr('step.' + k)}</span>
                  <span className="font-mono text-xs text-white/50">{st?.status === 'done' ? hm(st.at) : t.skipped}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
