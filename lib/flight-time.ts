import { matchAircraft } from '@/lib/aircraft-db'

// typical cruise TAS in knots (Mach 0.78 ≈ 447 kt, Mach 0.85 ≈ 487 kt at FL350)
const KT: Record<string, number> = {
  A388: 487, B748: 490, B744: 487, B77W: 487, B772: 487, B77L: 487, B773: 487, B788: 488, B789: 488, B78X: 488,
  A359: 488, A35K: 488, A339: 470, A333: 470, A332: 470, A343: 470, A346: 478, B763: 450, B764: 450, B752: 450, MD11: 480,
  A320: 447, A20N: 447, A319: 447, A19N: 447, A321: 447, A21N: 447, A318: 440, BCS1: 447, BCS3: 447,
  B737: 447, B738: 447, B739: 447, B38M: 450, B39M: 450,
  E170: 430, E75L: 430, E190: 440, E195: 440, E290: 440, E295: 440, E145: 410, CRJ7: 440, CRJ9: 440,
  AT45: 260, AT46: 270, AT75: 275, AT76: 275, DH8D: 360, DH8C: 290,
  C172: 105, C152: 100, C182: 140, C208: 170, SR20: 150, SR22: 180, DA40: 130, DA42: 150, DA62: 170, PC12: 270, TBM9: 300, B350: 290,
}

type Cls = 'jet' | 'prop' | 'light'
const classOf = (kt: number): Cls => (kt >= 400 ? 'jet' : kt >= 220 ? 'prop' : 'light')
// level at which the table speed above is typical
const REF_FL: Record<Cls, number> = { jet: 350, prop: 250, light: 80 }
const MAX_FL: Record<Cls, number> = { jet: 430, prop: 300, light: 140 }
const MIN_FL = 30
const JET_IAS = 300 // knots, typical airliner climb/cruise IAS before the Mach limit takes over

export function cruiseKnots(aircraft: string): number {
  const q = (aircraft || '').trim()
  const m = q ? matchAircraft(q).match : undefined
  const icao = (m?.icao || q).toUpperCase()
  if (KT[icao]) return KT[icao]
  const n = (m?.name || q).toLowerCase()
  if (/cessna 1|cessna 2|piper|diamond|cirrus|bonanza|mooney|baron|seneca/.test(n)) return 140
  if (/caravan|pc-12|tbm|kodiak|king air|dash 8|atr|saab|dornier/.test(n)) return 280
  return 450
}

// ISA atmosphere ------------------------------------------------------------
const tempK = (ft: number) => (ft <= 36089 ? 288.15 - 0.0019812 * ft : 216.65)
export function soundSpeedKt(fl: number) {
  return 661.4788 * Math.sqrt(tempK(Math.max(0, fl) * 100) / 288.15)
}
const sigma = (fl: number) => {
  const ft = Math.max(0, fl) * 100
  return ft <= 36089 ? Math.pow(tempK(ft) / 288.15, 4.2559) : 0.29707 * Math.exp(-(ft - 36089) / 20806.7)
}

// true airspeed at a flight level
// jets: constant IAS in the climb/low levels, constant Mach higher up (so TAS grows with altitude, then flattens)
// props / light aircraft: constant IAS, so TAS grows with altitude (about 1.5-2% per 1000 ft)
export function tasAt(aircraft: string, fl?: number): number {
  const base = cruiseKnots(aircraft)
  const cls = classOf(base)
  const f = Math.min(MAX_FL[cls], Math.max(MIN_FL, fl && fl > 0 ? fl : REF_FL[cls]))
  if (cls === 'jet') {
    const mach = base / soundSpeedKt(REF_FL.jet)
    return Math.min(mach * soundSpeedKt(f), JET_IAS / Math.sqrt(sigma(f)))
  }
  return base * Math.sqrt(sigma(REF_FL[cls]) / sigma(f))
}

// "0.82", ".82", "M.82" -> Mach (true speed depends on the level); "450" -> knots
export function parseSpeedAt(s: string, fl = 350): number | null {
  const t = (s || '').trim().toLowerCase().replace(',', '.')
  if (!t) return null
  const m = t.match(/^m?\s*(0?\.\d+|[01]\.\d+)$/)
  if (m) return Math.round(parseFloat(m[1]) * soundSpeedKt(fl || 350))
  const n = parseFloat(t.replace(/[^0-9.]/g, ''))
  return n >= 80 && n <= 700 ? Math.round(n) : null
}
export const parseSpeed = (s: string) => parseSpeedAt(s, 350)

export function taxiMinutes(aircraft: string) {
  const kt = cruiseKnots(aircraft)
  return kt >= 400 ? 20 : kt >= 220 ? 14 : 8
}

// gate-to-gate minutes: taxi + climb/descent + cruise over the (routed) distance.
// `fl` is the planned cruise level; short sectors never reach it.
export function estimateBlockMinutes(
  distanceNm: number,
  aircraft = '',
  opt: { speedKt?: number; routed?: boolean; fl?: number } = {}
): number {
  if (!distanceNm || distanceNm <= 0) return 0
  const base = cruiseKnots(aircraft)
  const cls = classOf(base)
  const routeNm = opt.routed ? distanceNm : distanceNm * 1.04 + 20
  const planned = opt.fl && opt.fl > 0 ? opt.fl : REF_FL[cls]
  const fl = Math.min(planned, Math.max(MIN_FL, routeNm * 1.6)) // roughly 6 nm of track per 1000 ft
  const kt = opt.speedKt || tasAt(aircraft, fl)
  const avg = routeNm < 300 ? kt * 0.8 : kt
  const baseCd = cls === 'jet' ? 10 : cls === 'prop' ? 6 : 3
  const climbDescent = baseCd * Math.min(1.25, Math.max(0.3, fl / REF_FL[cls]))
  return Math.max(10, Math.round((routeNm / avg) * 60 + climbDescent + taxiMinutes(aircraft)))
}
