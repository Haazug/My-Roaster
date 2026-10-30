'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import * as sound from '@/lib/sound'

export default function BackgroundMusic() {
  const [s, setS] = useState<sound.SoundState>(sound.getState())
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => sound.subscribe(setS), [])

  // browsers only allow sound after a first touch
  useEffect(() => {
    const first = () => sound.unlock()
    window.addEventListener('pointerdown', first, { once: true })
    return () => window.removeEventListener('pointerdown', first)
  }, [])

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
        <div className="flex h-9 items-center gap-3 rounded-full border border-white/10 bg-black/80 pl-4 pr-1 backdrop-blur">
          <input
            type="range"
            min={0}
            max={0.4}
            step={0.01}
            value={s.volume}
            aria-label="Volume"
            onChange={(e) => {
              sound.unlock()
              sound.setMuted(false)
              sound.setVolume(Number(e.target.value))
            }}
            className="h-1 w-24 accent-white"
          />
          <button
            type="button"
            onClick={() => { sound.unlock(); sound.setMuted(!s.muted) }}
            className="flex h-8 items-center rounded-full px-3 text-[11px] font-medium text-white/60 hover:text-white"
          >
            {s.muted ? 'On' : 'Off'}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Music"
        aria-expanded={open}
        onClick={() => { sound.unlock(); setOpen((v) => !v) }}
        className="flex size-9 items-center justify-center rounded-full text-white/60 transition hover:text-white"
      >
        {off ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  )
}
