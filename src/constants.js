// Categorías de lugares (enum del modelo de datos)
export const CATEGORIES = {
  museo:               { label: 'Museo',    color: '#7c3aed' },
  iglesia:             { label: 'Iglesia',  color: '#d97706' },
  monumento:           { label: 'Monumento', color: '#dc2626' },
  ruina_arqueologica:  { label: 'Ruina',    color: '#78716c' },
  parque:              { label: 'Parque',   color: '#16a34a' },
  comida:              { label: 'Comida',   color: '#db2777' },
  hotel:               { label: 'Hotel',    color: '#0f766e' },
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

// Cronograma (datos objetivos del repo "App Europa 2026": 18 días, 25 dic – 11 ene 2027)
export const ITINERARY = [
  { date: '2026-12-25', city: 'Medellín',  label: '✈️ Salida: Medellín → Madrid (AV16 22:20)',  travel: true },
  { date: '2026-12-26', city: 'Madrid',   label: '🚗 Madrid · El Molar y Bodega Tinta Castiza', travel: false },
  { date: '2026-12-27', city: 'Madrid',   label: '🌳 Madrid · Retiro, Gran Vía y Sol',          travel: false },
  { date: '2026-12-28', city: 'Madrid',   label: '🏟️ Madrid · Bernabéu y Palacio Real → ✈️ París (20:45)', travel: true },
  { date: '2026-12-29', city: 'París',    label: '🗼 París · Versalles, Eiffel y crucero',      travel: false },
  { date: '2026-12-30', city: 'París',    label: '🏛️ París · Notre Dame, Louvre y Barrio Latino', travel: false },
  { date: '2026-12-31', city: 'París',    label: '🎆 París · Montmartre y Año Nuevo',           travel: false },
  { date: '2027-01-01', city: 'París',    label: '🏰 Disneyland París (todo el día)',           travel: false },
  { date: '2027-01-02', city: 'Venecia',  label: '🚤 Como (Varenna–Bellagio) + Milán → 🚄 Venecia', travel: true },
  { date: '2027-01-03', city: 'Venecia',  label: '🛶 Venecia · Rialto y San Marcos',            travel: false },
  { date: '2027-01-04', city: 'Florencia', label: '🔪 Murano (mañana) + 🏛️ Florencia (tarde)',  travel: true },
  { date: '2027-01-05', city: 'Roma',     label: '🎨 Florencia día completo → 🚄 Roma',         travel: true },
  { date: '2027-01-06', city: 'Roma',     label: '⛪ Roma · Epifanía en San Pedro y centro',    travel: false },
  { date: '2027-01-07', city: 'Roma',     label: '🏟️ Roma · Coliseo, Foro y basílicas',        travel: false },
  { date: '2027-01-08', city: 'Roma',     label: '🖼️ Roma · Vaticano y Trastevere',            travel: false },
  { date: '2027-01-09', city: 'Roma',     label: '⚽ Roma · Borghese y AS Roma vs AC Milan',    travel: false },
  { date: '2027-01-10', city: 'Madrid',   label: '🛣️ Roma · Vía Apia → ✈️ Madrid (21:35, escala T4S)', travel: true },
  { date: '2027-01-11', city: 'Medellín', label: '🏠 Regreso: Madrid → Bogotá → Medellín (llega 16:50)', travel: true },
]

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const DATE_OPTIONS = ITINERARY.map(d => ({ value: d.date, label: `${fmtDate(d.date)} · ${d.label}` }))

// Ruta para dibujar los traslados en el mapa (centro de la ciudad por noche)
export const ROUTE_POINTS = [
  { city: 'Medellín',  date: '25 dic',          lat: 6.2442,  lng: -75.5812 },
  { city: 'Madrid',    date: '26–28 dic',       lat: 40.4168, lng: -3.7038 },
  { city: 'París',     date: '28 dic–1 ene',    lat: 48.8566, lng: 2.3522 },
  { city: 'Milán',     date: '2 ene (tránsito)', lat: 45.4642, lng: 9.1900 },
  { city: 'Varenna',   date: '2 ene (Como)',    lat: 46.0100, lng: 9.2833 },
  { city: 'Bellagio',  date: '2 ene (Como)',    lat: 45.9839, lng: 9.2582 },
  { city: 'Venecia',   date: '2–4 ene',         lat: 45.4408, lng: 12.3155 },
  { city: 'Florencia', date: '4–5 ene',         lat: 43.7696, lng: 11.2558 },
  { city: 'Roma',      date: '5–10 ene',        lat: 41.9028, lng: 12.4964 },
  { city: 'Madrid',    date: '10–11 ene (escala T4S)', lat: 40.4772, lng: -3.5675 },
  { city: 'Medellín',  date: '11 ene (llega)',  lat: 6.2442,  lng: -75.5812 },
]

// Tramos de vuelos/traslados editables (claves estables = ids en la tabla flights).
// mode: 'plane' | 'train' | 'ferry' — los aéreos llevan enlace de rastreo en Skyscanner.
export const FLIGHT_LEGS = [
  { id: 'mde-mad-25dic', label: '✈️ Medellín → Madrid', date: '2026-12-25', icon: '✈️', mode: 'plane', from: 'MDE', to: 'MAD' },
  { id: 'mad-par-28dic', label: '✈️ Madrid (Barajas) → París (Orly)', date: '2026-12-28', icon: '✈️', mode: 'plane', from: 'MAD', to: 'PAR' },
  { id: 'par-lin-02ene', label: '✈️ París (Orly) → Milán (Linate)', date: '2027-01-02', icon: '✈️', mode: 'plane', from: 'PAR', to: 'LIN' },
  { id: 'lin-var-02ene', label: '🚆 Milano Centrale → Varenna (Lago de Como)', date: '2027-01-02', icon: '🚆', mode: 'train' },
  { id: 'var-blg-02ene', label: '⛴️ Varenna → Bellagio (ferry)', date: '2027-01-02', icon: '⛴️', mode: 'ferry' },
  { id: 'lin-vce-02ene', label: '🚆 Milano Centrale → Venezia S. Lucia', date: '2027-01-02', icon: '🚆', mode: 'train' },
  { id: 'vce-flo-04ene', label: '🚆 Venezia S. Lucia → Firenze SMN', date: '2027-01-04', icon: '🚆', mode: 'train' },
  { id: 'flo-rom-05ene', label: '🚆 Firenze SMN → Roma Termini', date: '2027-01-05', icon: '🚆', mode: 'train' },
  { id: 'rom-mad-10ene', label: '✈️ Roma Fiumicino → Madrid Barajas', date: '2027-01-10', icon: '✈️', mode: 'plane', from: 'FCO', to: 'MAD' },
  { id: 'mad-bog-11ene', label: '✈️ Madrid Barajas T4S → Bogotá', date: '2027-01-11', icon: '✈️', mode: 'plane', from: 'MAD', to: 'BOG' },
  { id: 'bog-mde-11ene', label: '✈️ Bogotá → Medellín (llega 16:50)', date: '2027-01-11', icon: '✈️', mode: 'plane', from: 'BOG', to: 'MDE' },
]

// Conector Skyscanner: enlace de búsqueda con fechas conocidas del tramo.
// (No existe API pública gratuita; rastreamos vía enlaces directos.)
export function skyscannerUrl(leg) {
  if (leg.mode !== 'plane' || !leg.from || !leg.to) return null
  const d = (leg.date || '').replaceAll('-', '')
  const legs = { MADPAR: 'madrid-europa/barajas-orly', PARLIN: 'paris-europa/milan-europa', MADBOG: 'madrid-europa/bogota', BOGMDE: 'bogota/medellin' }
  return `https://www.skyscanner.com.co/transporte/vuelos/${legs[leg.from.toLowerCase() + leg.to.toLowerCase()] || leg.from.toLowerCase() + '/' + leg.to.toLowerCase()}/${d}/?adults=4&adultsv2=4&cabinclass=economy&rtn=0`
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
  return `${d} ${MONTHS[m - 1] ?? m}`
}

// Limpia los wiki-links [[texto|mostrar]] del repo externo (Obsidian) a texto plano.
export function wiki(s) {
  if (typeof s !== 'string') return s
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
}

// Monitoreo de ventas que la app vigila a diario (repo "App Europa 2026")
export const MONITORS = [
  {
    key: 'cenacolo',
    label: 'La Última Cena (Cenacolo Vinciano) — Milán, 2 ene',
    url: 'https://cenacolovinciano.vivaticket.it/',
    hint: 'Boletos del sáb 2-ene (turno de la tarde ~16:00). Solo en el canal oficial; máx. 5 por compra.',
    actionLabel: 'Comprar boletos',
  },
  {
    key: 'asroma',
    label: 'AS Roma vs AC Milan — Serie A, 9 ene 18:00 (Estadio Olímpico)',
    url: 'https://www.asroma.com/it/biglietti/maschile',
    hint: 'Entradas nominales; llevar pasaporte el día del partido.',
    actionLabel: 'Ver entradas',
  },
]
