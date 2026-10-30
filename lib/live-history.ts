import 'server-only'
import { resolve } from 'node:path'
import { SqliteHistory, type LiveHistory, type HistoryRecord, type SyncState } from '@/lib/live-history-sqlite'

class SupabaseHistory implements LiveHistory {
  constructor(private url: string, private key: string) {}
  private async request(path: string, method = 'GET', body?: unknown) {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      method, headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Live history HTTP ${res.status}; check server credentials and migration`)
    return method === 'GET' ? res.json() : null
  }
  async write(flights: HistoryRecord[]) {
    if (flights.length) await this.request('rpc/record_live_flights', 'POST', { records: flights })
  }
  async read(now = Date.now()): Promise<HistoryRecord[]> {
    // Supabase's default max_rows is 1000. Explicitly paginate rather than silently truncating.
    const flights: HistoryRecord[] = []
    for (let offset = 0; offset < 20000;) {
      const rows = await this.request(`live_flight_state?select=payload&expires_at=gt.${now}&order=id&limit=1000&offset=${offset}`)
      flights.push(...rows.map((row: { payload: HistoryRecord }) => row.payload))
      if (!rows.length) return flights
      offset += rows.length
    }
    throw new Error('Live history exceeds the 20000-flight read limit')
  }
  async getSync(scope: string): Promise<SyncState | null> {
    const rows = await this.request(`live_flight_sync?select=payload&scope=eq.${encodeURIComponent(scope)}`)
    return rows[0]?.payload || null
  }
  async setSync(scope: string, state: SyncState) {
    // RPC uses monotonic timestamps, so a slower worker cannot regress a completed sync.
    await this.request('rpc/set_live_sync', 'POST', { sync_scope: scope, sync_payload: state })
  }
}
let history: LiveHistory | undefined
export function getLiveHistory(): LiveHistory {
  if (history) return history
  const driver = process.env.LIVE_HISTORY_DRIVER || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? 'supabase' : 'sqlite')
  if (driver === 'supabase') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Persistent live history requires Supabase URL and server-only service role key')
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('Supabase must use HTTPS')
    return history = new SupabaseHistory(parsed.origin, key)
  }
  if (driver !== 'sqlite') throw new Error('Unknown live history driver')
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) throw new Error('SQLite requires a persistent volume; use Supabase on serverless')
  return history = new SqliteHistory(resolve(process.env.LIVE_HISTORY_PATH || '.local/live-history.sqlite'))
}
