'use client'
import LiveFlights from '@/components/LiveFlights'
import { useT } from '@/lib/i18n'
export default function LivePage() {
 const t=useT()
 return <section className="min-h-screen p-5 pb-32 sm:p-8"><h1 className="text-3xl font-semibold">{t('live.title')}</h1><p className="mt-2 text-sm text-white/45">{t('live.subtitle')}</p><LiveFlights standalone /></section>
}
