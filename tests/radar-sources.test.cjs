const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function loadDb(){const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='server-only'?{}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name),mod,mod.exports);return mod.exports}return load('lib/db.ts')}
const airports='1,"Airport","City","Country",AAA,XAAA,1,2,0,0,U,Etc/UTC,airport,OurAirports'
const facilities='ident,type,latitude_deg,longitude_deg\nDUP,large_airport,1,2\nMED,medium_airport,2,3\nFIELD,small_airport,4,5\nHEL,heliport,6,7\nWATER,seaplane_base,8,9\nBALLOON,balloonport,10,11\nCLOSED,closed,12,13'
for(const failure of ['none','airfields','airports','both'])test(`radar source union and independent fallback: ${failure}`,async()=>{
 const previous=global.fetch
 global.fetch=async url=>{
  const extra=String(url).includes('ourairports-data')
  if(failure==='both'||failure===(extra?'airfields':'airports'))throw Error('Source offline')
  return {ok:true,text:async()=>extra?facilities:String(url).endsWith('airports.dat')?airports:''}
 }
 try{
  const db=loadDb()
  if(failure==='both'){await assert.rejects(db.getRadarAirports(),/sources unavailable/);return}
  const points=await db.getRadarAirports()
  if(failure!=='airports')assert(points.some(p=>p.id==='AAA'))
  if(failure!=='airfields')for(const id of ['MED','FIELD','HEL','WATER','BALLOON'])assert(points.some(p=>p.id===id),id)
  assert(!points.some(p=>p.id==='CLOSED'))
  if(failure==='none'){
   assert(!points.some(p=>p.id==='DUP'),'the IATA airport identifier wins at identical coordinates')
   const visible=await db.getDb();assert(!visible.airports.has('HEL'));assert(!visible.airports.has('FIELD'))
  }
 }finally{global.fetch=previous}
})
