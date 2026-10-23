export const CONSENT_KEY = 'myroster.consent'
export type Consent = { v: 1; preferences: boolean; ts: number }

export function getConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    return raw ? (JSON.parse(raw) as Consent) : null
  } catch {
    return null
  }
}

export function setConsent(preferences: boolean) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, preferences, ts: Date.now() }))
    window.dispatchEvent(new Event('myroster:consent-changed'))
    if (!preferences) {
      window.localStorage.removeItem('myroster.music.volume')
      window.localStorage.removeItem('myroster.music.muted')
      window.localStorage.removeItem('myroster.lang')
    }
  } catch {}
}

export const canStorePreferences = () => !!getConsent()?.preferences
export const openConsent = () => window.dispatchEvent(new Event('myroster:open-consent'))

