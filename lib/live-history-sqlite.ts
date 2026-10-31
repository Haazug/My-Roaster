import type { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ResolvedFlight } from './live-model'

export type HistoryRecord = ResolvedFlight & { id: string; updatedAt: number; expiresAt: number }
export type SyncState = { checkedAt: number; nextOffset: number; complete: boolean; total: number | null; nextHex?:string; resolved?:number; processed?:number; failedRoutes?:number; candidates?:number; budgetLimited?:boolean }
export interface LiveHistory {
  write(flights: HistoryRecord[], now?: number): Promise<void>
  read(now?: number): Promise<HistoryRecord[]>
  getSync(scope: string): Promise<SyncState | null>
  setSync(scope: string, state: SyncState): Promise<void>
}

export class SqliteHistory implements LiveHistory {
  private db: DatabaseSync
  constructor(filename: string) {
    // Only load SQLite on hosts that use it; serverless Supabase must also work on older Node runtimes.
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
    mkdirSync(dirname(filename), { recursive: true })
    this.db = new DatabaseSync(filename)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS live_state (id TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS live_events (id TEXT NOT NULL, updated_at INTEGER NOT NULL, received_at INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(id,updated_at));
      CREATE TABLE IF NOT EXISTS live_sync (scope TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS live_state_expiry ON live_state(expires_at);
      CREATE INDEX IF NOT EXISTS live_events_received ON live_events(received_at);`)
  }
  async write(flights: HistoryRecord[], now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const state = this.db.prepare(`INSERT INTO live_state VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, expires_at=excluded.expires_at, payload=excluded.payload WHERE excluded.updated_at >= live_state.updated_at`)
      const previous = this.db.prepare('SELECT updated_at, payload FROM live_state WHERE id=?')
      const signature = (f: HistoryRecord) => JSON.stringify([f.callsign, f.flightNumber, f.from, f.to, f.source, !!f.onGround, !!f.terminal, f.serviceDate])
      const event = this.db.prepare('INSERT OR IGNORE INTO live_events VALUES(?,?,?,?)')
      for (const f of flights) {
        const body = JSON.stringify(f)
        const old = previous.get(f.id)
        state.run(f.id, f.updatedAt, f.expiresAt, body)
        // Journal service/phase changes, not every repeated ADS-B position.
        if (!old || (f.updatedAt >= Number(old.updated_at) && signature(JSON.parse(String(old.payload))) !== signature(f))) event.run(f.id, f.updatedAt, now, body)
      }
      // Keep terminal tombstones long enough to reject delayed updates for that service.
      this.db.prepare('DELETE FROM live_state WHERE expires_at < ?').run(now - 48 * 3600_000)
      this.db.prepare('DELETE FROM live_events WHERE received_at < ?').run(now - 7 * 86400_000)
      this.db.exec('COMMIT')
    } catch (e) { this.db.exec('ROLLBACK'); throw e }
  }
  async read(now = Date.now()) {
    return this.db.prepare('SELECT payload FROM live_state WHERE expires_at > ? ORDER BY updated_at DESC LIMIT 20000').all(now).map(row => JSON.parse(String(row.payload)) as HistoryRecord)
  }
  async getSync(scope: string): Promise<SyncState | null> {
    const row = this.db.prepare('SELECT payload FROM live_sync WHERE scope=?').get(scope)
    return row ? JSON.parse(String(row.payload)) : null
  }
  async setSync(scope: string, state: SyncState) {
    this.db.prepare('INSERT INTO live_sync VALUES(?,?) ON CONFLICT(scope) DO UPDATE SET payload=excluded.payload').run(scope, JSON.stringify(state))
  }
  close() { this.db.close() }
}
