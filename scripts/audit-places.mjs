// Auditoría: nombres de los 45 NUEVOS vs DB, y duplicados en DB.
import { client } from './helper-rest.mjs'
const db = client()

const norm = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

const rows = (await db.get('places', 'select=id,name,assigned_date&order=name.asc')) || []
console.log('TOTAL DB:', rows.length)

const want = [
  'Bodega Tinta Castiza (El Molar)', 'Parque del Retiro', 'Palacio de Cristal (Retiro)', 'Museo del Prado (opcional)',
  'Puerta de Alcalá', 'Fuente de Cibeles', 'Gran Vía (luces de Navidad)', 'Puerta del Sol',
  'Estadio Santiago Bernabéu', 'Palacio Real de Madrid', 'Lockerinthecity La Latina (consigna de maletas)',
  'Trocadéro', 'Museo de Orsay (opcional)', 'Catacumbas de París (opcional)', 'Panteón de París', 'Disneyland París',
  'Lago de Como · Varenna', 'Lago de Como · Bellagio', 'Duomo di Milano', 'Santa Maria delle Grazie · La Última Cena (Cenacolo)',
  'Puente de Rialto', 'Campanario de San Marcos', 'Puente de los Suspiros', 'Librería Acqua Alta', 'Gran Canal en góndola',
  'Palacio Ca\' Rezzonico (opcional)', 'Museo Leonardo Da Vinci (Venecia, opcional)',
  'Piazza della Signoria', 'Cappelle Medicee', 'Trattoria Zazà',
  'Coliseo', 'Estadio Olímpico · AS Roma vs AC Milan', 'Plaza del Popolo', 'Villa Borghese y mirador del Pincio',
  'Bocca della Verità', 'Termas de Caracalla', 'Vía Apia Antigua', 'Catacumbas de San Calixto',
  'Sala VIP Avianca Neptuno (escala nocturna)',
]
const dbNorms = rows.map((r) => ({ id: r.id, name: r.name, norm: norm(r.name), date: r.assigned_date }))
for (const w of want) {
  const n = norm(w)
  const hits = dbNorms.filter((r) => r.norm === n)
  console.log(hits.length === 0 ? 'FALTA' : hits.length > 1 ? 'DUP ' + hits.length : 'ok  ', '|', w, hits[0] ? '@' + hits[0].date : '')
}
// duplicados por norma en general
const seen = new Map()
for (const r of dbNorms) {
  const arr = seen.get(r.norm) || []
  arr.push(r)
  seen.set(r.norm, arr)
}
const dupGroups = [...seen.values()].filter((g) => g.length > 1)
if (dupGroups.length) {
  console.log('--- DUPLICADOS EN DB:')
  for (const g of dupGroups) console.log('   ', g.map((r) => r.name + ' @' + r.date).join('  ||  '))
}
