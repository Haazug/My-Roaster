'use client'
import useSWR from 'swr'
import type {DiscoveryCatalog} from './globe-discovery'
const fetcher=async(url:string)=>{const response=await fetch(url);if(!response.ok)throw Error('Discovery unavailable');return response.json()}
export function useGlobeDiscovery(active:boolean){return useSWR<DiscoveryCatalog>(active?'/api/globe/discovery':null,fetcher,{revalidateOnFocus:false,shouldRetryOnError:false,dedupingInterval:60000})}
export function useGlobeCountries(active:boolean){return useSWR(active?'/globe/countries.geojson':null,fetcher,{revalidateOnFocus:false,shouldRetryOnError:false,dedupingInterval:3600000})}
