// Flight Session Recording and Management
// Saves flight sessions to localStorage for persistence across page refreshes

export type FlightOutcome = 'completed' | 'diverted' | 'gave_up'
export type LandingQuality = 'butter' | 'smooth' | 'firm' | 'hard' | 'very_hard'

export interface FlightSession {
  id: string
  flightId: string
  airlineId: string
  from: string
  to: string
  flightNumber: string
  aircraft: string
  
  // Timing
  startedAt: number
  pausedAt?: number
  pausedMs: number
  endedAt?: number
  
  // Flight data
  plannedDurationMin: number
  distanceNm: number
  
  // Session state
  state: 'ready' | 'running' | 'paused' | 'ended'
  firedPhases: string[]
  
  // Results
  outcome?: FlightOutcome
  landing?: LandingQuality
  touchdownFpm?: number
  rating?: number // 1-5 stars
  notes?: string
  score?: number
}

const STORAGE_KEY = 'myroster.sessions'
const MAX_SESSIONS = 100

export function createSession(
  flightId: string,
  airlineId: string,
  from: string,
  to: string,
  flightNumber: string,
  aircraft: string,
  plannedDurationMin: number,
  distanceNm: number
): FlightSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    flightId,
    airlineId,
    from,
    to,
    flightNumber,
    aircraft,
    startedAt: Date.now(),
    pausedMs: 0,
    plannedDurationMin,
    distanceNm,
    state: 'ready',
    firedPhases: [],
  }
}

export function saveSession(session: FlightSession): void {
  try {
    const sessions = getAllSessions()
    const index = sessions.findIndex((s) => s.id === session.id)
    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }
    
    // Keep only recent sessions
    const trimmed = sessions.slice(-MAX_SESSIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

export function getSession(id: string): FlightSession | null {
  try {
    const sessions = getAllSessions()
    return sessions.find((s) => s.id === id) || null
  } catch {
    return null
  }
}

export function getAllSessions(): FlightSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function deleteSession(id: string): void {
  try {
    const sessions = getAllSessions()
    const filtered = sessions.filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete session:', error)
  }
}

export function getCompletedSessions(): FlightSession[] {
  return getAllSessions().filter((s) => s.state === 'ended' && s.outcome === 'completed')
}

export function getTotalStats() {
  const sessions = getAllSessions()
  const completed = sessions.filter((s) => s.outcome === 'completed')
  const diverted = sessions.filter((s) => s.outcome === 'diverted')
  const gaveUp = sessions.filter((s) => s.outcome === 'gave_up')
  
  const totalDistance = completed.reduce((sum, s) => sum + s.distanceNm, 0)
  const totalTime = completed.reduce((sum, s) => {
    if (s.endedAt && s.startedAt) {
      return sum + (s.endedAt - s.startedAt - s.pausedMs)
    }
    return sum
  }, 0)
  
  const uniqueAirlines = new Set(sessions.map((s) => s.airlineId))
  const uniqueAirports = new Set<string>()
  sessions.forEach((s) => {
    uniqueAirports.add(s.from)
    uniqueAirports.add(s.to)
  })
  
  const avgScore = completed.length > 0 
    ? completed.reduce((sum, s) => sum + (s.score || 0), 0) / completed.length 
    : 0

  return {
    totalFlights: sessions.length,
    completed: completed.length,
    diverted: diverted.length,
    gaveUp: gaveUp.length,
    totalDistance,
    totalTime,
    uniqueAirlines: uniqueAirlines.size,
    uniqueAirports: uniqueAirports.size,
    completionRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
    avgScore: Math.round(avgScore * 10) / 10,
  }
}

// Landing quality classification
export function classifyLanding(fpm: number): LandingQuality {
  const abs = Math.abs(fpm)
  if (abs <= 100) return 'butter'
  if (abs <= 200) return 'smooth'
  if (abs <= 300) return 'firm'
  if (abs <= 500) return 'hard'
  return 'very_hard'
}

// Score calculation
export function calculateScore(
  outcome: FlightOutcome,
  landing: LandingQuality | null,
  plannedMin: number,
  actualMin: number
): number {
  if (outcome === 'gave_up') return 0

  const base = outcome === 'completed' ? 50 : 35
  
  const landingScores: Record<LandingQuality, number> = {
    butter: 30,
    smooth: 25,
    firm: 15,
    hard: 5,
    very_hard: 0,
  }
  const landScore = landing ? landingScores[landing] : 0

  const timeDiff = Math.abs(actualMin - plannedMin)
  const punctualScore = timeDiff <= 10 ? 20 : timeDiff <= 20 ? 10 : 0

  return base + landScore + punctualScore
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

export function groupSessionsByMonth(sessions: FlightSession[]): Record<string, FlightSession[]> {
  const grouped: Record<string, FlightSession[]> = {}

  sessions.forEach((session) => {
    const date = new Date(session.startedAt)
    const monthKey = date.toLocaleString('en-US', { year: 'numeric', month: 'long' })

    if (!grouped[monthKey]) {
      grouped[monthKey] = []
    }
    grouped[monthKey].push(session)
  })

  return grouped
}
