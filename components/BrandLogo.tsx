export default function BrandLogo({className='',alt='MyRoster'}:{className?:string;alt?:string}){
 return <img src="/brand/myroster-mark.png?v=2.2.3-transparent" alt={alt} width={64} height={64} className={`object-contain brightness-0 invert ${className}`} draggable={false}/>
}
