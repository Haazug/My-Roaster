"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ChevronDown, Copy, Download, ExternalLink, Map, Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { copyText, downloadPln, flightSummary, simbriefUrl, type ExportFlight } from "@/lib/export"

export function ExportMenu({ flight }: { flight: ExportFlight }) {
  const [open, setOpen] = useState(false)
  const run = async (action: () => Promise<void> | void) => { setOpen(false); await action() }
  const simbrief = () => { window.open(simbriefUrl(flight), "_blank", "noopener,noreferrer"); toast("Opening SimBrief… log in if asked. Your flight is pre-filled.") }
  const volanta = async () => { window.open("https://fly.volanta.app/map", "_blank", "noopener,noreferrer"); await copyText(flightSummary(flight)); toast("Flight details copied. Tip: plan it in SimBrief, then in Volanta use Plan a Flight → Add a Flight Plan → Import from SimBrief.") }
  const planner = async () => { window.open("https://planner.flightsimulator.com", "_blank", "noopener,noreferrer"); downloadPln(flight); await copyText(flightSummary(flight)); toast(".pln downloaded and details copied. Enter the airports in the planner, or load the .pln from the in-sim World Map.") }
  const copy = async () => { const ok = await copyText(flightSummary(flight)); toast(ok ? "Copied" : "Could not copy flight details") }

  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger render={<Button className="h-11 rounded-xl bg-[#1f88ff] px-5 font-semibold text-white hover:bg-[#1674db]" aria-label="Export flight" />}>Export <ChevronDown data-icon="inline-end" /></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72 rounded-2xl border-white/10 bg-[#17181b] p-2 text-white">
      <DropdownMenuItem onClick={() => run(simbrief)} className="items-start gap-3 rounded-xl px-3 py-3 focus:bg-white/10">
        <Plane className="mt-0.5 text-[#55a7ff]" /><span><strong className="block font-medium">SimBrief Dispatch</strong><small className="text-white/50">Opens with the flight pre-filled</small></span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => run(volanta)} className="items-start gap-3 rounded-xl px-3 py-3 focus:bg-white/10">
        <Map className="mt-0.5 text-[#55a7ff]" /><span><strong className="block font-medium">Volanta</strong><small className="text-white/50">Copies flight details and opens the map</small></span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => run(planner)} className="items-start gap-3 rounded-xl px-3 py-3 focus:bg-white/10">
        <Download className="mt-0.5 text-[#55a7ff]" /><span><strong className="block font-medium">MSFS Flight Planner</strong><small className="text-white/50">Downloads a .pln file and opens the planner</small></span>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="my-2 bg-white/10" />
      <DropdownMenuItem onClick={() => run(copy)} className="gap-3 rounded-xl px-3 py-3 focus:bg-white/10"><Copy className="text-white/60" /><span>Copy flight summary</span></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

export function SimbriefQuickAction({ flight }: { flight: ExportFlight }) {
  return <button type="button" onClick={() => window.open(simbriefUrl(flight), "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55a7ff] hover:text-white" aria-label="Open flight in SimBrief"><ExternalLink className="size-3.5" />Open in SimBrief</button>
}
