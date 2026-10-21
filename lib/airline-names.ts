export const fixName = (n = '') => {
  const t = n.trim()
  return /^tam\b/i.test(t) && !/mercosur|paraguay|bolivia|express/i.test(t) ? 'LATAM Airlines Brasil' : n
}