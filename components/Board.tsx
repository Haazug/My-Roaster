import type { ReactNode } from 'react'

// Departure-board look: near-black panel, amber mono text, faint dot grid.
export const boardText = 'font-mono uppercase tracking-[.12em] text-[#facc15]'

export function Board({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-sm border-y-2 border-[#facc15]/40 bg-black/25 ${className}`}
      style={{ backgroundImage: 'radial-gradient(rgba(250,204,21,.07) 1px, transparent 1.4px)', backgroundSize: '6px 6px' }}
    >
      {children}
    </div>
  )
}

export function BoardHead({ cols, children, className = '' }: { cols: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-4 border-b border-[#facc15]/20 px-4 py-3 font-mono text-[11px] uppercase tracking-[.2em] text-white/45 ${className}`} style={{ gridTemplateColumns: cols }}>
      {children}
    </div>
  )
}

export function BoardRow({ cols, children, className = '' }: { cols: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid items-center gap-x-4 gap-y-2 border-b border-white/5 px-4 py-3 last:border-b-0 ${className}`} style={{ gridTemplateColumns: cols }}>
      {children}
    </div>
  )
}
