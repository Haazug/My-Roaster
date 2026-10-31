import {NextResponse} from 'next/server'
import {APP_VERSION,APP_RELEASE} from '@/lib/release'
export const dynamic='force-dynamic'
export function GET(){return NextResponse.json({version:APP_VERSION,release:APP_RELEASE,commit:process.env.VERCEL_GIT_COMMIT_SHA||null},{headers:{'Cache-Control':'no-store, max-age=0'}})}
