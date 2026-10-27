// Sonda 2: filas completas de places y accommodations (columnas exactas).
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
const base = env.VITE_SUPABASE_URL + '/rest/v1/'

const get = async (t, query = '') => {
  const r = await fetch(`${base}${t}?select=*${query}`, { headers: H })
  const x = await r.json()
  if (!r.ok) { console.log('!!', t, r.status, JSON.stringify(x).slice(0, 200)); return null }
  return x
}

const places = await get('places', '&limit=1')
const accs = await get('accommodations', '&limit=1')
const dn = await get('day_notes', '&limit=1')
console.log('PLACES cols:', Object.keys(places[0]).join(','))
console.log('ACCOMMODATIONS cols:', Object.keys(accs[0]).join(','))
console.log('DAY_NOTES cols:', Object.keys(dn[0]).join(','))
// ¿PK de day_notes es la fecha? pedir dos filas de la misma fecha no es posible si es PK.
const dates = await get('day_notes', '&select=date&order=date.asc')
console.log('DAY_NOTES fechas:', dates.map(d => d.date).join(' | '), '(dupes:', dates.length - new Set(dates.map(d => d.date)).size, ')')
// inventario de places (para MOVES)
const pl = await get('places', '&select=id,name,city,assigned_date&order=name.asc')
console.log('PLACES inventario:', pl.map(p => `${p.name} [${p.city}] ${p.assigned_date || '—'}`).join('\n'))
