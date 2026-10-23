'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getConsent, openConsent, setConsent } from '@/lib/consent'
import { useLang, useT } from '@/lib/i18n'

export function CookieSettingsButton({ className = '' }: { className?: string }) {
  const t = useT()
  return (
    <button type="button" onClick={openConsent} className={className}>
      {t('cookie.settings')}
    </button>
  )
}

export default function CookieBanner() {
  const t = useT()
  const chosen = useLang((s) => s.chosen)
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [prefs, setPrefs] = useState(false)

  useEffect(() => {
    if (!getConsent()) setOpen(true)
    const reopen = () => {
      setPrefs(!!getConsent()?.preferences)
      setCustom(true)
      setOpen(true)
    }
    window.addEventListener('myroster:open-consent', reopen)
    return () => window.removeEventListener('myroster:open-consent', reopen)
  }, [])

  const save = (p: boolean) => {
    setConsent(p)
    setOpen(false)
    setCustom(false)
  }

  if (!open || !chosen) return null

  const btn = 'min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold'

  return (
    <div role="dialog" aria-label={t('cookie.aria')} className="fixed inset-x-3 bottom-24 z-50 max-w-md rounded-2xl border border-white/10 bg-[#111217f5] p-4 text-white shadow-2xl backdrop-blur-xl lg:bottom-28 lg:left-6">
      <div className="flex items-center gap-3">
        <img src="/logo-mark.png" alt="" className="h-7 w-auto" />
        <p className="font-semibold">{t('cookie.title')}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/60">
        {t('cookie.body')} <Link href="/cookies" className="text-[#55a7ff] underline">{t('cookie.policy')}</Link> {t('cookie.and')}{' '}
        <Link href="/privacy" className="text-[#55a7ff] underline">{t('cookie.privacy')}</Link>.
      </p>

      {custom && (
        <div className="mt-3 space-y-2 rounded-xl bg-white/[.05] p-3 text-xs">
          <label className="flex items-start justify-between gap-3">
            <span><span className="font-semibold">{t('cookie.essential')}</span><br /><span className="text-white/50">{t('cookie.essentialD')}</span></span>
            <input type="checkbox" checked disabled className="mt-1" />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span><span className="font-semibold">{t('cookie.prefs')}</span><br /><span className="text-white/50">{t('cookie.prefsD')}</span></span>
            <input type="checkbox" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} className="mt-1" />
          </label>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {custom ? (
          <button onClick={() => save(prefs)} className={`${btn} bg-[#1f88ff]`}>{t('cookie.save')}</button>
        ) : (
          <>
            <button onClick={() => save(true)} className={`${btn} bg-[#1f88ff]`}>{t('cookie.acceptAll')}</button>
            <button onClick={() => save(false)} className={`${btn} border border-white/15 bg-white/10`}>{t('cookie.essentialOnly')}</button>
          </>
        )}
      </div>
      {!custom && (
        <button onClick={() => setCustom(true)} className="mt-2 w-full text-center text-xs text-white/50 underline">
          {t('cookie.customise')}
        </button>
      )}
    </div>
  )
}

