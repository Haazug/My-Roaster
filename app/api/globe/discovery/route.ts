import {NextResponse} from 'next/server'
import {getDb} from '@/lib/db'
import {buildGlobeDiscovery} from '@/lib/globe-discovery'
export async function GET(){
 try{return NextResponse.json(buildGlobeDiscovery(await getDb()),{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=86400'}})}
 catch{return NextResponse.json({error:'Discovery unavailable'},{status:503})}
}
