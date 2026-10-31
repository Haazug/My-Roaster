import type {ResolvedFlight} from './live-model'
export type LivePage={ok:boolean;data:ResolvedFlight[];retired?:ResolvedFlight[];globalFeed?:{nextHex?:string;unavailable?:boolean}}
// Cursors travel with the browser: continuation works across Vercel cold starts.
export async function collectLivePages(first:LivePage,receive:(page:LivePage)=>void,signal:AbortSignal,fetchPage:(url:string,options:{signal:AbortSignal})=>Promise<Response>=fetch,known:ResolvedFlight[]=[]){
 const read=async(url:string)=>{const response=await fetchPage(url,{signal});if(!response.ok)throw Error('Live batch unavailable');const page=await response.json() as LivePage;if(!page.ok)throw Error('Live batch unavailable');receive(page);return page}
 const tracked=new Set([...known,...first.data].map(f=>f.hex).filter(hex=>/^[A-F0-9]{6,8}$/.test(hex)).slice(0,400))
 const supplemental=read('/api/live/radar').catch(()=>{})
 let cursor=first.globalFeed?.nextHex
 const seen=new Set<string>()
 try{
  // Bound work per refresh without imposing a cap on displayed flights.
  for(let n=0;cursor&&n<7&&!signal.aborted&&!seen.has(cursor);n++){
   seen.add(cursor)
   const page=await read(`/api/live/now?cursor=${encodeURIComponent(cursor)}&seen=${[...tracked].join(',')}`)
   for(const f of page.data)if(tracked.size<400)tracked.add(f.hex)
   cursor=page.globalFeed?.nextHex
  }
 }finally{await supplemental}
 return cursor
}
