import 'server-only'
import { live, liveGlobal, type LiveAircraft } from '@/lib/live'
import { lookupCallsign } from '@/lib/route-lookup'
import { airlineByIcao, parseCallsign } from '@/lib/airline-lookup'
import { distNm } from '@/lib/live-geo'
import {radarBatch,radarOffset,type RadarAirport} from '@/lib/radar-airports'
import { getDb,getRadarAirports } from '@/lib/db'
import { getLiveHistory } from '@/lib/live-history'
import type { LiveHistory, HistoryRecord, SyncState } from '@/lib/live-history-sqlite'
import { AviationstackTimetable } from '@/lib/live-timetable'
import { FlightObservations, currentFlights, radarExpiry, airportDirection, flightIdentity, type ResolvedFlight } from '@/lib/live-model'

// In-memory fallback keeps live requests useful when the configured persistent store is unavailable.
const observations = new FlightObservations()
const pending = new Map<string, Promise<void>>()
const scanned = new Map<string, number>()
const satellites = ['NBJ', 'LIS', 'JNB', 'DXB', 'LHR', 'JFK', 'GRU', 'HND']
// Serverless can still discover traffic without a server database. Browser history persists it per device.
const transientRows = new Map<string, HistoryRecord>(), transientSync = new Map<string, SyncState>()
const transientHistory: LiveHistory = {
 write: async rows => { for (const f of rows) { const old=transientRows.get(f.id); if(!old||f.updatedAt>=old.updatedAt)transientRows.set(f.id,f) }; for(const [id,f] of transientRows)if(f.expiresAt<Date.now())transientRows.delete(id); while(transientRows.size>5000)transientRows.delete(transientRows.keys().next().value!) },
 read: async () => [...transientRows.values()].filter(f=>f.expiresAt>Date.now()),
 getSync: async scope => transientSync.get(scope)||null,
 setSync: async (scope,state) => {transientSync.set(scope,state)},
}
function workingHistory(): LiveHistory { try {return getLiveHistory()} catch {return transientHistory} }


export async function resolveAircraft(a: LiveAircraft, observedAt = Date.now()): Promise<ResolvedFlight> {
  const p = parseCallsign(a.callsign)
  const [route, airline] = await Promise.all([
    lookupCallsign(a.callsign),
    p ? airlineByIcao(p.icao) : Promise.resolve(null),
  ])
  const db = await getDb()
  const destination = route?.to ? db.airports.get(route.to) : undefined
  const expiresAt = radarExpiry(observedAt, destination ? distNm(a, destination) : undefined, a.gs)
  const airlineIata = route?.airlineIata || airline?.iata || ''
  return {
    ...a, expiresAt, routeCheckedAt: observedAt, source: 'radar', airlineIata, airlineIcao: route?.airlineIcao || airline?.icao || p?.icao || '',
    airlineName: route?.airlineName || airline?.name || 'Unknown airline',
    flightNumber: flightIdentity(a.callsign, airlineIata, route?.flightNumber),
    from: route?.from || null, to: route?.to || null,
    fromCity: route?.fromCity || '', toCity: route?.toCity || '',
    observedAt, status: 'observed', remainingMinutes: null,
  }
}

