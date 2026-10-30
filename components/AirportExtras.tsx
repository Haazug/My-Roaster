'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import FavButton from '@/components/FavButton'
import AirportAbout from '@/components/AirportAbout'
import AirportLiveNow from '@/components/AirportLiveNow'
import AirportAddRoute from '@/components/AirportAddRoute'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function AirportExtras({ noLive }: { noLive?: boolean }) {
  const params = useParams<{ code: string }>()
  const code = decodeURIComponent(String(params?.code || '')).toUpperCase()
  const { data } = useSWR(code ? `/api/airports/${code}/about` : null, fetcher)
  if (!code) return null
  const a = data?.airport
  return (
    <>
      {a && (
        <div className="mt-2">
          <FavButton kind="airport" item={{ id: a.iata, label: a.city || a.name, sub: a.name, href: `/airports/${a.iata}`, iata: a.iata, icao: a.icao }} />
        </div>
      )}
      <AirportAbout code={code} />
      {!noLive && <AirportLiveNow code={code} />}
      <AirportAddRoute code={code} />
    </>
  )
}
