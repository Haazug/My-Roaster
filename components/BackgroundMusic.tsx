'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import {useT} from '@/lib/i18n'
import * as sound from '@/lib/sound'

export default function BackgroundMusic() {
  const t=useT()
  const [s, setS] = useState<sound.SoundState>(sound.getState())
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => sound.subscribe(setS), [])



  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', out)
    return () => document.removeEventListener('pointerdown', out)
  }, [open])

  const off = s.muted || s.volume === 0

  return (
    <div
      ref={ref}
      className="fixed z-40 flex items-center gap-1"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 13px)', right: 68 }}
    >
      {open && (
        <div className="absolute right-0 top-11 flex w-64 flex-col gap-3 rounded-xl border border-white/10 bg-black/95 p-4 backdrop-blur">
          <p className="text-xs text-white/60">{t('audio.music')}</p><input
            type="range"
            min={0}
            max={0.4}
            step={0.01}
            value={s.volume}
            aria-label="Volume"
            onChange={(e) => {
              sound.unlock(true)
              sound.setMuted(false)
              sound.setVolume(Number(e.target.value))
            }}
            className="h-1 w-24 accent-white"
          />
          <button
            type="button"
            onClick={() => { sound.unlock(true); sound.setMuted(!s.muted) }}
            className="flex h-8 items-center rounded-full px-3 text-[11px] font-medium text-white/60 hover:text-white"
          >
            {t(s.muted?'audio.enable':'audio.disable')}
          </button>
          <button className="min-h-11 text-xs text-white/60" onClick={()=>{sound.unlock(true);sound.setEffectsMuted(!s.effectsMuted)}}>{t('audio.effects')} · {t(s.effectsMuted?'audio.enable':'audio.disable')}</button>
        </div>
      )}
      <button
        type="button"
        aria-label={t('audio.music')}
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v) }}
        className="flex size-9 items-center justify-center rounded-full text-white/60 transition hover:text-white"
      >
        {off ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  )
}