async function discover(code: string, station?:RadarAirport, limit=20) {
  if (Date.now() - (scanned.get(code) || 0) < 45_000) return
  const existing = pending.get(code)
  if (existing) return existing
  const work = (async () => {
    const db = await getDb()
    const ap = station||db.airports.get(code)
    if (!ap) return
    const aircraft = await live(`/point/${ap.lat}/${ap.lon}/140`)
    const observedAt = Date.now()
    // Bound route-provider traffic; rotate the scan to avoid starving higher-altitude aircraft.
    const offset = Math.floor(observedAt / 45_000) * 20 % Math.max(aircraft.length, 1)
    const selected = [...aircraft.slice(offset), ...aircraft.slice(0, offset)].slice(0, limit)
    let failed = false
    let historyFailed = false
    for (let i = 0; i < selected.length; i += 5) {
      const batch = await Promise.allSettled(selected.slice(i, i + 5).map(a => resolveAircraft(a, observedAt)))
      const rows = []
      for (const result of batch) {
        if (result.status === 'fulfilled') {
          observations.record(result.value)
          rows.push({ ...result.value, id: `radar:${result.value.hex}`, updatedAt: observedAt, expiresAt: result.value.expiresAt || observedAt + 20 * 60_000 })
        }
        else failed = true
      }
      try { await workingHistory().write(rows) } catch { historyFailed = true }
    }
    if (failed) throw new Error('Some flight routes could not be resolved')
    scanned.set(code, Date.now())
    if(historyFailed) throw new Error('History write unavailable')
  })()
  pending.set(code, work)
  try { await work } finally { pending.delete(code) }
}

let radarPending:Promise<{codes:string[];nextOffset:number;complete:boolean;total:number|null}>|undefined
async function discoverRadar(background=false){
 if(radarPending)return radarPending
 radarPending=(async()=>{
  const history=workingHistory(),scope='radar:airports',previous=await history.getSync(scope)
  if(previous&&Date.now()-previous.checkedAt<45_000)return {codes:[],...previous}
  const airports=await getRadarAirports(),limit=background?24:6
  const batch=radarBatch(airports,radarOffset(previous?.nextOffset,airports.length,limit),limit)
  const results=await Promise.allSettled(batch.points.map(point=>discover(point.id,point,5)))
  // Advance even if a station fails: one timeout must not starve the rest of the world.
  // Failed stations are revisited on the next sweep and this request remains degraded.
  const state={checkedAt:Date.now(),nextOffset:batch.nextOffset,complete:batch.complete,total:batch.total}
  await history.setSync(scope,state)
  if(results.some(r=>r.status==='rejected'))throw new Error('Some radar stations unavailable')
  return {codes:batch.points.map(p=>p.id),...state}
 })()
 try{return await radarPending}finally{radarPending=undefined}
}

let timetable: AviationstackTimetable | undefined

let globalPending: Promise<import('@/lib/live-history-sqlite').SyncState> | undefined
async function discoverGlobal(limit = 20) {
  if (globalPending) return globalPending
  globalPending = scanGlobal(limit)
  try { return await globalPending } finally { globalPending = undefined }
}
async function scanGlobal(limit: number) {
  const scope = 'radar:global'
  const history = workingHistory()
  const previous = await history.getSync(scope)
  if (previous && Date.now() - previous.checkedAt < 45_000) return previous
  const aircraft = (await liveGlobal()).sort((a, b) => a.hex.localeCompare(b.hex))
  const now = Date.now()
  const prior = await history.read()
  const db = await getDb()
  const known = new Map(prior.filter(f => f.source === 'radar').map(f => [f.hex, f]))
  const unresolved: LiveAircraft[] = []
  const refreshed = []
  for (const a of aircraft) {
    const old = known.get(a.hex)
    if (old && a.onGround) {
      const ground = { ...old, ...a, observedAt: now, updatedAt: now, expiresAt: now + 20 * 60_000 }
      observations.record(ground)
      refreshed.push(ground)
      continue
    }
    if (!a.callsign) continue
    if (old?.from && old.to && old.callsign === a.callsign && now - (old.routeCheckedAt || 0) < 5 * 60_000) {
      const target = db.airports.get(old.to)
      const f = { ...old, ...a, observedAt: now, updatedAt: now, expiresAt: radarExpiry(now, target ? distNm(a, target) : undefined, a.gs) }
      observations.record(f)
      refreshed.push(f)
    } else unresolved.push(a)
  }
  await history.write(refreshed)
  const offset = previous && !previous.complete && previous.nextOffset < unresolved.length ? previous.nextOffset : 0
  const batch = unresolved.slice(offset, offset + limit)
  let failed = false
  for (let i = 0; i < batch.length; i += 5) {
    const outcomes = await Promise.allSettled(batch.slice(i, i + 5).map(a => resolveAircraft(a, now)))
    const rows = []
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') { failed = true; continue }
      const f = outcome.value
      observations.record(f)
      rows.push({ ...f, id: `radar:${f.hex}`, updatedAt: now, expiresAt: f.expiresAt || now + 20 * 60_000 })
    }
    await history.write(rows)
  }
  const complete = offset + batch.length >= unresolved.length
  const state = { checkedAt: now, nextOffset: complete ? 0 : offset + batch.length, complete, total: aircraft.length }
  await history.setSync(scope, state)
  if (failed) throw new Error('Some global callsigns could not be resolved')
  return state
}

