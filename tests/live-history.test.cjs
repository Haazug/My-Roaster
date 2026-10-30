const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const ts = require('typescript')
function compile(file, adapters = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module = {exports:{}}
  new Function('require','module','exports',source)(name => Object.hasOwn(adapters,name) ? adapters[name] : require(name),module,module.exports)
  return { ...module.exports, source }
}
const { SqliteHistory, source } = compile('lib/live-history-sqlite.ts')
const { timetableRecord, AviationstackTimetable } = compile('lib/live-timetable.ts')
const { currentFlights, radarExpiry } = compile('lib/live-model.ts')
const now = Date.parse('2026-10-30T12:00:00Z')
const raw = patch => ({flight_date:'2026-10-30',flight_status:'active',departure:{iata:'NBJ',scheduled:'2026-10-30T10:00:00Z',actual:'2026-10-30T10:05:00Z'},arrival:{iata:'LIS',scheduled:'2026-10-30T17:00:00Z'},airline:{iata:'DT',icao:'DTA',name:'TAAG'},flight:{iata:'DT653',icao:'DTA653'},...patch})

test('SQLite survives a new process and guards against older observations overwriting terminal state', async () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roster-history-')), file=path.join(dir,'history.sqlite')
 const store=new SqliteHistory(file)
 try {
   const f=timetableRecord(raw({}),now)
   await store.write([f],now)
   await store.setSync('active',{checkedAt:now,nextOffset:100,complete:false,total:200})
   store.close()
   fs.writeFileSync(path.join(dir,'store.cjs'),source)
   const result=JSON.parse(execFileSync(process.execPath,['-e',`const {SqliteHistory}=require(${JSON.stringify(path.join(dir,'store.cjs'))});(async()=>{const s=new SqliteHistory(${JSON.stringify(file)});console.log(JSON.stringify({flights:await s.read(${now}),sync:await s.getSync('active')}));s.close()})()`],{encoding:'utf8'}))
   assert.equal(result.flights[0].flightNumber,'DT653')
   assert.equal(result.sync.nextOffset,100)
   const reopened=new SqliteHistory(file)
   const landed=timetableRecord(raw({flight_status:'landed',arrival:{iata:'LIS',actual:'2026-10-30T12:00:00Z'}}),now+1000)
   await reopened.write([landed],now+1000)
   await reopened.write([f],now+2000)
   const rows=await reopened.read(now+2000)
   assert.equal(rows[0].terminal,true)
   const probe=new (require('node:sqlite').DatabaseSync)(file)
   assert.equal(probe.prepare('select count(*) as count from live_events').get().count,2,'only initial and terminal service transitions are journaled')
   probe.close()
   assert.deepEqual(currentFlights(rows,now+2000),[])
   reopened.close()
 } finally { fs.rmSync(dir,{recursive:true,force:true}) }
})

test('only active/actual-departure evidence yields an uncertain airborne estimate, never a passed schedule alone', () => {
 assert.equal(timetableRecord(raw({flight_status:'scheduled',departure:{iata:'NBJ',scheduled:'2026-10-30T10:00:00Z'}}),now),null)
 const flight=timetableRecord(raw({}),now)
 assert.equal(flight.status,'estimated')
 assert.equal(flight.remainingMinutes,null)
 assert.equal(flight.source,'timetable')
 assert.equal(currentFlights([flight],now)[0].flightNumber,'DT653')
 assert.deepEqual(currentFlights([flight],Date.parse('2026-10-30T18:01:00Z')),[])
 assert.equal(timetableRecord(raw({departure:{iata:'NBJ',scheduled:'2026-10-30T10:00:00'}}),now),null,'ambiguous local times are rejected')
})

