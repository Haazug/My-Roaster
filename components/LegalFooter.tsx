'use client'

import Link from 'next/link'
import { openConsent } from '@/lib/consent'

export default function LegalFooter() {
  const link = 'hover:text-white'
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-2 px-5 pb-6 text-xs text-white/35 sm:px-8">
      <Link href="/privacy" className={link}>Privacy</Link>
      <Link href="/terms" className={link}>Terms</Link>
      <Link href="/cookies" className={link}>Cookies</Link>
      <Link href="/legal-notice" className={link}>Legal notice</Link>
      <button type="button" onClick={openConsent} className={link}>Cookie settings</button>
    </footer>
  )
}
