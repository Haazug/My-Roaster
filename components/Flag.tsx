import {isoOf} from '@/lib/flags'
export function Flag({country,size=24,className=''}:{country?:string;size?:16|24|32|48|64;className?:string}){
 const code=isoOf(country)
 if(!code)return null
 const flag=Array.from(code.toUpperCase()).map(c=>String.fromCodePoint(0x1f1e6+c.charCodeAt(0)-65)).join('')
 return <span role="img" aria-label={country} title={country} className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`} style={{fontSize:size*.8,width:size,height:size,fontFamily:'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'}}>{flag}</span>
}
