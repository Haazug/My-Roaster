'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Plane, Upload } from 'lucide-react'
import { parsePLNFile, createManualFlightPlan, type ParsedFlightPlan } from '@/lib/flight-plan-parser'
import { matchAircraft } from '@/lib/aircraft-db'

const same = (a?: string, b?: string) => !!a && !!b && a.trim().toUpperCase() === b.trim().toUpperCase()

export default function FlightPlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [seed, setSeed] = useState<any>(null)
  const [plan, setPlan] = useState<ParsedFlightPlan | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ departure: '', arrival: '', aircraft: 'A320', altitude: 35000, duration: 60 })

  // Pre-fill when we arrive from a route page
  useEffect(() => {
    try {
      const raw = localStorage.getItem('myroster.routeSeed')
      if (!raw) return
      const s = JSON.parse(raw)
      if (String(s.id).toUpperCase() !== String(id).toUpperCase()) return
      setSeed(s)
      setForm((f) => ({
        ...f,
        departure: s.fromIcao || s.orig || '',
        arrival: s.toIcao || s.dest || '',
        aircraft: s.aircraft || f.aircraft,
        duration: s.durationMin || f.duration,
      }))
    } catch {}
  }, [id])

  const acResult = matchAircraft(form.aircraft)

  // Save the plan and go straight to the checklist/clock page
  const launch = (p: ParsedFlightPlan) => {
    const fromSame = !!seed && (same(p.departure, seed.fromIcao) || same(p.departure, seed.orig))
    const toSame = !!seed && (same(p.arrival, seed.toIcao) || same(p.arrival, seed.dest))
    const unchanged = fromSame && toSame
    try {
      localStorage.setItem(
        'myroster.activePlan',
        JSON.stringify({
          id,
          airlineIata: seed?.airlineIata || String(id).split('-')[0].toUpperCase(),
          airlineName: seed?.airlineName,
          airlineIcao: seed?.airlineIcao,
          from: fromSame ? seed.orig : p.departure,
          to: toSame ? seed.dest : p.arrival,
          fromCity: fromSame ? seed.fromCity : p.departure,
          toCity: toSame ? seed.toCity : p.arrival,
          aircraft: p.aircraft,
          altitude: p.cruiseAltitude,
          distanceNm: unchanged ? seed.distanceNm : p.distance,
          durationMin: p.estimatedTime || form.duration || 60,
        })
      )
    } catch {}
    router.push(`/flights/${id}/fly`)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setError('')
      const parsed = parsePLNFile(await file.text())
      const ac = matchAircraft(form.aircraft)
      launch({ ...parsed, aircraft: ac.status === 'exact' && ac.match ? ac.match.name : seed?.aircraft || '' })
    } catch {
      setError('Could not read this .pln file')
    }
  }

  const handleManual = () => {
    if (!form.departure.trim() || !form.arrival.trim()) return setError('Enter origin and destination')
    if (acResult.status === 'none') return setError(`"${form.aircraft}" is not a known aircraft type.`)
    if (acResult.status !== 'exact' || !acResult.match) return setError('Please confirm the aircraft type above.')
    setError('')
    setPlan(
      createManualFlightPlan({ ...form, aircraft: acResult.match.name, passengers: 0, blockTime: '', rules: 'IFR' })
    )
  }

  const input =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#1f88ff]'

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <button onClick={() => router.back()} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="mt-4 text-2xl font-semibold">Flight Plan</h1>
      <p className="mt-1 text-sm text-white/50">Flight {id}</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="mb-1 text-sm font-medium text-white/70">Upload .pln file</h2>
        <p className="mb-3 text-xs text-white/40">MSFS or SimBrief. You go straight to the flight clock.</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f88ff] px-4 py-2 text-sm font-medium">
          <Upload className="size-4" /> Choose file
          <input type="file" accept=".pln,.xml" onChange={handleFile} className="hidden" />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="mb-3 text-sm font-medium text-white/70">Or enter manually</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className={input} placeholder="Origin (IATA or ICAO)" value={form.departure} onChange={(e) => { setPlan(null); setForm({ ...form, departure: e.target.value }) }} />
          <input className={input} placeholder="Destination (IATA or ICAO)" value={form.arrival} onChange={(e) => { setPlan(null); setForm({ ...form, arrival: e.target.value }) }} />
          <div className="col-span-2">
            <input className={input} placeholder="Aircraft (e.g. Airbus A380)" value={form.aircraft} onChange={(e) => { setPlan(null); setForm({ ...form, aircraft: e.target.value }) }} />
            {acResult.status === 'exact' && acResult.match && (
              <p className="mt-1 text-xs text-[#4caf50]">✓ {acResult.match.name} · {acResult.match.icao}</p>
            )}
            {acResult.status === 'fuzzy' && acResult.match && (
              <button type="button" onClick={() => setForm({ ...form, aircraft: acResult.match!.name })} className="mt-1 text-xs text-[#55a7ff]">
                Did you mean {acResult.match.name}?
              </button>
            )}
            {acResult.status === 'family' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {acResult.matches.map((m) => (
                  <button key={m.icao + m.name} type="button" onClick={() => setForm({ ...form, aircraft: m.name })} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs">
                    {m.name}
                  </button>
                ))}
              </div>
            )}
            {acResult.status === 'none' && form.aircraft.trim() && (
              <p className="mt-1 text-xs text-red-300">"{form.aircraft}" is not a known aircraft type.</p>
            )}
          </div>
          <input className={input} type="number" placeholder="Altitude (ft)" value={form.altitude} onChange={(e) => setForm({ ...form, altitude: Number(e.target.value) })} />
          <input className={input} type="number" placeholder="Duration (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
        </div>
        <button onClick={handleManual} className="mt-3 rounded-xl bg-[#1f88ff] px-4 py-2 text-sm font-medium">
          Create plan
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {plan && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">
            {plan.departure} → {plan.arrival}
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-white/40">Aircraft</dt><dd>{plan.aircraft}</dd></div>
            <div><dt className="text-white/40">Altitude</dt><dd>{plan.cruiseAltitude} ft</dd></div>
            <div><dt className="text-white/40">Duration</dt><dd>{form.duration} min</dd></div>
          </dl>
          <button
            onClick={() => launch({ ...plan, estimatedTime: form.duration })}
            disabled={!form.duration}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4caf50] px-4 py-3 text-sm font-semibold disabled:opacity-40"
          >
            <Plane className="size-4" /> Initiate flight
          </button>
        </div>
      )}
    </section>
  )
}