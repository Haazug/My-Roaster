export const TOP_ICAO = ['UAE', 'AFR', 'DTA', 'TAP', 'AZU', 'UAL', 'DAL', 'AAL', 'BAW', 'DLH', 'KLM', 'QTR', 'THY', 'ETH', 'ACA', 'RAM', 'MSR', 'SAA', 'LAN']
export const topRank = (icao?: string) => {
  const i = TOP_ICAO.indexOf((icao || '').toUpperCase())
  return i < 0 ? 999 : i
}
