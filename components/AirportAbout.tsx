'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useLang } from '@/lib/i18n'

const fetcher = (u: string) => fetch(u).then((r) => r.json())
const TXT: Record<string, any> = {
  en: { about: 'About', hub: 'Hub for', air: 'Main airlines', dest: 'Main destinations', line: (d: any) => `${d.name} (${d.codes}) serves ${d.city}, ${d.country}. In the route data it connects to ${d.destinations} destinations with ${d.airlines} airlines.` },
  pt: { about: 'Sobre', hub: 'Hub de', air: 'Principais companhias', dest: 'Principais destinos', line: (d: any) => `${d.name} (${d.codes}) serve ${d.city}, ${d.country}. Nos dados de rotas liga-se a ${d.destinations} destinos com ${d.airlines} companhias.` },
  it: { about: 'Informazioni', hub: 'Hub di', air: 'Compagnie principali', dest: 'Destinazioni principali', line: (d: any) => `${d.name} (${d.codes}) serve ${d.city}, ${d.country}. Nei dati delle rotte è collegato a ${d.destinations} destinazioni con ${d.airlines} compagnie.` },
  fr: { about: 'À propos', hub: 'Hub de', air: 'Compagnies principales', dest: 'Destinations principales', line: (d: any) => `${d.name} (${d.codes}) dessert ${d.city}, ${d.country}. Dans les données de routes, il est relié à ${d.destinations} destinations avec ${d.airlines} compagnies.` },
  es: { about: 'Acerca de', hub: 'Hub de', air: 'Aerolíneas principales', dest: 'Destinos principales', line: (d: any) => `${d.name} (${d.codes}) sirve a ${d.city}, ${d.country}. En los datos de rutas conecta con ${d.destinations} destinos con ${d.airlines} aerolíneas.` },
}

export default function AirportAbout({ code }: { code: string }) {
  const lang = useLang((s) => s.lang)
  const t = TXT[lang] || TXT.en
  const { data } = useSWR(code ? `/api/airports/${code}/about` : null, fetcher)
  if (!data?.airport) return null
  const a = data.airport
  const codes = [a.iata, a.icao].filter(Boolean).join(' / ')
  const chip = 'flex min-h-10 items-center gap-2 rounded-full bg-white/[.06] px-3 text-xs transition hover:bg-white/10'
  return (
    <div className="mt-6">
      <p className="text-sm leading-relaxed text-white/60">
        {t.line({ name: a.name, codes, city: a.city, country: a.country, destinations: data.destinations, airlines: data.airlines })}
      </p>
      <p className="mt-2 text-xs text-white/35">{Number(a.lat).toFixed(3)}°, {Number(a.lon).toFixed(3)}°</p>
      {data.hubOf?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{t.hub}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.hubOf.map((h: any) => <Link key={h.id} href={`/airlines/${h.id}`} className={chip}>{h.name}</Link>)}</div>
        </>
      )}
      {data.topAirlines?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{t.air}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.topAirlines.map((h: any) => <Link key={h.id} href={`/airlines/${h.id}`} className={chip}>{h.name}<span className="text-white/40">{h.routes}</span></Link>)}</div>
        </>
      )}
      {data.topDestinations?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{t.dest}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.topDestinations.map((h: any) => <Link key={h.iata} href={`/airports/${h.iata}`} className={chip}><strong>{h.iata}</strong><span className="text-white/45">{h.city}</span></Link>)}</div>
        </>
      )}
    </div>
  )
}
