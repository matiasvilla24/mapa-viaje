// Categorías de lugares (enum del modelo de datos)
export const CATEGORIES = {
  museo:               { label: 'Museo',              color: '#7c3aed' },
  iglesia:             { label: 'Iglesia',            color: '#d97706' },
  monumento:           { label: 'Monumento',          color: '#dc2626' },
  ruina_arqueologica:  { label: 'Ruina arqueológica', color: '#78716c' },
  parque:              { label: 'Parque',             color: '#16a34a' },
  paseo_barrio:        { label: 'Paseo / barrio',     color: '#0d9488' },
  comida:              { label: 'Comida',             color: '#db2777' },
  otro:                { label: 'Otro',               color: '#2563eb' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

// Cronograma base (flexible): días con ciudad principal y coordenadas para la ruta
export const ITINERARY = [
  { date: '2026-12-25', city: 'Medellín',   label: '✈️ Medellín → Madrid',          lat: 6.2442,  lng: -75.5812, travel: true },
  { date: '2026-12-26', city: 'Madrid',     label: 'Llegada a Madrid',              lat: 40.4168, lng: -3.7038,  travel: false },
  { date: '2026-12-27', city: 'Madrid',     label: '✈️ Madrid → París',             lat: 40.4168, lng: -3.7038,  travel: true },
  { date: '2026-12-28', city: 'París',      label: 'París',                          lat: 48.8566, lng: 2.3522,   travel: false },
  { date: '2026-12-29', city: 'París',      label: 'París',                          lat: 48.8566, lng: 2.3522,   travel: false },
  { date: '2026-12-30', city: 'París',      label: 'París',                          lat: 48.8566, lng: 2.3522,   travel: false },
  { date: '2026-12-31', city: 'París',      label: 'París · Fin de año',             lat: 48.8566, lng: 2.3522,   travel: false },
  { date: '2027-01-01', city: 'Milán',      label: '✈️ París → Milán',               lat: 45.4642, lng: 9.1900,   travel: true },
  { date: '2027-01-02', city: 'Milán',      label: 'Milán → Verona (tránsito)',      lat: 45.4642, lng: 9.1900,   travel: false },
  { date: '2027-01-03', city: 'Venecia',    label: 'Venecia',                        lat: 45.4408, lng: 12.3155,  travel: false },
  { date: '2027-01-04', city: 'Florencia',  label: 'Florencia',                      lat: 43.7696, lng: 11.2558,  travel: false },
  { date: '2027-01-05', city: 'Roma',       label: 'Roma',                           lat: 41.9028, lng: 12.4964,  travel: false },
  { date: '2027-01-06', city: 'Roma',       label: 'Roma',                           lat: 41.9028, lng: 12.4964,  travel: false },
  { date: '2027-01-07', city: 'Pompeya',    label: 'Pompeya (día por confirmar)',    lat: 40.7497, lng: 14.4869,  travel: false },
  { date: '2027-01-08', city: 'Roma',       label: 'Roma',                           lat: 41.9028, lng: 12.4964,  travel: false },
  { date: '2027-01-09', city: 'Madrid',     label: '✈️ Roma → Madrid (18:30)',       lat: 41.9028, lng: 12.4964,  travel: true },
  { date: '2027-01-10', city: 'Medellín',   label: '✈️ Madrid (15:30) → Medellín',   lat: 40.4168, lng: -3.7038,  travel: true },
]

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const DATE_OPTIONS = ITINERARY.map(d => ({ value: d.date, label: `${fmtDate(d.date)} · ${d.label}` }))

// Ruta para dibujar en el mapa: centros urbanos en orden del itinerario
export const ROUTE_POINTS = [
  { city: 'Medellín',   date: '25 dic', lat: 6.2442,  lng: -75.5812 },
  { city: 'Madrid',     date: '26 dic', lat: 40.4168, lng: -3.7038 },
  { city: 'París',      date: '28–31 dic', lat: 48.8566, lng: 2.3522 },
  { city: 'Milán',      date: '1–2 ene', lat: 45.4642, lng: 9.1900 },
  { city: 'Verona',     date: '2 ene (tránsito)', lat: 45.4384, lng: 10.9916 },
  { city: 'Venecia',    date: '3 ene', lat: 45.4408, lng: 12.3155 },
  { city: 'Florencia',  date: '4 ene', lat: 43.7696, lng: 11.2558 },
  { city: 'Roma',       date: '5–8 ene', lat: 41.9028, lng: 12.4964 },
  { city: 'Pompeya',    date: '7 ene (por confirmar)', lat: 40.7497, lng: 14.4869 },
  { city: 'Madrid',     date: '9 ene 18:30', lat: 40.4168, lng: -3.7038 },
  { city: 'Medellín',   date: '10 ene', lat: 6.2442,  lng: -75.5812 },
]

export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
