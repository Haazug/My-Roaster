'use client'
import {useEffect,useState} from 'react'
import useSWR from 'swr'
import {cacheLiveFlights} from '@/lib/live-device-history'
import {observedRouteNumbers,knownRouteNumbers,type LearnedRouteNumber} from '@/lib/route-number-memory'
import {routeFlightNumbers} from '@/lib/route-flight-numbers'
import type {ResolvedFlight} from '@/lib/live-model'
export function useRouteFlightNumbers(airline?:{iata?:string;icao?:string},from?:string,to?:string){
 const code=airline?.icao||airline?.iata
 const {data}=useSWR(code&&from&&to?`/api/live/route?airline=${encodeURIComponent(code)}&from=${from}&to=${to}`:null,async url=>{const r=await fetch(url);if(!r.ok)throw Error('Live lookup unavailable');const json=await r.json();return {...json,data:Array.isArray(json.data)?json.data:json.data?.aircraft||[]}},{refreshInterval:60000,revalidateOnFocus:false,shouldRetryOnError:false})
 const [cached,setCached]=useState<ResolvedFlight[]>([]),[learned,setLearned]=useState<LearnedRouteNumber[]>([])
 useEffect(()=>{let active=true;const rows=Array.isArray(data?.data)?data.data:data?.data?.aircraft||[];cacheLiveFlights([...rows,...(data?.retired||[])]).then(rows=>{if(active)setCached(rows);return observedRouteNumbers()}).then(rows=>{if(active)setLearned(rows)}).catch(()=>{if(active)setCached(rows)});return()=>{active=false}},[data])
 if(!from||!to||!airline)return []
 const known=knownRouteNumbers(learned,airline,from,to),current=routeFlightNumbers(cached,airline,from,to)
 return [...new Map([...known,...current].map(n=>[n.number,n])).values()]
}
