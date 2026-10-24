export type PilotProfile = {
  id: string
  name: string
  nationality: string
  avatar?: string
  createdAt: number
  totalFlights: number
  totalHours: number
}

export type PilotFriend = {
  profileId: string
  addedAt: number
}

const STORAGE_KEY = 'myroster.profile'
const FRIENDS_KEY = 'myroster.friends'

export function getProfile(): PilotProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const p = localStorage.getItem(STORAGE_KEY)
    return p ? JSON.parse(p) : null
  } catch {
    return null
  }
}

export function saveProfile(p: PilotProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export function getFriends(): PilotFriend[] {
  if (typeof window === 'undefined') return []
  try {
    const f = localStorage.getItem(FRIENDS_KEY)
    return f ? JSON.parse(f) : []
  } catch {
    return []
  }
}

export function addFriend(profileId: string) {
  const friends = getFriends()
  if (!friends.find((f) => f.profileId === profileId)) {
    friends.push({ profileId, addedAt: Date.now() })
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
  }
}

export function removeFriend(profileId: string) {
  const friends = getFriends().filter((f) => f.profileId !== profileId)
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

export function getPilotStats(profile: PilotProfile) {
  return {
    totalFlights: profile.totalFlights || 0,
    totalHours: profile.totalHours || 0,
    avgFlightTime: profile.totalFlights > 0 ? Math.round(profile.totalHours / profile.totalFlights * 100) / 100 : 0,
  }
}

export function generateShareCode(profile: PilotProfile): string {
  return btoa(
    JSON.stringify({
      id: profile.id,
      name: profile.name,
      nationality: profile.nationality,
      avatar: profile.avatar,
    })
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeShareCode(code: string): PilotProfile | null {
  try {
    const json = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
    const p = JSON.parse(json)
    return p && p.id && p.name ? (p as PilotProfile) : null
  } catch {
    return null
  }
}
