import 'server-only';
import {parseRadarAirports,type RadarAirport} from './radar-airports';
import { buildDb, type Db } from './openflights-parse';
const BASE='https://raw.githubusercontent.com/jpatokal/openflights/master/data/';
let cache:{at:number;p:Promise<Db>}|null=null;
const get=async(n:string)=>{const r=await fetch(BASE+n,{cache:'no-store'});if(!r.ok)throw new Error(`${n}: HTTP ${r.status}`);return r.text()};
let airportCache:{at:number;p:Promise<string>}|null=null;
function airportText(){if(!airportCache||Date.now()-airportCache.at>864e5){const p=get('airports.dat');airportCache={at:Date.now(),p};p.catch(()=>{airportCache=null})}return airportCache.p}
let radarCache:{source:Promise<string>;p:Promise<RadarAirport[]>}|null=null;
export function getRadarAirports(){const source=airportText();if(radarCache?.source!==source)radarCache={source,p:source.then(parseRadarAirports)};return radarCache!.p}
export function getDb(){if(!cache||Date.now()-cache.at>864e5){const p=Promise.all([get('routes.dat'),get('airlines.dat'),airportText()]).then(([r,a,p])=>buildDb(r,a,p));cache={at:Date.now(),p};p.catch(()=>{cache=null})}return cache.p}
