// Geocodificación v2 con Nominatim:
// - corrige el bug anterior (lon no lng) sobre los que quedaron con lat pero sin lng,
// - reintenta los que fallaron limpiando paréntesis/sufijos del nombre.
import { client } from './helper-rest.mjs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const db = client()

// consulta Nominatim con variantes del nombre (más → menos completa)
const rollup = (p) => {
  const clean = (s) => s.replace(/\s*\((?:opcional|[^)]*opcional[^)]*)\)\s*/gi, '').replace(/[·]/g, ',').replace(/\s+/g, ' ').trim()
  const base = clean(p.name)
  const variants = [
    `${base}, ${p.city}`,
    base,
    `${base.split('(')[0].trim()}, ${p.city}`,
  ]
  return [...new Set(variants)].filter(Boolean)
}

const search = async (q) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&accept-language=es`
  const r = await fetch(url, { headers: { 'User-Agent': 'mapa-viaje-app/1.0 (planificador familiar de viaje)' } })
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

// 1) los que ya tienen lat pero lng null (bug anterior) → compartimos el mismo lat? no: vuelve a buscar
const broken = (await db.get('places', 'select=id,name,city,assigned_date,lat,lng&lat=not.is.null&lng=is.null')) || []
console.log('con lat sin lng (bug anterior):', broken.length)
for (const p of broken) {
  let hit = null
  for (const q of rollup(p)) { hit = await search(q); if (hit) break; await sleep(1100) }
  if (hit) {
    await db.patch('places', 'id=eq.' + p.id, { lat: Number(hit.lat), lng: Number(hit.lon) }, 'fix ' + p.name)
    console.log('  ✓ fix', p.name, '@', Number(hit.lat).toFixed(5) + ',' + Number(hit.lon).toFixed(5))
  } else console.log('  ✗ sigue sin resultado', p.name, '[', p.city, ']')
  await sleep(1100)
}

// 2) los que aún no tienen nada: reintentar con variantes
const missing = (await db.get('places', 'select=id,name,city,assigned_date,lat,lng&lat=is.null&assigned_date=not.is.null')) || []
console.log('sin coords totales:', missing.length)
for (const p of missing) {
  let hit = null
  for (const q of rollup(p)) { hit = await search(q); if (hit) break; await sleep(1100) }
  if (hit) {
    await db.patch('places', 'id=eq.' + p.id, { lat: Number(hit.lat), lng: Number(hit.lon) }, 'geo ' + p.name)
    console.log('  ✓', p.name, '@', Number(hit.lat).toFixed(5) + ',' + Number(hit.lon).toFixed(5))
  } else console.log('  ✗ sin resultado', p.name, '[', p.city, ']')
  await sleep(1100)
}

const vt = (await db.get('places', 'select=lat,lng&lat=not.is.null&assigned_date=not.is.null')) || []
console.log('FIN: places con fecha y coords:', vt.length)
