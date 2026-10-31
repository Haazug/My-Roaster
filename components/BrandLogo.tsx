export default function BrandLogo({className='',alt='MyRoster'}:{className?:string;alt?:string}){
 return <img src="/icon-192.png?v=2.2.2" alt={alt} width={64} height={64} className={`rounded-lg bg-white object-contain ${className}`} draggable={false}/>
}
