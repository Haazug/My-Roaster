export type AircraftType = { name: string; icao: string; aliases?: string[] }
export type AircraftMatch = {
  status: 'exact' | 'family' | 'fuzzy' | 'none'
  match?: AircraftType
  matches: AircraftType[]
}

// [name, ICAO type code, aliases]
const RAW: [string, string, string[]?][] = [
  // Airbus
  ['Airbus A220-100', 'BCS1'],
  ['Airbus A220-300', 'BCS3'],
  ['Airbus A300-600', 'A306'],
  ['Airbus A310-300', 'A310'],
  ['Airbus A318', 'A318'],
  ['Airbus A319', 'A319'],
  ['Airbus A319neo', 'A19N'],
  ['Airbus A320', 'A320'],
  ['Airbus A320neo', 'A20N'],
  ['Airbus A321', 'A321'],
  ['Airbus A321neo', 'A21N'],
  ['Airbus A330-200', 'A332'],
  ['Airbus A330-300', 'A333'],
  ['Airbus A330-800neo', 'A338'],
  ['Airbus A330-900neo', 'A339'],
  ['Airbus A340-300', 'A343'],
  ['Airbus A340-500', 'A345'],
  ['Airbus A340-600', 'A346'],
  ['Airbus A350-900', 'A359'],
  ['Airbus A350-1000', 'A35K'],
  ['Airbus A380-800', 'A388'],
  // Boeing
  ['Boeing 707-320', 'B703'],
  ['Boeing 717-200', 'B712'],
  ['Boeing 727-200', 'B722'],
  ['Boeing 737-200', 'B732'],
  ['Boeing 737-300', 'B733'],
  ['Boeing 737-400', 'B734'],
  ['Boeing 737-500', 'B735'],
  ['Boeing 737-600', 'B736'],
  ['Boeing 737-700', 'B737'],
  ['Boeing 737-800', 'B738'],
  ['Boeing 737-900', 'B739'],
  ['Boeing 737 MAX 7', 'B37M'],
  ['Boeing 737 MAX 8', 'B38M'],
  ['Boeing 737 MAX 9', 'B39M'],
  ['Boeing 737 MAX 10', 'B3XM'],
  ['Boeing 747-200', 'B742'],
  ['Boeing 747-400', 'B744'],
  ['Boeing 747-8', 'B748'],
  ['Boeing 757-200', 'B752'],
  ['Boeing 757-300', 'B753'],
  ['Boeing 767-200', 'B762'],
  ['Boeing 767-300', 'B763'],
  ['Boeing 767-400', 'B764'],
  ['Boeing 777-200', 'B772'],
  ['Boeing 777-200LR', 'B77L'],
  ['Boeing 777-300', 'B773'],
  ['Boeing 777-300ER', 'B77W'],
  ['Boeing 787-8', 'B788'],
  ['Boeing 787-9', 'B789'],
  ['Boeing 787-10', 'B78X'],
  // McDonnell Douglas / DC
  ['Douglas DC-3', 'DC3'],
  ['Douglas DC-6', 'DC6'],
  ['Douglas DC-8-63', 'DC86'],
  ['Douglas DC-9-30', 'DC93'],
  ['Douglas DC-10-30', 'DC10'],
  ['McDonnell Douglas MD-11', 'MD11'],
  ['McDonnell Douglas MD-82', 'MD82'],
  ['McDonnell Douglas MD-83', 'MD83'],
  ['McDonnell Douglas MD-88', 'MD88'],
  ['McDonnell Douglas MD-90', 'MD90'],
  // Lockheed Martin and military
  ['Lockheed L-1011 TriStar', 'L101', ['TriStar']],
  ['Lockheed L-188 Electra', 'L188', ['Electra']],
  ['Lockheed Martin C-130 Hercules', 'C130', ['Hercules']],
  ['Lockheed Martin C-5M Super Galaxy', 'C5M', ['Galaxy']],
  ['Lockheed Martin F-16 Fighting Falcon', 'F16', ['Fighting Falcon']],
  ['Lockheed Martin F-22 Raptor', 'F22', ['Raptor']],
  ['Lockheed Martin F-35 Lightning II', 'F35', ['Lightning II']],
  ['Lockheed P-3 Orion', 'P3', ['Orion']],
  ['Boeing C-17 Globemaster III', 'C17', ['Globemaster']],
  ['Boeing F/A-18 Hornet', 'F18H', ['Hornet', 'FA-18']],
  ['Boeing F-15 Eagle', 'F15', ['Eagle']],
  ['Fairchild A-10 Thunderbolt II', 'A10', ['Warthog']],
  ['Eurofighter Typhoon', 'EUFI', ['Typhoon']],
  ['Aerospatiale-BAC Concorde', 'CONC', ['Concorde']],
  // Embraer
  ['Embraer ERJ-135', 'E135'],
  ['Embraer ERJ-145', 'E145'],
  ['Embraer E170', 'E170'],
  ['Embraer E175', 'E75L'],
  ['Embraer E190', 'E190'],
  ['Embraer E195', 'E195'],
  ['Embraer E190-E2', 'E290'],
  ['Embraer E195-E2', 'E295'],
  ['Embraer Phenom 100', 'E50P'],
  ['Embraer Phenom 300', 'E55P'],
  ['Embraer Praetor 500', 'E545'],
  ['Embraer Praetor 600', 'E550'],
  ['Embraer EMB-110 Bandeirante', 'E110', ['Bandeirante']],
  ['Embraer EMB-120 Brasilia', 'E120', ['Brasilia']],
  // ATR
  ['ATR 42-500', 'AT45'],
  ['ATR 42-600', 'AT46'],
  ['ATR 72-500', 'AT75'],
  ['ATR 72-600', 'AT76'],
  // Bombardier and De Havilland Canada
  ['Bombardier CRJ-200', 'CRJ2'],
  ['Bombardier CRJ-700', 'CRJ7'],
  ['Bombardier CRJ-900', 'CRJ9'],
  ['Bombardier CRJ-1000', 'CRJX'],
  ['Bombardier Challenger 350', 'CL35'],
  ['Bombardier Challenger 604', 'CL60'],
  ['Bombardier Global Express', 'GLEX'],
  ['Bombardier Global 6000', 'GL6T'],
  ['Bombardier Global 7500', 'GL7T'],
  ['Learjet 45', 'LJ45'],
  ['Learjet 60', 'LJ60'],
  ['Learjet 75', 'LJ75'],
  ['De Havilland Canada Dash 8-100', 'DH8A', ['Dash 8', 'Dash 8-100']],
  ['De Havilland Canada Dash 8-300', 'DH8C', ['Dash 8', 'Dash 8-300']],
  ['De Havilland Canada Dash 8 Q400', 'DH8D', ['Dash 8', 'Dash 8 Q400', 'Q400']],
  ['De Havilland Canada DHC-2 Beaver', 'DHC2', ['Beaver']],
  ['De Havilland Canada DHC-3 Otter', 'DHC3', ['Otter']],
  ['De Havilland Canada DHC-6 Twin Otter', 'DHC6', ['Twin Otter']],
  // Gulfstream
  ['Gulfstream G150', 'G150'],
  ['Gulfstream G200', 'GALX'],
  ['Gulfstream G280', 'G280'],
  ['Gulfstream G450', 'GLF4'],
  ['Gulfstream G550', 'GLF5'],
  ['Gulfstream G650', 'GLF6'],
  ['Gulfstream G500', 'GA5C'],
  ['Gulfstream G600', 'GA6C'],
  ['Gulfstream G700', 'GA7C'],
  // Dassault
  ['Dassault Falcon 50', 'FA50'],
  ['Dassault Falcon 900', 'F900'],
  ['Dassault Falcon 2000', 'F2TH'],
  ['Dassault Falcon 7X', 'FA7X'],
  ['Dassault Falcon 8X', 'FA8X'],
  ['Dassault Mirage 2000', 'M2KC'],
  ['Dassault Rafale', 'RFAL'],
  // Cessna
  ['Cessna 150', 'C150'],
  ['Cessna 152', 'C152'],
  ['Cessna 172 Skyhawk', 'C172', ['Cessna 172', '172', 'Skyhawk']],
  ['Cessna 182 Skylane', 'C182', ['Cessna 182', '182', 'Skylane']],
  ['Cessna 206 Stationair', 'C206', ['Cessna 206', '206']],
  ['Cessna 208 Caravan', 'C208', ['Cessna 208', '208', 'Caravan', 'Grand Caravan']],
  ['Cessna 210 Centurion', 'C210', ['Cessna 210', '210']],
  ['Cessna Citation Mustang', 'C510', ['Mustang']],
  ['Cessna CitationJet CJ1', 'C525', ['CJ1']],
  ['Cessna Citation CJ2', 'C25A', ['CJ2']],
  ['Cessna Citation CJ3', 'C25B', ['CJ3']],
  ['Cessna Citation CJ4', 'C25C', ['CJ4']],
  ['Cessna Citation XLS', 'C56X', ['Citation Excel', 'XLS']],
  ['Cessna Citation Latitude', 'C68A', ['Latitude']],
  ['Cessna Citation Sovereign', 'C680', ['Sovereign']],
  ['Cessna Citation X', 'C750'],
  ['Cessna Citation Longitude', 'C700', ['Longitude']],
  // Cirrus
  ['Cirrus SR20', 'SR20'],
  ['Cirrus SR22', 'SR22'],
  ['Cirrus Vision Jet SF50', 'SF50', ['Vision Jet']],
  // Diamond
  ['Diamond DA20', 'DV20'],
  ['Diamond DA40', 'DA40'],
  ['Diamond DA42', 'DA42'],
  ['Diamond DA62', 'DA62'],
  // Piper
  ['Piper PA-28 Cherokee', 'P28A', ['Cherokee', 'Warrior']],
  ['Piper PA-28R Arrow', 'P28R', ['Arrow']],
  ['Piper PA-34 Seneca', 'PA34', ['Seneca']],
  ['Piper PA-46 Malibu', 'PA46', ['Malibu']],
  ['Piper PA-18 Super Cub', 'PA18', ['Super Cub']],
  // Beechcraft
  ['Beechcraft Bonanza G36', 'BE36', ['Bonanza']],
  ['Beechcraft Baron 58', 'BE58', ['Baron']],
  ['Beechcraft King Air 90', 'BE9L', ['King Air']],
  ['Beechcraft King Air 200', 'BE20', ['King Air']],
  ['Beechcraft King Air 350', 'B350', ['King Air']],
  ['Beechcraft 1900D', 'B190'],
  // Daher, Pilatus and other single-engine turboprops
  ['Daher TBM 850', 'TBM8', ['TBM']],
  ['Daher TBM 930', 'TBM9', ['TBM', 'TBM 940', 'TBM 960']],
  ['Quest Kodiak 100', 'KODI', ['Kodiak']],
  ['Pilatus PC-12', 'PC12'],
  ['Pilatus PC-24', 'PC24'],
  ['Pilatus PC-6 Porter', 'PC6T', ['Porter']],
  // Others
  ['Honda HondaJet', 'HDJT', ['HondaJet']],
  ['Mooney M20', 'M20P', ['Mooney']],
  ['Fokker 100', 'F100'],
  ['Saab 340', 'SF34'],
  ['Dornier 328', 'D328'],
  ['British Aerospace 146-200', 'B462', ['BAe 146']],
  ['Avro RJ100', 'RJ1H'],
  ['Antonov An-124 Ruslan', 'A124', ['Ruslan']],
  ['Antonov An-225 Mriya', 'A225', ['Mriya']],
  ['Tupolev Tu-154', 'T154'],
  ['Sukhoi Superjet 100', 'SU95', ['SSJ100']],
  ['Comac C919', 'C919'],
  ['Comac ARJ21', 'AJ27'],
  ['Britten-Norman Islander', 'BN2P', ['Islander']],
]

