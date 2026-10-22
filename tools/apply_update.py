import re, pathlib

def read(p): return pathlib.Path(p).read_text()
def write(p, s): pathlib.Path(p).write_text(s)
def fail(path, why): print("NAO ALTERADO:", path, "-", why)

# ---------- app/layout.tsx ----------
p = "app/layout.tsx"
try:
    s = read(p)
    if "CookieBanner" in s:
        print("JA FEITO:", p)
    else:
        imports = list(re.finditer(r"^import .*$", s, re.M))
        s2 = s[:imports[-1].end()] + "\nimport CookieBanner from '@/components/CookieBanner'\nimport LegalFooter from '@/components/LegalFooter'" + s[imports[-1].end():]
        s2, n1 = re.subn(r"\{children\}\s*</main>", "{children}<LegalFooter /></main>", s2, count=1)
        s2, n2 = re.subn(r"(\n[ \t]*)(<Toaster\b)", r"\1<CookieBanner />\1\2", s2, count=1)
        if not n2:
            s2, n2 = re.subn(r"(\n[ \t]*)(</body>)", r"\1<CookieBanner />\1\2", s2, count=1)
        meta = """export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  applicationName: 'MyRoster',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'MyRoster', statusBarStyle: 'black-translucent' },"""
        if "manifest:" not in s2:
            s2 = s2.replace("export const metadata: Metadata = {", meta, 1)
        if n1 and n2 and "manifest:" in s2:
            write(p, s2); print("OK:", p)
        else:
            fail(p, "nao encontrei {children}</main>, <Toaster> ou metadata")
except FileNotFoundError:
    fail(p, "ficheiro nao existe")

# ---------- app/login/page.tsx ----------
p = "app/login/page.tsx"
try:
    s = read(p)
    if "/privacy" in s:
        print("JA FEITO:", p)
    else:
        edits = [
            ("import { useRouter } from 'next/navigation'",
             "import { useRouter } from 'next/navigation'\nimport Link from 'next/link'"),
            ('<div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-black/50 p-6">',
             '<div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-black/50 p-6">\n        <img src="/logo.png" alt="MyRoster" className="mb-5 h-12 w-auto" />'),
            ("{mode === 'in' ? 'No account? Create one' : 'Already have an account? Sign in'}\n            </button>",
             "{mode === 'in' ? 'No account? Create one' : 'Already have an account? Sign in'}\n            </button>\n"
             "            <p className=\"mt-5 text-center text-xs leading-relaxed text-white/45\">\n"
             "              By {mode === 'in' ? 'signing in' : 'creating an account'}, you agree to our{' '}\n"
             "              <Link href=\"/terms\" className=\"text-[#55a7ff] underline\">Terms &amp; Conditions</Link> and{' '}\n"
             "              <Link href=\"/privacy\" className=\"text-[#55a7ff] underline\">Privacy Policy</Link>. See also our{' '}\n"
             "              <Link href=\"/cookies\" className=\"text-[#55a7ff] underline\">Cookie Policy</Link>.\n"
             "            </p>"),
        ]
        miss = [o[:45] for o, _ in edits if o not in s]
        if miss: fail(p, "nao encontrei: %s" % miss)
        else:
            for o, n in edits: s = s.replace(o, n, 1)
            write(p, s); print("OK:", p)
except FileNotFoundError:
    fail(p, "ficheiro nao existe")

# ---------- components/BackgroundMusic.tsx (only save music prefs with consent) ----------
p = "components/BackgroundMusic.tsx"
try:
    s = read(p)
    if "canStorePreferences" in s:
        print("JA FEITO:", p)
    else:
        edits = [
            ('import { Volume2, Volume1, VolumeX } from "lucide-react";',
             'import { Volume2, Volume1, VolumeX } from "lucide-react";\nimport { canStorePreferences } from "@/lib/consent";'),
            ('try { localStorage.setItem("myroster.music.volume", String(volume)); } catch {}',
             'try { if (canStorePreferences()) localStorage.setItem("myroster.music.volume", String(volume)); } catch {}'),
            ('try { localStorage.setItem("myroster.music.muted", next ? "1" : "0"); } catch {}',
             'try { if (canStorePreferences()) localStorage.setItem("myroster.music.muted", next ? "1" : "0"); } catch {}'),
        ]
        miss = [o[:45] for o, _ in edits if o not in s]
        if miss: fail(p, "nao encontrei: %s (a musica funciona na mesma, so grava sem pedir consentimento)" % miss)
        else:
            for o, n in edits: s = s.replace(o, n, 1)
            write(p, s); print("OK:", p)
except FileNotFoundError:
    fail(p, "ficheiro nao existe")

print("\nFALTA: abrir lib/legal.ts e preencher o teu nome, morada, email e o site.")
