import { Suspense } from 'react'
import SearchClient from '@/components/search-client'

export default function SearchPage() {
  return (
    <Suspense fallback={<section className="min-h-screen p-5 text-white/50 sm:p-8">Loading search…</section>}>
      <SearchClient />
    </Suspense>
  )
}
