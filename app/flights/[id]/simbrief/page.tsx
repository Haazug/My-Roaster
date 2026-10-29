'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SimBriefData {
  origin: string
  destination: string
  airline: string
  flightNumber: string
  aircraft: string
  flightTime: number
}

export default function SimBriefPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [plnContent, setPlnContent] = useState('')
  const [simBriefData, setSimBriefData] = useState<SimBriefData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const parsePlnContent = (content: string): SimBriefData | null => {
    try {
      const lines = content.split('\n')
      const data: any = {}

      for (const line of lines) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          data[key.trim()] = valueParts.join('=').trim()
        }
      }

      return {
        origin: data['DEP'] || data['ORIGIN'] || 'UNKNOWN',
        destination: data['ARR'] || data['DESTINATION'] || 'UNKNOWN',
        airline: data['AIRLINE'] || 'UNKNOWN',
        flightNumber: data['FLIGHT'] || 'UNKNOWN',
        aircraft: data['AIRCRAFT'] || 'UNKNOWN',
        flightTime: parseInt(data['FLIGHTTIME'] || '0') || 0,
      }
    } catch (e) {
      return null
    }
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    try {
      const text = await navigator.clipboard.readText()
      setPlnContent(text)
    } catch (err) {
      toast.error('Failed to read clipboard')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setPlnContent(content)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!plnContent.trim()) {
      toast.error('Please paste or upload a flight plan')
      return
    }

    setIsLoading(true)
    const parsed = parsePlnContent(plnContent)

    if (parsed) {
      setSimBriefData(parsed)
      toast.success('Flight plan imported successfully!')
      setTimeout(() => {
        router.push(`/flights/${id}/fly?simbrief=true`)
      }, 1500)
    } else {
      toast.error('Invalid flight plan format')
    }
    setIsLoading(false)
  }

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href={`/flights/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <header className="mt-8 mb-8">
        <h1 className="text-3xl font-semibold">Import SimBrief Flight Plan</h1>
        <p className="mt-2 text-white/45">Paste your flight plan or upload the .pln file to monitor your flight with real data.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
            <Upload className="mx-auto mb-3 size-8 text-white/40" />
            <p className="font-semibold">Drag and drop your .pln file</p>
            <p className="mt-1 text-sm text-white/40">or click to browse</p>
            <input
              type="file"
              accept=".pln,.txt"
              onChange={handleFileUpload}
              className="mt-4 block w-full text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-[#1f88ff] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1f88ff]/90"
            />
          </div>

          <div className="text-center text-xs text-white/40">
            or
          </div>

          <textarea
            value={plnContent}
            onChange={(e) => setPlnContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste your flight plan here or use Cmd+V after uploading..."
            className="w-full h-48 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#1f88ff]/60"
          />

          <button
            onClick={handleImport}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 min-h-12 rounded-xl bg-[#1f88ff] font-semibold text-white transition hover:bg-[#1f88ff]/90 disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Import Flight Plan'}
          </button>
        </div>

        <div className="space-y-4">
          {simBriefData ? (
            <div className="rounded-2xl border border-[#55a7ff]/20 bg-[#1f88ff]/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#55a7ff]">
                <CheckCircle className="size-5" />
                <p className="font-semibold">Flight plan imported</p>
              </div>

              <div className="grid gap-3 text-sm">
                <div>
                  <p className="text-white/50">Origin</p>
                  <p className="text-lg font-semibold">{simBriefData.origin}</p>
                </div>
                <div>
                  <p className="text-white/50">Destination</p>
                  <p className="text-lg font-semibold">{simBriefData.destination}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-white/50 text-xs">Flight</p>
                    <p className="font-semibold">{simBriefData.airline}{simBriefData.flightNumber}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Aircraft</p>
                    <p className="font-semibold">{simBriefData.aircraft}</p>
                  </div>
                </div>
                {simBriefData.flightTime > 0 && (
                  <div>
                    <p className="text-white/50 text-xs">Flight Time</p>
                    <p className="font-semibold">{Math.floor(simBriefData.flightTime / 60)}h {simBriefData.flightTime % 60}m</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-6 text-center text-white/40">
              <AlertCircle className="mx-auto mb-3 size-8" />
              <p className="text-sm">Flight plan preview will appear here</p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs text-white/60 space-y-2">
            <p className="font-semibold text-white/80">Supported Formats:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>SimBrief (.pln files)</li>
              <li>Text files with KEY=VALUE format</li>
              <li>Any flight plan with route information</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.02] p-4 text-center text-sm text-white/50">
        <p>💡 Importing a flight plan will replace the default flight data with your SimBrief plan.</p>
      </div>
    </section>
  )
}
