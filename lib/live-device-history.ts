import type { ResolvedFlight } from './live-model'

const identity = (f: ResolvedFlight) => f.id || (f.hex ? `radar:${f.hex}` : `${f.flightNumber}:${f.from}:${f.to}:${f.serviceDate || ''}`)
export function mergeLiveHistory(previous: ResolvedFlight[], updates: ResolvedFlight[], now = Date.now()) {
  const entries = new Map(previous.map(f => [identity(f), f]))
  for (const f of updates) {
    const old = entries.get(identity(f))
    if (!old || (f.updatedAt ?? f.observedAt) >= (old.updatedAt ?? old.observedAt)) entries.set(identity(f), f)
  }
  return [...entries.values()].filter(f => now < (f.expiresAt ?? f.observedAt + 20 * 60_000))
    .sort((a,b) => (b.updatedAt ?? b.observedAt) - (a.updatedAt ?? a.observedAt)).slice(0, 5000)
}

// IndexedDB is functional flight history, independent of optional language/music preferences.
export async function cacheLiveFlights(updates: ResolvedFlight[]): Promise<ResolvedFlight[]> {
  if (typeof indexedDB === 'undefined') throw new Error('Device history unsupported')
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('myroster-live-history', 1)
    open.onupgradeneeded = () => { open.result.createObjectStore('flights', { keyPath: 'cacheId' }) }
    open.onerror = () => reject(new Error('Device history unavailable'))
    open.onblocked = () => reject(new Error('Device history blocked'))
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('flights', 'readwrite')
      const store = tx.objectStore('flights')
      let rows: ResolvedFlight[] = []
      const read = store.getAll()
      read.onsuccess = () => {
        rows = mergeLiveHistory(read.result.map(row => row.flight), updates)
        store.clear()
        rows.forEach(f => store.put({ cacheId: identity(f), flight: f }))
      }
      tx.oncomplete = () => { db.close(); import('./route-number-memory').then(m=>m.observedRouteNumbers(updates)).catch(()=>{}).finally(()=>resolve(rows)) }
      tx.onerror = () => { db.close(); reject(new Error('Device history could not be saved')) }
      tx.onabort = tx.onerror
    }
  })
}
