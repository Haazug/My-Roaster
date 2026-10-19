import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export async function GET(){try{const db=await getDb();return NextResponse.json([...db.airlines.values()].map(a=>({...a,numRoutes:db.routesByAirline.get(a.id)?.length??0})).filter(a=>a.numRoutes>0).sort((a,b)=>b.numRoutes-a.numRoutes))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Data unavailable'},{status:503})}}
