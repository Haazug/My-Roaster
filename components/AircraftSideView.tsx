'use client'

import { useEffect, useId, useState } from 'react'

type Kind = 'narrow' | 'wide' | 'quad' | 'tri' | 'rear' | 'prop' | 'light' | 'classic'

export function aircraftKind(input: string): Kind {
  const s = (input || '').toLowerCase()
  if (/747|b74|a380|a388|a34|dc-?8|il-?96|an-?124/.test(s)) return 'quad'
  if (/md-?11|dc-?10|l-?1011|tristar|727|b72|tu-?154|trident/.test(s)) return 'tri'
  if (/dc-?[2-7](?!\d)|c-?47|dakota|constellation|convair|l-?188|electra/.test(s)) return 'classic'
  if (/md-?[89]|dc-?9|717|b712|crj|canadair|fokker 100|f100|fokker 70|erj-?1[34]\d?|emb-?14|embraer 1[34]\d|bae 146|avro|citation|learjet|gulfstream|challenger|phenom|hondajet/.test(s)) return 'rear'
  if (/atr|dash ?8|dhc|dh8|q400|saab|sf340|s340|dornier|do-?328|fokker 50|f50|atp|jetstream|b190|beech 1900|king air|b350|pc-?12|pilatus|caravan|c208|tbm|an-?(24|26|32)|il-?18|twin otter/.test(s)) return 'prop'
  if (/cessna|\bc1\d\d\b|\bc2\d\d\b|piper|pa-?\d|diamond|\bda\d|cirrus|\bsr2|bonanza|mooney|robin|tecnam|zlin|sling|grob|pitts/.test(s)) return 'light'
  if (/777|b77|787|b78|767|b76|a33|a35|a30[06]|a310|il-?86/.test(s)) return 'wide'
  return 'narrow'
}

const BASE = 'https://cdn.jsdelivr.net/gh/Jxck-S/airline-logos@main'
const FOLDERS = ['flightaware_logos', 'radarbox_logos', 'custom_logos']
const DEFAULT: [string, string] = ['#1f88ff', '#c9d3dc']

