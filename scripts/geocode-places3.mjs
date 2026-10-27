// v3: corrige 2 resultados absurdos de la v2 (Zazà en Alabama, Popolo en El Paso) y
// resuelve los pendientes con consultas específicas + caja de país de validación.
import { client } from './helper-rest.mjs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const db = client()

const BOX = { España: [35, 45, -10, 5], Francia: [41, 51.5, -6, 10], Italia: [35, 47.5, 6, 19] }
const key = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

const PLAN = {
  trattoriazaza: ['Trattoria Zaza, Piazza del Mercato Centrale, Firenze', 'Trattoria Zaza Firenze'],
  plazadelpopolo: ['Piazza del Popolo, Roma', 'Piazza del Popolo, 00187 Roma'],
  bodegatintacastizaelmolar: ['Calle Fuente del Toro, 28710 El Molar', 'Tinta Castiza El Molar'],
  lockerinthecitylalatinaconsignademaletas: ['Calle de la Sierpe 5, 28005 Madrid', 'Lockerinthecity Calle Sierpe Madrid'],
  catacumbasdeparisopcional: ['Catacombes de Paris, 75014 Paris', 'Catacombes de Paris'],
  lagodecomovarenna: ['Varenna, Provincia di Lecco', 'Varenna Italia'],
  santamariadellegrazzielaultimacenacenacolo: ['Santa Maria delle Grazie, Milano', 'Cenacolo Vinciano Milano'],
  grancanalengondola: ['Bacino di San Marco, Venezia', 'Riva degli Schiavoni Venezia'],
  palaioscarezzonicoopcional: ["Ca' Rezzonico, Venezia", "Ca' Rezzonico, Dorsoduro Venezia"],
  palaioscarezzonico: ["Ca' Rezzonico, Venezia"],
  estadoioclimicoasromavsacmilan: ['Stadio Olimpico, Roma', 'Stadio Olimpico 00194 Roma'],
  viaapiaantigua: ['Via Appia Antica, 00179 Roma', 'Via Appia Antica'],
  salavipaviancaneptunoescolanocturna: ['Terminal 4S, Aeropuerto de Madrid-Barajas', 'Barajas T4S Madrid'],
  villaborgheseymiradordelpincio: ['Villa Borghese, Roma', 'Pincio Roma'],
}

const search = async (q) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&accept-language=es`
  const r = await fetch(url, { headers: { 'User-Agent': 'mapa-viaje-app/1.0 (planificador familiar de viaje)' } })
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

const rows = (await db.get('places', 'select=id,name,city,assigned_date,lat,lng&assigned_date=not.is.null&order=name.asc')) || []
const target = rows.filter((p) => p.lat == null || p.lng == null)
console.log('por corregir:', target.length)
for (const p of target) {
  const queries = PLAN[key(p.name)] || [p.name + ', ' + p.city]
  let hit = null
  for (const q of queries) {
    hit = await search(q)
    if (hit && hit.lat != null) {
      const [la, lo] = [Number(hit.lat), Number(hit.lon)]
      const box = BOX[p.city] || null
      if (box && !(la >= box[0] && la <= box[1] && lo >= box[2] && lo <= box[3])) {
        console.log('  ⊘ fuera de país:', p.name, '→', la, lo, '(q: ' + q + ')')
        hit = null
      } else break
    } else hit = null
    await sleep(1100)
  }
  if (hit && hit.lat != null) {
    await db.patch('places', 'id=eq.' + p.id, { lat: Number(hit.lat), lng: Number(hit.lon) }, 'v3 ' + p.name)
    console.log(`  ✓ ${p.name} @ ${Number(hit.lat).toFixed(5)},${Number(hit.lon).toFixed(5)}`)
  } else {
    console.log('  ✗ sin resultado válido:', p.name, '[', p.city, ']')
  }
  await sleep(1100)
}
const left = ((await db.get('places', 'select=id,name&lat=is.null&assigned_date=not.is.null')) || [])
console.log('quedan sin coords:', left.length ? left.map((r) => r.name).join(' · ') : 'ninguno')
console.log('FIN v3')
