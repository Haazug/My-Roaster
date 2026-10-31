export default function BrandLogo({className='',alt='MyRoster'}:{className?:string;alt?:string}){
 return <img src="/brand/myroster-icon-192-v223-fix.png" alt={alt} width={64} height={64} className={`rounded-lg bg-white object-contain ${className}`} draggable={false}/>
}