test('landed/cancelled/diverted services suppress their old estimates, not a different flight using the same aircraft', () => {
 const active=timetableRecord(raw({aircraft:{icao24:'ABC123'}}),now)
 for(const status of ['landed','cancelled','diverted']){
  const terminal=timetableRecord(raw({flight_status:status,aircraft:{icao24:'ABC123'}}),now+1000)
  const next={...active,flightNumber:'DT655',updatedAt:now,departedAt:now}
  assert.deepEqual(currentFlights([active,terminal],now+1000),[])
  assert.equal(currentFlights([next,terminal],now+1000).length,1)
 }
})

test('timetable pagination is checkpointed, resumed and cached, and airport directions use separate scopes', async () => {
 const states=new Map(), rows=[]
 const history={getSync:async k=>states.get(k),setSync:async(k,s)=>states.set(k,s),write:async r=>rows.push(...r)}
 const requests=[]
 const provider=new AviationstackTimetable(history,'test-only',async url=>{
   requests.push(new URL(url))
   const offset=Number(url.searchParams.get('offset'))
   return new Response(JSON.stringify({data:offset===0?Array.from({length:100},()=>raw({})): [raw({})],pagination:{total:101}}),{status:200})
 },1)
 const first=await provider.sync()
 assert.equal(first.complete,false)
 assert.equal(states.get('active').nextOffset,100)
 await provider.sync()
 assert.equal(requests.length,1,'cached partial page does not spend another metered request')
 states.get('active').checkedAt-=301000
 assert.equal((await provider.sync()).complete,true)
 assert.equal(requests[1].searchParams.get('offset'),'100')
 await provider.sync('NBJ')
 assert.equal(requests[2].searchParams.get('dep_iata'),'NBJ')
 assert.equal(requests[3].searchParams.get('arr_iata'),'NBJ')
 assert(!requests[2].searchParams.has('flight_status'),'airport refresh includes terminal/cancelled updates')
})

test('provider authentication/quota failures are not cached as an empty successful board', async () => {
 let saved=false
 const provider=new AviationstackTimetable({getSync:async()=>null,setSync:async()=>{saved=true},write:async()=>{}},'test-only',async()=>new Response(JSON.stringify({error:{code:'usage_limit_reached'}})))
 await assert.rejects(()=>provider.sync(),/Timetable provider rejected/)
 assert.equal(saved,false)
})


test('a lost long-haul position remains an explicit estimate until its bounded uncertainty window expires', () => {
 const expiresAt=radarExpiry(now,3000,500)
 assert.equal(expiresAt,now+7*3600_000)
 const flight={...timetableRecord(raw({}),now),source:'radar',hex:'ABC123',observedAt:now,expiresAt}
 assert.equal(currentFlights([flight],now+2*3600_000)[0].status,'estimated')
 assert.equal(currentFlights([flight],now+2*3600_000)[0].remainingMinutes,null)
 assert.deepEqual(currentFlights([flight],expiresAt+1),[])
 assert.equal(radarExpiry(now,3000,0),now+20*60000)
 assert.equal(radarExpiry(now,20000,100),now+18*3600_000)
 assert(Number.isInteger(radarExpiry(now,2431.47,487)),'persistent bigint expiry must use integer milliseconds')
})


test('the background sync endpoint requires a valid token and requests the larger background batch', async () => {
 const prior=process.env.LIVE_SYNC_TOKEN
 process.env.LIVE_SYNC_TOKEN='test-only-sync-token'
 try {
   let args
   const route=compile('app/api/live/sync/route.ts',{
    'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},
    '@/lib/live-discovery':{discoverFlights:async(...values)=>{args=values;return {data:[{}],degraded:false}}},
   })
   assert.equal((await route.GET(new Request('https://test/api/live/sync'))).status,401)
   const good=await route.GET(new Request('https://test/api/live/sync',{headers:{authorization:'Bearer test-only-sync-token'}}))
   assert.equal(good.status,200)
   assert.equal(good.body.count,1)
   assert.deepEqual(args,[undefined,{background:true}])
 } finally { if(prior===undefined) delete process.env.LIVE_SYNC_TOKEN;else process.env.LIVE_SYNC_TOKEN=prior }
})
