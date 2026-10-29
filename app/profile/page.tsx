'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, Copy, Users, LogOut, LogIn, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getProfile, getFriends, saveProfile, generateShareCode, getPilotStats, pullAccountData, pushAccountData, type PilotProfile } from '@/lib/pilot-profile'

const DEVELOPER_SECRET = "13442018"

export default function ProfilePage() {
  const [profile, setProfile] = useState<PilotProfile | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [nationality, setNationality] = useState('')
  const [avatar, setAvatar] = useState('')
  const [developer, setDeveloper] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [devUnlocked, setDevUnlocked] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [devError, setDevError] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    try {
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
        setUsername(p.username || '')
        setNationality(p.nationality || '')
        setAvatar(p.avatar || '')
        setDeveloper(p.developer || false)
        setDevUnlocked(p.developer || false)
        setFriendCount(getFriends().length)
      }
    } catch (e) {
      console.error('Load failed:', e)
      setError('Erro ao carregar perfil')
    }
  }, [])

  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      const mail = data.session?.user.email ?? null
      setEmail(mail)
      setAuthReady(true)
      if (mail) {
        pullAccountData().then((changed) => { if (changed) window.location.reload() })
        const p = getProfile()
        if (p && p.name === 'Pilot') {
          const updated = { ...p, name: mail.split('@')[0] }
          saveProfile(updated)
          setProfile(updated)
          setName(updated.name)
        }
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSave = async () => {
    if (!profile || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      const updated: PilotProfile = { 
        ...profile, 
        name: name.trim(), 
        username: username.trim() || undefined,
        nationality, 
        avatar,
        developer,
      }
      saveProfile(updated)
      pushAccountData()
      setProfile(updated)
      setTimeout(() => setSaving(false), 500)
    } catch (e) {
      console.error('Save failed:', e)
      setError('Erro ao guardar. Imagem muito grande?')
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('Terminar sessão?')) return
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('myroster.profile')
      localStorage.removeItem('myroster.friends')
      window.location.href = '/login'
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }

  const handleUnlockDeveloper = () => {
    setDevError('')
    if (devCode === DEVELOPER_SECRET) {
      setDevUnlocked(true)
      setDevCode('')
    } else {
      setDevError('Código incorreto')
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 500000) {
      setError('Imagem muito grande (máx 500KB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result as string
        setAvatar(data)
        setError('')
      } catch (err) {
        setError('Erro ao processar imagem')
      }
    }
    reader.readAsDataURL(file)
  }

  const stats = profile ? getPilotStats(profile) : null
  const displayName = developer ? `${name}${username ? ` (@${username})` : ''} • Developer` : name

  const makeThumb = (src: string) =>
    new Promise<string | undefined>((resolve) => {
      if (!src) return resolve(undefined)
      const img = new window.Image()
      img.onload = () => {
        try {
          const size = 64
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(undefined)
          const side = Math.min(img.width, img.height)
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.6))
        } catch {
          resolve(undefined)
        }
      }
      img.onerror = () => resolve(undefined)
      img.src = src
    })

  const handleCopyLink = async () => {
    if (!profile) return
    const thumb = await makeThumb(avatar || profile.avatar || '')
    const code = generateShareCode({
      ...profile,
      name: name.trim() || profile.name,
      username: username.trim() || undefined,
      nationality,
      avatar: thumb,
      developer,
    })
    navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-[#1f88ff]'
  const label = 'text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]'

  if (!profile) return <section className="min-h-screen p-5 text-white/40">Loading...</section>

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className={label}>Perfil</p>
          <h1 className="mt-2 text-4xl font-semibold">{displayName}</h1>
          {email && <p className="mt-1 text-sm text-white/50">{email}</p>}
        </div>
{email ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-300 hover:bg-red-300/20"
          >
            <LogOut className="size-4" /> Sair
          </button>
        ) : authReady ? (
          <Link
            href="/login?next=/profile"
            className="flex items-center gap-2 rounded-lg border border-[#1f88ff]/40 bg-[#1f88ff]/10 px-3 py-2 text-sm text-[#55a7ff] hover:bg-[#1f88ff]/20"
          >
            <LogIn className="size-4" /> Entrar
          </Link>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
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
          <span className="text-xs text-white/50">Alterar foto (máx 500KB)</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>

        {error && <p className="mt-4 text-sm text-red-300 text-center">{error}</p>}

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

        {/* Username */}
        <div className="mt-4">
          <p className={label}>Username</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase())}
            placeholder="username (sem espaços)"
            className={input}
          />
          {username && <p className="mt-1 text-xs text-white/40">@{username}</p>}
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
            <option value="Belgium">Bélgica</option>
            <option value="Switzerland">Suíça</option>
            <option value="Austria">Áustria</option>
            <option value="Poland">Polónia</option>
            <option value="Sweden">Suécia</option>
            <option value="Norway">Noruega</option>
            <option value="Denmark">Dinamarca</option>
            <option value="Finland">Finlândia</option>
            <option value="Greece">Grécia</option>
            <option value="Turkey">Turquia</option>
            <option value="Russia">Rússia</option>
            <option value="Japan">Japão</option>
            <option value="South Korea">Coreia do Sul</option>
            <option value="China">China</option>
            <option value="India">Índia</option>
            <option value="Australia">Austrália</option>
            <option value="New Zealand">Nova Zelândia</option>
            <option value="Canada">Canadá</option>
            <option value="Mexico">México</option>
            <option value="Argentina">Argentina</option>
            <option value="South Africa">África do Sul</option>
            <option value="Egypt">Egito</option>
            <option value="Nigeria">Nigéria</option>
            <option value="Kenya">Quénia</option>
            <option value="Morocco">Marrocos</option>
            <option value="United Arab Emirates">Emirados Árabes</option>
            <option value="Saudi Arabia">Arábia Saudita</option>
            <option value="Israel">Israel</option>
            <option value="Thailand">Tailândia</option>
            <option value="Vietnam">Vietnã</option>
            <option value="Indonesia">Indonésia</option>
            <option value="Malaysia">Malásia</option>
            <option value="Singapore">Singapura</option>
            <option value="Philippines">Filipinas</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-[#1f88ff] py-3 font-semibold hover:bg-[#1f88ff]/90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar mudanças'}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0a0a0acc] p-4 text-center">
          <p className="text-2xl font-bold text-[#1f88ff]">{stats?.totalFlights || 0}</p>
          <p className="text-xs text-white/50 mt-1">Voos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0a0a0acc] p-4 text-center">
          <p className="text-2xl font-bold text-[#1f88ff]">{stats?.totalHours || 0}</p>
          <p className="text-xs text-white/50 mt-1">Horas</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0a0a0acc] p-4 text-center">
          <p className="text-2xl font-bold text-[#1f88ff]">{friendCount}</p>
          <p className="text-xs text-white/50 mt-1">Amigos</p>
        </div>
      </div>

      {/* Partilhar */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
        <p className={label}>Partilhar conta</p>
        <h2 className="mt-2 text-lg font-semibold">Convida amigos</h2>
        <p className="mt-2 text-sm text-white/50">Partilha o teu link para que os teus amigos te adicionem como piloto amigo.</p>

        <button
          onClick={handleCopyLink}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[#1f88ff]/40 bg-[#1f88ff]/10 py-3 text-sm font-semibold hover:border-[#1f88ff]"
        >
          <Copy className="size-4" /> {copiedLink ? 'Link copiado!' : 'Copiar link de convite'}
        </button>

        <Link
          href="/friends"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f88ff] py-3 font-semibold"
        >
          <Users className="size-4" /> Ver amigos ({friendCount})
        </Link>
      </div>

      {/* Definições Avançadas */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
        <p className={label}>Definições avançadas</p>
        
        {!devUnlocked ? (
          <div className="mt-4">
            <p className="text-sm text-white/50 mb-3">Unlock Developer</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockDeveloper()}
                placeholder="Código secreto"
                className={input}
              />
              <button
                onClick={handleUnlockDeveloper}
                className="rounded-xl bg-[#1f88ff] px-4 font-semibold shrink-0 flex items-center gap-2"
              >
                <Lock className="size-4" /> Unlock
              </button>
            </div>
            {devError && <p className="mt-2 text-sm text-red-300">{devError}</p>}
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#1f88ff]/30 bg-[#1f88ff]/10 p-4">
              <input
                type="checkbox"
                checked={developer}
                onChange={(e) => setDeveloper(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label className="text-sm text-white/70">Developer Badge</label>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
