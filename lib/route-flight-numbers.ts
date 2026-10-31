import {currentFlights,flightNumberPart,type ResolvedFlight} from './live-model'
export type RouteFlightNumber={number:string;callsign:string;observedAt:number;aircraftType?:string;registration?:string}
export function routeFlightNumbers(flights:ResolvedFlight[],airline:{iata?:string;icao?:string},from:string,to:string,now=Date.now()):RouteFlightNumber[]{
 const found=new Map<string,RouteFlightNumber>()
 for(const f of currentFlights(flights,now).sort((a,b)=>b.observedAt-a.observedAt)){
  if(f.from!==from||f.to!==to||!((airline.iata&&f.airlineIata===airline.iata)||(airline.icao&&f.airlineIcao===airline.icao)))continue
  if(airline.icao&&f.airlineIcao&&f.airlineIcao!==airline.icao)continue
  if(airline.iata&&f.airlineIata&&f.airlineIata!==airline.iata)continue
  const part=flightNumberPart(f.flightNumber,airline.iata||'',airline.icao||'')
  if(!part)continue
  const number=`${airline.iata||airline.icao}${part}`
  if(!found.has(number))found.set(number,{number,callsign:f.callsign,observedAt:f.observedAt,...(f.type?{aircraftType:f.type}:{}),...(f.reg?{registration:f.reg}:{})})
 }
 return [...found.values()]
}
