'use client'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { useEffect, useMemo, useRef } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import LiveTraffic from './LiveTraffic'

const R = Math.PI / 180
// default live-traffic centre: Luanda (NBJ)
const LUANDA = { lat: -9.0507, lng: 13.4991, altitude: 1 }

function routeCamera(a: Point, b: Point) {
  const p1 = a.lat * R, l1 = a.lon * R, p2 = b.lat * R, l2 = b.lon * R
  const x = Math.cos(p1) * Math.cos(l1) + Math.cos(p2) * Math.cos(l2)
  const y = Math.cos(p1) * Math.sin(l1) + Math.cos(p2) * Math.sin(l2)
  const z = Math.sin(p1) + Math.sin(p2)
  const lat = Math.atan2(z, Math.hypot(x, y)) / R
  const lng = Math.atan2(y, x) / R
  const th = Math.acos(Math.min(1, Math.max(-1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l2 - l1))))
  const alt = Math.min(3, Math.max(0.35, 0.25 + th * 1.2))
  return { lat, lng, alt }
}

// airports of an airline ordered by how many routes touch them (first = hub)
function topAirports(routes: { from: Point; to: Point }[]) {
  const n = new Map<string, { p: Point; c: number }>()
  for (const r of routes) {
    for (const p of [r.from, r.to]) {
      const k = p.lat + ',' + p.lon
      const e = n.get(k)
      if (e) e.c++
      else n.set(k, { p, c: 1 })
    }
  }
  return Array.from(n.values()).sort((a, b) => b.c - a.c)
}

type Cam = { key: string; lat: number; lng: number; alt: number }

export default function GlobeInner() {
  const ref = useRef<GlobeMethods | undefined>(undefined)
  const view = useMapStore((s) => s.view)
  const zoomKey = useRef('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }
  const lock = view.mode === 'route' && !!view.lock

  // rotation and controls
  useEffect(() => {
    let n = 0
    const apply = () => {
      const c = ref.current?.controls() as any
      if (!c) return false
      c.autoRotate = view.mode !== 'airline' && view.mode !== 'route'
      c.autoRotateSpeed = view.mode === 'idle' ? 0.5 : 0.2
      c.enableRotate = !lock
      c.enableZoom = !lock
      return true
    }
    if (apply()) return
    const t = setInterval(() => {
      if (apply() || ++n > 40) clearInterval(t)
    }, 250)
    return () => clearInterval(t)
  }, [view.mode, lock])

  const hubs = useMemo(() => (view.mode === 'airline' ? topAirports(view.routes) : []), [view])

  // where the camera should be for the current view (null = leave it alone)
  const cam: Cam | null = useMemo(() => {
    if (view.mode === 'airline' && hubs.length) {
      const h = hubs[0].p
      return { key: 'a:' + h.lat.toFixed(2) + ',' + h.lon.toFixed(2), lat: h.lat, lng: h.lon, alt: 0.9 }
    }
    if (view.mode === 'route') {
      const k1 = `${view.from.lat.toFixed(3)},${view.from.lon.toFixed(3)}`
      const k2 = `${view.to.lat.toFixed(3)},${view.to.lon.toFixed(3)}`
      const c = routeCamera(view.from, view.to)
      return { key: 'r:' + [k1, k2].sort().join('|'), lat: c.lat, lng: c.lng, alt: c.alt }
    }
    return null
  }, [view, hubs])
  const camRef = useRef<Cam | null>(cam)
  camRef.current = cam
  const camKey = cam?.key ?? ''

  // one smooth move per place. Outbound/return of the same route, data refreshes and quick page swaps do not zoom again.
  useEffect(() => {
    if (!camKey) {
      const t = setTimeout(() => { zoomKey.current = '' }, 1200)
      return () => clearTimeout(t)
    }
    if (zoomKey.current === camKey) return
    zoomKey.current = camKey
    clearTimers()
    let tries = 0
    const go = () => {
      const g = ref.current
      const c = camRef.current
      if (!g || !c) {
        if (++tries < 12) later(go, 300)
        return
      }
      g.pointOfView({ lat: c.lat, lng: c.lng, altitude: c.alt }, 1800)
    }
    later(go, 150)
  }, [camKey])

  useEffect(() => clearTimers, [])

  const wps = view.mode === 'route' && view.waypoints && view.waypoints.length > 1 ? view.waypoints : null
  const arcs = view.mode === 'route' && !wps
    ? [{ startLat: view.from.lat, startLng: view.from.lon, endLat: view.to.lat, endLng: view.to.lon }]
    : view.mode === 'airline'
      ? view.routes.slice(0, 600).map((r) => ({ startLat: r.from.lat, startLng: r.from.lon, endLat: r.to.lat, endLng: r.to.lon }))
      : []
  const paths = wps ? [{ pts: wps.map((w) => [w.lat, w.lon]) }] : []

  const points: any[] =
    view.mode === 'airports'
      ? view.airports.map((p) => ({ ...p, r: 0.22 }))
      : view.mode === 'point'
        ? [{ ...view.point, r: 0.3 }, ...view.nearby.map((p) => ({ ...p, r: 0.18 }))]
        : view.mode === 'route'
          ? wps
            ? wps.map((w) => ({ ...w, r: 0.1 }))
            : [{ ...view.from, r: 0.25 }, { ...view.to, r: 0.25 }]
          : view.mode === 'airline'
            ? hubs.slice(0, 3).map((h, i) => ({ ...h.p, r: i === 0 ? 0.45 : 0.25, color: i === 0 ? '#ff9f1c' : '#facc15' }))
            : []

  return (
    <div className="relative size-full">
      <Globe
        ref={ref}
        width={typeof window === 'undefined' ? 900 : window.innerWidth}
        height={typeof window === 'undefined' ? 700 : window.innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#1f88ff"
        atmosphereAltitude={0.16}
        arcsData={arcs}
        arcColor={() => ['rgba(85,167,255,0.10)', 'rgba(31,136,255,0.85)']}
        arcStroke={view.mode === 'route' ? 0.35 : 0.1}
        arcAltitudeAutoScale={view.mode === 'route' ? 0.25 : 0.2}
        pathsData={paths}
        pathPoints="pts"
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={() => '#4caf50'}
        pathStroke={0.5}
        pathPointAlt={0.012}
        pointsData={points}
        pointLat="lat"
        pointLng="lon"
        pointColor={(p: any) => p.color || '#facc15'}
        pointAltitude={0.02}
        pointRadius={(p: any) => p.r ?? 0.25}
      />
      <LiveTraffic getCenter={() => (view.mode === 'idle' ? LUANDA : ref.current?.pointOfView())} />
    </div>
  )
}
