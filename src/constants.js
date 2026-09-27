// Categorías de lugares (enum del modelo de datos)
export const CATEGORIES = {
  museo:               { label: 'Museo',    color: '#7c3aed' },
  iglesia:             { label: 'Iglesia',  color: '#d97706' },
  monumento:           { label: 'Monumento', color: '#dc2626' },
  ruina_arqueologica:  { label: 'Ruina',    color: '#78716c' },
  parque:              { label: 'Parque',   color: '#16a34a' },
  comida:              { label: 'Comida',   color: '#db2777' },
  otro:                { label: 'Otro',     color: '#2563eb' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

// Personas de la familia (etiquetas obligatorias de autoría / interés)
export const PEOPLE = [
  { key: 'papa', label: 'Papá', color: '#2563eb' },   // azul
  { key: 'mama', label: 'Mamá', color: '#d9a400' },   // amarillo
  { key: 'susi', label: 'Susi', color: '#7c3aed' },   // morado
  { key: 'mati', label: 'Mati', color: '#dc2626' },   // rojo
]
export const PERSON_KEYS = PEOPLE.map((p) => p.key)
export const personLabel = (k) => PEOPLE.find((p) => p.key === k)?.label || k
export const personColor = (k) => PEOPLE.find((p) => p.key === k)?.color || '#64748b'

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

// Tramos de vuelos/traslados editables (claves estables = ids en la tabla flights)
// mode: 'plane' | 'train' — los aéreos llevan enlace de rastreo de precio en Skyscanner
export const FLIGHT_LEGS = [
  { id: 'mde-mad-25dic', label: '✈️ Medellín → Madrid', date: '2026-12-25', icon: '✈️', mode: 'plane', from: 'MDE', to: 'MAD' },
  { id: 'mad-26dic',     label: '🛬 Llegada a Madrid', date: '2026-12-26', icon: '🛬', mode: 'none' },
  { id: 'mad-par-27dic', label: '✈️ Madrid → París', date: '2026-12-27', icon: '✈️', mode: 'plane', from: 'MAD', to: 'PAR' },
  { id: 'par-fin-31dic', label: '🎆 Fin de año en París', date: '2026-12-31', icon: '🎆', mode: 'none' },
  { id: 'par-mxp-01ene', label: '✈️ París → Milán', date: '2027-01-01', icon: '✈️', mode: 'plane', from: 'PAR', to: 'MXP' },
  { id: 'mxp-vce-02ene', label: '🚆 Milán → Verona → Venecia', date: '2027-01-02', icon: '🚆', mode: 'train' },
  { id: 'vce-flo-03ene', label: '🚆 Venecia → Florencia', date: '2027-01-03', icon: '🚆', mode: 'train' },
  { id: 'flo-roma-04ene', label: '🚆 Florencia → Roma', date: '2027-01-04', icon: '🚆', mode: 'train' },
  { id: 'rom-nap-07ene', label: '🚆 Roma → Pompeya (ida y vuelta)', date: '2027-01-07', icon: '🚆', mode: 'train' },
  { id: 'rom-mad-09ene', label: '✈️ Roma → Madrid', date: '2027-01-09', icon: '✈️', mode: 'plane', from: 'ROM', to: 'MAD' },
  { id: 'mad-mde-10ene', label: '✈️ Madrid → Medellín', date: '2027-01-10', icon: '✈️', mode: 'plane', from: 'MAD', to: 'MDE' },
]

// Conector Skyscanner: enlace de búsqueda con fechas conocidas del tramo.
// (No existe API pública gratuita; rastreamos vía enlaces directos.)
export function skyscannerUrl(leg) {
  if (leg.mode !== 'plane' || !leg.from || !leg.to) return null
  const d = (leg.date || '').replaceAll('-', '')
  return `https://www.skyscanner.com.co/transporte/vuelos/${leg.from.toLowerCase()}/${leg.to.toLowerCase()}/${d}/?adults=4&adultsv2=4&cabinclass=economy&rtn=0`
}

// Presupuesto: categorías de ítems
export const BUDGET_CATEGORIES = {
  tiquetes:    { label: 'Tiquetes',            icon: '✈️' },
  alojamiento: { label: 'Alojamientos',        icon: '🏨' },
  comidas:     { label: 'Comidas',             icon: '🍽️' },
  entradas:    { label: 'Entradas a lugares',  icon: '🎟️' },
  transporte:  { label: 'Transporte local',    icon: '🚇' },
  varios:      { label: 'Gastos varios',       icon: '🛍️' },
}
export const BUDGET_CATEGORY_KEYS = Object.keys(BUDGET_CATEGORIES)

export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
