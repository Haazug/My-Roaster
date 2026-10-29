'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { UserPlus, Check, Users } from 'lucide-react'
import { decodeShareCode, addFriend, getProfile, getFriends, pushAccountData, type PilotProfile } from '@/lib/pilot-profile'

const CACHE_KEY = 'myroster.friendProfiles'

export default function InvitePage() {
  const params = useParams<{ code: string }>()
  const code = decodeURIComponent(String(params?.code ?? ''))

  const [pilot, setPilot] = useState<PilotProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [isMe, setIsMe] = useState(false)
  const [already, setAlready] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const p = decodeShareCode(code)
    setPilot(p)
    if (p) {
      const me = getProfile()
      setIsMe(me?.id === p.id)
      setAlready(getFriends().some((f) => f.profileId === p.id))
    }
    setReady(true)
  }, [code])

  const handleAdd = () => {
    if (!pilot) return
    addFriend(pilot.id)
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      const cache = raw ? JSON.parse(raw) : {}
      cache[pilot.id] = pilot
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.error('Failed to cache friend profile:', e)
    }
    pushAccountData()
    setAdded(true)
  }

  const label = 'text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]'

  if (!ready) return <section className="min-h-screen p-5 text-white/40">Loading...</section>

  if (!pilot) {
    return (
      <section className="min-h-screen p-5 text-white">
        <p className={label}>Convite</p>
        <h1 className="mt-2 text-3xl font-semibold">Convite inválido</h1>
        <p className="mt-3 text-sm text-white/50">Este link está incompleto ou corrompido. Pede um novo link ao teu amigo.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-[#1f88ff] px-5 py-3 font-semibold">Voltar ao início</Link>
      </section>
    )
  }

  return (
    <section className="min-h-screen p-5 pb-32 text-white sm:p-8">
      <p className={label}>Convite de amizade</p>
      <h1 className="mt-2 text-3xl font-semibold">Foste convidado!</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6 text-center">
        <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-full bg-[#1f88ff]/20 text-3xl font-semibold text-[#1f88ff]">
          {pilot.avatar ? (
            <img src={pilot.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            pilot.name.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="mt-4 text-2xl font-semibold">{pilot.name}</h2>
        {pilot.username && <p className="text-sm text-white/50">@{pilot.username}</p>}
        {pilot.developer && <p className="mt-1 text-xs text-[#55a7ff]">Developer</p>}
        {pilot.nationality && <p className="mt-2 text-sm text-white/50">{pilot.nationality}</p>}

        {isMe ? (
          <p className="mt-6 text-sm text-white/50">Este é o teu próprio link de convite.</p>
        ) : added || already ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-green-300/30 bg-green-300/10 py-3 text-sm font-semibold text-green-300">
            <Check className="size-4" /> {added ? 'Amigo adicionado!' : 'Já são amigos'}
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f88ff] py-3 font-semibold hover:bg-[#1f88ff]/90"
          >
            <UserPlus className="size-4" /> Adicionar amigo
          </button>
        )}

        <Link
          href="/friends"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold hover:border-[#1f88ff]/60"
        >
          <Users className="size-4" /> Ver amigos
        </Link>
      </div>
    </section>
  )
}
