'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {accountId,readActive,compareFlight,canWriteFlight,deviceId,deviceKind,localActive,saveLocalActive,type ActiveFlight} from '@/lib/active-flight'
export function useFlightHandoff(flightId:string,snapshot:Omit<ActiveFlight,'runId'|'deviceId'|'deviceKind'|'revision'>|null,restore:(f:ActiveFlight)=>void){
 const [tick,setTick]=useState(0)
 const retryAfter=useRef(0)
 const [ready,setReady]=useState(false),[readOnly,setReadOnly]=useState(false),[syncError,setSyncError]=useState(false)
 const restoreRef=useRef(restore);restoreRef.current=restore
 const initialAccount=useRef<string|null|undefined>(undefined)
 const run=useRef(''),uid=useRef<string|null>(null),queue=useRef<ActiveFlight|null>(null),working=useRef(false),fingerprint=useRef('')
 useEffect(()=>{
  let live=true
  const boot=async()=>{
   setReady(false);fingerprint.current=''
   try{
    const nextAccount=await accountId()
    if(initialAccount.current!==undefined&&initialAccount.current!==nextAccount){queue.current=null;setReadOnly(true);window.location.assign('/');return}
    initialAccount.current=nextAccount;uid.current=nextAccount
    const local=localActive()
    let planCreated=0;try{planCreated=Number(JSON.parse(localStorage.getItem('myroster.activePlan')||'null')?.createdAt||0)}catch{}
    const freshPlan=planCreated>Number(local?.startedAt||0)
    run.current=crypto.randomUUID()
    if(!freshPlan&&local&&local.flightId===flightId&&!local.finished&&local.deviceId===deviceId()&&(!local.accountId||local.accountId===uid.current)){
     run.current=local.runId;restoreRef.current(local)
    }
    if(uid.current){const remote=await readActive(uid.current);if(!live)return
     if(remote&&!remote.value.finished&&remote.value.deviceId!==deviceId()){setReadOnly(true)}
     else if(remote&&planCreated<=remote.value.startedAt&&remote.value.flightId===flightId&&!remote.value.finished){run.current=remote.value.runId;restoreRef.current(remote.value);setReadOnly(false)}
     else setReadOnly(false)
    }
   }catch{if(live)setSyncError(true)}finally{if(live)setReady(true)}
  }
  const resume=()=>{const local=localActive();if(local&&local.flightId===flightId&&local.deviceId===deviceId()){run.current=local.runId;restoreRef.current(local);setReadOnly(false);fingerprint.current=''}}
  boot();window.addEventListener('myroster:resume-flight',resume)
  const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'){queue.current=null;setReadOnly(true);setTimeout(boot,0)}})
  return()=>{live=false;window.removeEventListener('myroster:resume-flight',resume);data.subscription.unsubscribe()}
 },[flightId])
 useEffect(()=>{
  if(!ready||!snapshot||readOnly)return
  const serialized=JSON.stringify(snapshot)
  if(serialized===fingerprint.current&&!syncError&&!queue.current)return
  if(syncError&&Date.now()<retryAfter.current)return
  fingerprint.current=serialized
  const value:ActiveFlight={...snapshot,runId:run.current,deviceId:deviceId(),deviceKind:deviceKind(),revision:0,...(uid.current?{accountId:uid.current}:{})}
  saveLocalActive(value)
  if(!uid.current)return
  queue.current=value
  const flush=async()=>{
   if(working.current)return;working.current=true
   let attempts=0,inFlight:ActiveFlight|undefined
   try{while(queue.current&&uid.current&&attempts++<3){const next=queue.current;inFlight=next;queue.current=null;const user=uid.current
    const previous=await readActive(user)
    if(!canWriteFlight(previous?.value||null,next,deviceId())){setReadOnly(true);break}
    const saved=await compareFlight(user,previous,next)
    if(!saved){const latest=await readActive(user);if(latest?.value.deviceId!==deviceId()){setReadOnly(true);break};queue.current=next}
    else setSyncError(false)
   }}catch{queue.current ||= inFlight||value;retryAfter.current=Date.now()+8000;setSyncError(true)}finally{working.current=false}
  }
  flush()
 },[snapshot,ready,readOnly,syncError,tick])
 useEffect(()=>{
  const poll=async()=>{if(!uid.current)return;try{const row=await readActive(uid.current);if(row&&row.value.runId===run.current&&row.value.deviceId!==deviceId())setReadOnly(true)}catch{setSyncError(true)}}
  const timer=setInterval(()=>{poll();setTick(n=>n+1)},8000);return()=>clearInterval(timer)
 },[])
 const controlAllowed=async()=>{
  if(!ready||readOnly)return false
  if(!uid.current)return true
  try{const row=await readActive(uid.current);if(row&&((row.value.runId===run.current&&row.value.finished)||(!row.value.finished&&row.value.deviceId!==deviceId()))){setReadOnly(true);return false};return true}catch{setSyncError(true);return false}
 }
 const endControl=async()=>{
  if(!await controlAllowed())return false
  const local=localActive();if(!local||local.runId!==run.current)return false
  const ended={...local,finished:true}
  if(uid.current){try{const previous=await readActive(uid.current);if(previous?.value.runId!==run.current||previous.value.deviceId!==deviceId())return false;const row=await compareFlight(uid.current,previous,ended);if(!row)return false}catch{setSyncError(true);return false}}
  saveLocalActive(ended);return true
 }
 return {ready,readOnly,syncError,controlAllowed,endControl,runId:run.current}
}
