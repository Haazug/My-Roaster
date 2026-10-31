const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Compile server modules with controlled upstream adapters. Exercise real discovery and route handlers.
function load(file, adapters) {
  const filename = path.resolve(__dirname, '..', file)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const rows = new Map(), sync = new Map()
  const history = { write: async list => list.forEach(f => rows.set(f.id, f)), read: async () => [...rows.values()], getSync: async scope => sync.get(scope) || null, setSync: async (scope, state) => sync.set(scope, state) }
  const localRequire = name => {
    if (name === 'server-only') return {}
    if(name==='@/lib/db'&&adapters[name])return {getRadarAirports:async()=>[],...adapters[name]}
    if (Object.hasOwn(adapters, name)) return adapters[name]
    if (name === '@/lib/radar-airports') return load('lib/radar-airports.ts', {'./openflights-parse':{parseCsvLine:line=>JSON.parse('['+line+']')}})
    if (name === '@/lib/live-geo') return load('lib/live-geo.ts', {})
    if (name === '@/lib/live-history') return { getLiveHistory: () => history }
    if (name === '@/lib/live-timetable') return load('lib/live-timetable.ts', {})
    throw new Error(`Unexpected dependency ${name}`)
  }
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
  return module.exports
}

test('airport endpoints share satellite discoveries without admitting overflights or unresolved/ground aircraft', async () => {
  const model = load('lib/live-model.ts', {})
  const airports = new Map([['NBJ', { iata: 'NBJ', lat: -9, lon: 13 }], ['LIS', { iata: 'LIS', lat: 38, lon: -9 }]])
  const routes = { DTA653: { flightNumber: 'DT653', airlineIata: 'DT', airlineIcao: 'DTA', airlineName: 'TAAG', from: 'NBJ', to: 'LIS' }, BAW123: { airlineIata: 'BA', airlineIcao: 'BAW', airlineName: 'British Airways', from: 'JNB', to: 'LHR' } }
  const raw = ['DTA653', 'BAW123', 'UNKNOWN', 'DTA654'].map((callsign, i) => ({ hex: `ABC12${i}`, callsign, lat: -9, lon: 13, altFt: i === 3 ? 0 : 35000, onGround: i === 3 }))
  let scans = 0
  const db = { getDb: async () => ({ airports }) }
  const discovery = load('lib/live-discovery.ts', {
    '@/lib/live': { liveGlobal: async () => { scans++; return [] }, live: async query => { scans++; return query.includes('/-9/13/') ? raw : [] } },
    '@/lib/route-lookup': { lookupCallsign: async cs => routes[cs] || null },
    '@/lib/airline-lookup': { parseCallsign: cs => ({ icao: cs.slice(0, 3) }), airlineByIcao: async () => null },
    '@/lib/db': db, '@/lib/live-model': model,
  })
  const handler = load('app/api/airports/[code]/live/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    '@/lib/db': db, '@/lib/openflights-parse': { findAirport: (db, code) => db.airports.get(code === 'LAD' ? 'NBJ' : code) },
    '@/lib/live-discovery': discovery,
  })
  const request = code => handler.GET(new Request('http://test/'), { params: Promise.resolve({ code }) })
  const nbj = await request('NBJ')
  assert.equal(nbj.status, 200)
  assert.equal(nbj.body.data.length, 1)
  assert.equal(nbj.body.data[0].kind, 'departing')
  assert.equal(nbj.body.data[0].flightNumber, 'DT653')
  const lis = await request('LIS')
  assert.equal(lis.body.data.length, 1)
  assert.equal(lis.body.data[0].kind, 'arriving')
  assert.equal((await request('LAD')).body.data[0].hex, 'ABC120')
  assert.equal(scans, 3, 'consecutive reads reuse recent satellite scans and the global feed')
  assert.equal((await request('INVALID')).status, 404)
  const routeHandler = load('app/api/live/route/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    '@/lib/db': db, '@/lib/openflights-parse': { findAirport: (db, code) => db.airports.get(code) },
    '@/lib/live-discovery': discovery,
  })
  const exact = await routeHandler.GET(new Request('http://test/?airline=DTA&from=NBJ&to=LIS'))
  assert.equal(exact.body.data.aircraft[0].flightNumber, 'DT653')
  const wrongAirline = await routeHandler.GET(new Request('http://test/?airline=BAW&from=NBJ&to=LIS'))
  assert.equal(wrongAirline.body.data.count, 0)
  assert.equal((await routeHandler.GET(new Request('http://test/?airline=DTA&from=INVALID&to=LIS'))).status, 400)
})

test('source failures are reported as degraded, not as a successful complete empty timetable', async () => {
  const discovery = load('lib/live-discovery.ts', {
    '@/lib/live-model': load('lib/live-model.ts', {}),
    '@/lib/live': { liveGlobal: async () => { throw new Error('Provider unavailable') }, live: async () => { throw new Error('Provider unavailable') } },
    '@/lib/route-lookup': { lookupCallsign: async () => null },
    '@/lib/airline-lookup': { parseCallsign: () => null },
    '@/lib/db': { getDb: async () => ({ airports: new Map([['NBJ', { lat: -9, lon: 13 }]]) }) },
  })
  const result = await discovery.discoverFlights('NBJ')
  assert.equal(result.degraded, true)
  assert.deepEqual(result.data, [])
})


