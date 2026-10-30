'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import FavButton from '@/components/FavButton'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function AirlineFav() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const { data } = useSWR<any[]>('/api/airlines', fetcher)
  const a = Array.isArray(data) ? data.find((x) => String(x.id) === id) : null
  if (!a) return null
  return (
    <div className="mt-2">
      <FavButton kind="airline" item={{ id, label: a.name, sub: [a.iata, a.icao].filter(Boolean).join(' · '), href: `/airlines/${id}`, iata: a.iata, icao: a.icao }} />
    </div>
  )
}
