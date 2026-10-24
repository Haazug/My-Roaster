'use client'

import { useState } from 'react'

export default function FlightStates({
  approach,
  descent,
  onHoldingToggle,
  onGoAroundClick,
  holding,
  goAround,
  elapsed,
  total,
}: {
  approach: boolean
  descent: boolean
  onHoldingToggle: () => void
  onGoAroundClick: () => void
  holding: boolean
  goAround: boolean
  elapsed: number
  total: number
}) {
  const isOverdue = elapsed > total + 3 * 60000 // 3 min past

  return (
    <div className="mt-6 space-y-3">
      {/* Holding Box */}
      {!goAround && (
        <div className="rounded-xl border border-white/10 bg-[#111217cc] p-4">
          <button
            onClick={onHoldingToggle}
            className={`w-full text-left font-semibold ${
              holding ? 'text-yellow-400' : 'text-white/50'
            }`}
          >
            {holding ? '🔄 Holding (HLD)' : 'Holding'}
          </button>
          {holding && (
            <p className="mt-2 text-xs text-white/40">
              Avião em holding - a contar tempo normal
            </p>
          )}
        </div>
      )}

      {/* Go Around */}
      {approach && descent && !goAround && (
        <button
          onClick={onGoAroundClick}
          className="w-full rounded-xl border border-yellow-400/30 bg-yellow-400/10 py-3 font-semibold text-yellow-400 hover:bg-yellow-400/20"
        >
          ↪️ Go Around
        </button>
      )}

      {goAround && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm text-yellow-400">
          Iniciando go around...
        </div>
      )}

      {/* Overdue Alert */}
      {isOverdue && !goAround && (
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-400">
          ⚠️ Voo passou {Math.floor((elapsed - total) / 60000)} min do tempo estipulado
        </div>
      )}
    </div>
  )
}
