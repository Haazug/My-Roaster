'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parsePLNFile } from '@/lib/flight-plan-parser'
import { matchAircraft } from '@/lib/aircraft-db'
import { estimateBlockMinutes, parseSpeed } from '@/lib/flight-time'
import { BoardingPass } from '@/components/BoardingPass'

type Geo = { fromIata: string; toIata: string; fromCity: string; toCity: string; distanceNm: number }

const hhmm = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#1f88ff]'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs text-white/50 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function FlightPlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [seed, setSeed] = useState<any>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ flight: '', dep: '', arr: '', aircraft: 'A320', time: '12:00', fl: 350, speed: '', duration: 60 })
  const set = (k: string, v: any) => { setReady(false); setForm((f) => ({ ...f, [k]: v })) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthed(true)
      else router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    })
  }, [pathname, router])

  // pre-fill when coming from a route page
  useEffect(() => {
    try {
      const raw = localStorage.getItem('myroster.routeSeed')
      if (!raw) return
      const s = JSON.parse(raw)
      if (String(s.id).toUpperCase() !== String(id).toUpperCase()) return
      setSeed(s)
      setForm((f) => ({
        ...f,
        flight: s.airlineIata || '',
        dep: s.orig || '',
        arr: s.dest || '',
        aircraft: s.aircraft || f.aircraft,
        duration: s.durationMin || f.duration,
      }))
    } catch {}
  }, [id])

  // distance and cities for whatever airports are in the form (IATA codes)
  useEffect(() => {
    const a = form.dep.trim().toUpperCase()
    const b = form.arr.trim().toUpperCase()
    if (seed && a === String(seed.orig).toUpperCase() && b === String(seed.dest).toUpperCase()) {
      setGeo({ fromIata: seed.orig, toIata: seed.dest, fromCity: seed.fromCity, toCity: seed.toCity, distanceNm: seed.distanceNm })
      return
    }
    if (!/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b) || a === b) { setGeo(null); return }
    const air = seed?.airlineIata || String(id).split('-')[0]
    const t = setTimeout(() => {
      fetch(`/api/route/${air}/${a}-${b}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error && d.distanceNm) setGeo({ fromIata: d.from.iata, toIata: d.to.iata, fromCity: d.from.city, toCity: d.to.city, distanceNm: d.distanceNm })
          else setGeo(null)
        })
        .catch(() => setGeo(null))
    }, 500)
    return () => clearTimeout(t)
  }, [form.dep, form.arr, seed, id])

  const ac = matchAircraft(form.aircraft)
  const acName = ac.status === 'exact' && ac.match ? ac.match.name : ''

  // recalculate gate-to-gate time when distance, aircraft or speed change
  useEffect(() => {
    if (geo?.distanceNm && acName) {
      const speedKt = parseSpeed(form.speed) || undefined
      setForm((f) => ({ ...f, duration: estimateBlockMinutes(geo.distanceNm, acName, { speedKt }) }))
    }
  }, [geo, acName, form.speed])

  const launch = (o: { from: string; to: string; fromCity: string; toCity: string; aircraft: string; fl: number; distanceNm: number; durationMin: number }) => {
    try {
      localStorage.setItem(
        'myroster.activePlan',
        JSON.stringify({
          ...(seed || {}),
          id,
          airlineIata: seed?.airlineIata || String(id).split('-')[0].toUpperCase(),
          flightNumber: form.flight.replace(/^[A-Za-z]+/, ''),
          from: o.from, to: o.to, fromCity: o.fromCity, toCity: o.toCity,
          aircraft: o.aircraft, altitude: o.fl * 100, distanceNm: o.distanceNm, durationMin: o.durationMin,
        })
      )
    } catch {}
    router.push(`/flights/${id}/fly`)
  }

  const createPlan = () => {
    if (!form.dep.trim() || !form.arr.trim()) return setError('Enter origin and destination')
    if (ac.status === 'none') return setError(`"${form.aircraft}" is not a known aircraft type.`)
    if (!acName) return setError('Please confirm the aircraft type above.')
    if (!form.duration) return setError('Enter the block time')
    setError('')
    setReady(true)
  }

  const dep = form.dep.trim().toUpperCase()
  const arr = form.arr.trim().toUpperCase()
  const manualLaunch = () =>
    launch({
      from: geo?.fromIata || dep, to: geo?.toIata || arr,
      fromCity: geo?.fromCity || dep, toCity: geo?.toCity || arr,
      aircraft: acName, fl: form.fl, distanceNm: geo?.distanceNm || 0, durationMin: form.duration,
    })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setError('')
      const p = parsePLNFile(await file.text())
      launch({
        from: p.departure, to: p.arrival, fromCity: p.departure, toCity: p.arrival,
        aircraft: acName, fl: Math.round(p.cruiseAltitude / 100), distanceNm: p.distance,
        durationMin: p.distance ? estimateBlockMinutes(p.distance, acName, { routed: true, speedKt: parseSpeed(form.speed) || undefined }) : form.duration,
      })
    } catch {
      setError('Could not read this .pln file')
    }
  }

  if (!authed) return <section className="min-h-screen p-5 text-white/40 sm:p-8">Checking your account...</section>

  const [h, mi] = form.time.split(':').map(Number)
  const depMin = (h || 0) * 60 + (mi || 0)

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <button onClick={() => router.back()} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </button>
      <h1 className="mt-4 text-2xl font-semibold">Flight Plan</h1>
      <p className="mt-1 text-sm text-white/50">Flight {id}</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="text-sm font-medium text-white/70">Upload .pln file</h2>
        <p className="mb-3 mt-1 text-xs text-white/40">MSFS or SimBrief. Set the aircraft below first. You go straight to the flight clock.</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f88ff] px-4 py-2 text-sm font-medium">
          <Upload className="size-4" /> Choose file
          <input type="file" accept=".pln,.xml" onChange={handleFile} className="hidden" />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="mb-3 text-sm font-medium text-white/70">Or enter manually</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Flight number"><input className={inputCls} placeholder="e.g. DT653" value={form.flight} onChange={(e) => set('flight', e.target.value)} /></Field>
          <Field label="Departure time"><input className={inputCls} type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
          <Field label="Origin (IATA, e.g. AMS)"><input className={inputCls} value={form.dep} onChange={(e) => set('dep', e.target.value)} /></Field>
          <Field label="Destination (IATA, e.g. LIS)"><input className={inputCls} value={form.arr} onChange={(e) => set('arr', e.target.value)} /></Field>
          <Field label="Aircraft" className="col-span-2">
            <input className={inputCls} placeholder="e.g. Airbus A380" value={form.aircraft} onChange={(e) => set('aircraft', e.target.value)} />
            {ac.status === 'exact' && ac.match && <p className="mt-1 text-xs text-[#4caf50]">✓ {ac.match.name} · {ac.match.icao}</p>}
            {ac.status === 'fuzzy' && ac.match && (
              <button type="button" onClick={() => set('aircraft', ac.match!.name)} className="mt-1 text-xs text-[#55a7ff]">Did you mean {ac.match.name}?</button>
            )}
            {ac.status === 'family' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {ac.matches.map((m) => (
                  <button key={m.icao + m.name} type="button" onClick={() => set('aircraft', m.name)} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs">{m.name}</button>
                ))}
              </div>
            )}
            {ac.status === 'none' && form.aircraft.trim() && <p className="mt-1 text-xs text-red-300">"{form.aircraft}" is not a known aircraft type.</p>}
          </Field>
          <Field label="Cruise level (FL)"><input className={inputCls} type="number" value={form.fl} onChange={(e) => set('fl', Number(e.target.value))} /></Field>
          <Field label="Cruise speed (Mach or kt, optional)"><input className={inputCls} placeholder="M.82 or 450" value={form.speed} onChange={(e) => set('speed', e.target.value)} /></Field>
        </div>

        <div className="mt-4 grid grid-cols-4 rounded-2xl bg-white/[.04] p-3 text-center text-xs">
          <div><p className="text-white/40">Distance</p><p className="mt-1 text-sm font-semibold">{geo ? `${geo.distanceNm.toLocaleString('en-US')} nm` : '—'}</p></div>
          <div><p className="text-white/40">Departure</p><p className="mt-1 text-sm font-semibold">{form.time}</p></div>
          <div>
            <p className="text-white/40">Block time</p>
            <input className="mt-1 w-14 rounded bg-transparent text-center text-sm font-semibold outline-none" type="number" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))} />
          </div>
          <div><p className="text-white/40">Arrival</p><p className="mt-1 text-sm font-semibold">{hhmm(depMin + form.duration)}</p></div>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {geo ? 'Block time is calculated from distance, aircraft speed and route.' : 'Use 3-letter IATA codes to get distance and city names automatically. Otherwise type the block time (min).'}
        </p>
        <button onClick={createPlan} className="mt-3 rounded-xl bg-[#1f88ff] px-4 py-2 text-sm font-medium">Create plan</button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {ready && (
        <div className="mt-6">
          <BoardingPass
            tear
            data={{
              from: geo?.fromIata || dep, to: geo?.toIata || arr, fromCity: geo?.fromCity, toCity: geo?.toCity,
              airline: seed?.airlineName, flight: form.flight || String(id).toUpperCase(), aircraft: acName,
              distanceNm: geo?.distanceNm, date: new Date().toISOString().slice(0, 10),
            }}
            onBoard={manualLaunch}
          />
        </div>
      )}
    </section>
  )
}