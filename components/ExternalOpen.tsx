'use client'

import { useEffect } from 'react'

// Experimental: in the installed iPhone/iPad app, open external https links in real Safari.
export default function ExternalOpen() {
  useEffect(() => {
    const standalone = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!standalone || !ios) return
    const orig = window.open.bind(window)
    const toSafari = (href: string) => orig('x-safari-' + href, '_blank')
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      try {
        const u = new URL(String(url), window.location.href)
        if (u.origin !== window.location.origin && u.protocol === 'https:') return toSafari(u.href)
      } catch {}
      return orig(url as any, target, features)
    }) as typeof window.open
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="http"]') as HTMLAnchorElement | null
      if (!a) return
      try {
        const u = new URL(a.href)
        if (u.origin === window.location.origin || u.protocol !== 'https:') return
        e.preventDefault()
        toSafari(u.href)
      } catch {}
    }
    document.addEventListener('click', click, true)
    return () => {
      window.open = orig
      document.removeEventListener('click', click, true)
    }
  }, [])
  return null
}
