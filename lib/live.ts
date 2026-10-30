import 'server-only'

type Raw = { hex?: string; flight?: string; lat?: number; lon?: number; alt_baro?: number | 'ground'; gs?: number; track?: number; geom_rate?: number; squawk?: string; on_ground?: boolean; t?: string; r?: string; seen?: number; seen_pos?: number }
export type LiveAircraft = { hex: string; callsign: string; reg?: string; type?: string; lat: number; lon: number; altFt: number | null; onGround: boolean; gs?: number; track?: number; vs?: number; squawk?: string }
const primary = process.env.LIVE_API_BASE || 'https://api.adsb.lol/v2'
const fallback = 'https://api.airplanes.live/v2'
const cache = new Map<string, { at: number; value: LiveAircraft[] }>()
const pending = new Map<string, Promise<LiveAircraft[]>>()
let queue: Promise<void> = Promise.resolve()
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
function normalize(x: Raw): LiveAircraft | null {
  if (typeof x.lat !== 'number' || typeof x.lon !== 'number' || !Number.isFinite(x.lat) || !Number.isFinite(x.lon) || Math.abs(x.lat) > 90 || Math.abs(x.lon) > 180 || !x.hex || !/^[a-z0-9~]{6,8}$/i.test(x.hex)) return null
  // Old positions must not be refreshed as new observations.
  if ((x.seen_pos ?? x.seen ?? 0) > 90) return null
  return { hex: x.hex.toUpperCase(), callsign: (x.flight || '').trim().toUpperCase(), reg: x.r, type: x.t, lat: x.lat, lon: x.lon, altFt: typeof x.alt_baro === 'number' ? x.alt_baro : null, onGround: x.alt_baro === 'ground' || Boolean(x.on_ground), gs: x.gs, track: x.track, vs: x.geom_rate, squawk: x.squawk }
}
async function upstream(path: string, base = primary): Promise<LiveAircraft[]> {
  const key = base + path
  const old = cache.get(key)
  if (old && Date.now() - old.at < 15000) return old.value
  const active = pending.get(key)
  if (active) return active
  const run = (async () => {
    // Space request starts without holding the queue during network timeouts.
    const turn = queue
    queue = turn.then(() => wait(500))
    await turn
    try {
      const res = await fetch(base + path, { headers: { 'User-Agent': 'MyRoster-personal-project' }, cache: 'no-store', signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`Live provider HTTP ${res.status}`)
      const json = await res.json()
      const rows = Array.isArray(json) ? json : (json.ac || json.aircraft)
      if (!Array.isArray(rows)) throw new Error('Invalid live provider response')
      const value = rows.map(normalize).filter((a): a is LiveAircraft => a !== null)
      if (cache.size >= 500) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: Date.now(), value })
      return value
    } catch (error) {
      if (base === primary && base !== fallback) return upstream(path, fallback)
      // Never present a failed provider request as a successful empty/live response.
      throw error
    }
  })()
  pending.set(key, run)
  try { return await run } finally { pending.delete(key) }
}
export async function live(path: string) { return upstream(path) }
export async function liveRoute(points: { lat: number; lon: number }[]) {
  const merged = new Map<string, LiveAircraft>()
  for (const p of points) for (const ac of await live(`/point/${p.lat}/${p.lon}/200`)) merged.set(ac.hex, ac)
  return [...merged.values()]
}
