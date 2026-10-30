// Junta A→B e B→A numa só rota. Funciona para qualquer companhia.
export type RawRoute = { from: string; to: string; equip?: readonly string[]; codeshare?: boolean }
export type MergedRoute = {
  from: string          // ida: parte do aeroporto principal (hub) da companhia
  to: string
  equip: string[]       // aviões de ambos os sentidos, sem repetidos
  codeshare: boolean    // só é codeshare se todos os voos o forem
  roundTrip: boolean    // existe ida e volta
  hasOut: boolean
  hasBack: boolean
}

export const pairKey = (a: string, b: string) => [a, b].sort().join('-')

export function mergeRoutes(routes: readonly RawRoute[], hubs: readonly string[] = []): MergedRoute[] {
  const degree = new Map<string, number>()
  for (const r of routes) {
    degree.set(r.from, (degree.get(r.from) ?? 0) + 1)
    degree.set(r.to, (degree.get(r.to) ?? 0) + 1)
  }
  const groups = new Map<string, RawRoute[]>()
  for (const r of routes) {
    if (!r.from || !r.to || r.from === r.to) continue
    const k = pairKey(r.from, r.to)
    const g = groups.get(k)
    if (g) g.push(r)
    else groups.set(k, [r])
  }
  const out: MergedRoute[] = []
  groups.forEach((g) => {
    const a = g[0].from
    const b = g[0].to
    const da = degree.get(a) ?? 0
    const db = degree.get(b) ?? 0
    // o hub (aeroporto com mais ligações da companhia) é a origem da "ida"
    const rankA = hubs.indexOf(a), rankB = hubs.indexOf(b)
    const aFirst = rankA >= 0 ? rankB < 0 || rankA < rankB : rankB >= 0 ? false : da > db || (da === db && a < b)
    const [from, to] = aFirst ? [a, b] : [b, a]
    const equip: string[] = []
    for (const r of g) for (const e of r.equip ?? []) if (e && !equip.includes(e)) equip.push(e)
    const hasOut = g.some((r) => r.from === from)
    const hasBack = g.some((r) => r.from === to)
    out.push({
      from, to, equip,
      codeshare: g.every((r) => Boolean(r.codeshare)),
      roundTrip: hasOut && hasBack, hasOut, hasBack,
    })
  })
  return out
}

// Airline directories show actual services touching a declared hub; other bases remain searchable by airport.
export function hubRoutes<T extends RawRoute>(routes:readonly T[],hubs:readonly string[]):T[]{
 const bases=new Set(hubs)
 const pairs=new Set(mergeRoutes(routes,hubs).filter(r=>bases.has(r.from)&&r.hasOut).map(r=>pairKey(r.from,r.to)))
 return routes.filter(r=>pairs.has(pairKey(r.from,r.to)))
}
