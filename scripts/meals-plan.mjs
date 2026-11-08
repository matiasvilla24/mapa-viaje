// Coloca los lugares de comida añadidos por la familia en el día y la comida
// que les corresponde según la ruta, y rellena desayuno/almuerzo/cena de cada
// día en day_notes. Idempotente: se puede volver a ejecutar sin duplicar nada.
import { client } from './helper-rest.mjs'

const db = client()

// Lugares de comida: día, hora y comida (para asignar en places)
const FOOD = [
  { name: 'Bodega Tinta Castiza (El Molar)', date: '2026-12-26', time: '16:00' },
  { name: 'Rue Montorgueil',               date: '2026-12-30', time: '08:00' },
  { name: 'Le Petit Hostellerie',          date: '2026-12-30', time: '20:00' },
  { name: 'Pizzeria L’Angelo',             date: '2027-01-03', time: '20:00' },
  { name: 'Trattoria Zazà',                date: '2027-01-04', time: '19:30' },
  { name: 'Antico Forno Roscioli',         date: '2027-01-06', time: '14:00' },
  { name: 'Ristorante Pancrazio',          date: '2027-01-06', time: '20:00' },
  { name: 'Caffetteria Italia al Vittoriano', date: '2027-01-07', time: '15:30' },
  { name: 'Mercado de Porta Portese',      date: '2027-01-10', time: '08:00' },
]

// Tres comidas por día, en el orden de la ruta de cada jornada.
// Solo se usan lugares reales (los añadidos por la familia o los ya citados en
// las notas del viaje); cuando no hay un sitio concreto se indica la zona.
const MEALS = {
  '2026-12-25': { breakfast: 'En casa', lunch: 'En casa', dinner: 'Aeropuerto José María Córdova · 19:00 (vuelo 22:20)' },
  '2026-12-26': { breakfast: 'Café del hotel · 08:00', lunch: 'Bodega Tinta Castiza · cata con tapas · 16:00', dinner: 'El Molar · 19:30 (temporada navideña)' },
  '2026-12-27': { breakfast: 'Airbnb La Latina', lunch: 'Zona Retiro · libre', dinner: 'La Latina · junto al Airbnb' },
  '2026-12-28': { breakfast: 'Café rápido antes del Bernabéu · 08:15', lunch: 'Mercado San Miguel · 13:30', dinner: 'Aeropuerto · 18:30 (vuelo 20:45)' },
  '2026-12-29': { breakfast: 'Hotel · 07:00 (salida a Versalles)', lunch: 'Versalles · zona del palacio', dinner: 'Trocadéro · tras el crucero' },
  '2026-12-30': { breakfast: 'Rue Montorgueil · Stohrer · 08:00', lunch: 'Saveurs de Savoie · raclette · 12:30', dinner: 'Le Petit Hostellerie · fondue · 20:00' },
  '2026-12-31': { breakfast: 'Hotel', lunch: 'Montmartre · Place du Tertre · 13:00', dinner: 'Concordia / Madeleine · 19:30' },
  '2027-01-01': { breakfast: 'Hotel', lunch: 'Disneyland · dentro del parque', dinner: 'Disney Village' },
  '2027-01-02': { breakfast: 'Orly · café · 04:45', lunch: 'Varenna · orilla del lago · 13:30', dinner: 'Venecia · cena ligera al llegar · 21:00' },
  '2027-01-03': { breakfast: 'Hotel en Venecia', lunch: 'Riva Rialto · terraza sobre el Gran Canal · 13:30', dinner: 'Pizzeria L’Angelo · 20:00 · helado en Gelateria Suso' },
  '2027-01-04': { breakfast: 'Hotel en Venecia · 07:30', lunch: 'All’antico Vinaio · panino · 14:30', dinner: 'Trattoria Zazà · 19:30' },
  '2027-01-05': { breakfast: 'Hotel en Florencia', lunch: 'Mercato Centrale · 12:30', dinner: 'Roma · Pigneto · 21:00 (opcional)' },
  '2027-01-06': { breakfast: 'Airbnb / café cerca del Vaticano · 07:00', lunch: 'Antico Forno Roscioli · 14:00 · alternativa: Osteria da Fortunata', dinner: 'Ristorante Pancrazio · 20:00' },
  '2027-01-07': { breakfast: 'Airbnb / café en Monti · 08:00', lunch: 'Caffetteria Italia al Vittoriano · 15:30 (comida ligera)', dinner: 'Monti · zona del Airbnb' },
  '2027-01-08': { breakfast: 'Airbnb / café cerca del Vaticano · 07:30', lunch: 'Il Piccolo · Via delle Fornaci 22 · 13:00', dinner: 'Tonnarello · Trastevere · 20:30' },
  '2027-01-09': { breakfast: 'Café cerca de San Giovanni · 08:15', lunch: 'Zona Piazza del Popolo · 13:30', dinner: 'Cerca del Olímpico · tras el partido · 20:30' },
  '2027-01-10': { breakfast: 'Mercado de Porta Portese · 08:00', lunch: 'Vía Apia / Catacumbas · 13:00', dinner: 'Fiumicino · 20:00 (vuelo 21:35)' },
  '2027-01-11': { breakfast: 'Sala VIP Neptuno · T4S', lunch: 'Vuelo Madrid → Bogotá', dinner: 'Llegada a Medellín · 16:50' },
}

// 1) Lugares de comida: fecha + hora (la comida se ve en la agenda del día)
const rows = await db.get('places', 'select=id,name,assigned_date,assigned_time,category&category=eq.comida&limit=100')
const byName = new Map(rows.map((r) => [r.name, r]))
let placed = 0
for (const f of FOOD) {
  const row = byName.get(f.name)
  if (!row) { console.log('⚠️ no encontrado:', f.name); continue }
  const patch = {}
  if (row.assigned_date !== f.date) patch.assigned_date = f.date
  if (row.assigned_time !== f.time) patch.assigned_time = f.time
  if (Object.keys(patch).length) {
    await db.patch('places', `id=eq.${row.id}`, patch, f.name)
    placed++
  }
}
console.log(`Lugares de comida actualizados: ${placed}/${FOOD.length}`)

// 2) Comidas del día en day_notes
let meals = 0
for (const [date, m] of Object.entries(MEALS)) {
  const [cur] = await db.get('day_notes', `select=date,breakfast,lunch,dinner&date=eq.${date}`)
  if (!cur) { console.log('⚠️ sin fila day_notes:', date); continue }
  if (cur.breakfast === m.breakfast && cur.lunch === m.lunch && cur.dinner === m.dinner) continue
  await db.patch('day_notes', `date=eq.${date}`, { ...m, updated_by: 'Itinerario comidas' }, date)
  meals++
}
console.log(`Días con comidas actualizadas: ${meals}/${Object.keys(MEALS).length}`)

// 3) Resumen por día para revisión humana
const check = await db.get('day_notes', 'select=date,breakfast,lunch,dinner&order=date.asc&limit=100')
for (const n of check) {
  console.log(`${n.date} | 🥐 ${n.breakfast || '—'} | 🍝 ${n.lunch || '—'} | 🍕 ${n.dinner || '—'}`)
}