const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(name){const mod={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);return mod.exports}
const {mergeLiveHistory}=load('lib/live-device-history.ts'),{currentFlights}=load('lib/live-model.ts')
const flight=patch=>({id:'radar:ABC123',hex:'ABC123',callsign:'DTA653',flightNumber:'DT653',airlineIata:'DT',airlineIcao:'DTA',airlineName:'TAAG',from:'NBJ',to:'LIS',fromCity:'Luanda',toCity:'Lisbon',lat:-9,lon:13,altFt:35000,onGround:false,observedAt:1000,updatedAt:1000,expiresAt:1000000,source:'radar',status:'observed',remainingMinutes:null,...patch})
test('device history survives an empty source response without refreshing observation timestamps',()=>{
 const rows=mergeLiveHistory([flight({})],[],100000)
 assert.equal(rows[0].observedAt,1000)
 assert.equal(currentFlights(rows,100000)[0].status,'estimated')
 assert.deepEqual(mergeLiveHistory(rows,[],1000001),[])
})
test('new ground state invalidates a cached flight and a late response cannot resurrect it',()=>{
 const ground=flight({onGround:true,terminal:true,updatedAt:2000,observedAt:2000})
 const rows=mergeLiveHistory([flight({})],[ground],3000)
 assert.deepEqual(currentFlights(rows,3000),[])
 const delayed=mergeLiveHistory(rows,[flight({})],4000)
 assert.equal(delayed[0].onGround,true)
})
test('new interface messages include all five languages without English fallback',()=>{
 const {interfaceText}=load('lib/interface-i18n.ts')
 for(const [key,values] of Object.entries(interfaceText)){assert.equal(values.length,5,key);assert(values.every(v=>typeof v==='string'&&v.trim()),key)}
 assert.equal(interfaceText['settings.title'][1],'Definições')
 assert.equal(interfaceText['live.title'][3],'En direct')
})
