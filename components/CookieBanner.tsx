'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getConsent, openConsent, setConsent } from '@/lib/consent'

export function CookieSettingsButton({ className = '' }: { className?: string }) {
  return (
    <button type="button" onClick={openConsent} className={className}>
      Cookie settings
    </button>
  )
}

export default function CookieBanner() {
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

  if (!open) return null

  const btn = 'min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold'

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-3 bottom-24 z-50 max-w-md rounded-2xl border border-white/10 bg-[#111217f5] p-4 text-white shadow-2xl backdrop-blur-xl lg:bottom-28 lg:left-6">
      <div className="flex items-center gap-3">
        <img src="/logo-mark.png" alt="" className="h-7 w-auto" />
        <p className="font-semibold">Your privacy</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/60">
        MyRoster stores a few things in your browser to work (your session, your flights and favourites). With your
        permission it also remembers preferences such as music volume. We use no advertising or analytics trackers.
        See our <Link href="/cookies" className="text-[#55a7ff] underline">Cookie Policy</Link> and{' '}
        <Link href="/privacy" className="text-[#55a7ff] underline">Privacy Policy</Link>.
      </p>

      {custom && (
        <div className="mt-3 space-y-2 rounded-xl bg-white/[.05] p-3 text-xs">
          <label className="flex items-start justify-between gap-3">
            <span><span className="font-semibold">Essential</span><br /><span className="text-white/50">Login, your flights, favourites and settings you use. Always on.</span></span>
            <input type="checkbox" checked disabled className="mt-1" />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span><span className="font-semibold">Preferences</span><br /><span className="text-white/50">Remember music volume and mute.</span></span>
            <input type="checkbox" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} className="mt-1" />
          </label>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {custom ? (
          <button onClick={() => save(prefs)} className={`${btn} bg-[#1f88ff]`}>Save choices</button>
        ) : (
          <>
            <button onClick={() => save(true)} className={`${btn} bg-[#1f88ff]`}>Accept all</button>
            <button onClick={() => save(false)} className={`${btn} border border-white/15 bg-white/10`}>Essential only</button>
          </>
        )}
      </div>
      {!custom && (
        <button onClick={() => setCustom(true)} className="mt-2 w-full text-center text-xs text-white/50 underline">
          Customise
        </button>
      )}
    </div>
  )
}
