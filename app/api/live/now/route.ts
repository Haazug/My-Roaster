import { NextResponse,after } from 'next/server'
import { discoverFlights,discoverSupplementalRadar } from '@/lib/live-discovery'

export const maxDuration=60

export async function GET() {
  try {
    const result=await discoverFlights(undefined,{radar:false})
    after(async()=>{await discoverSupplementalRadar()})
    return NextResponse.json({ok:true,...result})
  } catch {
    return NextResponse.json({ ok: false, data: [], error: 'Live traffic unavailable' }, { status: 502 })
  }
}
