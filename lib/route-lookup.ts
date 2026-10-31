import 'server-only'

export type FlightRoute = {
  callsign: string
  flightNumber: string
  airlineName: string
  airlineIcao: string
  airlineIata: string
  from: string
  to: string
  fromIcao: string
  toIcao: string
  fromCity: string
  toCity: string
}

const pending = new Map<string, Promise<FlightRoute | null>>()
const cache = new Map<string, { at: number; value: FlightRoute | null }>()
export type LookupOptions={deadline?:number;priority?:number}
type Job={run:()=>Promise<void>;deadline:number;priority:number;reject:(error:Error)=>void}
const jobs:Job[]=[]
let active=0,blockedUntil=0
let wakeTimer:ReturnType<typeof setTimeout>|undefined
function drain(){
 if(wakeTimer){clearTimeout(wakeTimer);wakeTimer=undefined}
 jobs.sort((a,b)=>b.priority-a.priority)
 while(active<8&&jobs.length){
  const job=jobs[0]
  if(Date.now()>=job.deadline){jobs.shift();job.reject(new Error('Route lookup budget exhausted'));continue}
  if(Date.now()<blockedUntil){const at=Math.min(blockedUntil,...jobs.map(j=>j.deadline));wakeTimer=setTimeout(drain,Math.max(1,at-Date.now()));return}
  jobs.shift();active++
  job.run().finally(()=>{active--;drain()})
 }
}
function queuedLookup(key:string,options:LookupOptions):Promise<FlightRoute|null>{
 return new Promise((resolve,reject)=>{
  const deadline=options.deadline??Date.now()+12000
  jobs.push({deadline,priority:options.priority??20,reject,run:async()=>{try{resolve(await fetchRoute(key,deadline))}catch(error){reject(error)}}})
  drain()
 })
}
const fix = (c: string) => (c === 'LAD' ? 'NBJ' : c)
const fixIcao = (c: string) => (c === 'FNLU' ? 'FNBJ' : c)

export async function lookupCallsign(cs: string, options:LookupOptions={}): Promise<FlightRoute | null> {
  const key = String(cs || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3,8}$/.test(key)) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.value ? 5 * 60_000 : 60_000)) return hit.value
  const active = pending.get(key)
  if (active) return active
  const work = queuedLookup(key,options)
  pending.set(key, work)
  try { return await work } finally { pending.delete(key) }
}

async function fetchRoute(key: string,deadline=Infinity): Promise<FlightRoute | null> {
    const remaining=Math.min(6000,deadline-Date.now())
    if(remaining<=0)throw new Error('Route lookup budget exhausted')
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${key}`, { cache: 'no-store', headers: { 'User-Agent': 'MyRoster' }, signal: AbortSignal.timeout(Math.max(1,Math.floor(remaining))) })
    if(res.status===429){const retry=res.headers?.get?.('retry-after')||'',seconds=Number(retry),until=retry&&Number.isFinite(seconds)?Date.now()+Math.max(1,seconds)*1000:Date.parse(retry);blockedUntil=Math.max(blockedUntil,Number.isFinite(until)?until:Date.now()+1000)}
    if (!res.ok && res.status !== 404) throw new Error(`Route provider HTTP ${res.status}`)
    let value: FlightRoute | null = null
    if (res.ok) {
      const f = (await res.json())?.response?.flightroute
      if (f?.origin?.iata_code && f?.destination?.iata_code) {
        value = {
          callsign: key,
          flightNumber: f.callsign_iata || '',
          airlineName: f.airline?.name || '',
          airlineIcao: f.airline?.icao || '',
          airlineIata: f.airline?.iata || '',
          from: fix(f.origin.iata_code),
          to: fix(f.destination.iata_code),
          fromIcao: fixIcao(f.origin.icao_code || ''),
          toIcao: fixIcao(f.destination.icao_code || ''),
          fromCity: f.origin.municipality || '',
          toCity: f.destination.municipality || '',
        }
      }
    }
    if (res.ok || res.status === 404) {
      if (cache.size >= 5000) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: Date.now(), value })
    }
    return value
}
