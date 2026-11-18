// Segunda tanda de lugares/curiosidades del usuario:
//  1) NEW_PLACES: los que NO existían en la base (se crean con assigned_date null).
//  2) EXPANSIONS: los que YA existen sin el detalle pedido (se amplía description).
//  3) FIXES: texto corrupto de una ficha previa.
// Idempotente: se puede repetir sin duplicar.
// Uso: node scripts/merge-user-places-2.mjs
import { client } from './helper-rest.mjs'

const db = client()
const TAG = '[merge-2]'

// ─────────────────────────────────────────────────────────────
// 1) Lugares nuevos
// ─────────────────────────────────────────────────────────────
const NEW_PLACES = [
  {
    name: 'Santa Maria del Popolo',
    city: 'Roma',
    country: 'Italia',
    lat: 41.91146,
    lng: 12.47627,
    category: 'iglesia',
    address: 'Piazza del Popolo 12, Roma',
    description:
      'Iglesia agustina del s. XI en el extremo norte de la Piazza del Popolo, reformada por Bregno y Pinturicchio para Sixto IV: tres naves, capillas laterales y un interior que casi nadie mira porque todos pasan camino de la plaza. En la Capilla Chigi (de Rafael) cuelgan dos Caravaggio —la Crucifixión de San Pedro y la Conversión de San Pablo— y en el pavimento, justo al entrar, te recibe un esqueleto con un reloj de arena: el memento mori de la familia Chigi, con la inscripción «Hodie mihi, cras tibi» (hoy a mí, mañana a ti). Detalle: el esqueleto de la Capilla Chigi, de bronce, sujeta el reloj de arena en la mano; se ve desde la puerta.',
    highlights: 'Dos Caravaggios, Capilla Chigi de Rafael, el esqueleto con reloj de arena del suelo y la tumba de la familia Chigi. Gratis.',
    opening_hours: 'Lun–Sáb 7:00–19:00 · Dom 7:30–19:30 (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: 'Gratis (donativo)',
    assigned_date: null,
    added_by: 'Mati',
    notes: 'Con la luz de la tarde los Caravaggio se ven mal: mejor por la mañana.',
  },
  {
    name: 'San Francesco a Ripa',
    city: 'Roma',
    country: 'Italia',
    lat: 41.88533,
    lng: 12.47072,
    category: 'iglesia',
    address: 'Piazza San Francesco d’Assisi 88, Trastevere, Roma',
    description:
      'Iglesia franciscana de Trastevere con la ÚLTIMA escultura de Bernini: la Beata Ludovica Albertoni (1674), en la capilla Paluzzi-Albertoni. El mármol parece tela arrugada, la beata está en éxtasis sobre el lecho, con la mano en el pecho, y la luz entra desde arriba para iluminarle la cara. En la sacristía, el cuarto donde se alojó San Francisco en 1219, con la piedra que usaba de almohada. Casi siempre vacía y gratis.',
    highlights: 'Beata Ludovica Albertoni de Bernini (1674), su última obra, y la habitación de San Francisco con la piedra-almohada.',
    opening_hours: 'Todos los días 7:00–12:00 y 15:00–19:00 (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: 'Gratis',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'San Lorenzo in Damaso',
    city: 'Roma',
    country: 'Italia',
    lat: 41.89638,
    lng: 12.47249,
    category: 'iglesia',
    address: 'Piazza della Cancelleria, Roma',
    description:
      'Basílica paleocristiana fundada por el papa Dámaso I en el s. IV y rehecha por Bramante hacia 1485 dentro del Palazzo della Cancelleria, del que hoy es la capilla privada: se entra por una puerta lateral de la plaza, no por el palacio. Techo de madera dorada, una sola nave amplia y, bajo el altar, la confesión con reliquias de San Lorenzo y San Dámaso; en el ábside, el monumento del cardenal Carvajal. De las iglesias más silenciosas del centro histórico y casi sin turistas.',
    highlights: 'Iglesia escondida dentro del Palazzo della Cancelleria, techo dorado, reliquias de San Lorenzo y San Dámaso. Gratis.',
    opening_hours: 'Lun–Sáb 8:00–12:30 y 16:00–19:00 · Dom mañana (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: 'Gratis',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Villa Torlonia',
    city: 'Roma',
    country: 'Italia',
    lat: 41.91564,
    lng: 12.51062,
    category: 'parque',
    address: 'Via Nomentana 70, Roma',
    description:
      'Villa nobiliaria del s. XIX en la Via Nomentana, comprada por los Torlonia y alquilada a Mussolini por una lira al año entre 1925 y 1943 (vivió en el Casino Nobile). Hoy es un parque público con tres museos: el Casino Nobile (frescos y escuela romana del s. XIX), la Casina delle Civette (el capricho Liberty de vitrales de lechuzas, ficha aparte) y la Serra Moresca restaurada, además de un teatro y unas «ruinas» fingidas de jardín. Debajo del parque están las catacumbas judías de Villa Torlonia (s. II–IV), que solo se ven con visita guiada y cupo limitado.',
    highlights: 'Casino Nobile (casa de Mussolini), Casina delle Civette, Serra Moresca y las catacumbas judías bajo el parque.',
    opening_hours: 'Parque 7:00–anochecer · Museos 9:00–19:00, lunes cerrado (verificar)',
    reservation_required: false,
    reservation_notes: 'Catacumbas judías: reserva aparte y grupos pequeños.',
    price: 'Parque gratis · museos ~€8–12 combinada (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Villa Medici',
    city: 'Roma',
    country: 'Italia',
    lat: 41.90805,
    lng: 12.48219,
    category: 'monumento',
    address: 'Viale della Trinità dei Monti 1, Roma',
    description:
      'Villa del s. XVI en lo alto del Pincio, pegada a Trinità dei Monti, sede de la Academia de Francia en Roma desde 1803 (por ella pasaron pensionados y directores como Balthus). Solo se visita con tour guiado: el jardín a la italiana con la esfera armilar, la loggia con relieves romanos empotrados en el muro, el studiolo de Fernando de Médici con las Musas y la torre desde la que se ven San Pedro y media Roma. En la fachada, los leones de granito de la entrada son piezas romanas auténticas.',
    highlights: 'Academia de Francia, jardín del Pincio, studiolo de los Médici, relieves romanos en la fachada y vistas sobre Roma.',
    opening_hours: 'Visitas guiadas mar–dom en franjas horarias (reservar)',
    reservation_required: true,
    reservation_notes: 'Solo con tour guiado; reservar en villamedici.it con días de antelación.',
    price: '~€12–15 (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Villa Giulia (Museo Nazionale Etrusco)',
    city: 'Roma',
    country: 'Italia',
    lat: 41.91782,
    lng: 12.47772,
    category: 'museo',
    address: 'Piazzale di Villa Giulia 9, Roma',
    description:
      'Villa de recreo del papa Julio III (1551–1553), proyectada por Vignola con Ammannati y Vasari: ninfeo de dos pisos con la Fontana dell’Acqua Vergine, logia de las columnas y jardín. Hoy es el Museo Nazionale Etrusco y guarda el Sarcofago degli Sposi de Cerveteri (s. VI a.C., la pareja etrusca recostada sobre el banquete), el Apolo de Veio, bucchero, joyas y reconstrucciones de templos etruscos. Cierra los lunes y entre semana está casi vacío.',
    highlights: 'Sarcofago degli Sposi, Apolo de Veio, ninfeo de Vignola y jardín del papa Julio III.',
    opening_hours: 'Mar–Dom 8:30–19:30 · Lunes cerrado (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: '€10–13 (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Basílica de Majencio y Constantino (Colosseo di Costantino)',
    city: 'Roma',
    country: 'Italia',
    lat: 41.89174,
    lng: 12.48835,
    category: 'ruina_arqueologica',
    address: 'Via Sacra, Foro Romano, Roma',
    description:
      'La bóveda más grande del Foro: la empezó Majencio en 308 y la terminó Constantino, con tres naves cubiertas por bóvedas de cañón de 25 m de alto y 80 m de largo. Los romanos la llaman «Colosseo di Costantino» por sus arcos gigantes, aunque nunca fue un anfiteatro. En el ábside oeste estaba el Coloso de Constantino, y de ahí salieron la cabeza, la mano y el globo de bronce que hoy se ven en el patio del Palacio de los Conservadores, en el Capitolio. Se ve gratis desde la Via Sacra y desde el Coliseo; con la entrada del Foro se camina por dentro.',
    highlights: 'Bóvedas de 25 m, el «Colosseo di Costantino», el ábside del Coloso y los restos de la estatua en el Capitolio.',
    opening_hours: 'Con el Foro Romano: 8:30–16:30 (última entrada 15:30, verificar)',
    reservation_required: false,
    reservation_notes: 'Entra con la misma entrada del Foro/Coliseo.',
    price: 'Incluida en la entrada del Foro (~€18 — verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Cripta de los Capuchinos (Cripta Cappuccini)',
    city: 'Roma',
    country: 'Italia',
    lat: 41.90462,
    lng: 12.48778,
    category: 'museo',
    address: 'Via Vittorio Veneto 27, Roma',
    description:
      'Bajo la iglesia de Santa Maria della Concezione, en plena Via Veneto: seis salas y un corredor donde están enterrados unos 4.000 frailes capuchinos (1528–1870), ordenados en decoraciones de huesos —lámparas, rosarios, escudos, coronas— sobre tierra traída del Monte Calvario. El cartel del final lo resume: «Lo que vosotros sois, nosotros fuimos; lo que nosotros somos, vosotros seréis». No se permite fotografiar; la entrada incluye audioguía.',
    highlights: 'Osario de 4.000 capuchinos, lámparas y escudos de huesos, el memento mori más impactante de Roma.',
    opening_hours: 'Todos los días 10:00–19:00 (última entrada 18:30 — verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: '~€8–10 con audioguía (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: 'No se puede fotografiar dentro.',
  },
  {
    name: 'Villa Farnesina',
    city: 'Roma',
    country: 'Italia',
    lat: 41.89363,
    lng: 12.46637,
    category: 'museo',
    address: 'Via della Lungara 230, Trastevere, Roma',
    description:
      'Villa de Agostino Chigi, banquero del papa, construida entre 1506 y 1510: la mejor muestra de la Roma de Rafael en una sola planta. En la Logia de Galatea está el Triunfo de Galatea; en la Logia de Amor y Psique, el ciclo de frescos de Rafael y sus discípulos bajo la pérgola de frutas y verduras de Giovanni da Udine (se cuentan más de 160 especies pintadas); en la Sala de las Prospettive, el trampantojo de Peruzzi abre la pared al Tíber. Cierra domingos y las mañanas son tranquilas.',
    highlights: 'Triunfo de Galatea de Rafael, Logia de Amor y Psique, pérgola de Giovanni da Udine y trampantojo de Peruzzi.',
    opening_hours: 'Lun–Sáb 9:00–14:00 · Dom cerrado (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: '€10–12 (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Palazzo Venezia',
    city: 'Roma',
    country: 'Italia',
    lat: 41.89569,
    lng: 12.48205,
    category: 'museo',
    address: 'Piazza Venezia 3 / Via del Plebiscito 118, Roma',
    description:
      'Palacio del cardenal Barbo (luego papa Paulo II), terminado en 1471 con uno de los primeros patios renacentistas de Roma. Hoy es el Museo Nazionale del Palazzo di Venezia: cerámicas, terracotas, marfiles, armas y pinturas, y dentro la Sala del Mappamondo, el despacho de Mussolini cuando fue jefe del gobierno (1929–1943), con el balcón desde el que hablaba a la plaza. La entrada incluye el Palazzetto Venezia y su jardín escondido, con la iglesia de San Marco.',
    highlights: 'Patio renacentista de 1471, Sala del Mappamondo y balcón de Mussolini, colecciones de cerámica y armas, jardín del Palazzetto.',
    opening_hours: 'Mar–Dom 8:30–19:30 (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: '€10–12 (verificar)',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
  {
    name: 'Porte Saint-Denis',
    city: 'París',
    country: 'Francia',
    lat: 48.86968,
    lng: 2.3523,
    category: 'monumento',
    address: 'Rue Saint-Denis con Boulevard Saint-Denis, 10e, París',
    description:
      'Arco triunfal de 1672 de François Blondel, levantado por Luis XIV en el mismo sitio de la puerta medieval de Saint-Denis, sobre el camino que usaban los reyes para entrar en París desde la abadía. Los relieves celebran la toma de Maastricht y el paso del Rin, y arriba está la inscripción «Ludovico Magno». Es gratis, se cruza caminando y de noche se ilumina; a dos calles, la Porte Saint-Martin (1674) sigue en pie también, así que se pueden ver las dos seguidas. Metro Strasbourg–Saint-Denis.',
    highlights: 'Arco de Luis XIV de 1672, relieves de Maastricht y el Rin, gratis, y la Porte Saint-Martin a dos calles.',
    opening_hours: 'Siempre abierto (monumento al aire libre)',
    reservation_required: false,
    reservation_notes: null,
    price: 'Gratis',
    assigned_date: null,
    added_by: 'Mati',
    notes: 'Zona animada de noche; ir con luz de día o al caer el sol.',
  },
  {
    name: 'Metro Louvre–Rivoli (estación decorada)',
    city: 'París',
    country: 'Francia',
    lat: 48.86103,
    lng: 2.34062,
    category: 'otro',
    address: 'Línea 1, Rue de Rivoli, 1er, París',
    description:
      'Estación de la línea 1 abierta en 1900 y redecorada en 1968 como una galería del Louvre bajo tierra: los andenes tienen vitrinas con copias de piezas del museo (antigüedades egipcias, griegas y romanas) y bóvedas iluminadas, sin publicidad. Se ve en el trayecto hacia el Louvre; vale bajar, recorrer el andén y seguir. No cuesta nada extra si ya se viaja en metro.',
    highlights: 'Andenes-museo con vitrinas de copias del Louvre, bóvedas iluminadas y cero publicidad.',
    opening_hours: 'Metro ~5:30–1:00 (verificar)',
    reservation_required: false,
    reservation_notes: null,
    price: 'Incluida en el billete de metro',
    assigned_date: null,
    added_by: 'Mati',
    notes: null,
  },
]

// ─────────────────────────────────────────────────────────────
// 2) Ampliaciones sobre lugares que YA existen
// ─────────────────────────────────────────────────────────────
const EXPANSIONS = [
  {
    match: 'Tumba del Papa Alejandro VII',
    addDescription:
      'Cómo mirarla: el conjunto (Bernini, 1678) es un teatro de mármol en cuatro niveles —el papa Alejandro VII arrodillado arriba, la Caridad y la Verdad a los lados y, abajo, la Muerte: un esqueleto de bronce dorado que asoma bajo una cortina de mármol y levanta un reloj de arena hacia el espectador. Está en el pasillo izquierdo, frente a la nave: se ve desde la fila de la entrada aunque haya gente.',
  },
  {
    match: 'Basílica de San Pedro',
    addDescription:
      'Para no perdérselo: la tumba de Alejandro VII está en el pasillo izquierdo, a media nave, y su esqueleto con reloj de arena —la Muerte saliendo de una cortina de mármol— se ve desde la propia nave sin acercarse. Entrada gratis, pero hay control de seguridad con cola: ir antes de las 9:00 o después de las 16:00.',
  },
  {
    match: 'Museo del Ara Pacis',
    addDescription:
      'Qué mirar: el altar de la Paz de Augusto (13–9 a.C.) reconstruido pieza a pieza, con los bajorrelieves de la procesión imperial —se reconocen Agripa, Livia y los niños de la familia— y el panel de la Tellus (la Tierra con dos niños). El edificio de Richard Meier (2006) tiene el muro de mármol y las ventanas que dejan entrar la luz del oeste; a última hora de la tarde el relieve se ve mejor que a mediodía.',
  },
  {
    match: "Chiesa di Sant'Ignazio di Loyola",
    addDescription:
      'Las salas de atrás: el pasillo que sale de la nave está pintado por Andrea Pozzo con la misma arquitectura fingida del techo, de modo que la iglesia «continúa» por el corredor; al final quedan las habitaciones de San Luis Gonzaga, donde murió en 1591 con 23 años (se conserva el cuarto y objetos suyos). Suelen estar cerradas al público: preguntar en la sacristía o en la portería.',
  },
  {
    match: 'Galleria Borghese',
    addDescription:
      'Y además: la Paolina Borghese de Canova (1808), retratada como Venus Victoriosa con la manzana en la mano, en la planta baja; las telas de Caravaggio (Bacchino malato, David con la cabeza de Goliat, San Jerónimo) y el reloj de la Sala dell’Ercole. Solo se entra con hora reservada y por turnos de dos horas.',
  },
  {
    match: 'Cattedrale di Santa Maria del Fiore',
    addDescription:
      'La cúpula de Brunelleschi: 45 m de luz, levantada entre 1420 y 1436 sin cimbras, con doble cáscara y ladrillo en espina de pez que se aguanta solo; 463 escalones hasta la linterna. La subida tiene entrada aparte (Brunelleschi Pass, con hora) y el recorrido pasa entre las dos cáscaras, junto a los frescos del Juicio Final de Vasari y Zuccari, con vistas a Florencia por las troneras. El resto de la catedral es gratis; reservar la primera franja del día.',
  },
]

// ─────────────────────────────────────────────────────────────
// 3) Arreglos de fichas con texto corrupto
// ─────────────────────────────────────────────────────────────
const FIXES = [
  {
    match: 'Casina delle Civette',
    description:
      'Casa del príncipe Giovanni Torlonia dentro de la Villa Torlonia: un cottage «medievalista» con vitrales de lechuzas y murciélagos de estilo Liberty. Tras la restauración se convirtió en museo del vitral: ventanas, murales y detalles modernistas en todas las habitaciones.',
    highlights: 'Vitrales de lechuzas, murales Liberty y la casa más curiosa de Roma, dentro de la Villa Torlonia (residencia de Mussolini).',
  },
]

// ─────────────────────────────────────────────────────────────
// Ejecución
// ─────────────────────────────────────────────────────────────
const rows = (await db.get('places', 'select=id,name,description,highlights')) || []
console.log(TAG, 'lugares en base:', rows.length)

let upd = 0
for (const ex of EXPANSIONS) {
  const row = rows.find((r) => r.name.includes(ex.match))
  if (!row) { console.log(TAG, 'NO ENCONTRADO para ampliar:', ex.match); continue }
  const add = ex.addDescription.trim()
  if ((row.description || '').includes(add.slice(0, 45))) { console.log(TAG, 'ya ampliado:', row.name); continue }
  const res = await db.patch('places', 'id=eq.' + row.id, { description: (row.description || '') + ' ' + add }, row.name)
  if (res) { upd++; console.log(TAG, 'ampliado:', row.name) }
}
console.log(TAG, 'ampliaciones hechas:', upd)

for (const fx of FIXES) {
  const row = rows.find((r) => r.name.includes(fx.match))
  if (!row) { console.log(TAG, 'NO ENCONTRADO para arreglar:', fx.match); continue }
  if ((row.description || '').trim() === fx.description) { console.log(TAG, 'ya arreglado:', row.name); continue }
  const res = await db.patch('places', 'id=eq.' + row.id, { description: fx.description, highlights: fx.highlights }, row.name)
  if (res) console.log(TAG, 'arreglado:', row.name)
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
let inserted = 0
for (const p of NEW_PLACES) {
  const exists = rows.find((r) => norm(r.name) === norm(p.name))
  if (exists) { console.log(TAG, 'ya existe:', p.name); continue }
  const res = await db.post('places', [{ ...p }], p.name)
  if (res) { inserted++; console.log(TAG, 'insertado:', p.name) }
}
console.log(TAG, 'nuevos insertados:', inserted)
console.log(TAG, 'listo.')