function pickColors(d: Uint8ClampedArray): [string, string] | null {
  const buckets = Array.from({ length: 12 }, () => ({ n: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
    if (a < 128) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max < 60 || (max - min) / max < 0.35) continue
    const dl = max - min
    let h = 0
    if (max === r) h = ((g - b) / dl) % 6
    else if (max === g) h = (b - r) / dl + 2
    else h = (r - g) / dl + 4
    h = (h * 60 + 360) % 360
    const k = buckets[Math.floor(h / 30) % 12]
    k.n++; k.r += r; k.g += g; k.b += b
  }
  const sorted = buckets.map((k, i) => ({ ...k, i })).filter((k) => k.n > 6).sort((a, b) => b.n - a.n)
  if (!sorted.length) return null
  const hex = (k: { r: number; g: number; b: number; n: number }) =>
    '#' + [k.r, k.g, k.b].map((v) => Math.round(v / k.n).toString(16).padStart(2, '0')).join('')
  const main = sorted[0]
  const second = sorted.find((k) => { const di = Math.abs(k.i - main.i); return Math.min(di, 12 - di) >= 2 })
  return [hex(main), second ? hex(second) : DEFAULT[1]]
}

function useLogo(icao?: string) {
  const [src, setSrc] = useState('')
  const [colors, setColors] = useState<[string, string]>(DEFAULT)
  useEffect(() => {
    let live = true
    setSrc(''); setColors(DEFAULT)
    if (!icao) return
    ;(async () => {
      for (const f of FOLDERS) {
        const url = `${BASE}/${f}/${icao.toUpperCase()}.png`
        const img = await new Promise<HTMLImageElement | null>((res) => {
          const i = new Image()
          i.crossOrigin = 'anonymous'
          i.onload = () => res(i)
          i.onerror = () => res(null)
          i.src = url
        })
        if (!live) return
        if (!img) continue
        setSrc(url)
        try {
          const c = document.createElement('canvas')
          c.width = 48; c.height = 48
          const ctx = c.getContext('2d')
          if (!ctx) return
          ctx.drawImage(img, 0, 0, 48, 48)
          const cols = pickColors(ctx.getImageData(0, 0, 48, 48).data)
          if (cols && live) setColors(cols)
        } catch {}
        return
      }
    })()
    return () => { live = false }
  }, [icao])
  return { src, colors }
}

type Model = 'b737' | 'a320' | 'a220' | 'b747' | 'a380' | 'b777' | 'b787' | 'a350' | 'a330' | 'b757' | 'b767' | 'ejet' | null

export function aircraftModel(input: string): Model {
  const s = (input || '').toLowerCase()
  const t = s.trim()
  if (/^388$/.test(t)) return 'a380'
  if (/^74[0-9a-z]$/.test(t)) return 'b747'
  if (/^(359|351|35k)$/.test(t)) return 'a350'
  if (/^78[0-9a-z]$/.test(t)) return 'b787'
  if (/^77[0-9a-z]$/.test(t)) return 'b777'
  if (/^(33|34)[0-9a-z]$/.test(t)) return 'a330'
  if (/^76[0-9a-z]$/.test(t)) return 'b767'
  if (/^75[0-9a-z]$/.test(t)) return 'b757'
  if (/^(221|223)$/.test(t)) return 'a220'
  if (/^e[79][0-9a-z]$/.test(t)) return 'ejet'
  if (/^(73[0-9a-z]|7m[0-9a-z])$/.test(t)) return 'b737'
  if (/^(31|32)[0-9a-z]$/.test(t)) return 'a320'
  if (/a380|a388/.test(s)) return 'a380'
  if (/747|b74\d/.test(s)) return 'b747'
  if (/a350|a359|a35k/.test(s)) return 'a350'
  if (/787|b78\d/.test(s)) return 'b787'
  if (/777|b77[2-9lw]/.test(s)) return 'b777'
  if (/a33\d|a34\d/.test(s)) return 'a330'
  if (/767|b76\d/.test(s)) return 'b767'
  if (/757|b75\d/.test(s)) return 'b757'
  if (/a220|bcs[13]/.test(s)) return 'a220'
  if (/embraer 1(7|9)\d|e1(70|75|90|95)|e2(90|95)|e75|erj-?1(70|75|90|95)|e-?jet/.test(s)) return 'ejet'
  if (/737|b73\d|b3[789x]m|max ?\d/.test(s)) return 'b737'
  if (/a3(18|19|20|21)|a(19|20|21)n/.test(s)) return 'a320'
  return null
}

function lengthAdj(input: string) {
  const s = (input || '').toLowerCase()
  const t = s.trim()
  if (/^(739|73j|321|32q|32b|7m9|7m10|753)$/.test(t)) return -10
  if (/^(318|319|31n|736|73g|73w|7m7)$/.test(t)) return 22
  if (/a321|a21n|b739|737-?9|max ?(9|10)|b39m|b3xm|757-?3|b753/.test(s)) return -10
  if (/a318|a319|a19n|737-?[67]|max ?7|b37m|b73[67]/.test(s)) return 22
  return 0
}

const MODEL_ADJ: Partial<Record<Exclude<Model, null>, { dx?: number; dh?: number }>> = {
  b757: { dh: -2 },
  ejet: { dx: 30, dh: -2 },
  a220: { dx: 34, dh: -1 },
}

const MODEL_NAME: Record<Exclude<Model, null>, string> = {
  b737: 'Boeing 737', a320: 'Airbus A320', a220: 'Airbus A220', b747: 'Boeing 747', a380: 'Airbus A380', b777: 'Boeing 777',
  b787: 'Boeing 787', a350: 'Airbus A350', a330: 'Airbus A330/A340', b757: 'Boeing 757', b767: 'Boeing 767', ejet: 'Embraer E-Jet',
}

const cy = 62
const BODY = '#f3f5f7'
const SHADE = '#c5cdd6'
const LINE = '#8d99a6'
const DARK = '#1a2230'

const GEO: Record<Kind, { x0: number; x1: number; h: number; fin: number; ws: number; scale: number }> = {
  narrow: { x0: 30, x1: 380, h: 15, fin: 40, ws: 18, scale: 1 },
  wide: { x0: 18, x1: 384, h: 19, fin: 46, ws: 24, scale: 1 },
  quad: { x0: 12, x1: 390, h: 21, fin: 50, ws: 26, scale: 1 },
  tri: { x0: 22, x1: 382, h: 18, fin: 44, ws: 22, scale: 1 },
  rear: { x0: 40, x1: 372, h: 14, fin: 46, ws: 14, scale: 1 },
  prop: { x0: 46, x1: 352, h: 13, fin: 38, ws: 0, scale: 1.1 },
  light: { x0: 96, x1: 318, h: 11, fin: 30, ws: 0, scale: 1.35 },
  classic: { x0: 44, x1: 340, h: 15, fin: 38, ws: 0, scale: 1.1 },
}

export function AircraftSideView({ aircraft, airlineIcao, className = 'w-full' }: { aircraft: string; airlineIcao?: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const kind = aircraftKind(aircraft)
  const { src, colors } = useLogo(airlineIcao)
  if (/helicopter|robinson|\bbell \d|eurocopter|sikorsky|airbus h\d|\bec-?\d|\bas-?\d|\br(22|44|66)\b|glider|balloon|blimp/i.test(aircraft || '')) return null
  const [main, accent] = colors
  const model = aircraftModel(aircraft)
  const g0 = GEO[kind]
  const adj: { dx?: number; dh?: number } = (model && MODEL_ADJ[model]) || {}
  const { x1, fin, ws, scale } = g0
  const x0 = g0.x0 + (adj.dx || 0) + lengthAdj(aircraft)
  const h = g0.h + (adj.dh || 0)
  const cx = (x0 + x1) / 2
  const wx = cx - 10
  const jet = kind === 'narrow' || kind === 'wide' || kind === 'quad' || kind === 'tri'

  const body = `M ${x0} ${cy - h * 0.5} L ${x0 + 55} ${cy - h} L ${x1 - 48} ${cy - h} Q ${x1} ${cy - h} ${x1} ${cy + h * 0.25} Q ${x1 - 6} ${cy + h} ${x1 - 50} ${cy + h} L ${x0 + 60} ${cy + h} L ${x0} ${cy - h * 0.1} Z`
  const tail = `M ${x0 + 20} ${cy - h + 3} L ${x0 + 4} ${cy - h - fin} L ${x0 + 34} ${cy - h - fin} L ${x0 + 92} ${cy - h + 3} Z`
  const stab = `M ${x0 + 2} ${cy - 6} L ${x0 + 58} ${cy + 4} L ${x0 + 46} ${cy + 9} L ${x0 - 8} ${cy - 1} Z`
  const cockpit = `M ${x1 - 46} ${cy - h * 0.6} L ${x1 - 16} ${cy - h * 0.5} L ${x1 - 20} ${cy - h * 0.1} L ${x1 - 46} ${cy - h * 0.25} Z`
  const logoX = x0 + 38
  const logoY = cy - h - fin * 0.42
  const r = 12
  const st = { stroke: LINE, strokeWidth: 0.8 }
  const flat = model === 'b737'
  const engH = flat ? 12 : model === 'b777' ? 22 : kind === 'narrow' ? 15 : 18
  const engW = model === 'b777' ? 48 : kind === 'narrow' ? 34 : 40

  return (
    <div className={className}>
    <svg viewBox="0 -16 400 140" className="w-full" role="img" aria-label={`${aircraft || 'Aircraft'} side view`}>
      <defs>
        <clipPath id={`f${uid}`}><path d={body} /></clipPath>
        <clipPath id={`l${uid}`}><circle cx={logoX} cy={logoY} r={r - 1.5} /></clipPath>
      </defs>
      <g transform={`translate(200 ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
        {kind !== 'rear' && <path d={stab} fill={SHADE} {...st} />}
        <path d={body} fill={BODY} {...st} />
        <g clipPath={`url(#f${uid})`}>
          <rect x={0} y={cy + 1} width={400} height={4} fill={main} />
          <rect x={0} y={cy + 7} width={400} height={2} fill={accent} />
        </g>
        <path d={tail} fill={main} {...st} />
        {model === 'b747' && <path d={`M ${x1 - 150} ${cy - h + 1} Q ${x1 - 142} ${cy - h - 15} ${x1 - 112} ${cy - h - 15} L ${x1 - 92} ${cy - h - 15} Q ${x1 - 70} ${cy - h - 12} ${x1 - 58} ${cy - h + 1} Z`} fill={BODY} {...st} />}
        {model === 'a380' && (
          <>
            <path d={`M ${x0 + 70} ${cy - h + 1} Q ${x0 + 76} ${cy - h - 7} ${x0 + 90} ${cy - h - 7} L ${x1 - 70} ${cy - h - 7} Q ${x1 - 52} ${cy - h - 6} ${x1 - 46} ${cy - h + 1} Z`} fill={BODY} {...st} />
            <line x1={x0 + 100} y1={cy - h - 3} x2={x1 - 70} y2={cy - h - 3} stroke={DARK} strokeWidth={2} strokeDasharray="2.5 5" strokeLinecap="round" opacity={0.5} />
          </>
        )}
        {kind === 'rear' && <rect x={x0 - 6} y={cy - h - fin} width={46} height={5} rx={2} fill={SHADE} {...st} />}
        {src && kind !== 'light' && (
          <g>
            <circle cx={logoX} cy={logoY} r={r} fill="#fff" />
            <image href={src} x={logoX - r + 1.5} y={logoY - r + 1.5} width={(r - 1.5) * 2} height={(r - 1.5) * 2} preserveAspectRatio="xMidYMid meet" clipPath={`url(#l${uid})`} />
          </g>
        )}
        {kind === 'light' ? (
          <rect x={x1 - 112} y={cy - h * 0.6} width={62} height={9} rx={3} fill={DARK} opacity={0.5} />
        ) : (
          <>
            <path d={cockpit} fill={DARK} opacity={model === 'a350' ? 0.95 : 0.65} />
            <line x1={x0 + 105} y1={cy - h * 0.35} x2={x1 - 62} y2={cy - h * 0.35} stroke={DARK} strokeWidth={2.4} strokeDasharray="2.5 5" strokeLinecap="round" opacity={0.5} />
          </>
        )}

        {jet && (
          <>
            <path d={`M ${wx} ${cy + h * 0.25} L ${wx + 80} ${cy + h * 0.25} L ${wx + 36} ${cy + h + ws} L ${wx + 14} ${cy + h + ws} Z`} fill={SHADE} {...st} />
            {(kind === 'quad' ? [wx + 2, wx + 44] : [wx + 14]).map((ex) => (
              <g key={ex}>
                <rect x={ex} y={cy + h + ws - 15 + (flat ? 3 : 0)} width={engW} height={engH} rx={flat ? 4 : 8} fill={BODY} {...st} />
                <rect x={ex} y={cy + h + ws - 15 + (flat ? 3 : 0)} width={6} height={engH} rx={3} fill={main} />
                {model === 'b787' && <path d={`M ${ex + engW} ${cy + h + ws - 15} l 4 ${engH / 4} l -4 ${engH / 4} l 4 ${engH / 4} l -4 ${engH / 4}`} fill="none" stroke={LINE} strokeWidth={1} />}
              </g>
            ))}
            {kind === 'tri' && (
              <g>
                <rect x={x0 + 34} y={cy - h - 9} width={38} height={17} rx={8} fill={BODY} {...st} />
                <rect x={x0 + 34} y={cy - h - 9} width={6} height={17} rx={3} fill={main} />
              </g>
            )}
          </>
        )}

        {kind === 'rear' && (
          <>
            <path d={`M ${wx} ${cy + h * 0.3} L ${wx + 64} ${cy + h * 0.3} L ${wx + 30} ${cy + h + ws} L ${wx + 12} ${cy + h + ws} Z`} fill={SHADE} {...st} />
            <rect x={x0 + 58} y={cy - h * 0.3} width={44} height={14} rx={7} fill={BODY} {...st} />
            <rect x={x0 + 58} y={cy - h * 0.3} width={6} height={14} rx={3} fill={main} />
          </>
        )}

        {kind === 'prop' && (
          <>
            <rect x={wx - 4} y={cy - h - 4} width={80} height={6} rx={3} fill={SHADE} {...st} />
            <rect x={wx + 28} y={cy - h - 15} width={54} height={14} rx={7} fill={BODY} {...st} />
            <ellipse cx={wx + 84} cy={cy - h - 8} rx={5} ry={22} fill={DARK} opacity={0.12} />
            <rect x={wx + 83} y={cy - h - 30} width={2.5} height={44} rx={1.2} fill={DARK} opacity={0.6} />
            <circle cx={wx + 52} cy={cy + h + 7} r={6} fill={DARK} />
            <circle cx={x1 - 55} cy={cy + h + 6} r={5} fill={DARK} />
          </>
        )}

        {kind === 'light' && (
          <>
            <rect x={wx - 8} y={cy - h - 5} width={84} height={5} rx={2.5} fill={SHADE} {...st} />
            <line x1={wx + 36} y1={cy - h} x2={wx + 14} y2={cy + h * 0.7} stroke={LINE} strokeWidth={2} />
            <ellipse cx={x1 + 1} cy={cy} rx={4} ry={22} fill={DARK} opacity={0.12} />
            <rect x={x1 - 1} y={cy - 22} width={2.5} height={44} rx={1.2} fill={DARK} opacity={0.6} />
            <line x1={wx + 8} y1={cy + h} x2={wx + 4} y2={cy + h + 10} stroke={LINE} strokeWidth={2} />
            <circle cx={wx + 4} cy={cy + h + 13} r={6} fill={DARK} />
            <line x1={x1 - 38} y1={cy + h} x2={x1 - 38} y2={cy + h + 9} stroke={LINE} strokeWidth={2} />
            <circle cx={x1 - 38} cy={cy + h + 12} r={5} fill={DARK} />
          </>
        )}

        {kind === 'classic' && (
          <>
            <rect x={wx - 6} y={cy + h * 0.35} width={90} height={8} rx={4} fill={SHADE} {...st} />
            <rect x={wx + 22} y={cy + h * 0.35 - 3} width={58} height={15} rx={7} fill={BODY} {...st} />
            <ellipse cx={wx + 82} cy={cy + h * 0.35 + 4.5} rx={5} ry={23} fill={DARK} opacity={0.12} />
            <rect x={wx + 81} y={cy + h * 0.35 - 18} width={2.5} height={45} rx={1.2} fill={DARK} opacity={0.6} />
            <line x1={wx + 44} y1={cy + h * 0.35 + 10} x2={wx + 44} y2={cy + h + 8} stroke={LINE} strokeWidth={2} />
            <circle cx={wx + 44} cy={cy + h + 14} r={8} fill={DARK} />
            <circle cx={x0 + 10} cy={cy + h * 0.5} r={3.5} fill={DARK} />
          </>
        )}
      </g>
    </svg>
    <p className="mt-1 text-center text-[11px] text-white/40">{model ? `*ilustração aproximada · ${MODEL_NAME[model]}` : '*avião gerado genericamente'}</p>
    </div>
  )
}
