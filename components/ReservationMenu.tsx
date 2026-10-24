'use client'

import { useState } from 'react'
import { Save, FileText } from 'lucide-react'

export default function ReservationMenu({ 
  onSaveRoute, 
  onSaveForLater 
}: { 
  onSaveRoute: () => void
  onSaveForLater: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-full bg-white py-4 text-base font-semibold text-black shadow-lg hover:bg-white/90"
      >
        Reservar voo
      </button>
      
      {open && (
        <div className="absolute bottom-full mb-2 w-full rounded-2xl bg-[#111217] border border-white/10 overflow-hidden shadow-lg">
          <button
            onClick={() => {
              onSaveRoute()
              setOpen(false)
            }}
            className="w-full px-4 py-3 flex items-center gap-2 text-white hover:bg-white/10 text-sm font-semibold"
          >
            <Save className="size-4" /> Salvar rota
          </button>
          <button
            onClick={() => {
              onSaveForLater()
              setOpen(false)
            }}
            className="w-full px-4 py-3 flex items-center gap-2 text-white hover:bg-white/10 text-sm font-semibold border-t border-white/10"
          >
            <FileText className="size-4" /> Plano e guardar para depois
          </button>
        </div>
      )}
    </div>
  )
}
