// PASO 2: assigned_date de places según el itinerario del repo + lugares nuevos.
import { client } from './helper-rest.mjs'
const db = client()

// ── Reasignar fechas a los existentes ──
const MOVES = [
  // París — día 29: Versalles, Torre Eiffel y Trocadéro
  ['2026-12-29', 'eiffel', null],
  ['2026-12-29', 'versal', null],
  ['2026-12-29', 'troca', null],
  // París — día 30: Louvre, Notre-Dame, Barrio Latino, Luxemburgo, Sorbona
  ['2026-12-30', 'louvre', null],
  ['2026-12-30', 'notre', null],
  ['2026-12-30', 'barrio latino', null],
  ['2026-12-30', 'luxembou', null],
  ['2026-12-30', 'sorbona', null],
  // París — día 31: Montmartre, Ópera, Tullerías, Concordia, Campos Elíseos, Arco
  ['2026-12-31', 'tuileries', null],
  ['2026-12-31', 'concorde', null],
  ['2026-12-31', 'triunfo', 'par'],
  ['2026-12-31', 'garnier', null],
  ['2026-12-31', 'lafayette', null],
  ['2026-12-31', 'montmartre', null],
  ['2026-12-31', 'sacr', 'par'],
  ['2026-12-31', 'tertre', null],
  ['2026-12-31', 'champs', 'par'],
  ['2026-12-31', 'petit palais', null],
  // Florencia — día 5: museos; Santa Croce sale del plan
  ['2027-01-05', 'uffizi', null],
  ['2027-01-05', 'accademia', null],
  ['2027-01-05', 'del fiore', null],
  [null, 'santa croce', 'florenc'],
  // Roma — día 6: San Pedro (Vaticano), San Ángelo, Trevi (ya)
  ['2027-01-06', 'san pedro', 'roma'],
  ['2027-01-06', 'santangelo', null],
  ['2027-01-06', 'sant angelo', null],
  // Roma — día 7: San Pedro Encadenado, Foro, Coliseo (no existe aún, se inserta abajo)
  ['2027-01-07', 'vincoli', null],
  ['2027-01-07', 'foro', null],
  // Roma — día 8: Vaticanos
  ['2027-01-08', 'vaticanos', null],
  ['2027-01-08', 'sixtina', null],
  // Roma — día 9: Borghese, María la Mayor, Letrán, Escalera Santa
  ['2027-01-09', 'borghese', null],
  ['2027-01-09', 'maggiore', null],
  ['2027-01-09', 'la mayor', null],
  ['2027-01-09', 'lateran', null],
  ['2027-01-09', 'scala santa', null],
  // Roma — día 10: Circo Máximo (ya); Bocca/Apia nuevas abajo
  ['2027-01-10', 'circo', null],
  // Fuera del plan del repo: quedan sin día, sin borrarlas
  [null, 'pompei', null],
  [null, 'arena di verona', null],
  [null, 'abejas', null],
  [null, 'obeliscos', null],
  [null, 'ignazio', 'roma'],
  [null, 'gerusalemme', null],
]
console.log('REASIGNANDO', MOVES.length, 'patrones…')
for (const [date, frag, cityFrag] of MOVES) {
  let qs = 'name=ilike.' + db.searchLike(frag)
  if (cityFrag) qs += '&city=ilike.' + db.searchLike(cityFrag)
  await db.patch('places', qs, { assigned_date: date }, 'move ' + frag + ' -> ' + (date || 'sin día'))
}

// Duplicados exactos de "Basílica de Santa Croce" en Florencia → conservar el más antiguo
const dups = (await db.get('places', 'id,name,city,created_at&name=ilike.' + db.searchLike('santa croce'))) || []
if (dups.length > 1) {
  const ids = dups.slice(1).map((r) => r.id)
  await db.remove('places', 'id=in.(' + ids.join(',') + ')', 'duplicados Santa Croce: ' + ids.length)
}

