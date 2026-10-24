'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/pilot-profile'

export function FlyWithFriends({ flightKey }: { flightKey: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const create = async () => {
    setBusy(true)
    setErr('')
    try {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/flights/${flightKey}`)}`)
        return
      }
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      const name = getProfile()?.name || user.email?.split('@')[0] || 'Pilot'
      const a = await supabase.from('flight_sessions').insert({ id, host_id: user.id, flight_key: flightKey })
      if (a.error) throw a.error
      const b = await supabase.from('flight_session_members').insert({ session_id: id, user_id: user.id, name })
      if (b.error) throw b.error
      router.push(`/session/${id}`)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao criar a sessão')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={create}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#1f88ff]/40 bg-[#1f88ff]/10 px-6 font-semibold text-[#55a7ff] transition hover:border-[#1f88ff] disabled:opacity-50 sm:w-auto"
      >
        <Users className="mr-2 size-5" /> {busy ? '...' : 'Voar com amigos'}
      </button>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
    </div>
  )
}
