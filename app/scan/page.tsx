'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { QrCode, Upload } from 'lucide-react'
import { codeFromText } from '@/lib/share'

async function nativeDecode(src: CanvasImageSource): Promise<string | null> {
  try {
    const BD = (window as any).BarcodeDetector
    if (!BD) return null
    const det = new BD({ formats: ['qr_code'] })
    const r = await det.detect(src)
    return r?.[0]?.rawValue || null
  } catch {
    return null
  }
}

function decodeQR(jsQR: any, src: CanvasImageSource, w: number, h: number): string | null {
  const widths = [w, 1200, 800, 500, 320].filter((x, i, a) => x <= w && a.indexOf(x) === i)
  for (const tw of widths) {
    const th = Math.round((h * tw) / w)
    const cv = document.createElement('canvas')
    cv.width = tw
    cv.height = th
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    if (!ctx) continue
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, tw, th)
    ctx.drawImage(src, 0, 0, tw, th)
    const d = ctx.getImageData(0, 0, tw, th)
    const r = jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' })
    if (r?.data) return r.data
  }
  return null
}

export default function ScanPage() {
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const [cam, setCam] = useState(false)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const open = (raw: string) => {
    const code = codeFromText(raw)
    if (!code) return false
    router.push(`/s?d=${code}`)
    return true
  }

  useEffect(() => {
    if (!cam) return
    let stop = false
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = video.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        const jsQR = (await import('jsqr')).default
        const canvas = document.createElement('canvas')
        const tick = async () => {
          if (stop) return
          if (v.videoWidth) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            const raw = (await nativeDecode(v)) || decodeQR(jsQR, v, v.videoWidth, v.videoHeight)
            if (raw && open(raw)) return
          }
          setTimeout(tick, 200)
        }
        tick()
      } catch {
        setMsg('Camera not available. Paste the code or upload a photo of the QR code instead.')
        setCam(false)
      }
    })()
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam])

  const fromImage = async (file: File) => {
    setMsg('')
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await img.decode().catch(() => {})
    const jsQR = (await import('jsqr')).default
    const raw = (await nativeDecode(img)) || decodeQR(jsQR, img, img.naturalWidth, img.naturalHeight)
    if (!raw) return setMsg('No QR code found in that image. Crop it closer to the QR and try again.')
    if (!open(raw)) setMsg('QR read, but it is not a MyRoster code.')
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-[#1f88ff]'

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Scan</p>
      <h1 className="mt-2 text-4xl font-semibold">Open a shared route</h1>
      <p className="mt-2 text-sm text-white/45">Scan the code on a friend&apos;s boarding pass to fly the same route, solo or duo.</p>

      {cam ? (
        <video ref={video} muted playsInline className="mt-6 aspect-square w-full max-w-sm rounded-2xl bg-black object-cover" />
      ) : (
        <button onClick={() => { setMsg(''); setCam(true) }} className="mt-6 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#1f88ff] font-semibold">
          <QrCode className="size-5" /> Open camera
        </button>
      )}

      <label className="mt-3 flex min-h-12 w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 text-sm font-medium">
        <Upload className="size-4" /> Upload a photo of the code
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fromImage(e.target.files[0])} />
      </label>

      <div className="mt-6 flex max-w-sm gap-2">
        <input className={input} placeholder="Or paste a link or code" value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={() => !open(text) && setMsg('That is not a valid MyRoster code.')} className="rounded-xl bg-white px-4 text-sm font-semibold text-black">Open</button>
      </div>
      {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}
    </section>
  )
}
