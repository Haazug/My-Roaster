'use client'
import {useState,useEffect,useCallback} from 'react'
// The query lives in this history entry, so Back restores the results rather than an empty search.
export function usePageQuery(){
 const [q,setQ]=useState('')
 useEffect(()=>{const read=()=>setQ(new URL(location.href).searchParams.get('q')||'');read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read)},[])
 const update=useCallback((value:string)=>{setQ(value);const url=new URL(location.href);if(value)url.searchParams.set('q',value);else url.searchParams.delete('q');history.replaceState(null,'',url.pathname+url.search+url.hash)},[])
 return [q,update] as const
}
