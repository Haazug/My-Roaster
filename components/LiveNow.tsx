'use client'

import useSWR from 'swr'
import { ExternalLink, Radio } from 'lucide-react'
import { fr24Url, headingTo } from '@/lib/live-view'

type P = { lat: number; lon: number; iata: string }
type Ac = { hex: string; callsign: string; type?: string; altFt: number | null; track?: number }
type Res = { ok: boolean; data?: { count: number; aircraft: Ac[] }; error?: string }

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function LiveNow({ airlineIcao, from, to, distanceNm }: { airlineIcao?: string; from: P; to: P; distanceNm: number }) {
  const key = airlineIcao
    ? `/api/live/route?airline=${encodeURIComponent(airlineIcao)}&fromLat=${from.lat}&fromLon=${from.lon}&toLat=${to.lat}&toLon=${to.lon}`
    : null
  const { data, isLoading } = useSWR<Res>(key, fetcher, { refreshInterval: 60000, revalidateOnFocus: false, shouldRetryOnError: false })
  const list = data?.ok ? data.data?.aircraft ?? [] : []
  const goingTo = list.filter((a) => headingTo(a.track, from, to) === 'to')
  const goingFrom = list.filter((a) => headingTo(a.track, from, to) === 'from')

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#111217cc] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="size-4 text-[#4caf50]" aria-hidden="true" /> Ao vivo agora
        </p>
        <a
          href={fr24Url(from, to, distanceNm)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1 text-xs text-[#55a7ff]"
        >
          Ver no Flightradar24 <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>

      {!airlineIcao ? (
        <p className="mt-2 text-xs text-white/40">Esta companhia não tem código ICAO nos dados, por isso não dá para procurar aviões.</p>
      ) : isLoading ? (
        <p className="mt-2 text-xs text-white/40" aria-busy="true">A procurar aviões no ar…</p>
      ) : !data?.ok ? (
        <p className="mt-2 text-xs text-white/40">Tráfego ao vivo indisponível neste momento.</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-xs text-white/40">Nenhum avião da {airlineIcao} nesta rota agora. Isto só mostra o que está no ar neste momento, não quer dizer que a rota não exista.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-white/70">
            {list.length} {list.length === 1 ? 'avião' : 'aviões'} no ar · para {to.iata}: {goingTo.length} · para {from.iata}: {goingFrom.length}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {list.slice(0, 12).map((a) => (
              <li key={a.hex} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
                {a.callsign || a.hex}{a.type ? ` · ${a.type}` : ''}{a.altFt != null ? ` · FL${Math.round(a.altFt / 100)}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
