const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(supabase){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/active-flight.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({supabase}),m,m.exports);return m.exports}
const flight={runId:'run-1',flightId:'DT-NBJ-LIS',deviceId:'phone',deviceKind:'phone',finished:false,revision:1,plan:{from:'NBJ',to:'LIS'}}
function adapter(initial,collections=[]){let row=initial,offline=false;const db={from:()=>{
 const q={filters:{},patch:null,collection:false};const chain={select:()=>chain,eq:(k,v)=>{q.filters[k]=v;return chain},in:()=>{q.collection=true;return chain},update:patch=>{q.patch=patch;return chain},then:(ok,bad)=>Promise.resolve({data:collections,error:null}).then(ok,bad),maybeSingle:async()=>{
  if(offline)throw Error('offline')
  assert.equal(q.filters.user_id,'user-1');assert.equal(q.filters.key,'myroster.activeFlight')
  if(q.patch){if(!row||q.filters.updated_at!==row.updated_at)return {data:null};row=q.patch}
  return {data:row,error:null}
 }};return chain
 }};return {db,get row(){return row},set offline(v){offline=v}}}
function storage(){const old={localStorage:global.localStorage,window:global.window,CustomEvent:global.CustomEvent},data=new Map();global.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};global.window={dispatchEvent:()=>{}};global.CustomEvent=class{};return ()=>{for(const [k,v] of Object.entries(old)){if(v===undefined)delete global[k];else global[k]=v}}}
test('completed logs and deleted or ended scheduled trips invalidate only their own flight',()=>{
 const {flightHasEnded}=load({})
 assert(flightHasEnded(flight,[{id:'DT-NBJ-LIS-run-1'}],null))
 assert(!flightHasEnded(flight,[{id:'DT-NBJ-LIS-another-run'}],null))
 const scheduled={...flight,plan:{scheduleId:'booking-1'}}
 assert(flightHasEnded(scheduled,[],[]))
 assert(flightHasEnded(scheduled,[],[{id:'booking-1',status:'cancelled'}]))
 assert(!flightHasEnded(scheduled,[],[{id:'booking-1',status:'running'}]))
 assert(!flightHasEnded(scheduled,[],null),'an unavailable collection is not proof of removal')
})
test('completion evidence repairs an older stale active row before another device can claim it',async()=>{
 const a=adapter({value:flight,updated_at:'2026-10-31T10:00:00Z'},[{key:'myroster.logs',value:[{id:'DT-NBJ-LIS-run-1'}]}])
 const api=load(a.db),row=await api.readCurrentFlight('user-1')
 assert.equal(row.value.finished,true);assert.equal(a.row.value.finished,true)
 assert.equal(await api.claimFlight('user-1','run-1'),null)
})
test('finishing offline keeps a terminal update across navigation and delivers it after reconnecting',async()=>{
 const cleanup=storage(),a=adapter({value:flight,updated_at:'2026-10-31T10:00:00Z'}),api=load(a.db)
 try{
  a.offline=true;await api.finishLocalFlight(flight,'user-1','saved-log')
  assert.equal(api.localActive().finished,true)
  assert.equal(JSON.parse(localStorage.getItem('myroster.endedFlights')).length,1)
  a.offline=false;await api.flushEndedFlights('user-1')
  assert.equal(a.row.value.finished,true);assert.equal(a.row.value.savedLogId,'saved-log')
  assert.deepEqual(JSON.parse(localStorage.getItem('myroster.endedFlights')),[])
 }finally{cleanup()}
})
test('a pending terminal update never closes a different run or a run now controlled by another device',async()=>{
 for(const replacement of [{...flight,runId:'new-run'},{...flight,deviceId:'pc'}]){
  const cleanup=storage(),a=adapter({value:replacement,updated_at:'2026-10-31T10:00:00Z'}),api=load(a.db)
  try{await api.finishLocalFlight(flight,'user-1');assert.equal(a.row.value.finished,false);assert.deepEqual(JSON.parse(localStorage.getItem('myroster.endedFlights')),[])}finally{cleanup()}
 }
})
test('a known deleted remote run cannot be inserted again by its old timer, while a new run can start',()=>{
 const {canWriteFlight}=load({})
 assert.equal(canWriteFlight(null,flight,'phone','run-1'),false)
 assert.equal(canWriteFlight(null,{...flight,runId:'new'},'phone','run-1'),true)
})

test('legacy timestamp logs, saved summaries and final checklist states end old sessions without route-only matches',()=>{
 const {flightHasEnded}=load({}),f={...flight,startedAt:100000,takeoffAt:200000,statuses:{}}
 assert(flightHasEnded(f,[{id:'DT-NBJ-LIS-123456',orig:'NBJ',dest:'LIS',summary:{startedAt:100000}}],null))
 assert(flightHasEnded(f,[{id:'older-log',orig:'NBJ',dest:'LIS',departure:new Date(200000).toISOString()}],null))
 assert(!flightHasEnded(f,[{id:'older-log',orig:'NBJ',dest:'LIS',summary:{startedAt:90000}}],null))
 assert(!flightHasEnded({...f,runId:'11111111-1111-4111-8111-111111111111'},[{id:'DT-NBJ-LIS-22222222-2222-4222-8222-222222222222',orig:'NBJ',dest:'LIS',summary:{startedAt:100000}}],null),'a different explicit run must not match merely because its clock is close')
 assert(flightHasEnded({...f,savedLogId:'old-summary'},[],null))
 assert(flightHasEnded({...f,statuses:{'At gate':'done'}},[],null))
})
test('abandoned handoff sessions expire while long airborne flights, holds and fresh heartbeats remain valid',()=>{
 const {flightSessionExpired}=load({}),hour=3600000,start=Date.parse('2026-10-30T00:00:00Z')
 const row={value:{...flight,startedAt:start,takeoffAt:start,plan:{durationMin:600}},updated_at:new Date(start).toISOString()}
 assert(!flightSessionExpired(row,start+8*hour),'planned cruise duration protects a long flight')
 assert(flightSessionExpired(row,start+14*hour))
 assert(!flightSessionExpired({...row,value:{...row.value,heartbeatAt:start+14*hour}},start+15*hour))
 assert(!flightSessionExpired({...row,value:{...row.value,holding:true,holdSince:start+hour}},start+15*hour))
 assert(flightSessionExpired({...row,value:{...row.value,takeoffAt:null}},start+4*hour))
})
test('legacy local completion is migrated even when no terminal outbox was created by the old client',async()=>{
 const cleanup=storage(),a=adapter({value:flight,updated_at:'2026-10-31T10:00:00Z'}),api=load(a.db)
 try{api.saveLocalActive({...flight,finished:true,accountId:'user-1'});await api.flushEndedFlights('user-1');assert.equal(a.row.value.finished,true)}finally{cleanup()}
})
test('the authenticated user can close a ghost from another device but cannot close a newer replacement run',async()=>{
 const a=adapter({value:{...flight,deviceId:'other-phone'},updated_at:'2026-10-31T10:00:00Z'}),api=load(a.db)
 assert.equal(await api.closeSharedFlight('user-1','different-run'),null)
 assert.equal(a.row.value.finished,false)
 const ended=await api.closeSharedFlight('user-1','run-1')
 assert.equal(ended.value.finished,true);assert.equal(ended.value.endedReason,'user-ended')
 assert.equal(api.canWriteFlight(ended.value,flight,'other-phone'),false)
})
