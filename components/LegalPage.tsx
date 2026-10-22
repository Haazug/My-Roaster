import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

const PAGES = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms & Conditions'],
  ['/cookies', 'Cookie Policy'],
  ['/legal-notice', 'Legal Notice'],
]

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <img src="/logo.png" alt="MyRoster" className="mt-4 h-14 w-auto" />
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-xs text-white/40">Last updated: {LEGAL.updated}</p>
      <div className="mt-6 space-y-3 text-sm leading-relaxed text-white/70 [&_a]:text-[#55a7ff] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
        {children}
      </div>
      <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs text-white/45">
        {PAGES.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-white">{label}</Link>
        ))}
      </nav>
    </section>
  )
}
