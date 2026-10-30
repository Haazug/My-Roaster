import {redirect} from 'next/navigation'
import {lookupCallsign} from '@/lib/route-lookup'
import {findAirline} from '@/lib/openflights-parse'
import {getDb} from '@/lib/db'
export default async function FlightDetailPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 const parts=id.toUpperCase().split('-')
 if(parts.length===3){redirect(`/route/${encodeURIComponent(parts[0])}/${parts[1]}-${parts[2]}`)}
 const compact=id.replace(/[-\s]/g,'').toUpperCase()
 const db=await getDb()
 for(const length of [3,2]){
  const al=findAirline(db,compact.slice(0,length)),num=compact.slice(length)
  if(!al||!/^\d{1,4}[A-Z]?$/.test(num))continue
  const route=await lookupCallsign(`${al.icao}${num}`).catch(()=>null)
  if(route&&route.airlineIcao===al.icao)redirect(`/route/${al.iata||al.icao}/${route.from}-${route.to}?flight=${encodeURIComponent(route.flightNumber||compact)}`)
 }
 redirect(`/search?q=${encodeURIComponent(compact)}`)
}
