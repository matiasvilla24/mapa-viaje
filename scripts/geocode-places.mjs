// Geocodifica los places SIN coordenadas usando Nominatim (OpenStreetMap, gratuito).
// 1 req/seg con User-Agent propio, para no violar la política de uso.
import { client } from './helper-rest.mjs'
const db = client()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const rows = (await db.get('places', 'select=id,name,city,assigned_date,lat,lng&lat=is.null&assigned_date=not.is.null')) || []
console.log('A geocodificar:', rows.length)

let ok = 0, fail = []
for (const [i, p] of rows.entries()) {
  const address = encodeURIComponent(`${p.name}, ${p.city}`)
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${address}&format=json&limit=1&accept-language=es`, {
    headers: { 'User-Agent': 'mapa-viaje-app/1.0 (planificador familiar de viaje)' },
  })
  const arr = await r.json()
  if (Array.isArray(arr) && arr.length) {
    const { lat, lng } = arr[0]
    const upd = await db.patch('places', 'id=eq.' + p.id, { lat: Number(lat), lng: Number(lng) }, 'geo ' + p.name)
    ok++
    console.log(`  ${i + 1}/${rows.length} ✓ ${p.name} @ ${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`)
  } else {
    fail.push(p.name + ' [' + p.city + ']')
    console.log(`  ${i + 1}/${rows.length} ✗ ${p.name} [${p.city}]`)
  }
  await sleep(1100)
}
console.log('geocodificados:', ok, '| sin resultado:', fail.length ? fail.join(' · ') : 'ninguno')
console.log('FIN GEOCODE')
