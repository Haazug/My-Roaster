// Live traffic integration with airplanes.live API
// Fetches real aircraft data and matches with routes

const BASE_URL = 'https://api.airplanes.live/v2'
const RATE_LIMIT_MS = 1100
const CACHE_TTL_MS = 15000
const MAX_RESULTS = 1500

export interface LiveAircraft {
  hex: string
  callsign: string
  lat: number
  lon: number
  alt: number | null
  gs?: number
  track?: number
  vs?: number
  squawk?: string
  reg?: string
  type?: string
  onGround: boolean
}

interface CacheEntry {
  timestamp: number
  data: LiveAircraft[] | null
}

const cache = new Map<string, CacheEntry>()
let lastFetch = 0

async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now()
  const timeSinceLastFetch = now - lastFetch
  if (timeSinceLastFetch < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastFetch)
    )
  }
  lastFetch = Date.now()

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MyRoster-flight-sim' },
    })
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, try fallback
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
  } catch (error) {
    console.error('Live traffic fetch error:', error)
    return null
  }
}

function normalizeAircraft(data: any): LiveAircraft | null {
  if (!data.lat || !data.lon) return null

  return {
    hex: data.hex || data.icao || '',
    callsign: (data.callsign || '').trim(),
    lat: data.lat,
    lon: data.lon,
    alt: data.alt_baro ?? data.altitude ?? null,
    gs: data.gs || data.ground_speed,
    track: data.track || data.heading,
    vs: data.baro_rate || data.vertical_rate,
    squawk: data.squawk,
    reg: data.registration || data.reg,
    type: data.aircraft_type || data.type,
    onGround: data.on_ground ?? false,
  }
}

export async function getAircraftNear(
  lat: number,
  lon: number,
  radiusNm: number = 100
): Promise<{ aircraft: LiveAircraft[]; checkedAt: string }> {
  const key = `near:${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusNm}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      aircraft: cached.data || [],
      checkedAt: new Date().toISOString(),
    }
  }

  const url = `${BASE_URL}/point/${lat}/${lon}/${radiusNm}`
  const data = await rateLimitedFetch(url)

  let aircraft: LiveAircraft[] = []
  if (data?.ac) {
    aircraft = data.ac
      .map((ac: any) => normalizeAircraft(ac))
      .filter((ac: LiveAircraft | null) => ac !== null)
      .slice(0, MAX_RESULTS)
  }

  cache.set(key, { timestamp: Date.now(), data: aircraft })

  return {
    aircraft,
    checkedAt: new Date().toISOString(),
  }
}

export async function getAircraftByHex(hex: string): Promise<LiveAircraft | null> {
  const key = `hex:${hex}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data?.[0] ?? null
  }

  const url = `${BASE_URL}/hex/${hex.toUpperCase()}`
  const data = await rateLimitedFetch(url)

  if (!data) {
    cache.set(key, { timestamp: Date.now(), data: null })
    return null
  }

  const aircraft = normalizeAircraft(data)
  if (aircraft) {
    cache.set(key, { timestamp: Date.now(), data: [aircraft] })
  }

  return aircraft
}

export async function getAircraftByCallsign(
  callsign: string
): Promise<LiveAircraft[]> {
  const key = `callsign:${callsign}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data || []
  }

  const url = `${BASE_URL}/callsign/${callsign.toUpperCase()}`
  const data = await rateLimitedFetch(url)

  let aircraft: LiveAircraft[] = []
  if (data?.ac) {
    aircraft = data.ac
      .map((ac: any) => normalizeAircraft(ac))
      .filter((ac: LiveAircraft | null) => ac !== null)
  }

  cache.set(key, { timestamp: Date.now(), data: aircraft })
  return aircraft
}

export async function getAircraftByType(
  icaoType: string
): Promise<LiveAircraft[]> {
  const key = `type:${icaoType}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data || []
  }

  const url = `${BASE_URL}/type/${icaoType.toUpperCase()}`
  const data = await rateLimitedFetch(url)

  let aircraft: LiveAircraft[] = []
  if (data?.ac) {
    aircraft = data.ac
      .map((ac: any) => normalizeAircraft(ac))
      .filter((ac: LiveAircraft | null) => ac !== null)
      .slice(0, MAX_RESULTS)
  }

  cache.set(key, { timestamp: Date.now(), data: aircraft })
  return aircraft
}

export async function getAircraftByRegistration(
  reg: string
): Promise<LiveAircraft | null> {
  const key = `reg:${reg}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data?.[0] ?? null
  }

  const url = `${BASE_URL}/reg/${reg.toUpperCase()}`
  const data = await rateLimitedFetch(url)

  if (!data) {
    cache.set(key, { timestamp: Date.now(), data: null })
    return null
  }

  const aircraft = normalizeAircraft(data)
  if (aircraft) {
    cache.set(key, { timestamp: Date.now(), data: [aircraft] })
  }

  return aircraft
}

export function formatAltitude(alt: number | null | undefined): string {
  if (alt === null || alt === undefined) return 'Ground'
  const fl = Math.round(alt / 100)
  return `FL${fl.toString().padStart(3, '0')} (${alt.toLocaleString()} ft)`
}

export function formatSpeed(gs: number | undefined): string {
  if (!gs) return '-'
  return `${gs} kts`
}

export function formatVerticalRate(vs: number | undefined): string {
  if (!vs) return '0 fpm'
  const sign = vs > 0 ? '↑' : '↓'
  return `${sign} ${Math.abs(vs)} fpm`
}

export function formatTrack(track: number | undefined): string {
  if (track === undefined) return '-'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(track / 22.5) % 16
  return `${track.toFixed(0)}° ${directions[index]}`
}