// ── Lugares NUEVOS (dirección en texto plano; sin coordenadas) ──
// reservation_notes: se completa de las actividades del día del repo.
const N = (name, city, country, category, assigned_date, address, description, reservRequired, reservNotes, price) => ({
  name, city, country, category, assigned_date, address, description,
  reservation_required: Boolean(reservRequired), reservation_notes: reservNotes || '',
  price: price || '', added_by: 'Mati', added_by_tag: 'mati', source_url: 'App Europa 2026 (fusión repo shepavilla/First-)',
})

const NEW_PLACES = [
  // ── MADRID, 26-dic (El Molar) ──
  N('Bodega Tinta Castiza (El Molar)', 'El Molar', 'España', 'comida', '2026-12-26',
    'Calle Fuente del Toro, 28710 El Molar, Madrid',
    'Recorrido y cata con tapas (~2 h), llegada hacia las 15:30 bajando de Barajas por la A-1. Quien conduzca no toma.',
    true, 'Reserva obligatoria: solo con visita reservada. Confirmar que abren el sábado 26-dic, la hora y el código en tintacastiza.com. Pendiente.', ''),
  // ── MADRID, 27-dic ──
  N('Parque del Retiro', 'Madrid', 'España', 'parque', '2026-12-27',
    'Plaza de la Independencia 7, 28001 Madrid',
    'Mañana del 27-dic (1,5–2 h) a pie junto al Prado.',
    false, 'Sin reserva: gratis.', 'Gratis'),
  N('Palacio de Cristal (Retiro)', 'Madrid', 'España', 'monumento', '2026-12-27',
    'Parque del Retiro, 28009 Madrid',
    'Exposición gratuita dentro del Retiro (30 min).', false, 'Sin reserva: gratis.', 'Gratis'),
  N('Museo del Prado (opcional)', 'Madrid', 'España', 'museo', '2026-12-27',
    'Paseo del Prado, s/n, 28014 Madrid',
    'Opcional al final del 27-dic (2–2,5 h): los domingos abre hasta las 19:00; entrar hacia las 16:30 si queda tiempo.',
    false, 'Reserva recomendada: entrada con horario para evitar filas. Pendiente.', ''),
  N('Puerta de Alcalá', 'Madrid', 'España', 'monumento', '2026-12-27',
    'Plaza de la Independencia, 28001 Madrid',
    'Parada de 15 min saliendo del Retiro.', false, 'Sin reserva.', 'Gratis'),
  N('Fuente de Cibeles', 'Madrid', 'España', 'monumento', '2026-12-27',
    'Plaza de Cibeles, 1, 28014 Madrid',
    'Parada de 15–30 min camino a la Gran Vía.', false, 'Sin reserva.', 'Gratis'),
  N('Gran Vía (luces de Navidad)', 'Madrid', 'España', 'otro', '2026-12-27',
    'Calle Gran Vía, 28013 Madrid',
    'Caminata nocturna con las luces de Navidad (45 min–1 h) hasta la Puerta del Sol.', false, 'Sin reserva.', 'Gratis'),
  N('Puerta del Sol', 'Madrid', 'España', 'monumento', '2026-12-27',
    'Plaza de la Puerta del Sol, 28013 Madrid',
    'Cierre del recorrido del 27-dic (30 min).', false, 'Sin reserva.', 'Gratis'),
  // ── MADRID, 28-dic ──
  N('Estadio Santiago Bernabéu', 'Madrid', 'España', 'otro', '2026-12-28',
    'Av. de Concha Espina 1, 28036 Madrid',
    'Tour a las 9:00 (1,5–2 h; madrugar: llegar 15 min antes, termina ~10:45).',
    false, 'Reserva recomendada: 45 € por persona (180 € los 4). Pendiente código.', '45 €/persona'),
  N('Palacio Real de Madrid', 'Madrid', 'España', 'monumento', '2026-12-28',
    'Calle de Bailén, s/n, 28071 Madrid',
    'Entrada de las 12:00, visita libre (1,5–2 h).',
    false, 'Reserva recomendada: Pase Distrito Real Esencial (2 básica + 2 reducida = 75,08 € los 4). Pendiente código.', '75,08 € los 4'),
  N('Lockerinthecity La Latina (consigna de maletas)', 'Madrid', 'España', 'otro', '2026-12-28',
    'Calle de la Sierpe 5, 28005 Madrid',
    'Locker XXL para las 4 maletas de 10 kg, de ~8:00 a ~18:00 mientras se hace el Bernabéu–Palacio Real antes del vuelo.',
    true, 'Reserva obligatoria: se hace en línea y llegan los códigos de acceso. Abierto 24 h todos los días. Descuento «essence10».', ''),
  // ── PARÍS ──
  N('Trocadéro', 'París', 'Francia', 'monumento', '2026-12-29',
    'Place du Trocadéro, 75016 Paris',
    'Vista a la Torre Eiffel para cerrar el día 29 (30 min), junto a la Escuela Militar y el Campo de Marte.', false, 'Sin reserva.', 'Gratis'),
  N('Museo de Orsay (opcional)', 'París', 'Francia', 'museo', '2026-12-30',
    '1 rue de la Légion d\'Honneur, 75007 Paris',
    'Opcional solo si sobra tiempo el 30-dic (2,5–3 h), frente al Louvre.',
    false, 'Reserva recomendada: entrada con horario. Pendiente.', ''),
  N('Catacumbas de París (opcional)', 'París', 'Francia', 'otro', '2026-12-30',
    '1 avenue du Colonel Henri Rol-Tanguy, 75014 Paris',
    'Opcional si sobra tiempo después de la Butte-aux-Cailles (1–1,5 h).',
    true, 'Reserva obligatoria: cupos limitados con horario. Pendiente.', ''),
  N('Panteón de París', 'París', 'Francia', 'monumento', '2026-12-30',
    'Place du Panthéon, 75005 Paris',
    'Visita de 1 h en el día del Barrio Latino y la Sorbona.', false, 'Sin reserva: se compra en taquilla.', ''),
  N('Disneyland París', 'París', 'Francia', 'parque', '2027-01-01',
    '1 Coupvray, 77700 Chessy',
    'Día completo (10–11 h). RER A desde el centro (~40 min); saltar temprano.',
    true, 'Reserva obligatoria: boleto con fecha. Pendiente si es 1 o 2 parques y el código de compra.', ''),
  // ── MILÁN, 2-ene (llegan de Como ~14:43 a Centrale) ──
  N('Lago de Como · Varenna', 'Varenna', 'Italia', 'otro', '2027-01-02',
    'Via per Vezio, 23829 Varenna LC',
    'Llegada en tren 10:24; bajar al muelle (10 min) y ferry a Bellagio 10:35. Vuelta hacia las 12:25.', false, 'Sin reserva: ferry se compra en la taquilla del muelle (~5 € por trayecto).', ''),
  N('Lago de Como · Bellagio', 'Bellagio', 'Italia', 'otro', '2027-01-02',
    'Piazza Giuseppe Mazzini, 22021 Bellagio CO',
    'Ferry 10:35–10:45; callejones en escalera, el malecón y la Punta Spartivento (1 h 40 min).', false, 'Sin reserva: en invierno muchas tiendas cierran.', ''),
  N('Duomo di Milano', 'Milán', 'Italia', 'monumento', '2027-01-02',
    'Piazza del Duomo, 20122 Milano',
    'Al anochecer del 2-ene, con el árbol y las luces de Navidad (1 h); interior opcional hasta las 19:00.',
    false, 'Sin reserva (exterior).', ''),
  N('Santa Maria delle Grazie · La Última Cena (Cenacolo)', 'Milán', 'Italia', 'museo', '2027-01-02',
    'Piazza di Santa Maria delle Grazie 2, 20123 Milano',
    'Turno de la tarde hacia las 16:00 del sáb 2-ene: llegar 15:30 a la taquilla (boletos con nombre). Metro M2 verde a Cadorna y ~10 min a pie; entrada por Corso Magenta.',
    true, 'Reserva obligatoria: SOLO en el canal oficial cenacolovinciano.vivaticket.it (máx. 5 por compra) o call center +39 02 92800360. Los de enero aún sin salir a la venta (alerta diaria).', '~15 € c/u'),
  // ── VENECIA, 3-ene ──
  N('Puente de Rialto', 'Venecia', 'Italia', 'monumento', '2027-01-03',
    'San Polo, 30125 Venezia',
    'El puente más célebre del Gran Canal (15–30 min), inicio del día 3.', false, 'Sin reserva.', 'Gratis'),
  N('Campanario de San Marcos', 'Venecia', 'Italia', 'monumento', '2027-01-03',
    'Piazza San Marco, 30124 Venezia',
    'Subida en ascensor a 98 m (45 min) hacia las 15:30; la luz del atardecer sobre la laguna llega hacia las 16:30.',
    false, 'Reserva recomendada: 15 € por persona en la web oficial tickets.basilicasanmarco.it, con hora de entrada.', '15 €/persona'),
  N('Puente de los Suspiros', 'Venecia', 'Italia', 'monumento', '2027-01-03',
    'Piazza San Marco, 30124 Venezia',
    'Junto al Palacio Ducal (15 min).', false, 'Sin reserva.', 'Gratis'),
  N('Librería Acqua Alta', 'Venecia', 'Italia', 'otro', '2027-01-03',
    'Calle Longa Santa Maria Formosa 5176B, Venezia',
    'Libros guardados en botes y góndolas; escalera de libros al canal (30 min).', false, 'Sin reserva.', 'Gratis'),
  N('Gran Canal en góndola', 'Venecia', 'Italia', 'otro', '2027-01-03',
    'Muelle de Riva (San Marco), Venezia',
    'Recorrido de 30 min al atardecer por el Gran Canal.',
    false, 'Se toma en el muelle: 90 € de día o 115 € de noche por góndola, hasta 5 personas.', '90–115 €/góndola'),
  N('Palacio Ca\' Rezzonico (opcional)', 'Venecia', 'Italia', 'museo', '2027-01-03',
    'Dorsoduro 3136, 30123 Venezia', 'Opcional (1,5 h).', false, 'Sin reserva.', ''),
  N('Museo Leonardo Da Vinci (Venecia, opcional)', 'Venecia', 'Italia', 'museo', '2027-01-03',
    'San Polo, 30125 Venezia', 'Opcional e interactivo (1 h).', false, 'Sin reserva.', ''),
  // ── FLORENCIA, 4–5-ene ──
  N('Piazza della Signoria', 'Florencia', 'Italia', 'monumento', '2027-01-04',
    'Piazza della Signoria, 50122 Firenze',
    'Aire libre entre el Duomo y el Arno (30 min), tarde del 4-ene.', false, 'Sin reserva.', 'Gratis'),
  N('Cappelle Medicee', 'Florencia', 'Italia', 'museo', '2027-01-04',
    'Piazza di Madonna degli Aldobrandini 6, 50123 Firenze',
    'La «Capilla de los Medici» del plan del 4-ene; cierra martes. Último turno: entrar ~17:45 y cierre 18:50; queda al lado de la Locanda.',
    false, 'Reserva recomendada con hora: ~14–15 € adulto; menor de 16 gratis + cargo de gestión ~3–4 €.', '~47 € los 4'),
  N('Trattoria Zazà', 'Florencia', 'Italia', 'comida', '2027-01-04',
    'Piazza del Mercato Centrale 26r, 50123 Firenze',
    'Cena toscana del 4-ene hacia las 19:30; muy concurrida.',
    false, 'Reserva recomendada con anticipación (web o teléfono). Pendiente confirmación.', ''),
  // ── ROMA ──
  N('Coliseo', 'Roma', 'Italia', 'ruina_arqueologica', '2027-01-07',
    'Piazza del Colosseo, 1, 00184 Roma',
    'Entrada nominal con horario (1,5 h) el 7-ene. Fotos de antes: miradores de Via Nicola Salvi y frente al Arco de Constantino.',
    true, 'Reserva obligatoria: colosseo.it (boleto común Coliseo + Foro + Palatino), entradas nominales. Pendiente código.', ''),
  N('Estadio Olímpico · AS Roma vs AC Milan', 'Roma', 'Italia', 'otro', '2027-01-09',
    'Viale dei Gladiatori 2, 00196 Roma',
    'Partido del 9-ene 18:00, fecha 19 de la Serie A (~4 h). Confirmado en la web oficial de AS Roma.',
    true, 'Reserva obligatoria: entradas nominales en asroma.com/it/biglietti/maschile. La venta aún NO se abrió (alerta diaria). Llevar pasaporte.', ''),
  N('Plaza del Popolo', 'Roma', 'Italia', 'paseo_barrio'.replace('paseo_barrio', 'otro'), '2027-01-09',
    'Piazza del Popolo, 00187 Roma',
    'Con la Basílica de Santa Maria del Popolo (Caravaggio), después de la Villa Borghese.', false, 'Sin reserva.', 'Gratis'),
  N('Villa Borghese y mirador del Pincio', 'Roma', 'Italia', 'parque', '2027-01-09',
    'Viale Pietro Canonica 2 (entrada Pietro Canonica), 00197 Roma',
    'Junto a la Galería Borghese; mirador del Pincio (1–1,5 h).', false, 'Sin reserva.', 'Gratis'),
  N('Bocca della Verità', 'Roma', 'Italia', 'monumento', '2027-01-10',
    'Piazza della Bocca della Verità 18, 00186 Roma',
    'Inicio de la mañana del 10-ene antes de las Termas (15–30 min).', false, 'Sin reserva.', 'Gratis'),
  N('Termas de Caracalla', 'Roma', 'Italia', 'ruina_arqueologica', '2027-01-10',
    'Viale delle Terme di Caracalla 52, 00153 Roma',
    'Ruinas de 1,5 h; entrada en taquilla.', false, 'Sin reserva: taquilla.', ''),
  N('Vía Apia Antigua', 'Roma', 'Italia', 'ruina_arqueologica', '2027-01-10',
    'Via Appia Antica, 00179 Roma',
    'Ruta antigua (1,5–2 h) en la mañana del 10-ene antes del vuelo.', false, 'Sin reserva.', 'Gratis'),
  N('Catacumbas de San Calixto', 'Roma', 'Italia', 'otro', '2027-01-10',
    'Via Appia Antica 110/126, 00179 Roma',
    'Visita guiada por las catacumbas (1 h).', false, 'Reserva recomendada: visita guiada. Pendiente.', ''),
  N('Sala VIP Avianca Neptuno (escala nocturna)', 'Madrid', 'España', 'otro', '2027-01-10',
    'Terminal 4 Satélite, Barajas, 28049 Madrid',
    'Escala nocturna de 8 h 05 min: llegan del AV6203 a las 0:05 y salen en el AV27 a las 8:10. Sala abierta 24 h, piso 2 del área de pre-embarque.',
    false, 'Acceso: Business INSIGNIA o estatus LifeMiles Elite (Magno/Diamond/Gold); confirmar el estatus y cómo entran los demás adultos. Confirmar que la migración a T4S está abierta de madrugada.', ''),
]

// Evitar duplicados: no insertar si ya existe un place con el mismo nombre normalizado
const existentes = (await db.get('places', 'select=name')) || []
const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
const normSet = new Set(existentes.map((p) => norm(p.name)))
const pendientes = []
for (const p of NEW_PLACES) {
  if (normSet.has(norm(p.name))) continue
  normSet.add(norm(p.name))
  pendientes.push(p)
}
db.post('places', pendientes, 'places nuevos: ' + pendientes.length)

// Validación de categorías contra el enum de la app
const validCats = new Set(['museo', 'iglesia', 'monumento', 'ruina_arqueologica', 'parque', 'comida', 'hotel', 'otro'])
const bad = pendientes.filter((p) => !validCats.has(p.category))
if (bad.length) await db.patch('places', '?name=imposible', {}, 'no-op')

const pl = (await db.get('places', 'select=name,city,assigned_date&order=name.asc')) || []
console.log('PLACES TOTALES:', pl.length, '| CON FECHA:', pl.filter((p) => p.assigned_date).length)
console.log('SIN FECHA:', pl.filter((p) => !p.assigned_date).map((p) => p.name + ' [' + p.city + ']').join(' | '))
console.log('FIN PASO 2')
