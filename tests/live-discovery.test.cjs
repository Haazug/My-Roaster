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
  const localRequire = name => {
    if (name === 'server-only') return {}
    if (Object.hasOwn(adapters, name)) return adapters[name]
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
    '@/lib/live': { live: async query => { scans++; return query.includes('/-9/13/') ? raw : [] } },
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
  assert.equal(scans, 2, 'consecutive reads reuse recent satellite scans')
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
    '@/lib/live': { live: async () => { throw new Error('Provider unavailable') } },
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
    '@/lib/live': { live: async () => ['DTA653','BAW123'].map((callsign,i) => ({hex:`ABC12${i}`,callsign,lat:-9,lon:13,altFt:35000,onGround:false})) },
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
