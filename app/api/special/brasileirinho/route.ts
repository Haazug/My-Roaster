import {NextResponse} from 'next/server'
import {live} from '@/lib/live'
import {BRASILEIRINHO,isBrasileirinho} from '@/lib/brasileirinho'
export async function GET(){
 try{return NextResponse.json({ok:true,profile:BRASILEIRINHO,observedAt:Date.now(),data:(await live('/reg/PS-BZR')).filter(isBrasileirinho)})}
 catch{return NextResponse.json({ok:false,profile:BRASILEIRINHO,data:[],error:'Registration source unavailable'},{status:502})}
}
