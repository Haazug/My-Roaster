'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BookAction from '@/components/BookAction'
import { usePathname } from 'next/navigation'
import * as sound from '@/lib/sound'
import { encodeShare } from '@/lib/share'
import { useT } from '@/lib/i18n'

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
  tear: tearProp = false,
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
  const t = useT()
  const [bookMode, setBookMode] = useState(false)
  useEffect(() => {
    setBookMode(new URLSearchParams(window.location.search).has('book'))
  }, [])
  const tear = tearProp && !bookMode
  const [drag, setDrag] = useState(0)
  const [dir, setDir] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [torn, setTorn] = useState(false)
  const [showBtn, setShowBtn] = useState(false)
  const [collapse, setCollapse] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; a: number } | null>(null)
  const dragRef = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const stub = useRef<HTMLDivElement>(null)

  const seed = `${data.from}${data.to}${data.flight || ''}${data.date || ''}`
  const h = hash(seed)
  const seat = data.seat || `${String(1 + (h % 32)).padStart(2, '0')}${'ABCDEF'[(h >>> 5) % 6]}`
  const mins = data.durationMin || 0
  const dur = mins ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`) : ''
  const km = data.distanceNm ? `${Math.round(data.distanceNm * 1.852).toLocaleString('en-US')} km` : '—'
  const date = data.date ? data.date.replace(/-/g, '/') : '—'

  const [span, setSpan] = useState<{ a: number; b: number } | null>(null)
  const [pull, setPull] = useState(0)
  const [closing, setClosing] = useState(false)
  const spanRef = useRef<{ a: number; b: number } | null>(null)
  const dirRef = useRef(0)

  const setSpanBoth = (v: { a: number; b: number } | null) => {
    spanRef.current = v
    setSpan(v)
    const c = v ? Math.min(1, Math.abs(v.b - v.a)) : 0
    dragRef.current = c
    setDrag(c)
  }

  const fracOf = (clientX: number) => {
    const r = stub.current?.getBoundingClientRect()
    if (!r || !r.width) return 0.5
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  const rip = (d: number) => {
    if (torn) return
    setDir(d)
    setClosing(false)
    setSpanBoth(d > 0 ? { a: 0, b: 1.3 } : { a: 1, b: -0.3 })
    setPull(1)
    setTorn(true)
    try { navigator.vibrate?.(18) } catch {}
    const px = stub.current?.offsetHeight ?? 140
    setCollapse(px)
    requestAnimationFrame(() => requestAnimationFrame(() => setCollapse(0)))
    setTimeout(() => setShowBtn(true), 520)
    onTorn?.()
  }

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tear || torn || closing) return
    start.current = { x: e.clientX, y: e.clientY, a: fracOf(e.clientX) }
    dirRef.current = 0
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = start.current
    if (!st) return
    const dx = e.clientX - st.x
    if (!dirRef.current) {
      if (Math.abs(dx) < 5) return
      dirRef.current = dx > 0 ? 1 : -1
      setDir(dirRef.current)
    }
    const d = dirRef.current
    const f = fracOf(e.clientX)
    const prev = spanRef.current ? spanRef.current.b : st.a
    const front = d > 0 ? Math.max(prev, f) : Math.min(prev, f)
    setPull(Math.max(0, Math.min(1, (e.clientY - st.y) / 70)))
    setSpanBoth({ a: st.a, b: front })
  }

  const up = () => {
    if (!start.current) return
    start.current = null
    setDragging(false)
    const sp = spanRef.current
    if (sp) {
      const cov = Math.abs(sp.b - sp.a)
      const edge = sp.b < 0.04 || sp.b > 0.96
      if ((edge && cov > 0.3) || cov > 0.65) {
        rip(dirRef.current || 1)
        return
      }
      setClosing(true)
      setPull(0)
      setTimeout(() => {
        setSpanBoth(null)
        setClosing(false)
      }, 480)
    }
  }

  // ---- geometria do rasgo: uma tira rigida que gira na ponta, bordas irregulares ----
  const K = 14
  const NZ_A = useMemo(() => { const r = rng(hash(seed + 'a')); return Array.from({ length: K + 1 }, () => r()) }, [seed])
  const NZ_B = useMemo(() => { const r = rng(hash(seed + 'b')); return Array.from({ length: K + 1 }, () => r()) }, [seed])
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const ex = (x: number, nz: number[], k: number) => (x <= 0.002 || x >= 0.998 ? x * 100 : (x + (nz[k] - 0.5) * 0.03) * 100)
  const edgePts = (x: number, nz: number[]) =>
    Array.from({ length: K + 1 }, (_, k) => `${ex(x, nz, k).toFixed(2)}% ${((k / K) * 100).toFixed(1)}%`)

  const aF = span ? clamp01(span.a) : 0
  const bF = span ? clamp01(span.b) : 0
  const aIsLo = aF <= bF
  const lo = aIsLo ? aF : bF
  const hi = aIsLo ? bF : aF
  const nzLo = aIsLo ? NZ_A : NZ_B
  const nzHi = aIsLo ? NZ_B : NZ_A
  const tearSign = span && span.b < span.a ? -1 : 1
  const cov = hi - lo
  const theta = closing ? 0 : Math.min(1, cov * 5) * (3 + 15 * pull)

  const tornClip = span ? `polygon(${[...edgePts(lo, nzLo), ...edgePts(hi, nzHi).reverse()].join(',')})` : 'none'
  const leftClip = span && lo > 0.002 ? `polygon(${['0% 0%', ...edgePts(lo, nzLo), '0% 100%'].join(',')})` : null
  const rightClip = span && hi < 0.998 ? `polygon(${[...edgePts(hi, nzHi), '100% 100%', '100% 0%'].join(',')})` : null
  const tipPct = (tearSign > 0 ? bF : bF) * 100

  const stubTransform = torn ? `translate(${dir * 90}px, 380px) rotate(${dir * 18}deg)` : 'none'
  const stubTransition = torn ? 'transform .9s cubic-bezier(.55,.06,.85,.4), opacity .7s ease .2s' : 'none'
  const pieceTransition = dragging ? 'transform .08s linear' : 'transform .45s cubic-bezier(.2,.9,.2,1)'
  const p = drag

  const stubInner = useMemo(
    () => (
      <>
        <Barcode seed={seed} />
        {tear && !torn && <p className="mt-3 text-center text-[11px] uppercase tracking-[.25em] text-white/40">{t('bp.drag')}</p>}
      </>
    ),
    [seed, tear, torn, t]
  )

  const layerCls = 'absolute inset-0 rounded-b-3xl bg-[#232325] px-6 pb-5 pt-5'

  const code = compact ? 'text-4xl' : 'text-5xl'
  const displayStatus = data.booked ? 'BOOKED' : t('bp.now')
  const pathname = usePathname()
  const [mode, setMode] = useState<'solo' | 'duo'>('solo')
  const [qr, setQr] = useState('')
  const [duoStart] = useState(() => Math.ceil((Date.now() + 10 * 60000) / 60000) * 60000)
  const airlineCode = (pathname?.match(/\/flights\/([^/]+)/)?.[1] || '').split('-')[0].toUpperCase()
  const shareLink = useMemo(() => {
    if (!torn || !airlineCode || typeof window === 'undefined') return ''
    return `${window.location.origin}/s?d=${encodeShare({ a: airlineCode, f: data.from, t: data.to, ac: data.aircraft || '', n: data.flight || '', m: mode, s: mode === 'duo' ? duoStart : undefined })}`
  }, [torn, airlineCode, data.from, data.to, data.aircraft, data.flight, mode, duoStart])
  useEffect(() => {
    if (!shareLink) return
    import('qrcode').then((Q: any) => (Q.default || Q).toDataURL(shareLink, { margin: 1, width: 240 })).then(setQr).catch(() => {})
  }, [shareLink])

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
            <div><dt className="text-white/40">{t('bp.seat')}</dt><dd className="font-mono font-bold">{seat}</dd></div>
            <div className="text-right"><dt className="text-white/40">{t('bp.distance')}</dt><dd className="font-mono font-bold">{km}</dd></div>
            <div><dt className="text-white/40">{t('bp.boarding')}</dt><dd className="font-mono font-bold">{displayStatus}</dd></div>
            <div className="text-right"><dt className="text-white/40">{t('bp.date')}</dt><dd className="font-mono font-bold">{date}</dd></div>
          </dl>
        )}
        <div
          className="absolute inset-x-6 bottom-0 border-t border-dashed transition-colors duration-200"
          style={{ borderColor: `rgba(255,255,255,${0.2 + p * 0.5})` }}
        />
      </div>

      <div style={{ height: collapse === null ? undefined : collapse, transition: 'height .55s ease .4s' }}>
        <div
          ref={stub}
          role={tear && !torn ? 'button' : undefined}
          tabIndex={tear && !torn ? 0 : undefined}
          onKeyDown={(e) => {
            if (tear && !torn && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              rip(1)
            }
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`relative ${tear && !torn ? 'cursor-grab' : ''} ${torn ? 'pointer-events-none' : ''}`}
          style={{
            transform: stubTransform,
            transformOrigin: dir > 0 ? '0% 0%' : '100% 0%',
            transition: stubTransition,
            opacity: torn ? 0 : 1,
            touchAction: 'none',
            willChange: 'transform',
          }}
        >
          <div className="invisible rounded-b-3xl px-6 pb-5 pt-5" style={mask(notchBottom)}>
            {stubInner}
          </div>

          {!span && (
            <div aria-hidden="true" className={layerCls} style={mask(notchBottom)}>
              {stubInner}
            </div>
          )}

          {span && leftClip && (
            <div aria-hidden="true" className={layerCls} style={{ ...mask(notchBottom), clipPath: leftClip }}>
              {stubInner}
            </div>
          )}
          {span && rightClip && (
            <div aria-hidden="true" className={layerCls} style={{ ...mask(notchBottom), clipPath: rightClip }}>
              {stubInner}
            </div>
          )}
          {span && (
            <div
              aria-hidden="true"
              className={layerCls}
              style={{
                ...mask(notchBottom),
                clipPath: tornClip,
                transformOrigin: `${tipPct}% 0%`,
                transform: `rotate(${-tearSign * theta}deg)`,
                transition: pieceTransition,
                willChange: 'transform',
              }}
            >
              {stubInner}
            </div>
          )}
        </div>
      </div>

      {torn && !torn && qr && (
        <div className="mt-6 rounded-2xl bg-white/[.06] p-4 text-center">
          <div className="mx-auto flex w-fit rounded-full bg-white/10 p-1 text-xs">
            {(['solo', 'duo'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-4 py-1.5 font-semibold ${mode === m ? 'bg-white text-black' : 'text-white/60'}`}>{m === 'solo' ? 'Solo' : 'Duo'}</button>
            ))}
          </div>
          <img src={qr} alt="Share this route" className="mx-auto mt-3 size-40 rounded-xl bg-white p-2" />
          <p className="mt-2 text-xs text-white/50">{mode === 'duo' ? 'Duo: your friend scans this in MyRoster, Scan, and you both depart at the same time.' : 'Share this route: scan it in MyRoster, Scan.'}</p>
        </div>
      )}

      {bookMode && <BookAction data={data} />}

      {torn && (
        <button
          onClick={() => { sound.unlock(); sound.play('dingdong'); onBoard?.() }}
          className={`mt-6 w-full rounded-full bg-white py-4 text-base font-semibold text-black shadow-lg transition-all duration-500 ${showBtn ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
        >
          {t('bp.board')}
        </button>
      )}
    </div>
  )
}
