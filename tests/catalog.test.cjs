const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
const cache=new Map()
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');new Function('require','exports','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(key=>key.startsWith('@/')?load(key.slice(2)+'.ts'):require(key),mod.exports,mod);return mod.exports}
const {buildDb,searchRoutes}=load('lib/openflights-parse.ts'),{mergeRoutes}=load('lib/route-merge.ts'),{allianceFor,plausibleOperatingRoute}=load('lib/airline-metadata.ts')
const airlines='1,"KLM","",KL,KLM,"","Netherlands",Y\n2,"Delta","",DL,DAL,"","United States",Y\n3,"Old KLM code","",KL,OLD,"","Elsewhere",N'
const ap=(id,code,country)=>`${id},"${code}","${code}","${country}",${code},X${code},1,2,0,0,U,Etc/UTC,airport,OurAirports`
const airports=[ap(1,'AMS','Netherlands'),ap(2,'ATL','United States'),ap(3,'ABQ','United States'),ap(4,'ABV','Nigeria'),ap(5,'PHC','Nigeria'),ap(6,'LHR','United Kingdom')].join('\n')
const rows=['KL,1,AMS,1,ATL,2,,0,777','KL,1,ATL,2,AMS,1,,0,777','KL,1,ATL,2,ABQ,3,Y,0,CRJ','KL,1,ABV,4,PHC,5,,0,737','DL,1,ATL,2,ABQ,3,,0,777','KL,999,AMS,1,LHR,6,,0,737','KL,1,AMS,1,LHR,6,,1,737','KL,3,AMS,1,LHR,6,,0,737']
test('all entry points exclude codeshares, foreign domestic legs, mismatched IDs, stops and inactive operators',()=>{
 const db=buildDb(rows.join('\n'),airlines,airports)
 assert.deepEqual(db.routesByAirline.get('1').map(r=>`${r.from}-${r.to}`).sort(),['AMS-ATL','ATL-AMS'])
 assert.equal(mergeRoutes(db.routesByAirline.get('1')).length,1)
 assert.deepEqual(db.hubs.get('1'),['AMS'])
 assert.equal(db.routesByAirline.get('3').length,0)
 assert(!db.routesByAirport.get('ABQ')?.some(r=>r.airlineId==='1'))
 assert.equal(searchRoutes(db,'KL123').length,0)
})
test('multi-base European airlines keep plausible foreign bases while foreign domestic routes are excluded',()=>{
 assert(plausibleOperatingRoute('RYR','Ireland','United Kingdom','Spain'))
 assert(!plausibleOperatingRoute('RYR','Ireland','United States','United States'))
 assert(!plausibleOperatingRoute('KLM','Netherlands','Nigeria','Nigeria'))
 assert(plausibleOperatingRoute('KLM','Netherlands','Netherlands','United States'))
 assert.equal(allianceFor('KLM'),'SkyTeam');assert.equal(allianceFor('DLH'),'Star Alliance');assert.equal(allianceFor('BAW'),'oneworld')
})
if(process.env.CATALOG_DIR){test('full OpenFlights audit across every company',()=>{
 const dir=process.env.CATALOG_DIR,db=buildDb(fs.readFileSync(path.join(dir,'routes.dat'),'utf8'),fs.readFileSync(path.join(dir,'airlines.dat'),'utf8'),fs.readFileSync(path.join(dir,'airports.dat'),'utf8'))
 let count=0
 for(const [id,routes] of db.routesByAirline){const al=db.airlines.get(id);for(const r of routes){assert(!r.codeshare);assert(al.active);assert(plausibleOperatingRoute(al.icao,al.country,db.airports.get(r.from).country,db.airports.get(r.to).country));count++}}
 const klm=[...db.airlines.values()].find(a=>a.icao==='KLM'),klRoutes=db.routesByAirline.get(klm.id)
 assert.deepEqual(db.hubs.get(klm.id),['AMS']);assert(!klRoutes.some(r=>['ABQ','PHC'].includes(r.from)||['ABQ','PHC'].includes(r.to)))
 for(const code of ['KLM','RYR','AFR','DLH','BAW','DTA']){const a=[...db.airlines.values()].find(a=>a.icao===code&&a.active);const routes=db.routesByAirline.get(a.id)||[];const countries=new Set(routes.flatMap(r=>[db.airports.get(r.from).country,db.airports.get(r.to).country]));console.log(code,JSON.stringify({pairs:mergeRoutes(routes).length,countries:countries.size,hubs:db.hubs.get(a.id)}))}
 console.log('Validated operating legs:',count)
})}

test('closed passenger airports, ceased airlines and suspended networks cannot reappear from the old source',()=>{
 const {CLOSED_AIRPORTS,RETIRED_OPERATORS}=load('lib/airline-metadata.ts')
 const db=buildDb(['KL,1,AMS,1,TXL,7,,0,737','KL,1,AMS,1,MSQ,9,,0,737','AB,4,FRA,8,AMS,1,,0,737'].join('\n'),airlines+'\n4,Air Berlin,,AB,BER,,Germany,Y',airports+'\n'+[ap(7,'TXL','Germany'),ap(8,'FRA','Germany'),ap(9,'MSQ','Belarus')].join('\n'))
 assert.equal(db.routesByAirline.get('1').length,0)
 assert.equal(db.routesByAirline.get('4').length,0)
 assert.equal(db.airlines.get('4').active,false)
 assert(!db.routesByAirport.get('TXL'))
 assert(!plausibleOperatingRoute('KLM','Netherlands','Netherlands','Ukraine'))
 assert(!plausibleOperatingRoute('KLM','Netherlands','Netherlands','Russia'))
 assert(!plausibleOperatingRoute('AFL','Russia','Russia','France'))
 assert(plausibleOperatingRoute('THY','Turkey','Turkey','Russia'))
})
