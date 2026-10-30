'use client'

import { useEffect } from 'react'
import { Star } from 'lucide-react'
import { useFavs, useRecents, type FavItem } from '@/lib/use-favs'

export default function FavButton({ kind, item }: { kind: 'airline' | 'airport'; item: FavItem }) {
  const f = useFavs(kind)
  const r = useRecents()
  useEffect(() => {
    if (r.hydrated) r.add({ ...item, id: `${kind}:${item.id}`, kind })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.hydrated, item.id])
  const on = f.has(item.id)
  return (
    <button type="button" aria-pressed={on} aria-label="Favourite" onClick={() => f.toggle(item)} className="flex size-10 items-center justify-center rounded-full text-white/50 transition hover:text-white">
      <Star className={`size-5 ${on ? 'fill-[#facc15] text-[#facc15]' : ''}`} />
    </button>
  )
}
