'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useLang, useT } from '@/lib/i18n'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

const TXT: Record<string, any> = {
  en: { about: 'About', codes: 'Codes', hubs: 'Main hubs', top: 'Busiest airports', active: 'Active', historical: 'Historical',
    line: (d: any) => `${d.name} (${d.codes}) is an airline from ${d.country}. ${d.hub ? `Its main hub is ${d.hub}. ` : ''}The reference catalog contains ${d.airports} airports in ${d.countries} countries, with ${d.pairs} routes.` },
  pt: { about: 'Sobre', codes: 'Códigos', hubs: 'Hubs principais', top: 'Aeroportos mais movimentados', active: 'Ativa', historical: 'Histórica',
    line: (d: any) => `${d.name} (${d.codes}) é uma companhia de ${d.country}. ${d.hub ? `O hub principal é ${d.hub}. ` : ''}O catálogo de referência contém ${d.airports} aeroportos em ${d.countries} países, com ${d.pairs} rotas.` },
  it: { about: 'Informazioni', codes: 'Codici', hubs: 'Hub principali', top: 'Aeroporti più trafficati', active: 'Attiva', historical: 'Storica',
    line: (d: any) => `${d.name} (${d.codes}) è una compagnia di ${d.country}. ${d.hub ? `L'hub principale è ${d.hub}. ` : ''}Il catalogo di riferimento contiene ${d.airports} aeroporti in ${d.countries} paesi, con ${d.pairs} rotte.` },
  fr: { about: 'À propos', codes: 'Codes', hubs: 'Hubs principaux', top: 'Aéroports les plus actifs', active: 'Active', historical: 'Historique',
    line: (d: any) => `${d.name} (${d.codes}) est une compagnie de ${d.country}. ${d.hub ? `Son hub principal est ${d.hub}. ` : ''}Le catalogue de référence contient ${d.airports} aéroports dans ${d.countries} pays, avec ${d.pairs} routes.` },
  es: { about: 'Acerca de', codes: 'Códigos', hubs: 'Hubs principales', top: 'Aeropuertos más activos', active: 'Activa', historical: 'Histórica',
    line: (d: any) => `${d.name} (${d.codes}) es una aerolínea de ${d.country}. ${d.hub ? `Su hub principal es ${d.hub}. ` : ''}El catálogo de referencia contiene ${d.airports} aeropuertos en ${d.countries} países, con ${d.pairs} rutas.` },
}

export default function AirlineAbout({ id }: { id: string }) {
  const tr=useT()
  const lang = useLang((s) => s.lang)
  const t = TXT[lang] || TXT.en
  const { data } = useSWR(id ? `/api/airlines/${id}/about` : null, fetcher)
  if (!data?.airline) return null
  const a = data.airline
  const codes = [a.iata, a.icao].filter(Boolean).join(' / ')
  const hubs: any[] = data.hubs || []
  const chip = 'flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 text-xs transition hover:border-[#1f88ff]/60'
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-transparent p-4">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">{t.about}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {t.line({ name: a.name, codes, country: a.country || '—', hub: hubs[0] ? `${hubs[0].city} (${hubs[0].iata})` : '', airports: data.airports, countries: data.countries, pairs: data.pairs })}
      </p>
      <p className="mt-3 text-xs text-amber-200/60">{tr('catalog.reference')}</p>{a.alliance && <p className="mt-3 font-mono text-yellow-200">{a.alliance}</p>}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/50">
        <span>{t.codes}: <strong className="text-white">{codes || '—'}</strong></span>
        <span className={a.active ? 'text-[#55a7ff]' : 'text-amber-300'}>{a.active ? t.active : t.historical}</span>
      </div>
      {hubs.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{t.hubs}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {hubs.map((h) => <Link key={h.iata} href={`/airports/${h.iata}`} className={chip}><strong>{h.iata}</strong><span className="text-white/50">{h.city}</span></Link>)}
          </div>
        </>
      )}
      {data.top?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{t.top}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.top.map((h: any) => <Link key={h.iata} href={`/airports/${h.iata}`} className={chip}><strong>{h.iata}</strong><span className="text-white/50">{h.icao}</span></Link>)}
          </div>
        </>
      )}
    </div>
  )
}
