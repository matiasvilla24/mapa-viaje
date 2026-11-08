// Asigna el itinerario tentativo de Roma (6–10 ene) en la base.
// Solo escribe `assigned_date`; los precios, horarios y reservas ya cargados
// NO se tocan. Rellena únicamente los campos de horario/precio que estén vacíos
// en las paradas de la ruta, para que el plan sea utilizable en la app.
import { client } from './helper-rest.mjs'
import { ROME_ROUTE, routeKey } from '../src/constants.js'

const db = client()

// Datos de apoyo SOLO para campos vacíos (se marcan "verificar" cuando cambian).
const FILL = {
  Coliseo: {
    price: '€18 combinada (Coliseo + Foro + Palatino, 24 h) + €2 reserva online — verificar',
    opening_hours: 'Todos los días 8:30–16:30 en invierno (última entrada 15:30). Cerrado 1 ene y 1 may.',
  },
  'Catacumbas de San Calixto': {
    price: '€10 (aprox. — verificar)',
    opening_hours: 'Jue–Mar 9:00–12:00 y 14:00–17:00; miércoles cerrado (invierno). Verificar.',
  },
  'Termas de Caracalla': {
    price: '€10 (aprox. — verificar)',
    opening_hours: 'Martes a domingo 9:00–16:30 (última entrada 15:30); lunes cerrado.',
  },
  'Vía Apia Antigua': {
    price: 'Gratis (vía pública; catacumbas y villas se pagan aparte)',
    opening_hours: 'Siempre accesible; los monumentos del recorrido tienen horario propio.',
  },
  'Bocca della Verità': {
    opening_hours: 'Todos los días 9:30–17:00 (iglesia de Santa Maria in Cosmedin). Verificar.',
  },
  'Estadio Olímpico · AS Roma vs AC Milan': {
    price: 'Entradas según sector (venta en asroma.com)',
    opening_hours: '18:00 (apertura de puertas ~2 h antes; llevar pasaporte).',
  },
  'Isola Tiberina': { opening_hours: 'Siempre accesible (isla pública).' },
  'Plaza del Popolo': { opening_hours: 'Siempre accesible (plaza pública).' },
  'Villa Borghese y mirador del Pincio': { opening_hours: 'Parque abierto de 7:00 a ~20:00 en invierno. Verificar.' },
  'Las Abejas Barberini (guía de caza)': {
    opening_hours: 'Siempre visibles: fachada del Palazzo Barberini y fuente de Piazza Barberini.',
  },
}

const rows = await db.get(
  'places',
  'select=id,name,city,assigned_date,price,opening_hours&city=eq.Roma&limit=500',
)
console.log('Roma en base:', rows.length)

const keyOf = (s) => routeKey(s)
const byKey = new Map(rows.map((r) => [keyOf(r.name), r]))

let assigned = 0
let filled = 0
const missing = []

for (const day of ROME_ROUTE) {
  for (const stop of day.stops) {
    const k = keyOf(stop)
    let row = byKey.get(k)
    if (!row) {
      for (const [rk, r] of byKey) {
        if (rk && (rk.startsWith(k) || k.startsWith(rk))) { row = r; break }
      }
    }
    if (!row) { missing.push(`${day.date} · ${stop}`); continue }

    const patch = {}
    if (row.assigned_date !== day.date) patch.assigned_date = day.date

    const fill = FILL[stop] || {}
    for (const [field, value] of Object.entries(fill)) {
      const current = (row[field] || '').toString().trim()
      if (!current) patch[field] = value
    }

    if (Object.keys(patch).length) {
      await db.patch('places', `id=eq.${row.id}`, patch, `${day.date} ${stop}`)
      if (patch.assigned_date) assigned++
      if (Object.keys(patch).some((f) => f !== 'assigned_date')) filled++
    }
  }
}

console.log(`Fechas asignadas: ${assigned} · campos completados: ${filled}`)
if (missing.length) {
  console.log('⚠️ Sin coincidencia en la base:')
  for (const m of missing) console.log('  -', m)
} else {
  console.log('Todas las paradas quedaron vinculadas a un lugar real.')
}

// Resumen por día para verificación humana
const check = await db.get(
  'places',
  'select=name,assigned_date&city=eq.Roma&assigned_date=gte.2027-01-05&assigned_date=lte.2027-01-10&order=assigned_date.asc',
)
const count = {}
check.forEach((r) => { count[r.assigned_date] = (count[r.assigned_date] || 0) + 1 })
console.log('Lugares por día:', count)
