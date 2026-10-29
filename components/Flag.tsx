import { isoOf } from '@/lib/flags'

// flagsapi.com serves flags at 16, 24, 32, 48 and 64 px
export function Flag({ country, size = 24, className = '' }: { country?: string; size?: 16 | 24 | 32 | 48 | 64; className?: string }) {
  const c = isoOf(country)
  if (!c) return null
  return (
    <img
      src={`https://flagsapi.com/${c}/flat/${size}.png`}
      alt={country || ''}
      title={country}
      width={size}
      height={size}
      loading="lazy"
      className={`inline-block shrink-0 ${className}`}
    />
  )
}
