const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cache=new Map()
function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(key=>key.startsWith('@/')?load(path.resolve(key.slice(2)+'.ts')):key.startsWith('.')?load(path.resolve(path.dirname(file),key+'.ts')):require(key),m,m.exports);return m.exports}
const {parseRadarAirports,radarBatch,radarOffset}=load(path.resolve('lib/radar-airports.ts'))
test('radar stations retain airports without IATA or site routes and reject invalid coordinates',()=>{
 const rows=['1,"Airport, One","City","Country",AAA,XAAA,0,0','2,"No IATA","City","Country",\\N,ZZZZ,-12,10','3,"No codes","City","Country",\\N,\\N,45,30','4,"Invalid","City","Country",BAD,XBAD,NaN,3','5,"Invalid","City","Country",OUT,XOUT,95,3']
 const stations=parseRadarAirports(rows.join('\n'))
 assert(stations.some(a=>a.id==='AAA'&&a.lat===0))
 assert(stations.some(a=>a.id==='ZZZZ'))
 assert(stations.some(a=>a.id==='OF-3'))
 assert(stations.some(a=>a.id==='NBJ'))
 assert(!stations.some(a=>['BAD','OUT'].includes(a.id)))
})
test('bounded batches visit every radar coordinate and restart only after a complete sweep',()=>{
 const airports=Array.from({length:17},(_,i)=>({id:String(i),lat:0,lon:i})),seen=[]
 let offset=0,complete=false
 while(!complete){const batch=radarBatch(airports,offset,6);seen.push(...batch.points.map(p=>p.id));offset=batch.nextOffset;complete=batch.complete;assert(batch.points.length<=6)}
 assert.equal(offset,0);assert.deepEqual(seen,airports.map(p=>p.id))
 assert.equal(radarBatch(airports,999,6).points[0].id,'0')
 assert.equal(radarBatch([],0,6).complete,true)
})

if(process.env.RADAR_SOURCE)test('the full source includes every usable source coordinate, including stations absent from the directory',()=>{
 const text=fs.readFileSync(process.env.RADAR_SOURCE,'utf8'),stations=parseRadarAirports(text)
 assert(stations.length>7000)
 assert(stations.some(s=>s.id.length!==3))
 console.log('Radar source stations:',stations.length,'; stations without IATA:',stations.filter(s=>s.id.length!==3).length)
})

test('serverless cold starts rotate by time instead of repeatedly scanning only the first airports',()=>{
 const airports=Array.from({length:17},(_,i)=>({id:String(i),lat:0,lon:i})),seen=[]
 for(let slot=0;slot<3;slot++)seen.push(...radarBatch(airports,radarOffset(undefined,17,6,slot*45_000),6).points.map(p=>p.id))
 assert.deepEqual(seen,airports.map(p=>p.id))
 assert.equal(radarOffset(0,17,6,90_000),0,'a stored cursor takes precedence')
})

test('merging sources preserves an existing IATA airport instead of replacing it with the second source identifier',()=>{
 const {mergeRadarStations}=load(path.resolve('lib/radar-airports.ts'))
 const merged=mergeRadarStations([{id:'LIS',lat:38.77,lon:-9.13,kind:'airport'}],[{id:'LPPT',lat:38.77,lon:-9.13,kind:'airport'},{id:'HELI',lat:38.8,lon:-9.2,kind:'heliport'}])
 assert.equal(merged.length,2);assert(merged.some(p=>p.id==='LIS'));assert(!merged.some(p=>p.id==='LPPT'))
})
test('every normal batch mixes airports, airfields and helicopter sites, even with many more helipads',()=>{
 const {mixedRadarBatch}=load(path.resolve('lib/radar-airports.ts'))
 const stations=[...Array.from({length:5},(_,i)=>({id:'AIR'+i,lat:0,lon:i,kind:'airport'})),...Array.from({length:9},(_,i)=>({id:'FIELD'+i,lat:10,lon:i,kind:'airfield'})),...Array.from({length:21},(_,i)=>({id:'HEL'+i,lat:20,lon:i,kind:'heliport'})),{id:'WATER',lat:30,lon:1,kind:'seaplane'},{id:'BALLOON',lat:30,lon:2,kind:'balloonport'}]
 const seen=new Set();let cursor=0,complete=false
 for(let n=0;n<50&&!complete;n++){
  const batch=mixedRadarBatch(stations,cursor,6,0)
  assert(batch.points.length<=6);assert(batch.points.some(p=>p.kind==='airport'));assert(batch.points.some(p=>p.kind==='heliport'));assert(batch.points.some(p=>['airfield','seaplane','balloonport'].includes(p.kind)))
  batch.points.forEach(p=>seen.add(p.id));cursor=batch.nextOffset;complete=batch.complete
 }
 assert(complete);assert.equal(seen.size,stations.length)
 for(const at of [0,45000,90000000])assert(mixedRadarBatch(stations,undefined,6,at).points.some(p=>p.kind==='airport'))
})
if(process.env.RADAR_SOURCE&&process.env.AIRFIELD_SOURCE)test('full merged radar keeps airports alongside airfields and helipads in real mixed batches',()=>{
 const {parseAirfieldRadar,mergeRadarStations,mixedRadarBatch}=load(path.resolve('lib/radar-airports.ts'))
 const points=mergeRadarStations(parseRadarAirports(fs.readFileSync(process.env.RADAR_SOURCE,'utf8')),parseAirfieldRadar(fs.readFileSync(process.env.AIRFIELD_SOURCE,'utf8')))
 const counts={};for(const point of points)counts[point.kind]=(counts[point.kind]||0)+1
 assert(counts.airport>7000);assert(counts.airfield>10000);assert(counts.heliport>1000)
 for(const at of [0,45000,Date.now()]){const batch=mixedRadarBatch(points,undefined,6,at);assert(batch.points.some(p=>p.kind==='airport'));assert(batch.points.some(p=>p.kind==='heliport'));assert(batch.points.some(p=>['airfield','seaplane','balloonport'].includes(p.kind)))}
 console.log('Merged radar types:',counts,'; total:',points.length)
})
