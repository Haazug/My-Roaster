'use client'
import { AircraftSideView } from '@/components/AircraftSideView'

const T: [string, string][] = [
  ['Airbus A380-800', 'UAE'], ['Boeing 777-300ER', 'AFR'], ['Boeing 737-800', 'RYR'],
  ['Airbus A320', 'TAP'], ['Embraer ERJ-145', 'BEL'], ['McDonnell Douglas MD-82', 'AAL'],
  ['McDonnell Douglas MD-11', 'FDX'], ['Douglas DC-3', 'DAL'], ['ATR 72-600', 'AZA'],
  ['Cessna 172', ''], ['Boeing 757-200', 'DAL'],
]

export default function Page() {
  return (
    <main className="space-y-4 p-5 pb-32">
      {T.map(([a, i]) => (
        <div key={a} className="rounded-2xl border border-white/10 p-3">
          <p className="text-xs text-white/50">{a} · {i || 'sem companhia'}</p>
          <AircraftSideView aircraft={a} airlineIcao={i || undefined} />
        </div>
      ))}
    </main>
  )
}
