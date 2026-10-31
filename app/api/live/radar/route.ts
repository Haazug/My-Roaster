import {NextResponse} from 'next/server'
import {discoverFlights} from '@/lib/live-discovery'
export const maxDuration=60
export async function GET(){
 try{return NextResponse.json({ok:true,...await discoverFlights(undefined,{stations:false,global:false})})}
 catch{return NextResponse.json({ok:false,data:[],error:'Supplemental radar unavailable'},{status:502})}
}
