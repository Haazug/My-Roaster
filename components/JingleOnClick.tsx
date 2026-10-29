'use client'

import { useEffect } from 'react'
import * as sound from '@/lib/sound'

const RX = /^(fly now|voar agora|vola ora|voler maintenant|volar ahora|book trip|reservar viag|reservar viaj|prenota viaggio|r[eé]server (le )?voyage)/i

export default function JingleOnClick() {
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.('a,button') as HTMLElement | null
      if (!el) return
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ')
      if (t.length > 40 || !RX.test(t)) return
      sound.unlock()
      sound.play('jingle')
    }
    document.addEventListener('click', on, true)
    return () => document.removeEventListener('click', on, true)
  }, [])
  return null
}
