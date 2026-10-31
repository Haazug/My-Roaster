const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function loader(adapters={}){const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{if(name==='server-only')return {};if(name in adapters)return adapters[name];if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name+'.ts'));return require(name)},m,m.exports);return m.exports}return load}
const load=loader(),{tripState,scheduledEvent}=load('lib/flight-workflow.ts')
test('scheduled flight milestones use exact boundaries, latest relevant notification, delayed and 3-hour cancellation',()=>{
 const scheduledAt=10*3600_000,f={scheduledAt,takeoffAt:null}
 for(const [delta,stage] of [[-3600_001,null],[-3600_000,'checkin'],[-1800_000,'doors'],[-1,'doors'],[0,'due'],[25*60000,'disembark'],[179*60000,'disembark'],[180*60000,'cancelled']])assert.equal(scheduledEvent(f,scheduledAt+delta),stage,String(delta))
 assert.equal(tripState(f,scheduledAt),'delayed');assert.equal(tripState(f,scheduledAt+179*60000),'delayed');assert.equal(tripState(f,scheduledAt+180*60000),'cancelled')
 assert.equal(tripState({...f,startedAt:scheduledAt-60000},scheduledAt+60000),'delayed','opening preflight must not count as takeoff')
})
test('departed, completed and manually cancelled flights do not emit missed-departure notifications or auto-cancel',()=>{
 const f={scheduledAt:1000,takeoffAt:2000,startedAt:1500}
 assert.equal(tripState(f,99999999),'running');assert.equal(scheduledEvent(f,99999999),null)
 assert.equal(scheduledEvent({scheduledAt:1000,status:'cancelled'},999999),null)
 assert.equal(scheduledEvent({scheduledAt:1000,endedAt:2000},999999),null)
})
const {estimatedArrival,isTransatlantic,enrichLiveEstimate}=load('lib/live-estimates.ts'),luanda={iata:'NBJ',city:'Luanda',country:'Angola',lat:-9.05,lon:13.5},sao={iata:'GRU',city:'São Paulo',country:'Brazil',lat:-23.43,lon:-46.47}
test('Atlantic routes show an arrival estimate anchored to their actual last observation, not the time of the next refresh',()=>{
 assert(isTransatlantic(luanda,sao));assert(isTransatlantic(sao,luanda))
 assert(isTransatlantic({country:'United States',lat:40.64,lon:-73.78},{country:'United Arab Emirates',lat:25.25,lon:55.36}))
 assert(!isTransatlantic({country:'Brazil',lat:-23.43,lon:-46.47},{country:'Argentina',lat:-34.82,lon:-58.53}))
 assert(!isTransatlantic({...luanda,country:'Japan',lat:35,lon:139},{...sao,country:'United States',lat:34,lon:-118}))
 const f={observedAt:100000,lat:-9,lon:13.5,gs:480,type:'B77W',from:'NBJ',to:'GRU',source:'radar'}
 const a=estimatedArrival(f,sao);assert(a.eta>100000);assert.equal(a.etaSource,'position');assert.deepEqual(estimatedArrival({...f},sao),a)
 const full=enrichLiveEstimate(f,new Map([['NBJ',luanda],['GRU',sao]]));assert.equal(full.transatlantic,true);assert.equal(full.lastSeenPlace,'Luanda (NBJ)')
 assert.equal(estimatedArrival({...f,arrivesAt:10000000},sao).eta,10000000)
 assert.deepEqual(estimatedArrival(f,undefined),{})
 assert.equal(estimatedArrival({...f,gs:50},sao).etaSource,'route','taxi/climb speeds must not imply a multi-day ocean crossing')
})
const special=load('lib/brasileirinho.ts')
test('Brasileirinho has one aircraft, no invented flight codes and 24 sequential user-supplied legs through 30 October',()=>{
 assert.equal(load('lib/aircraft-db.ts').matchAircraft('F33A Bonanza').match.icao,'BE33')
 assert.equal(special.BRASILEIRINHO.fleetSize,1);assert.equal(special.BRASILEIRINHO.registration,'PS-BZR');assert.equal(special.BRASILEIRINHO.iata,'');assert.equal(special.BRASILEIRINHO.icao,'');assert.equal(special.BRASILEIRINHO.asOf,'2026-10-30')
 assert.equal(special.brasileirinhoLegs.length,24)
 for(let i=1;i<24;i++)assert.equal(special.brasileirinhoLegs[i-1].to.icao,special.brasileirinhoLegs[i].from.icao)
 assert.equal(special.brasileirinhoStops[8].country,'GD','Granada refers to Grenada in the Caribbean')
 assert.equal(special.brasileirinhoLegs[23].to.icao,'LOWS')
 assert(special.specialQuery('brasileirinho'));assert(special.specialQuery('PS-BZR'));assert(special.isBrasileirinho({reg:'ps-bzr'}));assert(!special.isBrasileirinho({reg:'PS-ABC',type:'BE33'}))
})
test('special airline search works independently of commercial catalog availability and keeps other Bonanzas out',async()=>{
 const api=loader({'next/server':{NextResponse:{json:body=>body}},'@/lib/db':{getDb:async()=>{throw Error('not available')}},'@/lib/live':{live:async()=>[{hex:'ABC123',reg:'PS-BZR'},{hex:'ABC124',reg:'PS-OTHER'}]}})('app/api/search/route.ts')
 const result=await api.GET(new Request('http://test/?q=brasileirinho'))
 assert.equal(result.airlines[0].id,'brasileirinho');assert.equal(result.flights.length,1);assert.equal(result.flights[0].reg,'PS-BZR');assert.equal(result.routes.length,0)
})
const {rememberRouteNumbers,knownRouteNumbers}=load('lib/route-number-memory.ts'),{currentFlights}=load('lib/live-model.ts')
test('observed numbers and actual aircraft survive live expiry without being presented as currently airborne',()=>{
 const now=200000,f={hex:'ABC123',callsign:'DTA653',flightNumber:'DT653',airlineIata:'DT',airlineIcao:'DTA',from:'NBJ',to:'LIS',observedAt:now,type:'B77W',reg:'D2-XXX',onGround:false,source:'radar',expiresAt:now+1000}
 const memory=rememberRouteNumbers([], [f],now)
 assert.equal(memory[0].aircraftType,'B77W');assert.equal(memory[0].registration,'D2-XXX')
 assert.deepEqual(currentFlights([f],now+2000),[])
 assert.equal(knownRouteNumbers(memory,{iata:'DT',icao:'DTA'},'NBJ','LIS',now+2000)[0].number,'DT653')
 assert.deepEqual(knownRouteNumbers(memory,{iata:'TP',icao:'TAP'},'NBJ','LIS',now+2000),[])
 assert.deepEqual(knownRouteNumbers(memory,{iata:'DT',icao:'DTA'},'LIS','NBJ',now+2000),[])
 assert.deepEqual(rememberRouteNumbers([], [{...f,flightNumber:'DTA6AB'},{...f,flightNumber:'PSBZR'},{...f,source:'timetable'},{...f,onGround:true}],now),[])
 assert.deepEqual(rememberRouteNumbers(memory,[],now+181*86400000),[])
})
const {parseAirfieldRadar,mergeRadarStations}=load('lib/radar-airports.ts')
test('small airfields and heliports contribute only sampling coordinates, with explicit latitude/longitude and no closed fields',()=>{
 const data='ident,type,latitude_deg,longitude_deg\nSMALL,small_airport,40,-74\nHEL,heliport,-27,-48\nOLD,closed,20,30\nBAD,small_airport,91,30'
 const points=parseAirfieldRadar(data);assert.equal(points.length,2);assert.deepEqual(points[0],{id:'SMALL',lat:40,lon:-74})
 assert.equal(mergeRadarStations(points,[{id:'same',lat:40,lon:-74}]).length,2)
})
if(process.env.AIRFIELD_SOURCE)test('full public airfield source includes active small fields without modifying any site catalog',()=>{
 const rows=parseAirfieldRadar(fs.readFileSync(process.env.AIRFIELD_SOURCE,'utf8'))
 assert(rows.length>30000);assert(rows.some(p=>p.id==='SDEN'));console.log('Active radar-only airfields/heliports:',rows.length)
})
