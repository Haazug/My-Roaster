'use client'
import {useEffect,useState} from 'react'
import useSWR from 'swr'
import {cacheLiveFlights} from '@/lib/live-device-history'
import {routeFlightNumbers} from '@/lib/route-flight-numbers'
import type {ResolvedFlight} from '@/lib/live-model'
export function useRouteFlightNumbers(airline?:{iata?:string;icao?:string},from?:string,to?:string){
 const code=airline?.icao||airline?.iata
 const {data}=useSWR(code&&from&&to?`/api/live/route?airline=${encodeURIComponent(code)}&from=${from}&to=${to}`:null,async url=>{const r=await fetch(url);if(!r.ok)throw Error('Live lookup unavailable');const json=await r.json();return {...json,data:Array.isArray(json.data)?json.data:json.data?.aircraft||[]}},{refreshInterval:60000,revalidateOnFocus:false,shouldRetryOnError:false})
 const [cached,setCached]=useState<ResolvedFlight[]>([])
 useEffect(()=>{let active=true;const rows=Array.isArray(data?.data)?data.data:data?.data?.aircraft||[];cacheLiveFlights([...rows,...(data?.retired||[])]).then(rows=>{if(active)setCached(rows)}).catch(()=>{if(active)setCached(rows)});return()=>{active=false}},[data])
 return from&&to&&airline?routeFlightNumbers(cached,airline,from,to):[]
}
