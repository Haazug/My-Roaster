import {parseCsvLine} from './openflights-parse'
// Coordinates are sampling stations only, never additions to the visible airport/route catalog.
export type RadarAirport={id:string;lat:number;lon:number}
export function parseRadarAirports(text:string):RadarAirport[]{
 const stations=new Map<string,RadarAirport>()
 for(const line of text.split(/\r?\n/)){
  if(!line)continue
  const r=parseCsvLine(line),lat=Number(r[6]),lon=Number(r[7])
  if(r.length<8||!r[6]||!r[7]||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue
  const id=r[4]||r[5]||`OF-${r[0]}`
  stations.set(id,{id,lat,lon})
 }
 stations.set('NBJ',{id:'NBJ',lat:-9.0507,lon:13.4991})
 return [...stations.values()].sort((a,b)=>a.id.localeCompare(b.id))
}
export function radarBatch(airports:RadarAirport[],offset:number,limit:number){
 const start=Number.isFinite(offset)&&offset>=0&&offset<airports.length?Math.floor(offset):0
 const points=airports.slice(start,start+Math.max(0,Math.floor(limit)))
 const complete=start+points.length>=airports.length
 return {points,nextOffset:complete?0:start+points.length,complete,total:airports.length}
}

// A serverless cold start must not keep restarting at the first alphabetic airport.
export function radarOffset(previous:number|undefined,total:number,limit:number,now=Date.now()){
 if(previous!==undefined)return previous
 return total>0&&limit>0?(Math.floor(now/45_000)%Math.ceil(total/limit))*limit:0
}
