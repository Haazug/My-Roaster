import Link from 'next/link'

export default function LogoCorner() {
  return (
    <Link
      href="/"
      aria-label="MyRoster"
      className="hidden lg:block fixed right-4 z-40 opacity-80 transition hover:opacity-100"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
    >
      <img src="/logo-mark-white.png" alt="MyRoster" width={44} height={34} className="h-auto w-11" draggable={false} />
    </Link>
  )
}