export async function discoverFlights(airport?: string, options: { background?: boolean } = {}) {
  const db = await getDb()
  const codes = [...new Set(airport ? [airport, ...satellites] : satellites)].filter(code=>db.airports.has(code))
  let historyAvailable = true
  let stored: ResolvedFlight[] = []
  let timetableStatus = { configured: false, complete: false, total: null as number | null, error: undefined as string | undefined }
  try {
    const history = getLiveHistory()
    if (process.env.AVIATIONSTACK_API_KEY) {
      timetable ||= new AviationstackTimetable(history, process.env.AVIATIONSTACK_API_KEY)
      try { timetableStatus = { ...await timetable.sync(airport), error: undefined } }
      catch { timetableStatus = { configured: true, complete: false, total: null, error: 'Timetable source unavailable' } }
    }
  } catch { historyAvailable = false }
  // The global provider feed extends discovery beyond fixed satellites. Its route enrichment is
  // bounded and cursor-based; lack of coverage or a partially processed feed is never called complete.
  const outcomes = await Promise.allSettled([...codes.map(code=>discover(code)), discoverRadar(options.background), discoverGlobal(options.background ? 100 : 20)])
  try { stored = await workingHistory().read() } catch { historyAvailable = false }
  const snapshot = [...stored, ...observations.snapshot()]
  const flights = currentFlights(snapshot)
  const retired = snapshot.filter(f=>f.onGround||f.terminal||!f.from||!f.to).map(f=>({...f, terminal:true}))
  if(outcomes.some(r=>r.status==='rejected'&&String(r.reason?.message)==='History write unavailable'))historyAvailable=false
  const data = (airport ? flights.filter(f => airportDirection(f, airport)) : flights).map(f => ({
    ...f, fromCity: f.fromCity || db.airports.get(f.from || '')?.city || '', toCity: f.toCity || db.airports.get(f.to || '')?.city || '',
    ...(airport ? { kind: airportDirection(f, airport) } : {}),
  }))
  const global = outcomes[outcomes.length - 1]
  return {
    data, retired,
    availability: { live: (data.some(f=>f.status==='observed') || outcomes.some(r=>r.status==='fulfilled')) ? (outcomes.some(r=>r.status==='rejected') ? 'partial' : 'available') : 'unavailable' },
    coverage: 'Provider coverage is partial. A timetable source is optional; estimates are not confirmed airborne positions.',
    scannedAirports: [...new Set([...codes,...(outcomes[outcomes.length-2].status==='fulfilled'?(outcomes[outcomes.length-2] as PromiseFulfilledResult<Awaited<ReturnType<typeof discoverRadar>>>).value.codes:[])])],
    radarCoverage: outcomes[outcomes.length-2].status==='fulfilled'?(outcomes[outcomes.length-2] as PromiseFulfilledResult<Awaited<ReturnType<typeof discoverRadar>>>).value:{complete:false,unavailable:true},
    history: { persistent: historyAvailable }, timetable: timetableStatus,
    globalFeed: global.status === 'fulfilled' ? global.value : { complete: false, unavailable: true },
    degraded: !historyAvailable || !!timetableStatus.error || outcomes.some(r => r.status === 'rejected'),
    checkedAt: new Date().toISOString(),
  }
}
