'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/lib/i18n'
import { DROP } from '@/lib/drop-i18n'

export default function PlnDrop() {
  const [over, setOver] = useState(false)
  const lang = useLang((s) => s.lang)

  useEffect(() => {
    const input = () => document.querySelector<HTMLInputElement>('input[type="file"]')
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files')
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!input() || !hasFiles(e)) return
      e.preventDefault()
      depth++
      setOver(true)
    }
    const hover = (e: DragEvent) => {
      if (input() && hasFiles(e)) e.preventDefault()
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setOver(false)
    }
    const drop = (e: DragEvent) => {
      const el = input()
      if (!el || !hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const f = e.dataTransfer?.files?.[0]
      if (!f) return
      const dt = new DataTransfer()
      dt.items.add(f)
      el.files = dt.files
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', hover)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', hover)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  if (!over) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="rounded-3xl border-2 border-dashed border-[#1f88ff] px-10 py-14 text-center text-lg font-semibold">{DROP[lang] || DROP.en}</div>
    </div>
  )
}
