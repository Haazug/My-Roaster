import {parseCsvLine} from './openflights-parse'
// Coordinates are sampling stations only, never additions to the visible airport/route catalog.
export type RadarAirport={id:string;lat:number;lon:number;kind?:'airport'|'airfield'|'heliport'|'seaplane'|'balloonport'}
export function parseRadarAirports(text:string):RadarAirport[]{
 const stations=new Map<string,RadarAirport>()
 for(const line of text.split(/\r?\n/)){
  if(!line)continue
  const r=parseCsvLine(line),lat=Number(r[6]),lon=Number(r[7])
  if(r.length<8||!r[6]||!r[7]||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue
  const id=r[4]||r[5]||`OF-${r[0]}`
  stations.set(id,{id,lat,lon,kind:'airport'})
 }
 stations.set('NBJ',{id:'NBJ',lat:-9.0507,lon:13.4991,kind:'airport'})
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

export function parseAirfieldRadar(text:string):RadarAirport[]{
 const [header,...lines]=text.split(/\r?\n/),names=parseCsvLine(header),idx=(name:string)=>names.indexOf(name)
 const latIndex=idx('latitude_deg'),lonIndex=idx('longitude_deg'),idIndex=idx('ident'),typeIndex=idx('type')
 if([latIndex,lonIndex,idIndex,typeIndex].some(i=>i<0))throw Error('Invalid airfield source')
 const out:RadarAirport[]=[]
 for(const line of lines){
  if(!line)continue
  const row=parseCsvLine(line),lat=Number(row[latIndex]),lon=Number(row[lonIndex])
  if(row[typeIndex]==='closed'||!row[idIndex]||!row[latIndex]||!row[lonIndex]||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue
  const type=row[typeIndex],kind:RadarAirport['kind']=type==='large_airport'||type==='medium_airport'?'airport':type==='heliport'?'heliport':type==='seaplane_base'?'seaplane':type==='balloonport'?'balloonport':'airfield'
  out.push({id:row[idIndex],lat,lon,kind})
 }
 return out
}
export function mergeRadarStations(...sources:RadarAirport[][]){
 const stations=new Map<string,RadarAirport>()
 for(const source of sources)for(const point of source){const key=`${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;if(!stations.has(key))stations.set(key,point)}
 return [...stations.values()].sort((a,b)=>a.id.localeCompare(b.id))
}

// Keep airports, airfields/water bases and helicopter landing sites represented in every
// normal batch. Smaller groups wrap while the largest completes a full sweep.
export function mixedRadarBatch(stations:RadarAirport[],offset:number|undefined,limit:number,now=Date.now()){
 const groups=[stations.filter(p=>!p.kind||p.kind==='airport'),stations.filter(p=>p.kind==='airfield'||p.kind==='seaplane'||p.kind==='balloonport'),stations.filter(p=>p.kind==='heliport')].filter(g=>g.length)
 limit=Math.max(0,Math.floor(limit))
 if(!groups.length)return {points:[],nextOffset:0,complete:true,total:0}
 if(limit<groups.length)return radarBatch(stations,radarOffset(offset,stations.length,limit,now),limit)
 const quotas=groups.map((_,i)=>Math.floor(limit/groups.length)+(i<limit%groups.length?1:0))
 const cycles=Math.max(...groups.map((g,i)=>Math.ceil(g.length/quotas[i])))
 const phase=offset!==undefined&&Number.isFinite(offset)&&offset>=0?Math.floor(offset)%cycles:Math.floor(now/45000)%cycles
 const points:RadarAirport[]=[],seen=new Set<string>()
 for(let turn=0;turn<Math.max(...quotas);turn++)for(let i=0;i<groups.length;i++){
  if(turn>=quotas[i])continue
  const point=groups[i][(phase*quotas[i]+turn)%groups[i].length],key=`${point.lat.toFixed(4)},${point.lon.toFixed(4)}`
  if(!seen.has(key)){seen.add(key);points.push(point)}
 }
 return {points,nextOffset:(phase+1)%cycles,complete:phase+1>=cycles,total:stations.length}
}
