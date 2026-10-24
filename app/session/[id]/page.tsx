'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Copy, Plane, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/pilot-profile'

type Member = { user_id: string; name: string; joined_at: string }

export default function SessionPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id ?? '')
  const router = useRouter()
  const [flightKey, setFlightKey] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setInterval> | undefined

    const loadMembers = async () => {
      const { data } = await supabase
        .from('flight_session_members')
        .select('user_id,name,joined_at')
        .eq('session_id', id)
        .order('joined_at')
      if (live && data) setMembers(data as Member[])
    }

    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      const user = s.session?.user
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/session/${id}`)}`)
        return
      }
      const { data: sess, error } = await supabase.from('flight_sessions').select('flight_key').eq('id', id).maybeSingle()
      if (!live) return
      if (error) return setState('error')
      if (!sess) return setState('missing')
      setFlightKey(sess.flight_key)

      const name = getProfile()?.name || user.email?.split('@')[0] || 'Pilot'
      await supabase.from('flight_session_members').upsert({ session_id: id, user_id: user.id, name })
      await loadMembers()
      if (!live) return
      setState('ok')
      timer = setInterval(loadMembers, 4000)
    })()

    return () => {
      live = false
      if (timer) clearInterval(timer)
    }
  }, [id, router])

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const label = 'text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]'

  if (state === 'loading') return <section className="min-h-screen p-5 text-white/40">Loading...</section>

  if (state !== 'ok') {
    return (
      <section className="min-h-screen p-5 text-white sm:p-8">
        <p className={label}>Voo em grupo</p>
        <h1 className="mt-2 text-3xl font-semibold">{state === 'missing' ? 'Sessão não encontrada' : 'Erro ao abrir a sessão'}</h1>
        <p className="mt-3 text-sm text-white/50">Pede um novo link ao teu amigo.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-[#1f88ff] px-5 py-3 font-semibold">Voltar ao início</Link>
      </section>
    )
  }

  return (
    <section className="min-h-screen p-5 pb-32 text-white sm:p-8">
      <p className={label}>Voo em grupo</p>
      <h1 className="mt-2 text-4xl font-semibold">{flightKey}</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111217cc] p-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Users className="size-4" /> Pilotos na sessão ({members.length})
        </p>
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#1f88ff]/20 text-sm font-semibold text-[#1f88ff]">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{m.name}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={copyLink}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1f88ff]/40 bg-[#1f88ff]/10 py-3 text-sm font-semibold hover:border-[#1f88ff]"
        >
          <Copy className="size-4" /> {copied ? 'Link copiado!' : 'Copiar link para convidar'}
        </button>

        <Link
          href={`/flights/${encodeURIComponent(flightKey)}/flight-plan`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f88ff] py-3 font-semibold"
        >
          <Plane className="size-4" /> Iniciar voo
        </Link>
      </div>
    </section>
  )
}
