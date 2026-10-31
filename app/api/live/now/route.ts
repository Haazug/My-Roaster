import { NextResponse,after } from 'next/server'
import { discoverFlights,discoverSupplementalRadar } from '@/lib/live-discovery'

export const maxDuration=60

export async function GET(request:Request) {
  try {
    const cursor=request?new URL(request.url).searchParams.get('cursor'):null
    if(cursor!==null&&cursor!=='start'&&!/^[A-F0-9]{6,8}$/.test(cursor))return NextResponse.json({ok:false,error:'Invalid cursor'},{status:400})
    const seen=(request?new URL(request.url).searchParams.get('seen')||'':'').split(',').filter(hex=>/^[A-F0-9]{6,8}$/.test(hex)).slice(0,400)
    const result=await discoverFlights(undefined,{radar:false,seen,cursor:cursor??undefined,stations:cursor===null||cursor==='start'})
    if(cursor===null)after(async()=>{await discoverSupplementalRadar()})
    return NextResponse.json({ok:true,...result})
  } catch {
    return NextResponse.json({ ok: false, data: [], error: 'Live traffic unavailable' }, { status: 502 })
  }
}
