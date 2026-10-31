import BrandLogo from '@/components/BrandLogo'
import Link from 'next/link'

export default function LogoCorner() {
  return (
    <Link
      href="/"
      aria-label="MyRoster"
      className="fixed right-4 z-40 opacity-80 transition hover:opacity-100"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
    >
      <BrandLogo className="h-11 w-11" />
    </Link>
  )
}
