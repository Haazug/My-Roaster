'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Play, Pause, SkipForward, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface FlightSession {
  id: string
  flightId: string
  startTime: number
  pausedTime?: number
  pausedMs: number
  state: 'ready' | 'running' | 'paused' | 'ended'
  elapsed: number
  plannedDurationMin: number
}

export default function FlyNowPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  
  const [session, setSession] = useState<FlightSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('Ready')
  const [showEndMenu, setShowEndMenu] = useState(false)

  const flightKey = id ? (id as string).toUpperCase() : ''
  
  // Sample flight data - em produção viria da API
  const SAMPLE_DATA: Record<string, any> = {
    'DT-653': {
      airline: 'TAAG Angola Airlines',
      airlineIata: 'DT',
      flightNumber: '653',
      from: 'Luanda (LAD)',
      to: 'Lisbon (LIS)',
      aircraft: 'Airbus A320',
      distance: '2,200 nm',
      durationMin: 360,
      depTime: '22:45',
    },
    'EK-287': {
      airline: 'Emirates',
      airlineIata: 'EK',
      flightNumber: '287',
      from: 'Dubai (DXB)',
      to: 'New York (JFK)',
      aircraft: 'Boeing 777-300ER',
      distance: '5,124 nm',
      durationMin: 765,
      depTime: '14:00',
    },
  }

  const flightData = SAMPLE_DATA[flightKey]

  useEffect(() => {
    // Initialize session
    if (!session && flightData) {
      const newSession: FlightSession = {
        id: `session-${Date.now()}`,
        flightId: flightKey,
        startTime: Date.now(),
        pausedMs: 0,
        state: 'ready',
        elapsed: 0,
        plannedDurationMin: flightData.durationMin,
      }
      setSession(newSession)
    }
  }, [flightData, flightKey, session])

  useEffect(() => {
    if (!session) return
    let interval: NodeJS.Timeout | null = null

    if (session.state === 'running') {
      interval = setInterval(() => {
        const now = Date.now()
        const newElapsed = now - session.startTime - session.pausedMs
        setElapsed(newElapsed)

        // Update phase based on elapsed time
        const elapsedMin = Math.floor(newElapsed / 1000 / 60)
        if (elapsedMin < 5) setCurrentPhase('Boarding')
        else if (elapsedMin < 10) setCurrentPhase('Pushback')
        else if (elapsedMin < 15) setCurrentPhase('Taxi out')
        else if (elapsedMin < 20) setCurrentPhase('Takeoff')
        else if (elapsedMin < 30) setCurrentPhase('Climb')
        else if (elapsedMin < session.plannedDurationMin - 30) setCurrentPhase('Cruise')
        else if (elapsedMin < session.plannedDurationMin - 12) setCurrentPhase('Descent')
        else if (elapsedMin < session.plannedDurationMin - 6) setCurrentPhase('Approach')
        else if (elapsedMin < session.plannedDurationMin) setCurrentPhase('Landing')
        else if (elapsedMin < session.plannedDurationMin + 5) setCurrentPhase('Taxi in')
        else setCurrentPhase('At gate')
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session])

  const handleStart = () => {
    if (!session) return
    setSession({ ...session, state: 'running', startTime: Date.now() })
    toast.success('Flight started. Prepare for departure!')
  }

  const handlePause = () => {
    if (!session) return
    setSession({ ...session, state: 'paused', pausedTime: Date.now() })
  }

  const handleResume = () => {
    if (!session) return
    const pauseDuration = (session.pausedTime || 0) > 0 ? Date.now() - session.pausedTime : 0
    setSession({ ...session, state: 'running', pausedMs: session.pausedMs + pauseDuration })
  }

  const handleNextPhase = () => {
    const nextPhases = ['Boarding', 'Pushback', 'Taxi out', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Taxi in', 'At gate']
    const currentIdx = nextPhases.indexOf(currentPhase)
    if (currentIdx >= 0 && currentIdx < nextPhases.length - 1) {
      setCurrentPhase(nextPhases[currentIdx + 1])
    }
  }

  const handleEnd = (outcome: 'completed' | 'diverted' | 'gave_up') => {
    if (!session) return
    setSession({ ...session, state: 'ended' })
    toast.success(`Flight ended: ${outcome}`)
    setTimeout(() => {
      router.push(`/logs`)
    }, 1500)
  }

  if (!flightData || !session) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-10 text-white/40">Loading flight...</div>
      </section>
    )
  }

  const elapsedMin = Math.floor(elapsed / 1000 / 60)
  const elapsedSec = Math.floor((elapsed / 1000) % 60)
  const remainingMin = Math.max(0, session.plannedDurationMin - elapsedMin)
  const progress = Math.min(100, (elapsedMin / session.plannedDurationMin) * 100)

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href={`/flights/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{flightData.airlineIata}{flightData.flightNumber}</h1>
            <p className="mt-2 text-sm text-white/45">{flightData.from} → {flightData.to}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#4caf50] uppercase">
              {session.state === 'running' ? '🟢 IN PROGRESS' : '⏸ PAUSED'}
            </p>
          </div>
        </div>
      </header>

      {/* Timer */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-[#111217cc] p-8 text-center">
        <div className="text-6xl font-bold tabular-nums">
          {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
        </div>
        <p className="mt-4 text-sm text-white/45">
          {session.plannedDurationMin - elapsedMin} min remaining • Planned: {session.plannedDurationMin} min
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-xs text-white/50">
          <span>{currentPhase}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#1f88ff] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Flight Info */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111217cc] p-4">
          <p className="text-xs text-white/50">Departure</p>
          <p className="mt-2 font-semibold">{flightData.depTime}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111217cc] p-4">
          <p className="text-xs text-white/50">Aircraft</p>
          <p className="mt-2 font-semibold text-sm">{flightData.aircraft}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111217cc] p-4">
          <p className="text-xs text-white/50">Distance</p>
          <p className="mt-2 font-semibold">{flightData.distance}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex gap-3">
        {session.state === 'ready' && (
          <button
            onClick={handleStart}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4caf50] font-semibold text-white transition hover:bg-[#4caf50]/90"
          >
            <Play className="size-5" /> Start Flight
          </button>
        )}
        {session.state === 'running' && (
          <button
            onClick={handlePause}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#facc15] font-semibold text-black transition hover:bg-[#facc15]/90"
          >
            <Pause className="size-5" /> Pause
          </button>
        )}
        {session.state === 'paused' && (
          <button
            onClick={handleResume}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4caf50] font-semibold text-white transition hover:bg-[#4caf50]/90"
          >
            <Play className="size-5" /> Resume
          </button>
        )}

        {session.state !== 'ready' && (
          <>
            <button
              onClick={handleNextPhase}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 font-semibold transition hover:bg-white/[.08]"
              title="Skip to next phase"
            >
              <SkipForward className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* End Flight Button */}
      <div className="mt-4 relative">
        <button
          onClick={() => setShowEndMenu(!showEndMenu)}
          className="w-full flex min-h-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 font-semibold text-red-300 transition hover:bg-red-400/20"
        >
          End Flight
        </button>

        {showEndMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowEndMenu(false)}
              aria-hidden="true"
            />
            <div className="absolute bottom-full mb-2 left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#111217] p-2 shadow-lg">
              <button
                onClick={() => handleEnd('completed')}
                className="w-full flex items-center gap-2 rounded-lg p-3 text-left hover:bg-white/[.08]"
              >
                <CheckCircle className="size-5 text-[#4caf50]" />
                <div>
                  <p className="font-semibold text-sm">Completed</p>
                  <p className="text-xs text-white/40">Successful landing</p>
                </div>
              </button>
              <button
                onClick={() => handleEnd('diverted')}
                className="w-full flex items-center gap-2 rounded-lg p-3 text-left hover:bg-white/[.08]"
              >
                <Clock className="size-5 text-[#facc15]" />
                <div>
                  <p className="font-semibold text-sm">Diverted</p>
                  <p className="text-xs text-white/40">Went to alternate airport</p>
                </div>
              </button>
              <button
                onClick={() => handleEnd('gave_up')}
                className="w-full flex items-center gap-2 rounded-lg p-3 text-left hover:bg-white/[.08]"
              >
                <ArrowLeft className="size-5 text-red-400" />
                <div>
                  <p className="font-semibold text-sm">Gave Up</p>
                  <p className="text-xs text-white/40">Quit the flight</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.02] p-4 text-center">
        <p className="text-xs text-white/50">
          💡 Tip: Keep this window open for the full experience. Notifications will alert you at key moments.
        </p>
      </div>
    </section>
  )
}
