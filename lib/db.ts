import 'server-only';
import {parseRadarAirports,parseAirfieldRadar,mergeRadarStations,type RadarAirport} from './radar-airports';
import { buildDb, type Db } from './openflights-parse';
const BASE='https://raw.githubusercontent.com/jpatokal/openflights/master/data/';
let cache:{at:number;p:Promise<Db>}|null=null;
const get=async(n:string)=>{const r=await fetch(BASE+n,{cache:'no-store'});if(!r.ok)throw new Error(`${n}: HTTP ${r.status}`);return r.text()};
let airportCache:{at:number;p:Promise<string>}|null=null;
function airportText(){if(!airportCache||Date.now()-airportCache.at>864e5){const p=get('airports.dat');airportCache={at:Date.now(),p};p.catch(()=>{airportCache=null})}return airportCache.p}
let airfieldCache:{at:number;p:Promise<RadarAirport[]>}|null=null
function airfieldStations(){
 if(!airfieldCache||Date.now()-airfieldCache.at>864e5){
  const p=fetch('https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv',{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('Airfield radar source unavailable');return parseAirfieldRadar(await r.text())})
  const entry={at:Date.now(),p};airfieldCache=entry
  p.catch(()=>{if(airfieldCache===entry)entry.at=Date.now()-864e5+60000})
 }
 return airfieldCache.p
}
let radarCache:{airportSource:Promise<string>;airfieldSource:Promise<RadarAirport[]>;p:Promise<RadarAirport[]>}|null=null
export function getRadarAirports(){
 const airportSource=airportText(),airfieldSource=airfieldStations()
 if(radarCache?.airportSource===airportSource&&radarCache.airfieldSource===airfieldSource)return radarCache.p
 const p=Promise.allSettled([airportSource.then(parseRadarAirports),airfieldSource]).then(results=>{
  const available=results.filter((r):r is PromiseFulfilledResult<RadarAirport[]>=>r.status==='fulfilled').map(r=>r.value)
  if(!available.length)throw Error('Radar station sources unavailable')
  // Source order preserves existing airport identifiers; one failed source never drops the other.
  return mergeRadarStations(...available)
 })
 const entry={airportSource,airfieldSource,p};radarCache=entry
 p.catch(()=>{if(radarCache===entry)radarCache=null})
 return p
}
export function getDb(){if(!cache||Date.now()-cache.at>864e5){const p=Promise.all([get('routes.dat'),get('airlines.dat'),airportText()]).then(([r,a,p])=>buildDb(r,a,p));cache={at:Date.now(),p};p.catch(()=>{cache=null})}return cache.p}
