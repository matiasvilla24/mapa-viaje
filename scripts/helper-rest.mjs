// Helper común de acceso REST a Supabase con la anon key del .env.local.
// No imprime valores de secretos. Error por llamada: log '!!' y sigue.
import fs from 'node:fs'

export const loadEnv = () => Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

export function client() {
  const env = loadEnv()
  const BASE = env.VITE_SUPABASE_URL + '/rest/v1/'
  const HEAD = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }

  const call = async (t, qs = '', method = 'GET', body = null, label = '') => {
    const url = BASE + t + (qs ? '?' + qs : '')
    const extra = method === 'POST' || method === 'PATCH' ? { Prefer: 'return=representation' } : {}
    const r = await fetch(url, { method, headers: { ...HEAD, ...extra }, body: body == null ? undefined : JSON.stringify(body) })
    const txt = await r.text()
    let out = null
    try { out = txt ? JSON.parse(txt) : null } catch { out = txt }
    if (r.status >= 400) {
      console.log('!!', method, t, label || qs.slice(0, 70), '->', r.status, (typeof out === 'string' ? out : JSON.stringify(out) || '').slice(0, 300))
    }
    return out
  }

  return {
    get: (t, qs = '') => call(t, qs, 'GET'),
    post: (t, rows, label = '') => (rows && rows.length ? call(t, '', 'POST', rows, label) : (console.log('skip POST', t, label), null)),
    patch: (t, qs, fields, label = '') => call(t, qs, 'PATCH', fields, label),
    remove: (t, qs, label = '') => call(t, qs, 'DELETE', null, label),
    searchLike: (s) => encodeURIComponent('*' + s + '*'),
  }
}
