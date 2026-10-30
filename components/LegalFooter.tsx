'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { openConsent } from '@/lib/consent'

export default function LegalFooter() {
  const t = useT()
  const link = 'hover:text-white'
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-2 px-5 pb-6 text-xs text-white/35 sm:px-8">
      <Link href="/privacy" className={link}>{t('legal.privacy')}</Link>
      <Link href="/terms" className={link}>{t('legal.terms')}</Link>
      <Link href="/cookies" className={link}>Cookies</Link>
      <Link href="/legal-notice" className={link}>{t('legal.notice')}</Link>
      <button type="button" onClick={openConsent} className={link}>{t('cookie.settings')}</button>
    </footer>
  )
}
