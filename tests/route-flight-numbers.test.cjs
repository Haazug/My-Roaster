const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cache=new Map()
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);new Function('require','exports','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),mod.exports,mod);return mod.exports}
const {routeFlightNumbers}=load(path.resolve('lib/route-flight-numbers.ts'))
const flight=(patch={})=>({hex:'ABC123',callsign:'KLM4XY',flightNumber:'KL123',airlineIata:'KL',airlineIcao:'KLM',airlineName:'KLM',from:'AMS',to:'LHR',fromCity:'Amsterdam',toCity:'London',lat:52,lon:4,altFt:30000,onGround:false,observedAt:1000,expiresAt:100000,status:'observed',remainingMinutes:null,...patch})
test('route numbers match the actual direction and operator, without turning callsigns or unrelated flights into numbers',()=>{
 const rows=[flight(),flight({hex:'ABC124',flightNumber:'KL124',from:'LHR',to:'AMS'}),flight({hex:'ABC125',flightNumber:'AF125',airlineIata:'AF',airlineIcao:'AFR'}),flight({hex:'ABC126',flightNumber:'KLM6AB'}),flight({hex:'ABC127',flightNumber:'KL127',airlineIcao:'DAL'})]
 assert.deepEqual(routeFlightNumbers(rows,{iata:'KL',icao:'KLM'},'AMS','LHR',2000),[{number:'KL123',callsign:'KLM4XY',observedAt:1000}])
 assert.equal(routeFlightNumbers(rows,{iata:'KL',icao:'KLM'},'LHR','AMS',2000)[0].number,'KL124')
})
test('expired, terminal and on-ground observations do not offer a currently airborne flight number',()=>{
 assert.deepEqual(routeFlightNumbers([flight({expiresAt:1500}),flight({hex:'ABC124',flightNumber:'KL124',onGround:true}),flight({hex:'ABC125',flightNumber:'KL125',terminal:true})],{iata:'KL',icao:'KLM'},'AMS','LHR',2000),[])
})
test('a missing provider number stays empty and duplicates retain the most recent valid identity',()=>{
 assert.deepEqual(routeFlightNumbers([flight({flightNumber:''}),flight({hex:'ABC124',flightNumber:'KL'})],{iata:'KL',icao:'KLM'},'AMS','LHR',2000),[])
 const numbers=routeFlightNumbers([flight(),flight({hex:'ABC124',callsign:'KLM123',observedAt:1500})],{iata:'KL',icao:'KLM'},'AMS','LHR',2000)
 assert.deepEqual(numbers,[{number:'KL123',callsign:'KLM123',observedAt:1500}])
})
