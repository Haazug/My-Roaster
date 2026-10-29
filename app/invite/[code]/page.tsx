'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { UserPlus, Check, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { decodeShareCode, addFriend, getProfile, getFriends, pushAccountData, type PilotProfile } from '@/lib/pilot-profile'
import { PilotBadge } from '@/components/PilotBadge'

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
    let live = true
    ;(async () => {
      let p: PilotProfile | null = null
      if (/^[a-f0-9]{8}$/i.test(code)) {
        try {
          const { data } = await supabase.from('pilot_invites').select('profile').eq('code', code.toLowerCase()).maybeSingle()
          p = (data?.profile as PilotProfile) || null
        } catch {}
      } else {
        p = decodeShareCode(code)
      }
      if (!live) return
      setPilot(p)
      if (p) {
        const me = getProfile()
        setIsMe(me?.id === p.id)
        setAlready(getFriends().some((f) => f.profileId === p.id))
      }
      setReady(true)
    })()
    return () => { live = false }
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
        <p className={label}>Invite</p>
        <h1 className="mt-2 text-3xl font-semibold">Invalid invite</h1>
        <p className="mt-3 text-sm text-white/50">This link is incomplete or corrupted. Ask your friend for a new one.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">Back home</Link>
      </section>
    )
  }

  return (
    <section className="min-h-screen p-5 pb-32 text-white sm:p-8">
      <p className={label}>Friend invite</p>
      <h1 className="mb-8 mt-2 text-3xl font-semibold">You were invited</h1>

      <PilotBadge pilot={pilot}>
        {isMe ? (
          <p className="text-sm text-white/50">This is your own invite link.</p>
        ) : added || already ? (
          <div className="flex items-center justify-center gap-2 rounded-full border border-[#1f88ff]/40 bg-[#1f88ff]/10 py-3 text-sm font-semibold text-[#55a7ff]">
            <Check className="size-4" /> {added ? 'Friend added' : 'Already friends'}
          </div>
        ) : (
          <button onClick={handleAdd} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black">
            <UserPlus className="size-4" /> Add friend
          </button>
        )}
        <Link href="/friends" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/80">
          <Users className="size-4" /> View friends
        </Link>
      </PilotBadge>
    </section>
  )
}
