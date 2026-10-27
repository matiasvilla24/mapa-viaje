// Sonda one-off de acceso REST con la anon key de .env.local (no imprime secretos).
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
  const sample = Array.isArray(x) ? x[0] : x
  console.log(t, 'rows', Array.isArray(x) ? x.length : '?', 'sample:', sample == null ? 'null' : JSON.stringify(sample).slice(0, 300))
  return x
}

for (const t of ['flights', 'accommodations', 'places', 'day_notes', 'bookings', 'budget_items', 'alerts', 'alert_checks', 'push_subscriptions']) await get(t, '&limit=2')
console.log('FIN probe')
