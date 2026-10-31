const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cache=new Map()
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);new Function('require','exports','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),mod.exports,mod);return mod.exports}
const {canDiscoverGlobe,buildGlobeDiscovery,discoveryContext}=load(path.resolve('lib/globe-discovery.ts'))
const airports=[['NBJ','Luanda','Angola'],['LIS','Lisbon','Portugal'],['AMS','Amsterdam','Netherlands'],['XXX','Unused','Angola']].map(([iata,city,country])=>({iata,icao:'X'+iata,name:city+' Airport',city,country,lat:0,lon:0}))
const airlines=[{id:'dta',iata:'DT',icao:'DTA',name:'TAAG',country:'Angola',active:true},{id:'tap',iata:'TP',icao:'TAP',name:'TAP',country:'Portugal',active:true},{id:'old',iata:'XX',icao:'OLD',name:'Retired',country:'Angola',active:false}]
const route=(id,from,to)=>({airlineId:id,from,to,codeshare:false,equip:[]})
const routes=[route('dta','NBJ','LIS'),route('dta','LIS','NBJ'),route('tap','NBJ','LIS'),route('tap','LIS','NBJ'),route('tap','LIS','AMS'),route('tap','AMS','LIS')]
const db={airports:new Map(airports.map(a=>[a.iata,a])),airlines:new Map(airlines.map(a=>[a.id,a])),hubs:new Map([['dta',['NBJ']],['tap',['LIS']]]),routesByAirline:new Map(airlines.map(a=>[a.id,routes.filter(r=>r.airlineId===a.id)])),routesByAirport:new Map(airports.map(a=>[a.iata,routes.filter(r=>r.from===a.iata||r.to===a.iata)]))}
test('discovery is available only in exploration on the home page, never on route or flight pages',()=>{
 assert(canDiscoverGlobe('/',true));assert(!canDiscoverGlobe('/',false));for(const path of ['/route/DT/NBJ-LIS','/flights/DT-NBJ-LIS/fly','/airports','/airlines','/live'])assert(!canDiscoverGlobe(path,true))
})
test('the catalog counts destinations once and distinguishes country domicile from airport operators',()=>{
 const data=buildGlobeDiscovery(db)
 assert.equal(data.airports.length,3);assert.equal(data.airlines.length,2)
 assert.equal(data.airports.find(a=>a.iata==='NBJ').destinations,1)
 assert.deepEqual(data.airports.find(a=>a.iata==='NBJ').airlineIds.sort(),['dta','tap'])
 assert.equal(data.countries.find(c=>c.code==='AO').airlines,1)
 assert.equal(data.countries.find(c=>c.code==='NL').airlines,0)
 assert.equal(data.airlines.find(a=>a.id==='tap').numRoutes,2)
})
test('country, airport and airline descriptions resolve their own context without assigning a foreign operator to the country',()=>{
 const data=buildGlobeDiscovery(db)
 assert.deepEqual(discoveryContext(data,{kind:'country',code:'AO'}).airlines.map(a=>a.id),['dta'])
 assert.deepEqual(discoveryContext(data,{kind:'airport',id:'NBJ'}).airlines.map(a=>a.id).sort(),['dta','tap'])
 const tap=discoveryContext(data,{kind:'airline',id:'tap'});assert.equal(tap.country.code,'PT');assert.deepEqual(tap.airline.hubs,['LIS'])
 assert.deepEqual(discoveryContext(data,{kind:'country',code:'UNKNOWN'}).airports,[])
})
test('bundled country geometry contains actual country polygons and identifiers used by the directory',()=>{
 const geo=JSON.parse(fs.readFileSync('public/globe/countries.geojson','utf8'))
 assert.equal(geo.type,'FeatureCollection');assert(geo.features.length>150)
 for(const code of ['AO','PT','NL','US','GB'])assert(geo.features.some(f=>f.properties.code===code&&['Polygon','MultiPolygon'].includes(f.geometry.type)))
})
