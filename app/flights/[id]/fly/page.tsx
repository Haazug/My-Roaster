'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, FileUp, SkipForward, Star } from 'lucide-react'
import { toast } from 'sonner'
import { AirlineLogo } from '@/components/AirlineLogo'
import { taxiMinutes } from '@/lib/flight-time'
import { useMapStore } from '@/lib/map-store'
import { useT, useLang } from '@/lib/i18n'
import { CABIN } from '@/lib/extra-i18n'
import * as sound from '@/lib/sound'
import { useLocalStorage } from '@/lib/use-local-storage'
import { supabase } from '@/lib/supabase'

type Status = 'done' | 'skipped'

// "at" = fraction of the flight time after takeoff when the step is expected (null = no estimate)
const STEPS = [
  { key: 'Boarding', icon: '🚪', at: null },
  { key: 'Pushback', icon: '🔙', at: null },
  { key: 'Taxi out', icon: '🛫', at: null },
  { key: 'Takeoff', icon: '✈️', at: null },
  { key: 'Climb', icon: '📈', at: 0 },
  { key: 'Cruise', icon: '🧭', at: 0.1 },
  { key: 'Descent', icon: '📉', at: 0.8 },
  { key: 'Approach', icon: '🎯', at: 0.9 },
  { key: 'Landing', icon: '🛬', at: 1 },
  { key: 'Taxi in', icon: '🅿️', at: null },
  { key: 'At gate', icon: '🎉', at: null },
]

const kindFor = (k: string): sound.Kind => (['Takeoff', 'Approach', 'Cruise', 'Landing'].includes(k) ? 'dingdong' : 'ding')

type FlightInfo = {
  free?: boolean
  airlineName: string
  airlineIata: string
  airlineIcao: string
  flightNumber: string
  orig: string
  dest: string
  fromCity: string
  toCity: string
  aircraft: string
  durationMin: number
  distanceNm: number
  altitude?: number
  fromLat?: number
  fromLon?: number
  toLat?: number
  toLon?: number
  waypoints?: { id?: string; lat: number; lon: number }[]
}

