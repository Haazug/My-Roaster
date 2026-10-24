export type PilotProfile = {
  id: string
  name: string
  username?: string
  nationality: string
  avatar?: string
  developer?: boolean
  createdAt: number
  totalFlights: number
  totalHours: number
}

export type PilotFriend = {
  profileId: string
  addedAt: number
}

export type SharedFlight = {
  id: string
  sharedBy: string
  sharedByName: string
  sharedAt: number
}

const STORAGE_KEY = 'myroster.profile'
const FRIENDS_KEY = 'myroster.friends'
const SHARED_KEY = 'myroster.shared'

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch (e) {
    console.error('Failed to save profile:', e)
  }
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
    try {
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
    } catch (e) {
      console.error('Failed to save friends:', e)
    }
  }
}

export function removeFriend(profileId: string) {
  const friends = getFriends().filter((f) => f.profileId !== profileId)
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
  } catch (e) {
    console.error('Failed to remove friend:', e)
  }
}

export function generateShareCode(profile: PilotProfile): string {
  const short = profile.id.replace('pilot_', '').substring(0, 8)
  return btoa(JSON.stringify({ id: profile.id, name: profile.name, username: profile.username, nationality: profile.nationality, avatar: profile.avatar, developer: profile.developer }))
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

export function getPilotStats(profile: PilotProfile) {
  return {
    totalFlights: profile.totalFlights || 0,
    totalHours: profile.totalHours || 0,
    avgFlightTime: profile.totalFlights > 0 ? Math.round((profile.totalHours / profile.totalFlights) * 100) / 100 : 0,
  }
}

export function recordSharedFlight(flightId: string, sharedByProfile: PilotProfile) {
  if (typeof window === 'undefined') return
  try {
    const shared = localStorage.getItem(SHARED_KEY)
    const list: SharedFlight[] = shared ? JSON.parse(shared) : []
    list.push({
      id: flightId,
      sharedBy: sharedByProfile.id,
      sharedByName: sharedByProfile.username || sharedByProfile.name,
      sharedAt: Date.now(),
    })
    localStorage.setItem(SHARED_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Failed to record shared flight:', e)
  }
}

export function getSharedFlightInfo(flightId: string): SharedFlight | null {
  if (typeof window === 'undefined') return null
  try {
    const shared = localStorage.getItem(SHARED_KEY)
    const list: SharedFlight[] = shared ? JSON.parse(shared) : []
    return list.find((s) => s.id === flightId) || null
  } catch {
    return null
  }
}
