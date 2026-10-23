'use client'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { useEffect, useRef } from 'react'
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

  // camera: zooms once per place. Swapping the direction of the same route (outbound/return) does NOT zoom again.
  useEffect(() => {
    let key = ''
    let start: (() => boolean) | null = null
    if (view.mode === 'airline' && view.routes.length) {
      const n = new Map<string, { p: Point; c: number }>()
      for (const r of view.routes) {
        for (const p of [r.from, r.to]) {
          const k = p.lat + ',' + p.lon
          const e = n.get(k)
          if (e) e.c++
          else n.set(k, { p, c: 1 })
        }
      }
      let best: { p: Point; c: number } | null = null
      for (const e of Array.from(n.values())) if (!best || e.c > best.c) best = e
      if (best) {
        const hub = best.p
        key = 'a:' + hub.lat + ',' + hub.lon
        start = () => {
          const g = ref.current
          if (!g) return false
          g.pointOfView({ lat: hub.lat * 0.5, lng: hub.lon - 70, altitude: 2.8 }, 0)
          later(() => g.pointOfView({ lat: hub.lat, lng: hub.lon, altitude: 0.9 }, 2600), 80)
          return true
        }
      }
    } else if (view.mode === 'route') {
      const a = view.from
      const b = view.to
      const k1 = `${a.lat.toFixed(3)},${a.lon.toFixed(3)}`
      const k2 = `${b.lat.toFixed(3)},${b.lon.toFixed(3)}`
      key = 'r:' + [k1, k2].sort().join('|')
      const c = routeCamera(a, b)
      start = () => {
        const g = ref.current
        if (!g) return false
        g.pointOfView({ lat: c.lat * 0.6, lng: c.lng - 60, altitude: Math.min(3.2, c.alt + 1) }, 0)
        later(() => g.pointOfView({ lat: c.lat, lng: c.lng, altitude: c.alt }, 2200), 80)
        return true
      }
    }
    if (!key || !start) {
      zoomKey.current = ''
      return
    }
    if (zoomKey.current === key) return
    zoomKey.current = key
    clearTimers()
    let tries = 0
    const go = () => {
      if (start!() === false && ++tries < 12) later(go, 300)
    }
    later(go, 250)
  }, [view])

  useEffect(() => clearTimers, [])

  const wps = view.mode === 'route' && view.waypoints && view.waypoints.length > 1 ? view.waypoints : null
  const arcs = view.mode === 'route' && !wps
    ? [{ startLat: view.from.lat, startLng: view.from.lon, endLat: view.to.lat, endLng: view.to.lon }]
    : view.mode === 'airline'
      ? view.routes.slice(0, 600).map((r) => ({ startLat: r.from.lat, startLng: r.from.lon, endLat: r.to.lat, endLng: r.to.lon }))
      : []
  const paths = wps ? [{ pts: wps.map((w) => [w.lat, w.lon]) }] : []
  const points = view.mode === 'airports'
    ? view.airports
    : view.mode === 'point'
      ? [view.point, ...view.nearby]
      : wps
        ? wps
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
        arcColor={() => '#1f88ff'}
        arcStroke={view.mode === 'route' ? 1.2 : 0.3}
        arcAltitudeAutoScale={0.3}
        pathsData={paths}
        pathPoints="pts"
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={() => '#4caf50'}
        pathStroke={1.4}
        pathPointAlt={0.012}
        pointsData={points}
        pointLat="lat"
        pointLng="lon"
        pointColor={() => '#facc15'}
        pointAltitude={0.02}
        pointRadius={wps ? 0.18 : 0.35}
      />
      <LiveTraffic getCenter={() => (view.mode === 'idle' ? LUANDA : ref.current?.pointOfView())} />
    </div>
  )
}
