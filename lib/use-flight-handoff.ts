'use client'
import {useEffect,useRef,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {accountId,readActive,readCurrentFlight,finishLocalFlight,flushEndedFlights,compareFlight,canWriteFlight,deviceId,deviceKind,localActive,saveLocalActive,type ActiveFlight} from '@/lib/active-flight'
export function useFlightHandoff(flightId:string,snapshot:Omit<ActiveFlight,'runId'|'deviceId'|'deviceKind'|'revision'>|null,restore:(f:ActiveFlight)=>void){
 const [tick,setTick]=useState(0)
 const retryAfter=useRef(0)
 const [inactive,setInactive]=useState(false)
 const [ready,setReady]=useState(false),[readOnly,setReadOnly]=useState(false),[syncError,setSyncError]=useState(false)
 const restoreRef=useRef(restore);restoreRef.current=restore
 const initialAccount=useRef<string|null|undefined>(undefined)
 const syncedRun=useRef('')
 const run=useRef(''),uid=useRef<string|null>(null),queue=useRef<ActiveFlight|null>(null),working=useRef(false),fingerprint=useRef('')
 useEffect(()=>{
  let live=true
  const boot=async()=>{
   setReady(false);setInactive(false);fingerprint.current=''
   try{
    const nextAccount=await accountId()
    if(initialAccount.current!==undefined&&initialAccount.current!==nextAccount){queue.current=null;setReadOnly(true);window.location.assign('/');return}
    initialAccount.current=nextAccount;uid.current=nextAccount
    const local=localActive()
    let planCreated=0;try{planCreated=Number(JSON.parse(localStorage.getItem('myroster.activePlan')||'null')?.createdAt||0)}catch{}
    const freshPlan=planCreated>Number(local?.startedAt||0)
    if(!freshPlan&&local?.finished&&local.flightId===flightId&&(!local.accountId||local.accountId===uid.current)){setReadOnly(true);setInactive(true);return}
    run.current=crypto.randomUUID()
    if(!freshPlan&&local&&local.flightId===flightId&&!local.finished&&local.deviceId===deviceId()&&(!local.accountId||local.accountId===uid.current)){
     run.current=local.runId;restoreRef.current(local)
    }
    if(uid.current){await flushEndedFlights(uid.current);const remote=await readCurrentFlight(uid.current);if(!live)return
     if(remote?.value.runId===run.current)syncedRun.current=remote.value.runId
     if(!freshPlan&&local?.accountId===uid.current&&local.flightId===flightId&&(!remote||remote.value.runId!==local.runId||remote.value.finished)){queue.current=null;saveLocalActive({...local,finished:true});setReadOnly(true);setInactive(true);return}
     if(remote&&!remote.value.finished&&remote.value.deviceId!==deviceId()){setReadOnly(true);if(!freshPlan&&remote.value.flightId===flightId){run.current=remote.value.runId;syncedRun.current=remote.value.runId;restoreRef.current(remote.value)}}
     else if(remote&&planCreated<=remote.value.startedAt&&remote.value.flightId===flightId&&!remote.value.finished){run.current=remote.value.runId;syncedRun.current=remote.value.runId;restoreRef.current(remote.value);setReadOnly(false)}
     else setReadOnly(false)
    }
   }catch{if(live)setSyncError(true)}finally{if(live)setReady(true)}
  }
  const resume=()=>{const local=localActive();if(local&&!local.finished&&local.flightId===flightId&&local.deviceId===deviceId()){run.current=local.runId;syncedRun.current=local.runId;restoreRef.current(local);setReadOnly(false);fingerprint.current=''}}
  boot();window.addEventListener('myroster:resume-flight',resume)
  const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'){queue.current=null;setReadOnly(true);setTimeout(boot,0)}})
  return()=>{live=false;window.removeEventListener('myroster:resume-flight',resume);data.subscription.unsubscribe()}
 },[flightId])
 useEffect(()=>{
  if(!ready||!snapshot||readOnly||inactive)return
  const local=localActive();if(local?.runId===run.current&&local.finished&&!snapshot.finished)return
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
    if(!canWriteFlight(previous?.value||null,next,deviceId(),syncedRun.current)){setReadOnly(true);if(!previous){saveLocalActive({...next,finished:true});setInactive(true)};break}
    const saved=await compareFlight(user,previous,next)
    if(!saved){const latest=await readActive(user);if(latest?.value.deviceId!==deviceId()){setReadOnly(true);break};queue.current=next}
    else {syncedRun.current=saved.value.runId;setSyncError(false)}
   }}catch{queue.current ||= inFlight||value;retryAfter.current=Date.now()+8000;setSyncError(true)}finally{working.current=false}
  }
  flush()
 },[snapshot,ready,readOnly,syncError,tick])
 useEffect(()=>{
  const poll=async()=>{if(!uid.current||!run.current)return;try{
   await flushEndedFlights(uid.current)
   const row=await readCurrentFlight(uid.current),local=localActive()
   if(local?.runId===run.current&&local.finished)return
   if((!row&&syncedRun.current===run.current)||(row&&row.value.runId!==run.current&&local?.accountId===uid.current)||(row?.value.runId===run.current&&row.value.finished)){
    queue.current=null;setReadOnly(true);setInactive(true)
    if(local?.runId===run.current)saveLocalActive({...local,finished:true})
    return
   }
   if(row?.value.runId===run.current&&row.value.deviceId!==deviceId()){setReadOnly(true);restoreRef.current(row.value)}
  }catch{setSyncError(true)}}
  const timer=setInterval(()=>{poll();setTick(n=>n+1)},8000);return()=>clearInterval(timer)
 },[])
 const controlAllowed=async()=>{
  if(!ready||readOnly)return false
  if(!uid.current)return true
  try{const row=await readCurrentFlight(uid.current);if(!row&&syncedRun.current===run.current){const local=localActive();if(local?.runId===run.current)saveLocalActive({...local,finished:true});setReadOnly(true);setInactive(true);return false};if(row&&((row.value.runId===run.current&&row.value.finished)||(!row.value.finished&&row.value.deviceId!==deviceId()))){setReadOnly(true);return false};return true}catch{setSyncError(true);return false}
 }
 const endControl=async(savedLogId?:string)=>{
  if(!ready||readOnly||inactive)return false
  const local=localActive();if(!local||local.runId!==run.current)return false
  queue.current=null
  await finishLocalFlight(local,uid.current,savedLogId)
  return true
 }

 return {ready,inactive,readOnly,syncError,controlAllowed,endControl,runId:run.current}
}
