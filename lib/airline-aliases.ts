const squash = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// extra names people type, by ICAO code
const ALIASES: Record<string, string> = {
  DTA: 'taag linhas aereas de angola angola airlines transportes aereos angolanos',
  AFR: 'airfrance air france',
  KLM: 'klm royal dutch airlines koninklijke luchtvaart',
  TAP: 'tap air portugal transportes aereos portugueses',
  DLH: 'lufthansa deutsche lufthansa',
  BAW: 'british airways ba speedbird',
  IBE: 'iberia',
  UAE: 'emirates fly emirates',
  QTR: 'qatar airways',
  ETD: 'etihad airways',
  THY: 'turkish airlines turk hava yollari',
  UAL: 'united airlines',
  DAL: 'delta air lines delta airlines',
  AAL: 'american airlines',
  AZU: 'azul linhas aereas brasileiras',
  GLO: 'gol linhas aereas gol transportes aereos',
  TAM: 'tam linhas aereas latam brasil',
  LAN: 'latam chile latam airlines',
  ARG: 'aerolineas argentinas',
  AVA: 'avianca',
  CMP: 'copa airlines',
  AMX: 'aeromexico',
  ETH: 'ethiopian airlines',
  KQA: 'kenya airways',
  SAA: 'south african airways',
  LNK: 'airlink south africa',
  RAM: 'royal air maroc',
  MSR: 'egyptair egypt air',
  RWD: 'rwandair',
  MAU: 'air mauritius',
  VLG: 'vueling',
  GFA: 'gulf air',
  SIA: 'singapore airlines',
  CPA: 'cathay pacific',
  JAL: 'japan airlines',
  ANA: 'all nippon airways',
  QFA: 'qantas',
  AIC: 'air india',
  SVA: 'saudia saudi arabian airlines',
  FDB: 'flydubai',
  WZZ: 'wizz air',
  EZY: 'easyjet',
  RYR: 'ryanair',
  NAX: 'norwegian',
  SAS: 'scandinavian airlines',
  FIN: 'finnair',
  ACA: 'air canada',
  JBU: 'jetblue',
  SWA: 'southwest airlines',
  ASA: 'alaska airlines',
  SWR: 'swiss international air lines',
  AUA: 'austrian airlines',
  ELY: 'el al israel airlines',
}

type A = { name: string; iata?: string; icao?: string; country?: string }

export function matchAirline(a: A, q: string) {
  const nq = squash(q)
  if (!nq) return true
  const hay = squash(`${a.name} ${a.iata || ''} ${a.icao || ''} ${a.country || ''}`) + squash(ALIASES[a.icao || ''] || '')
  if (hay.includes(nq)) return true
  const words = q.split(/\s+/).map(squash).filter(Boolean)
  return words.length > 1 && words.every((w) => hay.includes(w))
}
