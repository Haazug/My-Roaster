'use client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {ArrowLeft} from 'lucide-react'
import {useT} from '@/lib/i18n'
import type {ReactNode} from 'react'
export default function BackLink({href='/',className='',global=false}:{href?:string;className?:string;children?:ReactNode;global?:boolean}){
 const router=useRouter(),t=useT()
 return <Link href={href} aria-label={t('back')} data-page-back-link={global?undefined:'true'} className={className} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(Number(history.state?.myrosterDepth)>0)router.back();else router.push(href)}}><ArrowLeft className="size-4"/>{t('back')}</Link>
}
