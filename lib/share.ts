export type Share = { a: string; f: string; t: string; ac?: string; n?: string; m?: 'solo' | 'duo'; s?: number }

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

export const encodeShare = (p: Share) => b64(JSON.stringify(p))

export function decodeShare(code: string): Share | null {
  try {
    const p = JSON.parse(unb64(code))
    return p && typeof p.a === 'string' && typeof p.f === 'string' && typeof p.t === 'string' ? p : null
  } catch {
    return null
  }
}

// accepts a full link, "?d=CODE" or just the code
export function codeFromText(text: string): string | null {
  const m = String(text).match(/[?&]d=([A-Za-z0-9_-]+)/)
  const code = m ? m[1] : String(text).trim()
  return decodeShare(code) ? code : null
}
