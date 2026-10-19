import 'server-only';
import { buildDb, type Db } from './openflights-parse';
const BASE='https://raw.githubusercontent.com/jpatokal/openflights/master/data/';
let cache:{at:number;p:Promise<Db>}|null=null;
const get=async(n:string)=>{const r=await fetch(BASE+n,{cache:'no-store'});if(!r.ok)throw new Error(`${n}: HTTP ${r.status}`);return r.text()};
export function getDb(){if(!cache||Date.now()-cache.at>864e5){const p=Promise.all([get('routes.dat'),get('airlines.dat'),get('airports.dat')]).then(([r,a,p])=>buildDb(r,a,p));cache={at:Date.now(),p};p.catch(()=>{cache=null})}return cache.p}
