'use client'

import { useRef, useState } from 'react'
import { Download, Share2, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas-pro'

type Data = { from: string; to: string; fromCity?: string; toCity?: string; airline?: string; flight?: string; aircraft?: string; distanceNm?: number; date?: string }
type Legacy = Partial<{ airline: string; airlineIata: string; flightNumber: string; from: string; to: string; fromCity: string; toCity: string; date: string; depTime: string; boardingTime: string; arrivalTime: string; passenger: string; aircraft: string; registration: string; gate: string; seat: string; distance: number; duration: string }>
type Props = Legacy & { data?: Partial<Data>; tear?: boolean; onBoard?: () => void }

export function BoardingPass(props: Props) {
  const d = props.data ?? {}
  const from = d.from ?? props.from ?? '---'
  const to = d.to ?? props.to ?? '---'
  const fromCity = d.fromCity ?? props.fromCity ?? ''
  const toCity = d.toCity ?? props.toCity ?? ''
  const airline = d.airline ?? props.airline ?? ''
  const flight = d.flight ?? `${props.airlineIata ?? ''}${props.flightNumber ?? ''}`
  const aircraft = d.aircraft ?? props.aircraft ?? ''
  const nm = d.distanceNm ?? props.distance
  const date = d.date ?? props.date ?? ''
  const ref = useRef<HTMLDivElement>(null)
  const [torn, setTorn] = useState(false)

  const cells: [string, string | undefined][] = [
    ['Flight', flight], ['Date', date], ['Aircraft', aircraft], ['Distance', nm ? `${nm.toLocaleString('en-US')} nm` : ''],
    ['Passenger', props.passenger], ['Boarding', props.boardingTime], ['Departure', props.depTime], ['Arrival', props.arrivalTime],
    ['Gate', props.gate], ['Seat', props.seat], ['Duration', props.duration], ['Reg', props.registration],
  ]
  const shown = cells.filter(([, v]) => v)
  const code = `${from}${to}${flight}`.toUpperCase()

  const save = async () => {
    if (!ref.current) return
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: '#0a0a0a', scale: 2 })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${from}-${to}-boarding-pass.png`
      a.click()
      toast.success('Boarding pass saved')
    } catch {
      toast.error('Could not save the image')
    }
  }

  const share = async () => {
    const text = `${flight} · ${fromCity || from} to ${toCity || to}${date ? ` · ${date}` : ''}`
    try {
      if (navigator.share) await navigator.share({ title: 'Boarding pass', text })
      else { await navigator.clipboard.writeText(text); toast.success('Flight details copied') }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md">
        <div ref={ref} className={`overflow-hidden border-2 border-white/20 bg-[#10151d] ${tearCls(props.tear)}`}>
          <div className="flex items-center justify-between bg-[#1f88ff] px-5 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Boarding pass</p>
              <p className="text-lg font-bold text-white">{airline || flight}</p>
            </div>
            <span className="text-2xl">✈️</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div><p className="text-3xl font-black text-[#55a7ff]">{from}</p><p className="text-xs text-white/60">{fromCity}</p></div>
              <span className="text-white/40">→</span>
              <div className="text-right"><p className="text-3xl font-black text-[#55a7ff]">{to}</p><p className="text-xs text-white/60">{toCity}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-white/20 pt-4">
              {shown.map(([k, v]) => (
                <div key={k}><p className="text-[10px] uppercase tracking-wider text-white/45">{k}</p><p className="mt-0.5 text-sm font-semibold">{v}</p></div>
              ))}
            </div>
            <div className="mt-5 flex h-10 items-end justify-center gap-[2px] border-t border-dashed border-white/20 pt-4">
              {code.split('').flatMap((c, i) => [c.charCodeAt(0) % 4 + 1, (i % 3) + 1]).map((w, i) => (
                <span key={i} className={i % 2 ? 'bg-transparent' : 'bg-white/70'} style={{ width: w, height: 32 }} />
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-white/40">FOR FLIGHT SIMULATION ONLY</p>
          </div>
        </div>

        {props.tear && props.onBoard && (
          <div className={`transition-all duration-500 ${torn ? 'translate-x-full rotate-6 opacity-0' : ''}`}>
            <div className="rounded-b-xl border-2 border-t-0 border-dashed border-white/25 bg-[#0c1117] p-4">
              <button
                disabled={torn}
                onClick={() => { setTorn(true); setTimeout(() => props.onBoard?.(), 500) }}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4caf50] font-semibold text-black disabled:opacity-60"
              >
                <Scissors className="size-4" /> Tear off to board
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={save} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold hover:bg-white/10"><Download className="size-4" /> Save image</button>
        <button onClick={share} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold hover:bg-white/10"><Share2 className="size-4" /> Share</button>
      </div>
    </div>
  )
}

function tearCls(tear?: boolean) {
  return tear ? 'rounded-t-xl' : 'rounded-xl'
}
