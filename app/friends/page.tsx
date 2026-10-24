'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, X } from 'lucide-react'
import { getProfile, getFriends, addFriend, removeFriend, decodeShareCode, type PilotProfile } from '@/lib/pilot-profile'

export default function FriendsPage() {
  const searchParams = useSearchParams()
  const code = searchParams?.get('code')
  
  const [friends, setFriends] = useState<PilotProfile[]>([])
  const [pendingFriend, setPendingFriend] = useState<PilotProfile | null>(null)
  const [myProfile, setMyProfile] = useState<PilotProfile | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const p = getProfile()
    setMyProfile(p)
    loadFriends()

    if (code) {
      const decoded = decodeShareCode(code)
      if (decoded && decoded.id !== p?.id) {
        setPendingFriend(decoded)
      }
    }
  }, [code])

  const loadFriends = () => {
    const friendsList = getFriends()
    setFriends(friendsList as any)
  }

  const handleAddFriend = (friend: PilotProfile) => {
    if (friend.id === myProfile?.id) {
      setError('Não podes adicionar-te a ti mesmo!')
      return
    }
    addFriend(friend.id)
    setPendingFriend(null)
    setCodeInput('')
    setError('')
    loadFriends()
  }

  const handleRemoveFriend = (friendId: string) => {
    removeFriend(friendId)
    loadFriends()
  }

  const handleCodeInput = () => {
    setError('')
    const decoded = decodeShareCode(codeInput)
    if (!decoded) {
      setError('Código inválido')
      return
    }
    if (decoded.id === myProfile?.id) {
      setError('Não podes adicionar-te a ti mesmo!')
      return
    }
    setPendingFriend(decoded)
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-[#1f88ff]'
  const label = 'text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]'

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className={label}>Amigos</p>
      <h1 className="mt-2 text-4xl font-semibold">Pilotos amigos</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111217cc] p-6">
        <p className={label}>Adicionar amigo</p>
        <p className="mt-2 text-sm text-white/50">Cola o código que o teu amigo partilhou</p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Cole o código aqui"
            className={input}
          />
          <button
            onClick={handleCodeInput}
            className="rounded-xl bg-[#1f88ff] px-4 font-semibold shrink-0"
          >
            Adicionar
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        {pendingFriend && (
          <div className="mt-4 rounded-xl border border-[#1f88ff]/30 bg-[#1f88ff]/10 p-4">
            <div className="flex items-center gap-3">
              {pendingFriend.avatar && (
                <img
                  src={pendingFriend.avatar}
                  alt={pendingFriend.name}
                  className="size-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{pendingFriend.name}</p>
                <p className="text-xs text-white/50">{pendingFriend.nationality}</p>
              </div>
            </div>
            <button
              onClick={() => handleAddFriend(pendingFriend)}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-[#1f88ff] py-2 font-semibold text-sm"
            >
              <UserPlus className="size-4" /> Adicionar amigo
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className={label}>Teus amigos ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">Ainda não tens amigos. Partilha o teu código!</p>
        ) : (
          <div className="mt-3 space-y-2">
            {friends.map((friend: any) => (
              <div key={friend.profileId} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111217cc] p-4">
                <div className="flex items-center gap-3">
                  {friend.avatar && (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="size-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{friend.name}</p>
                    <p className="text-xs text-white/50">{friend.nationality}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.profileId)}
                  className="rounded-lg border border-red-300/30 bg-red-300/10 p-2 text-red-300 hover:bg-red-300/20"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/profile"
        className="mt-6 block text-center text-sm text-white/50 underline"
      >
        Voltar ao perfil
      </Link>
    </section>
  )
}
