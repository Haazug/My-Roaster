import 'server-only'

type Raw = { hex?: string; flight?: string; lat?: number; lon?: number; alt_baro?: number | 'ground'; gs?: number; track?: number; nav_altitude_mcp?: number; geom_rate?: number; squawk?: string; on_ground?: boolean; t?: string; r?: string }
export type LiveAircraft = { hex:string; callsign:string; reg?:string; type?:string; lat:number; lon:number; altFt:number|null; onGround:boolean; gs?:number; track?:number; vs?:number; squawk?:string }
const primary = process.env.LIVE_API_BASE || 'https://api.adsb.lol/v2'
const fallback = 'https://api.airplanes.live/v2'
const cache = new Map<string,{at:number; value:LiveAircraft[]}>()
let queue: Promise<unknown> = Promise.resolve()
const wait = (ms:number) => new Promise(r=>setTimeout(r,ms))
function normalize(x:Raw):LiveAircraft|null { if(typeof x.lat !== 'number' || typeof x.lon !== 'number' || !x.hex) return null; return {hex:x.hex.toUpperCase(),callsign:(x.flight||'').trim(),reg:x.r||undefined,type:x.t||undefined,lat:x.lat,lon:x.lon,altFt:typeof x.alt_baro==='number'?x.alt_baro:null,onGround:x.alt_baro==='ground'||Boolean(x.on_ground),gs:x.gs,track:x.track,vs:x.geom_rate,squawk:x.squawk} }
async function upstream(path:string, base=primary):Promise<LiveAircraft[]> { const key=base+path, old=cache.get(key); if(old && Date.now()-old.at<15000) return old.value; const run=queue.then(async()=>{const last=cache.get(key); if(last && Date.now()-last.at<15000) return last.value; const res=await fetch(base+path,{headers:{'User-Agent':'MyRoster-personal-project'},cache:'no-store'}); if(!res.ok) throw new Error(String(res.status)); const json=await res.json(); const rows=Array.isArray(json)?json:(json.ac||json.aircraft||[]); const value=rows.map(normalize).filter(Boolean) as LiveAircraft[]; cache.set(key,{at:Date.now(),value}); return value}); queue=run.catch(()=>{}).then(()=>wait(500)); try{return await run}catch(e){ console.error('[live] falhou',base+path,String(e)); if(base===primary) return upstream(path,fallback); return old?.value||[] }}
export async function live(path:string){return upstream(path)}
export async function liveRoute(points:{lat:number;lon:number}[]){const merged=new Map<string,LiveAircraft>(); for(const p of points){for(const ac of await live(`/point/${p.lat}/${p.lon}/200`)) merged.set(ac.hex,ac)} return [...merged.values()]}
