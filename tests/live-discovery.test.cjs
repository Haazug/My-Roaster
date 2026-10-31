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
    if(name==='@/lib/brasileirinho')return load('lib/brasileirinho.ts',{})
    if(name==='@/lib/live-estimates')return load('lib/live-estimates.ts',{'./live-geo':load('lib/live-geo.ts',{}),'./flags':load('lib/flags.ts',{})})
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
    'next/server': { after:()=>{}, NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
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
  assert.equal(scans, 4, 'consecutive reads reuse recent satellite scans and the global feed')
  assert.equal((await request('INVALID')).status, 404)
  const routeHandler = load('app/api/live/route/route.ts', {
    'next/server': { after:()=>{}, NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
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

function memoryHistory(){const rows=new Map(),sync=new Map();return {rows,write:async list=>{for(const f of list){const old=rows.get(f.id);if(!old||f.updatedAt>=old.updatedAt)rows.set(f.id,f)}},read:async()=>[...rows.values()],getSync:async key=>sync.get(key)||null,setSync:async(key,state)=>sync.set(key,state)}}
function aircraft(i,patch={}){return {hex:i.toString(16).padStart(6,'0').toUpperCase(),callsign:'DTA'+(1000+i),lat:-9,lon:13,altFt:35000,onGround:false,gs:450,...patch}}
function throughputAdapters(raw,history,lookup){return {
 '@/lib/live-model':load('lib/live-model.ts',{}),
 '@/lib/live-history':{getLiveHistory:()=>history},
 '@/lib/db':{getDb:async()=>({airports:new Map([['NBJ',{iata:'NBJ',lat:-9,lon:13}],['LIS',{iata:'LIS',lat:38,lon:-9}]])}),getRadarAirports:async()=>[]},
 '@/lib/live':{live:async()=>[],liveGlobal:async()=>raw},
 '@/lib/route-lookup':{lookupCallsign:lookup},
 '@/lib/airline-lookup':{parseCallsign:()=>null},
}}
const mappedRoute={from:'NBJ',to:'LIS',airlineIata:'DT',airlineIcao:'DTA',airlineName:'TAAG'}
test('global enrichment budget goes to airborne route candidates, not hundreds of ground aircraft and registrations',async()=>{
 const raw=[...Array.from({length:200},(_,i)=>aircraft(i,{onGround:true})),...Array.from({length:200},(_,i)=>aircraft(i+200,{callsign:'N'+(12300+i)})),...Array.from({length:40},(_,i)=>aircraft(i+400))],history=memoryHistory(),lookups=[]
 const discovery=load('lib/live-discovery.ts',throughputAdapters(raw,history,async cs=>{lookups.push(cs);return mappedRoute}))
 const result=await discovery.discoverFlights(undefined,{radar:false})
 assert.equal(result.data.length,40);assert.equal(lookups.length,40);assert(lookups.every(cs=>cs.startsWith('DTA')))
})
test('stable hex cursor never skips the next flights when the unresolved work list shrinks',async()=>{
 const original=Date.now;let now=225000;Date.now=()=>now
 try{
  const raw=Array.from({length:250},(_,i)=>aircraft(i)),history=memoryHistory(),lookups=[]
  const discovery=load('lib/live-discovery.ts',throughputAdapters(raw,history,async cs=>{lookups.push(cs);return mappedRoute}))
  const first=await discovery.discoverFlights(undefined,{radar:false});assert.equal(first.data.length,100)
  now+=46000;const second=await discovery.discoverFlights(undefined,{radar:false});assert.equal(second.data.length,200)
  now+=46000;const third=await discovery.discoverFlights(undefined,{radar:false});assert.equal(third.data.length,250)
  assert.equal(new Set(lookups).size,250);assert.equal(lookups.length,250,'fresh known routes are refreshed without repeated route-provider calls')
 }finally{Date.now=original}
})
test('the response does not wait for the supplemental landing-site registry and schedules it after returning',async()=>{
 const history=memoryHistory(),jobs=[];let registryCalls=0,release
 const gate=new Promise(resolve=>{release=resolve}),adapters=throughputAdapters([aircraft(1)],history,async()=>mappedRoute)
 adapters['@/lib/db'].getRadarAirports=()=>{registryCalls++;return gate}
 const discovery=load('lib/live-discovery.ts',adapters)
 const handler=load('app/api/live/now/route.ts',{'next/server':{after:job=>jobs.push(job),NextResponse:{json:body=>body}},'@/lib/live-discovery':discovery})
 const response=await handler.GET(new Request('http://test/api/live/now'));assert.equal(response.data.length,1);assert.equal(registryCalls,0);assert.equal(jobs.length,1)
 const work=jobs[0]();await Promise.resolve();await Promise.resolve();release([]);await work;assert.equal(registryCalls,1)
})
test('route-provider requests share a concurrency cap and expired jobs do not make HTTP calls',async()=>{
 const original=global.fetch;let active=0,maximum=0,calls=0
 global.fetch=async()=>{calls++;maximum=Math.max(maximum,++active);await new Promise(resolve=>setTimeout(resolve,2));active--;return {ok:true,json:async()=>({response:{flightroute:{callsign_iata:'DT123',origin:{iata_code:'NBJ'},destination:{iata_code:'LIS'}}}})}}
 try{
  const api=load('lib/route-lookup.ts',{})
  const jobs=Array.from({length:25},(_,i)=>api.lookupCallsign('DTA'+(100+i)))
  jobs.push(api.lookupCallsign('DTA100'));await Promise.all(jobs)
  assert(maximum<=8);assert(maximum>1);assert.equal(calls,25)
  await assert.rejects(api.lookupCallsign('DTA999',{deadline:Date.now()-1}),/budget exhausted/);assert.equal(calls,25)
 }finally{global.fetch=original}
})
test('global provider starts independently of the point-query queue',async()=>{
 const original=global.fetch,calls=[]
 global.fetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>({ac:[]})}}
 try{
  const api=load('lib/live.ts',{})
  await Promise.all([api.live('/point/1/2/140'),api.live('/point/3/4/140'),api.live('/point/5/6/140'),api.liveGlobal()])
  assert(calls.findIndex(url=>url.includes('re-api'))<calls.findIndex(url=>url.includes('/point/3/4/')))
 }finally{global.fetch=original}
})

test('recent negative route results do not consume the next enrichment budget',async()=>{
 const original=Date.now;let now=225000,lookups=0;Date.now=()=>now
 try{
  const history=memoryHistory(),raw=Array.from({length:30},(_,i)=>aircraft(i)),discovery=load('lib/live-discovery.ts',throughputAdapters(raw,history,async()=>{lookups++;return null}))
  assert.equal((await discovery.discoverFlights(undefined,{radar:false})).data.length,0);assert.equal(lookups,30)
  now+=46000;await discovery.discoverFlights(undefined,{radar:false});assert.equal(lookups,30)
  now+=46000;await discovery.discoverFlights(undefined,{radar:false});assert.equal(lookups,60)
 }finally{Date.now=original}
})
test('partial route lookup failures retain detected flights and do not misreport the global feed as unavailable',async()=>{
 const history=memoryHistory(),discovery=load('lib/live-discovery.ts',throughputAdapters([aircraft(1),aircraft(2)],history,async cs=>{if(cs==='DTA1002')throw Error('Route provider timeout');return mappedRoute}))
 const result=await discovery.discoverFlights(undefined,{radar:false})
 assert.equal(result.data.length,1);assert.equal(result.globalFeed.total,2);assert.equal(result.globalFeed.failedRoutes,1);assert.equal(result.globalFeed.unavailable,undefined);assert.equal(result.availability.live,'partial');assert.equal(result.degraded,true)
})

test('numeric IATA prefixes remain eligible without treating an aircraft registration as a passenger callsign',async()=>{
 const history=memoryHistory(),raw=[aircraft(1,{callsign:'G3123',reg:'PR-GXX'}),aircraft(2,{callsign:'N12345',reg:'N12345'})],lookups=[]
 const adapters=throughputAdapters(raw,history,async cs=>{lookups.push(cs);return {...mappedRoute,airlineIata:'G3',airlineIcao:'GLO',flightNumber:'G3123'}})
 const getDb=adapters['@/lib/db'].getDb;adapters['@/lib/db'].getDb=async()=>({...await getDb(),airlines:new Map([['glo',{iata:'G3'}],['n1',{iata:'N1'}]])})
 const result=await load('lib/live-discovery.ts',adapters).discoverFlights(undefined,{radar:false})
 assert.deepEqual(lookups,['G3123']);assert.equal(result.data[0].flightNumber,'G3123');assert.equal(result.data[0].airlineIcao,'GLO')
})

test('a time-limited sweep resumes at the first budget-deferred aircraft rather than skipping the remaining batch',async()=>{
 const original=Date.now;let now=225000;Date.now=()=>now
 try{
  const history=memoryHistory(),lookups=[],raw=Array.from({length:250},(_,i)=>aircraft(i))
  const discovery=load('lib/live-discovery.ts',throughputAdapters(raw,history,async(cs,options)=>{
   if(now+650>=options.deadline)throw Error('Route lookup budget exhausted')
   now+=650;lookups.push(cs);return mappedRoute
  }))
  const first=await discovery.discoverFlights(undefined,{radar:false});assert(first.globalFeed.budgetLimited);assert(first.data.length>0&&first.data.length<100)
  const count=lookups.length
  now+=46000;await discovery.discoverFlights(undefined,{radar:false})
  assert.equal(lookups[count],'DTA'+(1000+count));assert.equal(new Set(lookups).size,lookups.length)
 }finally{Date.now=original}
})

test('route provider Retry-After pauses queued requests instead of amplifying a rate-limit response',async()=>{
 const original=global.fetch;let calls=0,limitedAt=0;const starts=[]
 global.fetch=async()=>{
  starts.push(Date.now());calls++
  if(calls===1){limitedAt=Date.now();return {ok:false,status:429,headers:new Headers({'retry-after':'1'})}}
  return {ok:true,json:async()=>({response:{flightroute:{origin:{iata_code:'NBJ'},destination:{iata_code:'LIS'}}}})}
 }
 try{
  const api=load('lib/route-lookup.ts',{}),results=await Promise.allSettled(Array.from({length:10},(_,i)=>api.lookupCallsign('DTA'+(100+i))))
  assert.equal(results.filter(r=>r.status==='fulfilled').length,9)
  assert(starts[8]-limitedAt>=900);assert(starts[9]-limitedAt>=900)
 }finally{global.fetch=original}
})


test('browser cursors collect more than 300 real routes across independent cold instances',async()=>{
 const raw=Array.from({length:350},(_,i)=>aircraft(i)),collected=new Map();let cursor='start'
 for(let n=0;n<4;n++){
  const discovery=load('lib/live-discovery.ts',throughputAdapters(raw,memoryHistory(),async()=>mappedRoute))
  const page=await discovery.discoverFlights(undefined,{radar:false,stations:false,cursor})
  for(const f of page.data)collected.set(f.hex,f)
  cursor=page.globalFeed.nextHex
  if(n<3)assert(cursor)
 }
 assert.equal(collected.size,350);assert.equal(cursor,undefined)
})
test('FNLU is queried at its physical location without becoming a public airport',async()=>{
 const adapters=throughputAdapters([],memoryHistory(),async()=>mappedRoute),points=[]
 adapters['@/lib/live'].live=async query=>{points.push(query);return query.includes('/-8.858375/13.231178/')?[aircraft(1)]:[]}
 const result=await load('lib/live-discovery.ts',adapters).discoverFlights(undefined,{radar:false})
 assert(points.some(p=>p.includes('/-8.858375/13.231178/')))
 assert.equal(result.data[0].from,'NBJ');assert.equal(result.data[0].to,'LIS')
})
test('cold instances deliver ground tombstones even without the previous route in server memory',async()=>{
 const result=await load('lib/live-discovery.ts',throughputAdapters([aircraft(1,{onGround:true})],memoryHistory(),async()=>mappedRoute)).discoverFlights(undefined,{radar:false,stations:false,cursor:'start',seen:[aircraft(1).hex]})
 assert.equal(result.data.length,0);assert.equal(result.retired[0].hex,aircraft(1).hex);assert.equal(result.retired[0].terminal,true)
})

test('progressive browser collection delivers supplemental results and each cursor exactly once',async()=>{
 const {collectLivePages}=load('lib/live-pages.ts',{}),urls=[],received=[]
 await collectLivePages({ok:true,data:[],globalFeed:{nextHex:'000100'}},p=>received.push(p),new AbortController().signal,async url=>{
  urls.push(url)
  return {ok:true,json:async()=>({ok:true,data:[],globalFeed:url.includes('000100')?{nextHex:'000200'}:{}})}
 })
 assert.equal(received.length,3);assert(urls.includes('/api/live/radar'));assert(urls.some(u=>u.includes('000200')))
})
test('progressive browser collection stops repeated cursors without discarding successful pages',async()=>{
 const {collectLivePages}=load('lib/live-pages.ts',{});let requests=0,pages=0
 await collectLivePages({ok:true,data:[],globalFeed:{nextHex:'000100'}},()=>pages++,new AbortController().signal,async url=>{
  requests++;return {ok:true,json:async()=>({ok:true,data:[],globalFeed:{nextHex:'000100'}})}
 })
 assert.equal(requests,2);assert.equal(pages,2)
})
