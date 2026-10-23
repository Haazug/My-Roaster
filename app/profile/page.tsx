"use client"
import Link from "next/link"
import { useLocalStorage } from "@/lib/use-local-storage"
import type { RosterFlight } from "@/lib/roster-data"
import { useT } from "@/lib/i18n"
import { LanguageSelect } from "@/components/LanguageGate"

export default function ProfilePage() {
  const t = useT()
  const [profile, setProfile] = useLocalStorage("myroster.profile", { name: "Pilot", avatar: "" })
  const [logs] = useLocalStorage<RosterFlight[]>("myroster.logs", [])
  const nm = logs.reduce((s, f) => s + f.distanceNm, 0)
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-white/50">← MyRoster</Link>
        <h1 className="mt-10 text-4xl font-semibold">{t("profile.title")}</h1>
        <div className="mt-8 rounded-[28px] border border-white/10 bg-[#151619] p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#1f88ff] text-2xl font-bold">{profile.avatar || profile.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <label className="text-xs text-white/40">{t("profile.name")}</label>
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1 block rounded-lg bg-white/10 px-3 py-2 outline-none" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Stat label={t("profile.flights")} value={logs.length} />
            <Stat label={t("profile.nm")} value={nm.toLocaleString()} />
            <Stat label={t("profile.airports")} value={new Set(logs.flatMap((f) => [f.orig, f.dest])).size} />
            <Stat label={t("profile.airlines")} value={new Set(logs.map((f) => f.airlineIata)).size} />
          </div>
        </div>
        <LanguageSelect className="mt-6 rounded-[28px] border border-white/10 bg-[#151619] p-6" />
        <Link href="/login" className="mt-6 flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 font-medium">{t("profile.account")}</Link>
        <p className="mt-10 text-xs leading-5 text-white/35">{t("profile.disclaimer")}</p>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/[0.05] p-4">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  )
}
