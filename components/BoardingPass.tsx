'use client'

import { useRef, useState } from 'react'

export type PassData = {
  from: string
  to: string
  fromCity?: string
  toCity?: string
  airline?: string
  flight?: string
  aircraft?: string
  distanceNm?: number
  durationMin?: number
  seat?: string
  date?: string
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const rng = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}

function Barcode({ seed }: { seed: string }) {
  const r = rng(hash(seed))
  const W = 140, H = 36, rows = 6, rh = H / rows
  const out: React.ReactElement[] = []
  const bars = (x0: number, x1: number, k: string) => {
    let x = x0, on = true, i = 0
    while (x < x1) {
      const w = Math.min(1 + Math.floor(r() * 3), x1 - x)
      if (on) out.push(<rect key={`${k}${i++}`} x={x} y={0} width={w} height={H} />)
      x += w
      on = !on
    }
  }
  bars(0, 16, 'l')
  bars(W - 16, W, 'r')
  for (let row = 0; row < rows; row++) {
    let x = 20, on = r() > 0.5, i = 0
    while (x < W - 20) {
      const w = Math.min(1 + Math.floor(r() * 4), W - 20 - x)
      if (on) out.push(<rect key={`m${row}-${i++}`} x={x} y={row * rh} width={w} height={rh} />)
      x += w
      on = !on
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full text-white" fill="currentColor" aria-hidden="true">
      {out}
    </svg>
  )
}

const notchTop = 'radial-gradient(circle 10px at 0 100%, transparent 97%, #000), radial-gradient(circle 10px at 100% 100%, transparent 97%, #000)'
const notchBottom = 'radial-gradient(circle 10px at 0 0, transparent 97%, #000), radial-gradient(circle 10px at 100% 0, transparent 97%, #000)'
const mask = (img: string) =>
  ({ WebkitMaskImage: img, maskImage: img, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }) as React.CSSProperties

export function BoardingPass({
  data,
  tear = false,
  compact = false,
  onTorn,
  onBoard,
}: {
  data: PassData
  tear?: boolean
  compact?: boolean
  onTorn?: () => void
  onBoard?: () => void
}) {
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [torn, setTorn] = useState(false)
  const startX = useRef<number | null>(null)
  const dragRef = useRef(0)
  const box = useRef<HTMLDivElement>(null)

  const seed = `${data.from}${data.to}${data.flight || ''}${data.date || ''}`
  const h = hash(seed)
  const seat = data.seat || `${String(1 + (h % 32)).padStart(2, '0')}${'ABCDEF'[(h >>> 5) % 6]}`
  const mins = data.durationMin || 0
  const dur = mins ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`) : ''
  const km = data.distanceNm ? `${Math.round(data.distanceNm * 1.852).toLocaleString('en-US')} km` : '—'
  const date = data.date ? data.date.replace(/-/g, '/') : '—'

  const set = (v: number) => {
    dragRef.current = v
    setDrag(v)
  }
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tear || torn) return
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return
    const w = box.current?.offsetWidth || 300
    set(Math.max(0, Math.min(1, Math.abs(e.clientX - startX.current) / (w * 0.45))))
  }
  const up = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    if (dragRef.current > 0.6) {
      setTorn(true)
      onTorn?.()
    } else set(0)
  }

  const p = drag
  const stubTransform = torn ? 'translate(14px, 170px) rotate(11deg)' : `translate(${p * 26}px, ${p * 30}px) rotate(${p * 7}deg)`
  const code = compact ? 'text-4xl' : 'text-5xl'

  return (
    <div ref={box} className="w-full select-none text-white">
      <div className="relative overflow-hidden rounded-t-3xl bg-[#232325] px-6 pb-6 pt-6 shadow-xl" style={mask(notchTop)}>
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1px, transparent 1.6px)',
            backgroundSize: '9px 9px',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, #000 25%, transparent 72%)',
            maskImage: 'radial-gradient(ellipse at 50% 45%, #000 25%, transparent 72%)',
          }}
        />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className={`font-mono ${code} font-extrabold leading-none tracking-tight`}>{data.from}</p>
            {data.fromCity && <p className="mt-2 truncate text-sm text-white/45">{data.fromCity}</p>}
          </div>
          <div className="px-2 pt-2 text-center text-white/35">
            <p className="text-base">✈</p>
            {dur && <p className="mt-1 font-mono text-xs">{dur}</p>}
          </div>
          <div className="min-w-0 text-right">
            <p className={`font-mono ${code} font-extrabold leading-none tracking-tight`}>{data.to}</p>
            {data.toCity && <p className="mt-2 truncate text-sm text-white/45">{data.toCity}</p>}
          </div>
        </div>
        {!compact && (
          <dl className="relative mt-7 grid grid-cols-2 gap-y-4 text-sm">
            <div><dt className="text-white/40">Seat</dt><dd className="font-mono font-bold">{seat}</dd></div>
            <div className="text-right"><dt className="text-white/40">Distance</dt><dd className="font-mono font-bold">{km}</dd></div>
            <div><dt className="text-white/40">Boarding</dt><dd className="font-mono font-bold">Now</dd></div>
            <div className="text-right"><dt className="text-white/40">Date</dt><dd className="font-mono font-bold">{date}</dd></div>
          </dl>
        )}
        <div className="absolute inset-x-6 bottom-0 border-t border-dashed border-white/20" />
      </div>

      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={`relative rounded-b-3xl bg-[#232325] px-6 pb-5 pt-5 shadow-xl ${tear && !torn ? 'cursor-grab' : ''} ${torn ? 'pointer-events-none' : ''}`}
        style={{
          ...mask(notchBottom),
          transform: stubTransform,
          transition: dragging ? 'none' : 'transform .7s cubic-bezier(.3,.8,.3,1)',
          touchAction: 'none',
        }}
      >
        <Barcode seed={seed} />
        {tear && !torn && <p className="mt-3 text-center text-[11px] uppercase tracking-[.25em] text-white/40">Drag to tear</p>}
      </div>

      {torn && (
        <button onClick={onBoard} className="mt-44 w-full rounded-full bg-white py-4 text-base font-semibold text-black shadow-lg">
          Boarding
        </button>
      )}
    </div>
  )
}