const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(name,adapters={}){const mod={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{if(Object.hasOwn(adapters,name))return adapters[name];throw Error(name)},mod.exports,mod);return mod.exports}
const {departureChoice,tripState,progressFraction,splitRoute,calendarEvent}=load('lib/flight-workflow.ts')
test('a different local departure minute warns and a passed time schedules the next day, including midnight',()=>{
 const now=new Date(2026,9,30,23,55).getTime()
 assert.equal(departureChoice('23:55',now).differs,false)
 const next=new Date(departureChoice('00:05',now).scheduledAt)
 assert.equal(next.getDate(),31);assert.equal(next.getHours(),0);assert.equal(next.getMinutes(),5)
 assert.throws(()=>departureChoice('25:99',now))
})
test('missing the start time becomes delayed, never automatically completed by the elapsed schedule',()=>{
 assert.equal(tripState({scheduledAt:1000},999),'scheduled')
 assert.equal(tripState({scheduledAt:1000},1000),'delayed')
 assert.equal(tripState({scheduledAt:1000},100000000),'cancelled')
 assert.equal(tripState({scheduledAt:1000,startedAt:2000},3000),'running')
 assert.equal(tripState({scheduledAt:1000,startedAt:2000,endedAt:3000},4000),'completed')
 assert.equal(tripState({departure:'ignored'}),'booked')
})
test('progress is bounded and splits the actual multi-leg route, including the international date line',()=>{
 assert.equal(progressFraction(5,0),0);assert.equal(progressFraction(-1,10),0);assert.equal(progressFraction(11,10),1)
 const points=[{lat:0,lon:170},{lat:0,lon:180},{lat:0,lon:-170}]
 const {done,remaining}=splitRoute(points,0.25)
 assert(Math.abs(done.at(-1).lon-175)<0.01)
 assert.deepEqual(done.at(-1),remaining[0])
 assert.equal(splitRoute(points,0).done.length,0)
 assert.equal(splitRoute(points,1).remaining.length,0)
})
test('calendar reminders use absolute UTC time and escape event content',()=>{
 const event=calendarEvent('booking','DT653, NBJ; LIS\nReminder',Date.UTC(2026,9,30,12),60,'https://example.com/trips')
 assert(event.includes('DTSTART:20261030T120000Z'))
 assert(event.includes('DTEND:20261030T130000Z'))
 assert(event.includes('TRIGGER:PT0M'))
 assert(event.includes('SUMMARY:DT653\\, NBJ\\; LIS\\nReminder'))
})
test('a handoff uses compare-and-swap: a stale owner cannot overwrite a newer claim or another account',async()=>{
 let stored={value:{runId:'run-1',deviceId:'pc',revision:1},updated_at:'2026-10-30T12:00:00.000Z'}
 const queries=[]
 const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'user-1'}}}})},from:()=>{
  const q={method:'read',filters:{},payload:null};queries.push(q)
  const chain={select:()=>chain,eq:(k,v)=>{q.filters[k]=v;return chain},update:p=>{q.method='update';q.payload=p;return chain},insert:p=>{q.method='insert';q.payload=p;return chain},maybeSingle:async()=>{
   if(q.method==='update'){
    if(q.filters.user_id!=='user-1'||q.filters.key!=='myroster.activeFlight'||q.filters.updated_at!==stored.updated_at)return {data:null,error:null}
    stored=q.payload;return {data:stored,error:null}
   }
   return {data:stored,error:null}
  }};return chain
 }}
 const {compareFlight}=load('lib/active-flight.ts',{'@/lib/supabase':{supabase}})
 const old=structuredClone(stored)
 const claim=await compareFlight('user-1',old,{runId:'run-1',deviceId:'phone',revision:1,takeoffAt:1000,statuses:{Takeoff:'done'}})
 assert.equal(claim.value.deviceId,'phone')
 assert.equal(claim.value.takeoffAt,1000)
 assert.equal(await compareFlight('user-1',old,{runId:'run-1',deviceId:'pc'}),null)
 assert.equal(await compareFlight('other-user',claim,{runId:'run-1',deviceId:'other'}),null)
 assert.equal(stored.value.deviceId,'phone')
})


test('an old device cannot resurrect the same run after it completed elsewhere; a new run remains possible',()=>{
 const {canWriteFlight}=load('lib/active-flight.ts',{'@/lib/supabase':{supabase:{}}})
 const done={runId:'one',deviceId:'phone',finished:true}
 assert.equal(canWriteFlight(done,{runId:'one',deviceId:'pc',finished:false},'pc'),false)
 assert.equal(canWriteFlight(done,{runId:'one',deviceId:'phone',finished:false},'phone'),false)
 assert.equal(canWriteFlight(done,{runId:'two',deviceId:'pc',finished:false},'pc'),true)
 assert.equal(canWriteFlight({...done,finished:false},{runId:'two',deviceId:'pc',finished:false},'pc'),false)
})


test('a handoff device with no cached bookings completes only the matching account trip',async()=>{
 const originals={localStorage:global.localStorage,window:global.window,CustomEvent:global.CustomEvent}
 const cache=new Map()
 global.localStorage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)}
 global.window={dispatchEvent:()=>{}}
 global.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail}}
 let row={updated_at:'2026-10-30T12:00:00.000Z',value:[{id:'one',startedAt:100,status:'running'},{id:'two',scheduledAt:999999,status:'scheduled'}]}
 const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'user-1'}}}})},from:()=>{
  const q={filters:{},patch:null}
  const chain={select:()=>chain,eq:(k,v)=>{q.filters[k]=v;return chain},update:v=>{q.patch=v;return chain},maybeSingle:async()=>{
   assert.equal(q.filters.user_id,'user-1');assert.equal(q.filters.key,'myroster.bookings')
   if(q.patch){assert.equal(q.filters.updated_at,row.updated_at);row=q.patch;return {data:{updated_at:row.updated_at},error:null}}
   return {data:row,error:null}
  }};return chain
 }}
 try{
  const {updateTripStatus}=load('lib/trip-client.ts',{'@/lib/supabase':{supabase}})
  await updateTripStatus('one',{endedAt:200,status:'completed'})
  assert.equal(row.value.length,2)
  assert.equal(row.value[0].startedAt,100)
  assert.equal(row.value[0].status,'completed')
  assert.equal(row.value[1].status,'scheduled')
  assert.equal(JSON.parse(cache.get('myroster.bookings')).length,2)
 }finally{for(const [key,value] of Object.entries(originals)){if(value===undefined)delete global[key];else global[key]=value}}
})