test('operational callsigns identify the airline without inventing a passenger flight number', () => {
  const { parseCallsign } = load('lib/airline-lookup.ts', { '@/lib/db': {} })
  assert.deepEqual(parseCallsign('DTA6AB'), { icao: 'DTA', num: '6AB' })
  assert.deepEqual(parseCallsign('DLH4XY'), { icao: 'DLH', num: '4XY' })
  assert.equal(parseCallsign('N123AB'), null)
})

test('failed route lookups keep successful observations and expose degraded coverage', async () => {
  const discovery = load('lib/live-discovery.ts', {
    '@/lib/live-model': load('lib/live-model.ts', {}),
    '@/lib/live': { liveGlobal: async () => [], live: async () => ['DTA653','BAW123'].map((callsign,i) => ({hex:`ABC12${i}`,callsign,lat:-9,lon:13,altFt:35000,onGround:false})) },
    '@/lib/route-lookup': { lookupCallsign: async cs => {
      if(cs === 'BAW123') throw new Error('Route service unavailable')
      return {from:'NBJ',to:'LIS',airlineIata:'DT',airlineIcao:'DTA',airlineName:'TAAG'}
    } },
    '@/lib/airline-lookup': { parseCallsign: () => null },
    '@/lib/db': { getDb: async () => ({airports:new Map([['NBJ',{lat:-9,lon:13}]])}) },
  })
  const result = await discovery.discoverFlights('NBJ')
  assert.equal(result.degraded,true)
  assert.equal(result.data.length,1)
  assert.equal(result.data[0].flightNumber,'DT653')
})


test('the global feed discovers flights beyond fixed satellite airports and preserves airport assignment', async () => {
 const db={getDb:async()=>({airports:new Map([['LAX',{iata:'LAX',lat:34,lon:-118}],['HND',{iata:'HND',lat:35,lon:139}]])})}
 const discovery=load('lib/live-discovery.ts',{
  '@/lib/live-model':load('lib/live-model.ts',{}), '@/lib/db':db,
  '@/lib/live':{live:async()=>[],liveGlobal:async()=>[{hex:'ABC123',callsign:'ANA105',lat:40,lon:-170,altFt:35000,onGround:false,gs:480}]},
  '@/lib/route-lookup':{lookupCallsign:async()=>({from:'LAX',to:'HND',airlineIata:'NH',airlineIcao:'ANA',airlineName:'ANA',flightNumber:'NH105'})},
  '@/lib/airline-lookup':{parseCallsign:()=>null},
 })
 const global=await discovery.discoverFlights()
 assert.equal(global.data[0].flightNumber,'NH105')
 assert.equal(global.globalFeed.total,1)
 assert.equal(global.history.persistent,true)
 const airport=await discovery.discoverFlights('LAX')
 assert.equal(airport.data[0].kind,'departing')
 assert.equal(airport.data[0].from,'LAX')
})


test('Vercel without database credentials still discovers flights and truthfully reports device-only history', async () => {
 const discovery=load('lib/live-discovery.ts',{
  '@/lib/live-model':load('lib/live-model.ts',{}),
  '@/lib/live-history':{getLiveHistory:()=>{throw new Error('server database not configured')}},
  '@/lib/db':{getDb:async()=>({airports:new Map([['NBJ',{iata:'NBJ',lat:-9,lon:13}],['LIS',{iata:'LIS',lat:38,lon:-9}]])})},
  '@/lib/live':{live:async()=>[{hex:'ABC123',callsign:'DTA653',lat:-9,lon:13,altFt:35000,onGround:false}],liveGlobal:async()=>{throw new Error('optional global feed unavailable')}},
  '@/lib/route-lookup':{lookupCallsign:async()=>({from:'NBJ',to:'LIS',airlineIata:'DT',airlineIcao:'DTA',airlineName:'TAAG'})},
  '@/lib/airline-lookup':{parseCallsign:()=>null},
 })
 const result=await discovery.discoverFlights('NBJ')
 assert.equal(result.history.persistent,false)
 assert.equal(result.data[0].flightNumber,'DT653')
 assert.equal(result.availability.live,'partial','an optional global source failure must not mean all traffic is unavailable')
})


test('rotating radar stations include airports outside the site catalog without adding them or assigning overflights',async()=>{
 const airports=new Map([['NBJ',{iata:'NBJ',lat:-9,lon:13}],['LIS',{iata:'LIS',lat:38,lon:-9}]])
 const scanned=[]
 const discovery=load('lib/live-discovery.ts',{
  '@/lib/live-model':load('lib/live-model.ts',{}),
  '@/lib/db':{getDb:async()=>({airports}),getRadarAirports:async()=>[{id:'ZZZZ',lat:6,lon:24}]},
  '@/lib/live':{liveGlobal:async()=>[],live:async query=>{scanned.push(query);return query.includes('/6/24/')?[{hex:'ABC123',callsign:'DTA653',lat:6,lon:24,altFt:35000,onGround:false}]:[]}},
  '@/lib/route-lookup':{lookupCallsign:async()=>({from:'NBJ',to:'LIS',airlineIata:'DT',airlineIcao:'DTA',airlineName:'TAAG'})},
  '@/lib/airline-lookup':{parseCallsign:()=>null},
 })
 const result=await discovery.discoverFlights('NBJ')
 assert(scanned.includes('/point/6/24/140'))
 assert(result.scannedAirports.includes('ZZZZ'))
 assert.equal(airports.has('ZZZZ'),false)
 assert.equal(result.data[0].from,'NBJ');assert.equal(result.data[0].kind,'departing')
 assert.equal(result.radarCoverage.total,1)
})
