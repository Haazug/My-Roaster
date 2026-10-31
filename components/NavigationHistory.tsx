'use client'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import BackLink from './BackLink'
export default function NavigationHistory(){
 const path=usePathname(),[local,setLocal]=useState(true)
 useEffect(()=>{
  const push=history.pushState,replace=history.replaceState
  let initialDepth=0
  try{if(history.length>1&&document.referrer&&new URL(document.referrer).origin===location.origin)initialDepth=1}catch{}
  if(!Number.isFinite(history.state?.myrosterDepth))replace.call(history,{...history.state,myrosterDepth:initialDepth},'')
  const wrappedPush:History['pushState']=function(data,title,url){push.call(history,{...data,myrosterDepth:Number(history.state?.myrosterDepth||0)+1},title,url)}
  const wrappedReplace:History['replaceState']=function(data,title,url){replace.call(history,{...data,myrosterDepth:Number(history.state?.myrosterDepth||0)},title,url)}
  history.pushState=wrappedPush;history.replaceState=wrappedReplace
  return()=>{if(history.pushState===wrappedPush)history.pushState=push;if(history.replaceState===wrappedReplace)history.replaceState=replace}
 },[])
 useEffect(()=>{const main=document.querySelector('main');const check=()=>setLocal(!!document.querySelector('[data-page-back-link]'));check();const observer=new MutationObserver(check);if(main)observer.observe(main,{childList:true,subtree:true});return()=>observer.disconnect()},[path])
 const fallback=path.startsWith('/logs/')?'/trips':path.startsWith('/airlines/')?'/airlines':path.startsWith('/airports/')?'/airports':'/'
 return path==='/'||local?null:<BackLink global href={fallback} className="fixed left-3 top-2 z-40 inline-flex min-h-10 items-center gap-2 rounded-full bg-black/60 px-3 text-xs text-white/60 backdrop-blur lg:left-5"/>
}
