// Ajudas para a caixa "Ao vivo agora" e para o link do Flightradar24.
type P = { lat: number; lon: number }
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function midpoint(a: P, b: P): P {
  const f1 = rad(a.lat), f2 = rad(b.lat), dl = rad(b.lon - a.lon)
  const bx = Math.cos(f2) * Math.cos(dl), by = Math.cos(f2) * Math.sin(dl)
  const f3 = Math.atan2(Math.sin(f1) + Math.sin(f2), Math.sqrt((Math.cos(f1) + bx) ** 2 + by ** 2))
  const l3 = rad(a.lon) + Math.atan2(by, Math.cos(f1) + bx)
  return { lat: deg(f3), lon: ((deg(l3) + 540) % 360) - 180 }
}

export function bearingDeg(a: P, b: P) {
  const dl = rad(b.lon - a.lon)
  const y = Math.sin(dl) * Math.cos(rad(b.lat))
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dl)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export const zoomFor = (nm: number) => (nm < 250 ? 8 : nm < 700 ? 7 : nm < 1800 ? 6 : nm < 4000 ? 5 : 4)

// mapa ao vivo do Flightradar24 centrado no meio da rota (mesmo formato do link que já usas)
export function fr24Url(a: P, b: P, distanceNm: number) {
  const m = midpoint(a, b)
  return `https://www.flightradar24.com/${m.lat.toFixed(2)},${m.lon.toFixed(2)}/${zoomFor(distanceNm)}`
}

// 'to' = vai de a para b; 'from' = vai de b para a; null = sem rumo conhecido
export function headingTo(track: number | undefined, a: P, b: P): 'to' | 'from' | null {
  if (typeof track !== 'number') return null
  const diff = Math.abs(((track - bearingDeg(a, b) + 540) % 360) - 180)
  return diff < 90 ? 'to' : 'from'
}
