'use client'
import { LanguageSelect } from '@/components/LanguageGate'
import { useT } from '@/lib/i18n'
import { CookieSettingsButton } from '@/components/CookieBanner'
export default function SettingsPage() {
 const t = useT()
 return <section className="min-h-screen p-5 pb-32 sm:p-8">
  <h1 className="text-3xl font-semibold">{t('settings.title')}</h1>
  <p className="mt-3 text-sm text-white/45">{t('settings.languageHint')}</p>
  <LanguageSelect className="mt-8 border-y border-white/10 py-6" />
  <CookieSettingsButton className="mt-6 min-h-11 text-sm text-white/50 hover:text-white" />
 </section>
}
