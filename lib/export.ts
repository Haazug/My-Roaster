export type ExportAirport = { icao: string; iata: string; city: string; name?: string; lat: number; lon: number }
export type ExportFlight = {
  airlineIcao?: string; airlineIata: string; airlineName: string;
  flightNumber: string;
  origin: ExportAirport; dest: ExportAirport;
  aircraftIcao: string;
  aircraftName: string;
  depHour: number; depMin: number;
  durationMin: number;
  distanceNm: number;
}

const pad = (n: number) => String(n).padStart(2, "0")

export function simbriefUrl(f: ExportFlight): string {
  const entries: Record<string, string | undefined> = {
    airline: f.airlineIcao, fltnum: f.flightNumber, type: f.aircraftIcao,
    orig: f.origin.icao, dest: f.dest.icao, deph: pad(f.depHour), depm: pad(f.depMin),
    steh: String(Math.floor(f.durationMin / 60)), stem: String(f.durationMin % 60),
  }
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(entries)) if (v) p.set(k, v)
  return `https://dispatch.simbrief.com/options/custom?${p.toString()}`
}

export function flightSummary(f: ExportFlight): string {
  const h = Math.floor(f.durationMin / 60), m = f.durationMin % 60
  return [
    `${f.airlineName} ${f.airlineIata}${f.flightNumber}`,
    `${f.origin.city} (${f.origin.icao}) → ${f.dest.city} (${f.dest.icao})`,
    `Aircraft: ${f.aircraftName} (${f.aircraftIcao})`,
    `Departure: ${pad(f.depHour)}:${pad(f.depMin)}  Duration: ${h}h ${pad(m)}m  Distance: ${Math.round(f.distanceNm)} nm`,
  ].join("\n")
}

function lla(lat: number, lon: number, altFt = 0): string {
  const part = (v: number, pos: string, neg: string) => { const hemi = v >= 0 ? pos : neg; const a = Math.abs(v); const d = Math.floor(a); const mFull = (a - d) * 60; const mi = Math.floor(mFull); const s = ((mFull - mi) * 60).toFixed(2); return `${hemi}${d}° ${mi}' ${s}"` }
  const alt = `${altFt >= 0 ? "+" : "-"}${String(Math.abs(altFt)).padStart(6, "0")}.00`
  return `${part(lat, "N", "S")},${part(lon, "E", "W")},${alt}`
}

export function buildPln(f: ExportFlight): string {
  const wp = (a: ExportAirport) => `\n    <ATCWaypoint id="${a.icao}">\n      <ATCWaypointType>Airport</ATCWaypointType>\n      <WorldPosition>${lla(a.lat, a.lon)}</WorldPosition>\n      <ICAO><ICAOIdent>${a.icao}</ICAOIdent></ICAO>\n    </ATCWaypoint>`
  return `<?xml version="1.0" encoding="UTF-8"?>\n<SimBase.Document Type="AceXML" version="1,0">\n  <Descr>AceXML Document</Descr>\n  <FlightPlan.FlightPlan>\n    <Title>${f.origin.icao} to ${f.dest.icao}</Title>\n    <FPType>IFR</FPType>\n    <RouteType>HighAlt</RouteType>\n    <CruisingAlt>${f.distanceNm > 800 ? 35000 : 24000}</CruisingAlt>\n    <DepartureID>${f.origin.icao}</DepartureID>\n    <DepartureLLA>${lla(f.origin.lat, f.origin.lon)}</DepartureLLA>\n    <DestinationID>${f.dest.icao}</DestinationID>\n    <DestinationLLA>${lla(f.dest.lat, f.dest.lon)}</DestinationLLA>\n    <Descr>${f.origin.icao}, ${f.dest.icao}</Descr>\n    <DepartureName>${f.origin.name ?? f.origin.city}</DepartureName>\n    <DestinationName>${f.dest.name ?? f.dest.city}</DestinationName>${wp(f.origin)}${wp(f.dest)}\n  </FlightPlan.FlightPlan>\n</SimBase.Document>`
}

export function downloadPln(f: ExportFlight) { const blob = new Blob([buildPln(f)], { type: "application/xml" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${f.origin.icao}-${f.dest.icao}.pln`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
export async function copyText(text: string): Promise<boolean> { try { await navigator.clipboard.writeText(text); return true } catch { return false } }
