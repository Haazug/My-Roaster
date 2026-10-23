'use client'

// One shared audio engine: background music, cabin noise (during the flight) and the "ding".
// Volume goes through Web Audio gain nodes, so it also works on iPhone/iPad (where audio.volume is read-only).

export type Channel = 'music' | 'cabin'
export type SoundState = { volume: number; muted: boolean; bed: Channel; playing: boolean }

const SRC: Record<Channel, string> = { music: '/aviao_es-e-mu_sicas.mp3', cabin: '/cabin-noise.mp3' }
const BOOST: Record<Channel, number> = { music: 1, cabin: 1.5 }
const CHANNELS: Channel[] = ['music', 'cabin']

let ctx: AudioContext | null = null
let unlocked = false
let volume = 0.05
let muted = false
let bed: Channel = 'music'
const els: Partial<Record<Channel, HTMLAudioElement>> = {}
const gains: Partial<Record<Channel, GainNode>> = {}
const listeners = new Set<(s: SoundState) => void>()
let snapshot: SoundState = { volume, muted, bed, playing: false }

function emit() {
  const a = els[bed]
  snapshot = { volume, muted, bed, playing: !!a && !a.paused && !muted }
  listeners.forEach((fn) => fn(snapshot))
}

export const getState = () => snapshot
export function subscribe(fn: (s: SoundState) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function connect(ch: Channel) {
  const a = els[ch]
  if (!ctx || !a || gains[ch]) return
  try {
    const g = ctx.createGain()
    g.gain.value = 0
    ctx.createMediaElementSource(a).connect(g)
    g.connect(ctx.destination)
    gains[ch] = g
    a.volume = 1
  } catch {}
}

function elFor(ch: Channel) {
  let a = els[ch]
  if (!a && typeof window !== 'undefined') {
    a = new Audio(SRC[ch])
    a.loop = true
    a.preload = 'auto'
    a.addEventListener('playing', emit)
    a.addEventListener('pause', emit)
    els[ch] = a
    connect(ch)
  }
  return a
}

const target = (ch: Channel) => (muted || bed !== ch ? 0 : Math.min(1, volume * BOOST[ch]))

function apply() {
  if (typeof window === 'undefined') return
  CHANNELS.forEach((ch) => {
    const t = target(ch)
    const a = t > 0 ? elFor(ch) : els[ch]
    if (!a) return
    const g = gains[ch]
    if (g && ctx) g.gain.setTargetAtTime(t, ctx.currentTime, 0.35)
    else a.volume = t
    if (t > 0) {
      if (a.paused) a.play().catch(() => {})
    } else {
      window.setTimeout(() => {
        if (target(ch) === 0) els[ch]?.pause()
      }, 1500)
    }
  })
  emit()
}

// call inside a click/touch handler (browsers only allow sound after a gesture)
export function unlock() {
  if (typeof window === 'undefined') return
  if (!unlocked) {
    unlocked = true
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      ctx = new AC()
    } catch {
      ctx = null
    }
    CHANNELS.forEach(connect)
  }
  ctx?.resume().catch(() => {})
  apply()
}

export const start = () => apply()
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v))
  apply()
}
export function setMuted(m: boolean) {
  muted = m
  apply()
}
export function setBed(ch: Channel) {
  if (bed === ch) return
  bed = ch
  apply()
}

let dingEl: HTMLAudioElement | null = null
export function ding() {
  if (typeof window === 'undefined' || muted) return
  try {
    if (!dingEl) {
      dingEl = new Audio('/ding.mp3')
      dingEl.preload = 'auto'
    }
    const d = dingEl.cloneNode() as HTMLAudioElement
    d.volume = 0.7
    d.play().catch(() => {})
  } catch {}
}
