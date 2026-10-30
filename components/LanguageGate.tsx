'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LANGS, chooseLang, persistLangIfAllowed, syncLang, useLang, useT } from '@/lib/i18n'

export function LanguageSelect({ className = '' }: { className?: string }) {
  const lang = useLang((s) => s.lang)
  const t = useT()
  return (
    <div className={className}>
      <p className="text-xs text-white/40">{t('lang.label')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            aria-pressed={lang === l.code}
            onClick={() => chooseLang(l.code)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${lang === l.code ? 'border-white bg-white text-black' : 'border-white/10 bg-transparent'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LanguageGate() {
  const chosen = useLang((s) => s.chosen)
  const lang = useLang((s) => s.lang)
  const [ready, setReady] = useState(false)
  const t = useT()

  useEffect(() => {
    let live = true
    syncLang().finally(() => live && setReady(true))
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') syncLang()
    })
    const onConsent = () => persistLangIfAllowed()
    window.addEventListener('myroster:consent-changed', onConsent)
    return () => {
      live = false
      sub.subscription.unsubscribe()
      window.removeEventListener('myroster:consent-changed', onConsent)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  if (!ready || chosen) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={t('lang.label')} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111217] p-6 text-white shadow-2xl">
        <h2 className="text-xl font-semibold">{t('lang.title')}</h2>
        <p className="mt-1 text-sm text-white/45">Escolhe a tua língua · Scegli la lingua · Choisissez la langue · Elige el idioma</p>
        <div className="mt-5 grid gap-2">
          {LANGS.map((l) => (
            <button key={l.code} type="button" aria-pressed={lang === l.code}
            onClick={() => chooseLang(l.code)} className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-left text-base font-medium hover:border-[#1f88ff]">
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/35">{t('lang.sub')}</p>
      </div>
    </div>
  )
}
