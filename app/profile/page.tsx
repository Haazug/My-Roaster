'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, Copy, Users } from 'lucide-react'
import { getProfile, saveProfile, generateShareCode, getPilotStats, type PilotProfile } from '@/lib/pilot-profile'

export default function ProfilePage() {
  const [profile, setProfile] = useState<PilotProfile | null>(null)
  const [name, setName] = useState('')
  const [nationality, setNationality] = useState('')
  const [avatar, setAvatar] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const p = getProfile()
    if (!p) {
      const newId = `pilot_${Date.now()}`
      const newProfile: PilotProfile = {
        id: newId,
        name: 'Pilot',
        nationality: '',
        createdAt: Date.now(),
        totalFlights: 0,
        totalHours: 0,
      }
      saveProfile(newProfile)
      setProfile(newProfile)
      setName(newProfile.name)
    } else {
      setProfile(p)
      setName(p.name)
      setNationality(p.nationality || '')
      setAvatar(p.avatar || '')
    }
  }, [])

  const handleSave = () => {
    if (!profile) return
    const updated: PilotProfile = { ...profile, name: name || 'Pilot', nationality, avatar }
    saveProfile(updated)
    setProfile(updated)
  }

  const shareCode = profile ? generateShareCode(profile) : ''
  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/friends?code=${shareCode}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result as string
      setAvatar(data)
    }
    reader.readAsDataURL(file)
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-[#1f88ff]'
  const label = 'text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]'

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <p className={label}>Perfil</p>
      <h1 className="mt-2 text-4xl font-semibold">Meu piloto</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111217cc] p-6">
        {/* Avatar */}
        <label className="flex flex-col items-center gap-3 cursor-pointer group">
          <div className="relative size-24 rounded-full bg-[#1f88ff]/20 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Camera className="size-8 text-[#1f88ff]" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-full" />
          </div>
          <span className="text-xs text-white/50">Alterar foto</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>

        {/* Nome */}
        <div className="mt-6">
          <p className={label}>Nome de piloto</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className={input}
          />
        </div>

        {/* Nacionalidade */}
        <div className="mt-4">
          <p className={label}>Nacionalidade</p>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className={input + ' cursor-pointer'}
          >
            <option value="">Selecione...</option>
            <option value="Angola">Angola</option>
            <option value="Portugal">Portugal</option>
            <option value="Brazil">Brasil</option>
            <option value="United States">Estados Unidos</option>
            <option value="United Kingdom">Reino Unido</option>
            <option value="France">França</option>
            <option value="Germany">Alemanha</option>
            <option value="Spain">Espanha</option>
            <option value="Italy">Itália</option>
            <option value="Netherlands">Holanda</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="mt-6 w-full rounded-xl bg-[#1f88ff] py-3 font-semibold hover:bg-[#1f88ff]/90"
        >
          Guardar mudanças
        </button>
      </div>

      {/* Partilhar */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111217cc] p-6">
        <p className={label}>Partilhar conta</p>
        <h2 className="mt-2 text-lg font-semibold">Convida amigos</h2>
        <p className="mt-2 text-sm text-white/50">Partilha este código para que os teus amigos te adicionem como piloto amigo.</p>

        <div className="mt-4 rounded-xl bg-white/5 p-4 border border-white/10 font-mono text-xs break-all">
          {shareCode}
        </div>

        <button
          onClick={handleCopyCode}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold hover:border-[#1f88ff]/60"
        >
          <Copy className="size-4" /> {copied ? 'Copiado!' : 'Copiar código'}
        </button>

        <Link
          href="/friends"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f88ff] py-3 font-semibold"
        >
          <Users className="size-4" /> Ver amigos
        </Link>
      </div>
    </section>
  )
}
