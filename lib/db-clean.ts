import type { Db } from '@/lib/openflights-parse'
import { EXTRA_AIRLINES } from '@/lib/extra-airlines'

function addExtras(db: Db) {
  const all = Array.from(db.airlines.values())
  for (const ex of EXTRA_AIRLINES) {
    let al = all.find((a) => a.icao === ex.icao && a.active) || all.find((a) => a.icao === ex.icao)
    if (!al) {
      al = { id: 'x-' + ex.icao, iata: ex.iata, icao: ex.icao, name: ex.name, country: ex.country, active: true }
      db.airlines.set(al.id, al)
    } else {
      al.active = true
      if (!al.iata) al.iata = ex.iata
      if (!al.country) al.country = ex.country
    }
    const list = db.routesByAirline.get(al.id) ?? []
    const has = (a: string, b: string) => list.some((r) => r.from === a && r.to === b)
    for (const [hub, dests] of Object.entries(ex.hubs)) {
      for (const d of dests) {
        if (hub === d || !db.airports.has(hub) || !db.airports.has(d)) continue
        for (const [a, b] of [[hub, d], [d, hub]]) {
          if (!has(a, b)) list.push({ airlineId: al.id, from: a, to: b, codeshare: false, equip: [...ex.equip] })
        }
      }
    }
    db.routesByAirline.set(al.id, list)
  }
}

export function finalizeDb(db: Db): Db {
  try {
    addExtras(db)
    const hubs = new Map<string, string[]>()
    let removed = 0
    for (const [id, list] of db.routesByAirline) {
      const country = db.airlines.get(id)?.country || ''
      const home = (c: string) => !!country && db.airports.get(c)?.country === country
      let routes = list
      if (list.some((r) => home(r.from) || home(r.to))) {
        const deg = new Map<string, number>()
        for (const r of list) if (!r.codeshare) for (const c of [r.from, r.to]) deg.set(c, (deg.get(c) || 0) + 1)
        const kept = list.filter((r) => {
          if (home(r.from) || home(r.to)) return true
          if (r.codeshare) return false
          return (deg.get(r.from) || 0) >= 3 || (deg.get(r.to) || 0) >= 3
        })
        if (kept.length >= list.length * 0.4) {
          removed += list.length - kept.length
          routes = kept
          db.routesByAirline.set(id, kept)
        }
      }
      const d = new Map<string, number>()
      for (const r of routes) for (const c of [r.from, r.to]) d.set(c, (d.get(c) || 0) + 1)
      const top = Array.from(d.entries()).sort((a, b) => b[1] - a[1])
      hubs.set(id, top.filter((e, i) => i === 0 || e[1] >= Math.max(5, top[0][1] * 0.5)).slice(0, 3).map((e) => e[0]))
    }
    db.routesByAirport.clear()
    for (const list of db.routesByAirline.values()) {
      for (const rt of list) {
        for (const a of [rt.from, rt.to]) {
          const l = db.routesByAirport.get(a) ?? []
          l.push(rt)
          db.routesByAirport.set(a, l)
        }
      }
    }
    ;(db as any).hubs = hubs
    console.log('[db] rotas sem sentido removidas:', removed)
  } catch (e) {
    console.error('[db] limpeza falhou', e)
  }
  return db
}
