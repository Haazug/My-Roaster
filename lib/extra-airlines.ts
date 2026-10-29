export type ExtraAirline = { icao: string; iata: string; name: string; country: string; equip: string[]; hubs: Record<string, string[]> }

// Airlines (or routes) missing from the 2014 OpenFlights data. Each hub -> destinations, added in both directions.
export const EXTRA_AIRLINES: ExtraAirline[] = [
  {
    icao: 'GLO', iata: 'G3', name: 'Gol Linhas Aéreas', country: 'Brazil', equip: ['738'],
    hubs: {
      GRU: ['GIG', 'SDU', 'BSB', 'CNF', 'SSA', 'REC', 'FOR', 'NAT', 'MCZ', 'BEL', 'MAO', 'CGB', 'GYN', 'VIX', 'IGU', 'POA', 'CWB', 'FLN', 'EZE', 'SCL', 'MVD', 'ASU', 'MIA', 'MCO'],
      CGH: ['SDU', 'BSB', 'CNF', 'POA', 'CWB', 'FLN', 'SSA', 'REC'],
      GIG: ['BSB', 'CNF', 'SSA', 'REC', 'FOR', 'POA'],
      BSB: ['SSA', 'REC', 'FOR', 'CNF', 'GYN', 'MAO', 'BEL', 'CGB', 'NAT'],
    },
  },
  {
    icao: 'LNK', iata: '4Z', name: 'Airlink', country: 'South Africa', equip: ['E90'],
    hubs: {
      JNB: ['CPT', 'DUR', 'PLZ', 'GRJ', 'BFN', 'ELS', 'KIM', 'UTN', 'MQP', 'HDS', 'VFA', 'WDH', 'LUN', 'HRE', 'MPM', 'WVB', 'BEW', 'TNR', 'MRU', 'PHW', 'NLP'],
      CPT: ['GRJ', 'PLZ', 'DUR', 'WDH'],
    },
  },
  {
    icao: 'VLG', iata: 'VY', name: 'Vueling', country: 'Spain', equip: ['320', '321'],
    hubs: {
      BCN: ['MAD', 'AGP', 'SVQ', 'PMI', 'IBZ', 'MAH', 'LPA', 'TFS', 'ACE', 'BIO', 'SCQ', 'OVD', 'VGO', 'GRX', 'ALC', 'CDG', 'ORY', 'FCO', 'AMS', 'LHR', 'LGW', 'LIS', 'OPO', 'ZRH', 'BRU', 'FRA', 'MUC', 'VCE', 'NAP', 'BLQ', 'MXP', 'ATH', 'CMN', 'RAK', 'ALG', 'DUB', 'CPH', 'ARN', 'VIE'],
      MAD: ['BIO', 'AGP', 'SVQ', 'LPA', 'PMI', 'CDG', 'ORY', 'FCO'],
    },
  },
  {
    icao: 'GFA', iata: 'GF', name: 'Gulf Air', country: 'Bahrain', equip: ['320', '321', '788'],
    hubs: {
      BAH: ['DXB', 'AUH', 'DOH', 'KWI', 'MCT', 'RUH', 'JED', 'DMM', 'MED', 'LHR', 'CDG', 'FRA', 'ATH', 'AMM', 'BEY', 'CAI', 'BOM', 'DEL', 'COK', 'TRV', 'KHI', 'LHE', 'ISB', 'DAC', 'CMB', 'MNL', 'BKK', 'KUL', 'IST', 'NBO', 'ADD', 'KRT', 'BGW', 'EBL', 'NJF', 'BSR'],
    },
  },
]
