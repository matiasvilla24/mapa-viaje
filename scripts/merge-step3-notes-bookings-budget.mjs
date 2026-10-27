// PASO 3: day_notes (textos del día), bookings (checklist 64) y budget_items.
// Todo se deriva DIRECTO de scripts/europa-state.json (sin retranscripciones).
import fs from 'node:fs'
import { client } from './helper-rest.mjs'
const db = client()

const state = JSON.parse(fs.readFileSync(new URL('europa-state.json', import.meta.url), 'utf8')).state
const days = state.days

// ── DAY_NOTES: título, estadia, actividades, tips, reservas y traslados por fecha ──
const existingDates = new Set(((await db.get('day_notes', 'select=date')) || []).map((r) => r.date))
const rows = days.map((d) => ({
  date: d.date,
  title: d.place || null,
  sleep_place: d.sleep || null,
  updated_by: 'Eugenia (App Europa 2026)',
  stay_name: d.stay?.name || null,
  stay_details: d.stay?.details || null,
  activities: d.activities || [],
  tips: d.tips || null,
  reservas: (d.reservas || '').trim() || null,
  legs: d.legs || [],
}))
const toPatch = rows.filter((r) => existingDates.has(r.date))
const toPost = rows.filter((r) => !existingDates.has(r.date))
for (const r of toPatch) {
  await db.patch('day_notes', 'date=eq.' + r.date, r, 'day_note ' + r.date)
}
if (toPost.length) db.post('day_notes', toPost, 'day_notes nuevos: ' + toPost.length)
console.log('day_notes: patch', toPatch.length, '· post', toPost.length)

// ── BOOKINGS: checklist completo del repo (64 ítems) ──
await db.remove('bookings', 'id=not.is.null', 'bookings: borrar')
const bookings = (state.bookings || []).map((b, i) => ({
  id: b.id, sort_order: i, sec: b.sec || '', date: b.date || null,
  cat: b.cat || '', title: b.title || '', need: b.need || '', done: Boolean(b.done),
  info: b.info || '', mode: b.mode || '', cancel_by: b.cancelBy || null, cancel_note: b.cancelNote || '',
  platform: b.platform || '', web: b.web || '',
  updated_by: 'Eugenia (App Europa 2026)',
}))
db.post('bookings', bookings, 'bookings: ' + bookings.length)
console.log('bookings: post', bookings.length, '· pendientes obligatorias:', bookings.filter((b) => b.need === 'ob' && !b.done).length)

// ── BUDGET_ITEMS: presupuesto del repo (tasas: COP/EUR 3900 · COP/USD 3200) ──
await db.remove('budget_items', 'id=not.is.null', 'budget: borrar')
const toEUR = (m, c) => (m == null ? null : c === 'COP' ? m / 3900 : c === 'USD' ? m * (3900 / 3200) : m)
const CATMAP = { desayuno: 'comidas', almuerzo: 'comidas', cena: 'comidas', transporte: 'transporte', museos: 'entradas', compras: 'varios', otros: 'varios', hotel: 'alojamiento' }
const MONTHS = { 1: 'ene', 12: 'dic' }
const dd = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m] || m}` }

const items = []
items.push({
  category: 'tiquetes', label: '✈️ Tiquetes Avianca AOJ4ZK (Medellín→Madrid ida / Roma→Bogotá→Medellín regreso, 4 personas)',
  estimated: toEUR(19225051, 'COP'), spent: 19225051 / 3900, currency: 'COP',
  notes: 'COP 19.225.051 (tarifa 15.620.087 + impuestos 3.604.964). Tramos: AV16 25-dic 22:20 · AV6203 10-ene 21:35 · AV27+AV9324 11-ene (escala en Madrid). ≈ 4.929,50 EUR. Pagó: Mati (AVIANCA).',
})
items.push({
  category: 'tiquetes', label: '✈️ Tiquetes Booking UEEJTZ + KDLKK48 (Madrid→París + París→Milán, 4 personas)',
  estimated: toEUR(3077754, 'COP'), spent: 3077754 / 3900, currency: 'COP',
  notes: 'COP 3.077.754 (tiquetes 1.750.719 + asientos 1.327.036) para Transavia TO4639 (28 dic) y easyJet U24959 (2 ene). ≈ 789,17 EUR.',
})
items.push({
  category: 'varios', label: '🧳 Maletas de mano (Transavia 28-dic + easyJet 2-ene, 4 viajes)',
  estimated: null, spent: 0, currency: 'EUR',
  notes: 'PENDIENTE: comprar en línea (transavia.com UEEJTZ / easyjet.com KDLKK48). Revisar si los asientos easyJet 3B–3E ya incluyen la maleta de cabina.',
})
for (const d of days) {
  const stay = d.stay || {}
  const rate = stay.rate || {}
  if (rate.m != null) {
    items.push({
      category: 'alojamiento',
      label: `🏨 ${dd(d.date)} · ${stay.name ? stay.name.split('·')[0].trim() : 'Hospedaje'} (una noche)`,
      estimated: toEUR(+rate.m, rate.c), spent: 0, currency: rate.c,
      notes: `Noche del ${dd(d.date)} · pagó/por pagar: ${rate.by || '—'}${stay.details ? '. ' + stay.details.split('\n')[0] : ''}`,
    })
  }
  for (const [cat, amount] of Object.entries(d.costs || {})) {
    if (!amount || amount.m == null || !amount.m) continue
    items.push({
      category: CATMAP[cat] || 'varios',
      label: `${cat === 'desayuno' ? '🥐' : cat === 'almuerzo' ? '🍝' : cat === 'cena' ? '🍕' : cat === 'transporte' ? '🚇' : cat === 'museos' ? '🎟️' : cat === 'compras' ? '🛍️' : '🛒'} ${dd(d.date)} · ${cat}${amount.by ? ' (pagó ' + amount.by + ')' : ''}`,
      estimated: toEUR(+amount.m, amount.c), spent: 0, currency: amount.c,
      notes: `${amount.c === 'EUR' ? '' : amount.c + ' ' + amount.m + ' ≈ ' + toEUR(+amount.m, amount.c).toFixed(2) + ' EUR · '}${d.place || ''}`.trim(),
    })
  }
}
db.post('budget_items', items, 'budget_items: ' + items.length)
console.log('budget_items: post', items.length)

// ── VERIFICACIÓN ──
const dn = (await db.get('day_notes', 'select=date,title&order=date.asc')) || []
console.log('day_notes totales:', dn.length, '| con plan importado:', dn.filter((r) => r.title).length)
const bk = (await db.get('bookings', 'select=id,need,done&order=sort_order.asc')) || []
console.log('bookings totales:', bk.length, '(`ob` pendientes:', bk.filter((b) => b.need === 'ob' && !b.done).length + ')')
const bud = (await db.get('budget_items', 'select=estimated,currency')) || []
const toNum = (v) => (typeof v === 'string' ? Number(v) : v)
const sumEur = bud.reduce((s, r) => s + (r.currency === 'EUR' ? toNum(r.estimated) : toNum(r.estimated)), 0)
console.log('budget_items:', bud.length, '· suma estimated (unidades mixtas EUR/COP/USD, la app convierte):', Math.round(sumEur * 100) / 100)
const mm = await db.get('places', 'select=name,assigned_date&name=ilike.' + db.searchLike('la mayor'))
console.log('Santa María la Mayor:', JSON.stringify(mm))
console.log('FIN PASO 3')