const SAMPLES: Record<string, FlightInfo> = {
  'DT-653': { airlineName: 'TAAG Angola Airlines', airlineIata: 'DT', airlineIcao: 'DTA', flightNumber: '653', orig: 'NBJ', dest: 'LIS', fromCity: 'Luanda', toCity: 'Lisbon', aircraft: 'Airbus A320', durationMin: 360, distanceNm: 2200, fromLat: -9.0507, fromLon: 13.4991, toLat: 38.7742, toLon: -9.1342 },
  'EK-287': { airlineName: 'Emirates', airlineIata: 'EK', airlineIcao: 'UAE', flightNumber: '287', orig: 'DXB', dest: 'JFK', fromCity: 'Dubai', toCity: 'New York', aircraft: 'Boeing 777-300ER', durationMin: 765, distanceNm: 5124, fromLat: 25.2532, fromLon: 55.3657, toLat: 40.6398, toLon: -73.7787 },
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function FlyNowPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const flightKey = id ? String(id).toUpperCase() : ''
  const tr = useT()
  const setView = useMapStore((s) => s.setView)

  const [info, setInfo] = useState<FlightInfo | null>(SAMPLES[flightKey] || null)
  const [checked, setChecked] = useState(false)
  const [showChecklist,setShowChecklist] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [takeoffAt, setTakeoffAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [finished, setFinished] = useState(false)
  const [rating, setRating] = useState(0)
  const [logId, setLogId] = useState<string | null>(null)
  const [logs, setLogs] = useLocalStorage<any[]>('myroster.logs', [])
  const fired = useRef<Set<string>>(new Set())
  const saved = useRef(false)
  const stepLog = useRef<Record<string, { status: string; at: number }>>({})
  const startedAt = useRef(Date.now())
  const nextCabin = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)
  const holdSince = useRef<number | null>(null)
  const holdTotal = useRef(0)
  const holdCount = useRef(0)
  const goArounds = useRef(0)
  const [goAroundCount, setGoAroundCount] = useState(0)
  const [sessionId, setSessionId] = useState('')
  const [crew, setCrew] = useState<string[]>([])
  const uid = useRef('')
  const seen = useRef<Set<number>>(new Set())
  const applyRef = useRef<(key: string, status: Status, at?: number) => void>(() => {})
  const goAroundRef = useRef<(remote?: boolean) => void>(() => {})
  useEffect(() => {
    setSessionId(new URLSearchParams(window.location.search).get('session') || '')
  }, [])
  const lang = useLang((s) => s.lang)

  // Load the plan saved by the Flight Plan page (for flights that are not samples)
  useEffect(() => {
    {
      try {
        const raw = localStorage.getItem('myroster.activePlan')
        if (raw) {
          const p = JSON.parse(raw)
          if (String(p.id).toUpperCase() === flightKey) {
            setInfo({
              airlineName: p.airlineName || p.airlineIata || 'Flight',
              airlineIata: p.airlineIata || '',
              airlineIcao: p.airlineIcao || '',
              flightNumber: p.flightNumber || '',
              orig: p.from || '',
              dest: p.to || '',
              fromCity: p.fromCity || p.from || '',
              toCity: p.toCity || p.to || '',
              aircraft: p.aircraft || '',
              durationMin: p.durationMin || 60,
              distanceNm: p.distanceNm || 0, free: !!p.free, altitude: p.altitude,
              fromLat: p.fromLat, fromLon: p.fromLon, toLat: p.toLat, toLon: p.toLon,
              waypoints: Array.isArray(p.waypoints) ? p.waypoints : undefined,
            })
          }
        }
      } catch {}
    }
    setChecked(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightKey])

  // keep the globe fixed on this flight's route (through the waypoints when there is a .pln); cabin noise ends with the page
  useEffect(() => {
    if (!info) return
    let live = true
    const show = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
      if (!live) return
      setView({
        mode: 'route',
        from: { iata: info.orig, city: info.fromCity, lat: a.lat, lon: a.lon },
        to: { iata: info.dest, city: info.toCity, lat: b.lat, lon: b.lon },
        waypoints: info.waypoints,
        lock: true,
      })
    }
    if (info.fromLat != null && info.fromLon != null && info.toLat != null && info.toLon != null) {
      show({ lat: info.fromLat, lon: info.fromLon }, { lat: info.toLat, lon: info.toLon })
    } else {
      const find = (code: string) =>
        fetch(`/api/airport-search?q=${encodeURIComponent(code)}`)
          .then((r) => r.json())
          .then((l) => (Array.isArray(l) ? l.find((x: any) => x.iata === code || x.icao === code) || l[0] : null))
          .catch(() => null)
      Promise.all([find(info.orig), find(info.dest)]).then(([a, b]) => {
        if (a && b) show(a, b)
      })
    }
    return () => {
      live = false
    }
  }, [info, setView])

  useEffect(
    () => () => {
      setView({ mode: 'idle' })
      sound.setBed('music')
    },
    [setView]
  )

  const notify = (title: string, body: string, kind: sound.Kind = 'ding') => {
    sound.play(kind)
    toast(title, { description: body })
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`✈️ ${title}`, { body })
      }
    } catch {}
  }

  // Clock only runs after takeoff
  useEffect(() => {
    if (!takeoffAt || finished) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [takeoffAt, finished])

  const airborneMin = Math.max(5, (info?.durationMin || 0) - taxiMinutes(info?.aircraft || ''))
  const totalMs = airborneMin * 60_000
  const elapsed = takeoffAt ? Math.max(0, now - takeoffAt) : 0
  const current = STEPS.find((s) => !statuses[s.key])
  const currentIdx = current ? STEPS.indexOf(current) : STEPS.length

  // Reminders at the estimated times
  useEffect(() => {
    if (!takeoffAt || !totalMs || finished || holding) return
    STEPS.forEach((s) => {
      if (s.at === null || statuses[s.key] || fired.current.has(s.key)) return
      if (elapsed >= s.at * totalMs) {
        fired.current.add(s.key)
        notify(tr('fly.timeFor', { step: tr('step.' + s.key) }), tr('fly.tick'), kindFor(s.key))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, takeoffAt, statuses])

  // random cabin announcements during the cruise (ding + toast + notification)
  useEffect(() => {
    if (!takeoffAt || !totalMs || finished) return
    const frac = elapsed / totalMs
    if (frac < 0.12 || frac > 0.78) return
    const mins = elapsed / 60000
    const gap = () => {
      const lo = Math.min(10, Math.max(2, airborneMin / 8))
      const hi = Math.min(22, Math.max(4, airborneMin / 4))
      return lo + Math.random() * (hi - lo)
    }
    if (nextCabin.current === null) nextCabin.current = mins + gap()
    if (mins >= nextCabin.current) {
      nextCabin.current = mins + gap()
      const pack = CABIN[lang] || CABIN.en
      notify(pack.title, pack.lines[Math.floor(Math.random() * pack.lines.length)], Math.random() < 0.5 ? 'ding' : 'dingdong')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, takeoffAt, finished])

  // When every step is handled, save the flight to history
  useEffect(() => {
    if (!info || saved.current) return
    if (!STEPS.every((s) => statuses[s.key])) return
    saved.current = true
    const entryId = `${flightKey}-${Date.now()}`
    const entry = {
      id: entryId,
      airlineIata: info.airlineIata,
      airlineName: info.airlineName,
      orig: info.orig,
      dest: info.dest,
      flightNumber: info.flightNumber || flightKey,
      aircraft: info.aircraft,
      departure: new Date(takeoffAt || Date.now()).toISOString(),
      distanceNm: info.distanceNm,
      fromCity: info.fromCity,
      toCity: info.toCity,
      rating: 0, free: !!info.free,
      summary: {
        startedAt: startedAt.current,
        takeoffAt: takeoffAt || null,
        landingAt: stepLog.current['Landing']?.at || null,
        endedAt: Date.now(),
        plannedMin: info.durationMin,
        airborneMin,
        altitude: info.altitude || null,
        steps: stepLog.current,
        goArounds: goArounds.current,
        holdings: holdCount.current,
        holdingMin: Math.round((holdTotal.current + (holdSince.current !== null ? Date.now() - holdSince.current : 0)) / 60000),
      },
    }
    setLogs([entry, ...logs])
    setLogId(entryId)
    setFinished(true)
    sound.setBed('music')
    toast.success(tr('fly.savedToast'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses])

  const askPermission = async () => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch {}
  }

  // shared flight: tell the other pilots what happened
  const send = (kind: string, step: string, status: string) => {
    if (!sessionId || !uid.current) return
    supabase
      .from('flight_session_events')
      .insert({ session_id: sessionId, user_id: uid.current, kind, step, status })
      .then(({ error }) => { if (error) console.error('send failed', error) })
  }

  const endHolding = () => {
    if (holdSince.current !== null) {
      holdTotal.current += Date.now() - holdSince.current
      holdSince.current = null
    }
    setHolding(false)
  }

  const toggleHolding = () => {
    sound.unlock()
    sound.play('ding')
    if (holdSince.current !== null) {
      endHolding()
      toast(tr('fly.holdingEnded'), { description: tr('fly.resumed') })
    } else {
      holdSince.current = Date.now()
      holdCount.current += 1
      setHolding(true)
      toast(tr('fly.holding'), { description: tr('fly.clockContinues') })
    }
  }

  const goAround = (remote = false) => {
    sound.unlock()
    sound.play('dingdong')
    const from = STEPS.findIndex((x) => x.key === 'Descent')
    const redo = STEPS.slice(from)
    redo.forEach((x) => { delete stepLog.current[x.key] })
    setStatuses((prev) => {
      const next = { ...prev }
      redo.forEach((x) => { delete next[x.key] })
      return next
    })
    goArounds.current += 1
    setGoAroundCount(goArounds.current)
    toast(tr('fly.goAround'), { description: tr('fly.backDescent') })
    if (!remote) send('goaround', '', '')
  }

  const mark = (key: string, status: Status, remote = false, at?: number) => {
    sound.unlock()
    if (holdSince.current !== null) endHolding()
    askPermission()
    if (at === undefined) sound.play(kindFor(key))
    stepLog.current[key] = { status, at: at ?? Date.now() }
    setStatuses((prev) => ({ ...prev, [key]: status }))
    if (key === 'Takeoff') {
      const t0 = at ?? Date.now()
      setTakeoffAt(t0)
      setNow(t0)
      sound.setBed('cabin') // background music out, cabin noise in
      toast.success(tr('fly.takeoffToast'))
    }
    if (key === 'Landing') sound.setBed('music') // flight over: music is back
    if (!remote) send('step', key, status)
  }

  const skipToTakeoff = () => {
    sound.play('ding')
    setStatuses((prev) => {
      const next = { ...prev }
      STEPS.slice(0, 3).forEach((s) => {
        if (!next[s.key]) { next[s.key] = 'skipped'; stepLog.current[s.key] = { status: 'skipped', at: Date.now() } }
      })
      return next
    })
  }

  // apply what another pilot did (earlier steps that are still open are marked as skipped)
  const applyRemote = (key: string, status: Status, at?: number) => {
    const idx = STEPS.findIndex((x) => x.key === key)
    if (idx < 0) return
    if (stepLog.current[key]?.status === status) return
    STEPS.slice(0, idx).forEach((x) => {
      if (!stepLog.current[x.key]) stepLog.current[x.key] = { status: 'skipped', at: at ?? Date.now() }
    })
    setStatuses((prev) => {
      const next = { ...prev }
      STEPS.slice(0, idx).forEach((x) => { if (!next[x.key]) next[x.key] = 'skipped' })
      return next
    })
    mark(key, status, true, at)
  }
  applyRef.current = applyRemote
  goAroundRef.current = goAround

  // shared flight: listen to the others, and replay what already happened (late join / reload)
  useEffect(() => {
    if (!sessionId) return
    let live = true
    let channel: any

    const loadCrew = async () => {
      const { data } = await supabase.from('flight_session_members').select('name').eq('session_id', sessionId).order('joined_at')
      if (live && data) setCrew(data.map((m: any) => m.name))
    }

    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      const me = s.session?.user.id
      if (!me || !live) return
      uid.current = me

      const apply = (e: any, replay: boolean) => {
        if (seen.current.has(e.id)) return
        seen.current.add(e.id)
        const at = replay ? Date.parse(e.created_at) : undefined
        if (e.kind === 'step') applyRef.current(e.step, e.status, at)
        else if (e.kind === 'goaround') goAroundRef.current(true)
      }

      channel = supabase
        .channel('flight-' + sessionId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flight_session_events', filter: `session_id=eq.${sessionId}` }, (p: any) => {
          if (p.new?.user_id !== me) apply(p.new, false)
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flight_session_members', filter: `session_id=eq.${sessionId}` }, (p: any) => {
          toast(tr('fly.joined',{name:p.new?.name || 'Pilot'}))
          loadCrew()
        })
        .subscribe()

      await loadCrew()
      const { data: old } = await supabase.from('flight_session_events').select('*').eq('session_id', sessionId).order('id')
      if (!live) return
      ;(old || []).forEach((e: any) => apply(e, true))
    })()

    return () => {
      live = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [sessionId])

  const rate = (n: number) => {
    const v = n === rating ? 0 : n
    setRating(v)
    setLogs(logs.map((l) => (l.id === logId ? { ...l, rating: v } : l)))
  }

  if (!checked) {
    return <section className="min-h-screen p-5 sm:p-8 text-white/40">{tr('fly.loading')}</section>
  }

  if (!info) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href={`/flights/${id}/flight-plan`} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> {tr('back')}
        </Link>
        <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-5 text-white/60">
          {tr('fly.noPlan', { id: String(id) })}
        </div>
      </section>
    )
  }

  const airborneProgress = totalMs ? Math.min(100, (elapsed / totalMs) * 100) : 0
  const remainingMs = Math.max(0, totalMs - elapsed)
  const holdMs = holdTotal.current + (holdSince.current !== null ? Math.max(0, now - holdSince.current) : 0)

  return (
    <section
      className="min-h-screen p-5 pb-32 sm:p-8"
      onClickCapture={() => sound.unlock()}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/flights/${id}/flight-plan`} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> {tr('back')}
        </Link>
        <Link
          href={`/flights/${id}/simbrief`}
          className="flex min-h-11 items-center gap-2 text-xs text-white/45 transition hover:text-white"
        >
          <FileUp className="size-4" /> {tr('fly.importPlan')}
        </Link>
      </div>

      <header className="border-b border-white/10 pb-6">
        <AirlineLogo iata={info.airlineIata} icao={info.airlineIcao} name={info.airlineName} size="md" />
        <h1 className="mt-4 text-3xl font-semibold">
          {info.flightNumber ? `${info.airlineIata}${info.flightNumber}` : flightKey}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {info.orig} → {info.dest} · {info.aircraft} · {info.durationMin} {tr('fly.min')}
        </p>
      </header>

      {sessionId && crew.length > 0 && (
        <p className="mt-4 rounded-xl border border-[#55a7ff]/30 bg-[#1f88ff]/10 px-4 py-3 text-sm text-[#55a7ff]">
          {tr('fly.group')} · {crew.join(', ')}
        </p>
      )}

      {finished ? (
        <div className="mt-8 rounded-2xl border border-[#55a7ff]/30 bg-[#1f88ff]/10 p-6 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-2xl font-semibold">{tr('fly.addedTitle')}</h2>
          <p className="mt-2 text-sm text-white/60">
            {info.orig} → {info.dest}
          </p>
          <p className="mt-6 text-sm text-white/60">{tr('fly.rate')}</p>
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => rate(n)} aria-label={tr('fly.stars', { n })} className="p-1">
                <Star className={`size-9 ${n <= rating ? 'fill-white text-white' : 'text-white/30'}`} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/40">{tr('fly.rateHint', { n: rating })}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={logId ? '/logs/' + encodeURIComponent(logId) : '/logs'} className="rounded-xl bg-[#1f88ff] px-6 py-3 text-sm font-semibold">
              {tr('fly.viewLogs')}
            </Link>
            <Link href="/" className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium">
              {tr('fly.home')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-10 border-b border-white/10 pb-8 text-center">
            {takeoffAt ? (
              <>
                <div className="text-6xl font-light tabular-nums tracking-tight sm:text-7xl text-white">{fmt(elapsed)}</div>
                <p className="mt-4 text-sm text-white/45">
                  {tr('fly.remaining', { n: Math.ceil(remainingMs / 60_000), b: info.durationMin })}
                </p>
                {(holding || holdTotal.current > 0) && (
                  <p className="mt-3 text-sm font-medium text-white">{tr('fly.holding')}: {fmt(holdMs)}</p>
                )}
                {holding && elapsed >= totalMs && (
                  <p className="mt-1 text-xs text-white/70">{tr('fly.autopilot')}</p>
                )}
                <div className="mt-6 h-[3px] overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-white transition-all" style={{ width: `${airborneProgress}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-white/30">--:--</div>
                <p className="mt-4 text-sm text-white/45">{tr('fly.clockStarts')}</p>
              </>
            )}
          </div>

          {currentIdx < 3 && (
            <button
              onClick={skipToTakeoff}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              <SkipForward className="size-4" /> {tr('fly.skipToTakeoff')}
            </button>
          )}

          <button type="button" aria-expanded={showChecklist} onClick={()=>setShowChecklist(!showChecklist)} className="mt-5 flex min-h-11 w-full items-center justify-between text-xs text-white/45">{tr('fly.checklist')}<span>{showChecklist?'−':'+'}</span></button>
          <ul className="divide-y divide-white/[.06]">
            {STEPS.map((s) => {
              if(!showChecklist && current?.key !== s.key) return null
              const st = statuses[s.key]
              const isCurrent = current?.key === s.key
              const eta = s.at !== null ? Math.round(s.at * airborneMin) : null
              const due = isCurrent && takeoffAt && s.at !== null && elapsed >= s.at * totalMs
              return (
                <li
                  key={s.key}
                  className={`py-4 ${isCurrent ? 'text-white' : 'text-white/40'} ${due ? 'border-l border-white/40 pl-3' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center">
                      {st === 'done' ? (
                        <Check className="size-5 text-[#55a7ff]" />
                      ) : st === 'skipped' ? (
                        <SkipForward className="size-4 text-white/30" />
                      ) : (
                        <span className="size-5 rounded-full border border-white/25" />
                      )}
                    </span>
                    <span className={`flex-1 text-sm ${st ? 'text-white/45' : 'text-white'} ${st === 'skipped' ? 'line-through' : ''}`}>
                      {tr('step.' + s.key)}
                      {s.key === 'Takeoff' && !st && <span className="ml-2 text-xs text-white/40">{tr('fly.startsClock')}</span>}
                    </span>
                    {eta !== null && <span className="text-xs text-white/40">+{eta} {tr('fly.min')}</span>}
                  </div>
                  {isCurrent && s.key === 'Cruise' && takeoffAt && (
                    <button
                      onClick={toggleHolding}
                      className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm font-medium ${holding ? 'border-white/60 bg-white/15 text-white' : 'border-white/15 bg-white/10'}`}
                    >
                      {tr(holding ? 'fly.exitHolding' : 'fly.holding')}
                    </button>
                  )}
                  {isCurrent && (s.key === 'Approach' || s.key === 'Landing') && (
                    <button onClick={() => goAround()} className="mt-3 w-full rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-medium text-white">
                      {tr('fly.goAround')}{goAroundCount > 0 ? ` (${goAroundCount})` : ''}
                    </button>
                  )}
                  {isCurrent && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => mark(s.key, 'done')} className="flex-1 min-h-11 rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                        {s.key === 'Takeoff' ? tr('fly.takeoffBtn') : tr('fly.done')}
                      </button>
                      {s.key !== 'Takeoff' && (
                        <button onClick={() => mark(s.key, 'skipped')} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70">
                          {tr('fly.skip')}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <button onClick={() => router.push('/')} className="mt-6 min-h-11 text-xs text-white/35 hover:text-red-300">
            {tr('fly.cancel')}
          </button>
        </>
      )}
    </section>
  )
}