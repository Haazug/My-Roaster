'use client'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import { splitRoute, interpolateRoute } from '@/lib/flight-workflow'
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
  const [size,setSize]=useState({width:900,height:700})
  useEffect(()=>{const resize=()=>setSize({width:window.innerWidth,height:window.innerHeight});resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[])
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
      c.autoRotate = view.mode === 'idle' || (view.mode === 'airports' && !view.selected)
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
  }, [view.mode, lock, view.mode==='airports'?view.selected:undefined])

  const hubs = useMemo(() => (view.mode === 'airline' ? (view.hubs?.length ? view.hubs.map(p=>({p,c:1})) : topAirports(view.routes)) : []), [view.mode,view.mode==='airline'?view.routes:undefined,view.mode==='airline'?view.hubs:undefined])

  // where the camera should be for the current view (null = leave it alone)
  const cam: Cam | null = useMemo(() => {
    if (view.mode === 'airline' && hubs.length) {
      const h = hubs[0].p
      return { key: 'a:' + h.lat.toFixed(2) + ',' + h.lon.toFixed(2), lat: h.lat, lng: h.lon, alt: 0.9 }
    }
    const selected = view.mode==='point' ? view.point : view.mode==='airports' ? view.airports.find(p=>p.iata===view.selected) : undefined
    if(selected) return {key:'p:'+selected.iata,lat:selected.lat,lng:selected.lon,alt:0.55}
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
      clearTimers()
      // back to a menu: after a short wait (so quick page swaps do not bounce) show the whole globe again
      if(view.mode==='airports')return
      const t = setTimeout(() => {
        if (!zoomKey.current) return
        zoomKey.current = ''
        clearTimers()
        const g = ref.current
        if (!g) return
        const pv = g.pointOfView()
        g.pointOfView({ lat: pv.lat, lng: pv.lng, altitude: 2.5 }, 1600)
      }, 450)
      return () => clearTimeout(t)
    }
    if (zoomKey.current === camKey) return
    clearTimers()
    let tries = 0
    const go = () => {
      const g = ref.current
      const c = camRef.current
      if (!g || !c) {
        if (++tries < 12) later(go, 300)
        return
      }
      zoomKey.current = c.key
      const pv = g.pointOfView()
      const near = Math.abs(pv.lat - c.lat) < 1.5 && Math.abs(pv.lng - c.lng) < 1.5 && Math.abs(pv.altitude - c.alt) < 0.15
      if (!near) g.pointOfView({ lat: c.lat, lng: c.lng, altitude: c.alt }, 1800)
    }
    later(go, 450)
  }, [camKey,view.mode])

  useEffect(() => clearTimers, [])

  const wps=view.mode==='route'&&view.waypoints&&view.waypoints.length>1?view.waypoints:undefined
  const from=view.mode==='route'?view.from:undefined, to=view.mode==='route'?view.to:undefined
  const network=view.mode==='airline'?view.routes:undefined
  const progress=view.mode==='route'?view.progress:undefined
  const routePoints=useMemo(()=>from&&to?wps||Array.from({length:65},(_,i)=>interpolateRoute(from,to,i/64)):[],[from,to,wps])
  const basePath=useMemo(()=>({pts:routePoints.map(w=>[w.lat,w.lon,0.012]),color:'#68717c'}),[routePoints])
  const paths=useMemo(()=>{
    if(!from||!to)return []
    if(progress===undefined)return wps?[basePath]:[]
    const done=splitRoute(routePoints,progress).done
    return done.length>1?[basePath,{pts:done.map(w=>[w.lat,w.lon,0.016]),color:'#4ade80'}]:[basePath]
  },[from,to,progress,wps,routePoints,basePath])
  const arcs=useMemo(()=>network?network.slice(0,600).map(r=>({startLat:r.from.lat,startLng:r.from.lon,endLat:r.to.lat,endLng:r.to.lon})):from&&to&&progress===undefined&&!wps?[{startLat:from.lat,startLng:from.lon,endLat:to.lat,endLng:to.lon}]:[],[network,from,to,progress===undefined,wps])
  const airports=view.mode==='airports'?view.airports:undefined
  const point=view.mode==='point'?view.point:undefined, nearby=view.mode==='point'?view.nearby:undefined
  const selected=view.mode==='airports'?view.selected:point?.iata
  const points=useMemo(()=>airports?airports.map(p=>({...p,r:p.iata===selected?0.17:0.09,color:p.iata===selected?'#facc15':'#ffffff'})):point?[{...point,r:0.17,color:'#facc15'},...(nearby||[]).filter(p=>p.iata!==point.iata).map(p=>({...p,r:0.08,color:'#ffffff'}))]:from&&to?[{...from,r:0.18,color:'#facc15'},{...to,r:0.18,color:'#facc15'}]:hubs.slice(0,3).map((h,i)=>({...h.p,r:i===0?0.24:0.16,color:'#facc15'})),[airports,selected,point,nearby,from,to,hubs])

  const selectedPoints=useMemo(()=>point?[point]:from&&to?[from,to]:airports?airports.filter(p=>p.iata===selected):hubs.slice(0,3).map(h=>h.p),[point,from,to,airports,selected,hubs])

  return (
    <div className="relative size-full">
      <Globe
        ref={ref}
        waitForGlobeReady={false}
        width={size.width}
        height={size.height}
        globeOffset={size.width>=1024?[Math.min(250-size.width/2,0),0]:[0,0]}
        globeImageUrl="/globe/earth-blue-marble.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        backgroundImageUrl="/globe/night-sky.png"
        atmosphereColor="#1f88ff"
        atmosphereAltitude={0.16}
        arcsData={arcs}
        arcColor={() => (view.mode === 'route' ? ['rgba(255,255,255,0.9)', 'rgba(31,136,255,1)'] : ['rgba(85,167,255,0.18)', 'rgba(130,195,255,0.9)'])}
        arcStroke={view.mode === 'route' ? 0.85 : 0.22}
        arcAltitudeAutoScale={view.mode === 'route' ? 0.25 : 0.2}
        arcsTransitionDuration={0}
        pathsData={paths}
        pathTransitionDuration={0}
        pathPoints="pts"
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={(p:any)=>p.color}
        pathStroke={1.1}
        pathPointAlt={(p:any)=>p[2]??0.012}
        pointsData={points}
        pointsMerge
        pointsTransitionDuration={0}
        labelsTransitionDuration={0}
        pointLat="lat"
        pointLng="lon"
        pointColor={(p: any) => p.color || '#ffffff'}
        pointAltitude={0.002}
        pointRadius={(p: any) => p.r ?? 0.25}
        ringsData={selectedPoints}
        ringLat="lat"
        ringLng="lon"
        ringColor={() => (t: number) => `rgba(250,204,21,${1 - t})`}
        ringMaxRadius={Math.min(4,Math.max(0.5,(cam?.alt||1)*2))}
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={1800}
        labelsData={selectedPoints}
        labelLat="lat"
        labelLng="lon"
        labelText={(p:any)=>`${p.iata} · ${p.city || p.name || ''}`}
        labelSize={Math.max(0.16,(cam?.alt||0.9)*0.6)}
        labelDotRadius={0}
        labelColor={() => 'rgba(255,255,255,0.9)'}
        labelAltitude={0.03}
        labelResolution={2}
      />
      <div className="hidden lg:block"><LiveTraffic getCenter={() => (view.mode === 'idle' ? LUANDA : ref.current?.pointOfView())} /></div>
    </div>
  )
}
