// Parche final: 6 pines con coordenadas publicadas (2 absurdos de Nominatim + 4 sin resultado).
import { client } from './helper-rest.mjs'
const db = client()

const FIX = [
  ["Trattoria Zazà", 'Florencia', 43.77499, 11.25786],
  ["Plaza del Popolo", 'Roma', 41.90638, 12.47647],
  ["Santa Maria delle Grazie · La Última Cena (Cenacolo)", 'Milán', 45.46630, 9.17050],
  ["Palacio Ca' Rezzonico (opcional)", 'Venecia', 45.43266, 12.32366],
  ["Estadio Olímpico · AS Roma vs AC Milan", 'Roma', 41.90737, 12.45558],
  ["Sala VIP Avianca Neptuno (escala nocturna)", 'Madrid', 40.47721, -3.56758],
]
for (const [name, city, lat, lng] of FIX) {
  await db.patch('places', 'name=ilike.' + db.searchLike('ca'.slice(0, 0) + name), {}, 'noop')
}
// (el searchLike con apóstrofes es frágil; usamos filtro por ciudad+subtexto verificando por id)
const rows = (await db.get('places', 'select=id,name,lat,lng&assigned_date=not.is.null')) || []
let fixed = 0
for (const [name, city, lat, lng] of FIX) {
  const row = rows.find((r) => r.name.startsWith(name.slice(0, 18)) && r.name.includes(name.split('(')[0].trim().slice(0, 12)))
  if (!row) { console.log('✗ no hallado:', name); continue }
  await db.patch('places', 'id=eq.' + row.id, { lat, lng }, 'fix pin ' + name)
  fixed++
  console.log(`  ✓ ${row.name} @ ${lat},${lng}`)
}
const left = (await db.get('places', 'select=id,name&lat=is.null&assigned_date=not.is.null')) || []
console.log('sin coords quedan:', left.length ? left.map((r) => r.name).join(' · ') : 'ninguno')
console.log('FIN pin-fix', fixed)
