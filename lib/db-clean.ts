import type { Db } from '@/lib/openflights-parse'
import { PRIMARY_HUBS, plausibleOperatingRoute, RETIRED_OPERATORS, CLOSED_AIRPORTS } from '@/lib/airline-metadata'
import { EXTRA_AIRLINES } from '@/lib/extra-airlines'

function addExtras(db: Db) {
  const all = Array.from(db.airlines.values())
  for (const ex of EXTRA_AIRLINES) {
    // remove airlines from other countries that reuse this airline's codes (e.g. City Connexion, Burundi, also coded G3/GLO)
    for (const o of all) {
      if (o.country === ex.country) continue
      if ((ex.icao && o.icao === ex.icao) || (ex.iata && o.iata === ex.iata)) {
        db.airlines.delete(o.id)
        db.routesByAirline.delete(o.id)
      }
    }
    let al = all.find((a) => a.icao === ex.icao && a.country === ex.country && a.active) || all.find((a) => a.icao === ex.icao && a.country === ex.country)
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
  addExtras(db)
  for(const airline of db.airlines.values())if(RETIRED_OPERATORS.has(airline.icao))airline.active=false
  const hubs = new Map<string, string[]>()
  let removed = 0
  for (const [id, list] of db.routesByAirline) {
    const al = db.airlines.get(id)
    const routes = list.filter(r => !r.codeshare && al?.active && !CLOSED_AIRPORTS.has(r.from) && !CLOSED_AIRPORTS.has(r.to) && plausibleOperatingRoute(al.icao, al.country, db.airports.get(r.from)?.country || '', db.airports.get(r.to)?.country || ''))
    removed += list.length-routes.length
    db.routesByAirline.set(id, routes)
    const d = new Map<string, number>()
    for (const r of routes) for (const c of [r.from, r.to]) d.set(c, (d.get(c) || 0) + 1)
    const top = Array.from(d.entries()).sort((a, b) => b[1] - a[1])
    const known = PRIMARY_HUBS[al?.icao || '']
    const home = top.filter(([code]) => db.airports.get(code)?.country === al?.country)
    hubs.set(id, known ? known.filter(code=>db.airports.has(code)) : home.slice(0, 3).map(([code])=>code))
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
  return db
}