const AIRCRAFT: AircraftType[] = RAW.map(([name, icao, aliases]) => ({ name, icao, aliases }))

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const DB = AIRCRAFT.map((type) => ({
  type,
  keys: Array.from(
    new Set(
      [
        norm(type.name),
        norm(type.name.split(' ').slice(1).join(' ')),
        norm(type.icao),
        ...(type.aliases || []).map(norm),
      ].filter(Boolean)
    )
  ),
}))

// Edit distance that counts a swapped pair of letters as one mistake
function dist(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) d[i][0] = i
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

export function matchAircraft(input: string): AircraftMatch {
  const q = norm(input)
  if (!q) return { status: 'none', matches: [] }

  // 1. exact name, ICAO code or alias (a unique one)
  const exactAll = DB.filter((e) => e.keys.includes(q))
  if (exactAll.length === 1) return { status: 'exact', match: exactAll[0].type, matches: [exactAll[0].type] }
  if (exactAll.length > 1) return { status: 'family', matches: exactAll.map((e) => e.type).slice(0, 12) }

  // 2. partial: "a380", "737", "max 8" (with a digit) or a manufacturer like "airbus"
  if (q.length >= 3) {
    const part = /\d/.test(q)
      ? DB.filter((e) => e.keys.some((k) => k.includes(q)))
      : DB.filter((e) => norm(e.type.name).startsWith(q))
    if (part.length === 1) return { status: 'exact', match: part[0].type, matches: [part[0].type] }
    if (part.length > 1) return { status: 'family', matches: part.map((e) => e.type).slice(0, 12) }
  }

  // 3. typos
  const tol = q.length <= 3 ? 0 : q.length <= 7 ? 1 : q.length <= 11 ? 2 : 3
  let best: { type: AircraftType; d: number } | null = null
  for (const e of DB) {
    for (const k of e.keys) {
      const d = Math.min(dist(q, k), dist(q, k.slice(0, q.length)))
      if (d <= tol && (!best || d < best.d)) best = { type: e.type, d }
    }
  }
  if (best) return { status: 'fuzzy', match: best.type, matches: [best.type] }

  return { status: 'none', matches: [] }
}