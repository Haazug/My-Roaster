'use client'
import {supabase} from '@/lib/supabase'
export const ACTIVE_KEY='myroster.activeFlight'
export type ActiveFlight={runId:string;flightId:string;deviceId:string;deviceKind:string;plan:any;statuses:Record<string,'done'|'skipped'>;takeoffAt:number|null;startedAt:number;finished:boolean;holding:boolean;holdSince:number|null;holdTotal:number;holdCount:number;goArounds:number;stepLog:Record<string,{status:string;at:number}>;fired:string[];savedLogId?:string|null;revision:number;accountId?:string}
export type FlightRow={value:ActiveFlight;updated_at:string}
export function deviceId(){let id=sessionStorage.getItem('myroster.deviceId');if(!id){id=crypto.randomUUID();sessionStorage.setItem('myroster.deviceId',id)}return id}
export function deviceKind(){return /iPad|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent))?'tablet':/Mobi|Android/i.test(navigator.userAgent)?'phone':'computer'}
export function localActive():ActiveFlight|null{try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch{return null}}
export function saveLocalActive(flight:ActiveFlight){localStorage.setItem(ACTIVE_KEY,JSON.stringify(flight));window.dispatchEvent(new CustomEvent('myroster:active-flight',{detail:flight}))}
export async function accountId(){const {data}=await supabase.auth.getSession();return data.session?.user.id||null}
export async function readActive(uid:string):Promise<FlightRow|null>{const {data,error}=await supabase.from('user_data').select('value,updated_at').eq('user_id',uid).eq('key',ACTIVE_KEY).maybeSingle();if(error)throw new Error('Flight sync unavailable');return data as FlightRow|null}
export async function compareFlight(uid:string,previous:FlightRow|null,value:ActiveFlight):Promise<FlightRow|null>{
 const updated_at=new Date(Math.max(Date.now(),Date.parse(previous?.updated_at||'')+1||0)).toISOString()
 const row={user_id:uid,key:ACTIVE_KEY,value:{...value,accountId:uid,revision:(previous?.value.revision||0)+1},updated_at}
 const request=previous?supabase.from('user_data').update({value:row.value,updated_at}).eq('user_id',uid).eq('key',ACTIVE_KEY).eq('updated_at',previous.updated_at):supabase.from('user_data').insert(row)
 const {data,error}=await request.select('value,updated_at').maybeSingle()
 if(error?.code==='23505')return null
 if(error)throw new Error('Flight sync unavailable')
 return data as FlightRow|null
}
export async function claimFlight(uid:string,runId:string){
 const previous=await readActive(uid)
 if(!previous||previous.value.runId!==runId||previous.value.finished)return null
 return compareFlight(uid,previous,{...previous.value,deviceId:deviceId(),deviceKind:deviceKind()})
}

export function canWriteFlight(previous:ActiveFlight|null,next:ActiveFlight,device:string){
 if(!previous)return true
 if(previous.runId===next.runId)return previous.deviceId===device&&(!previous.finished||next.finished)
 return previous.finished||previous.deviceId===device
}
