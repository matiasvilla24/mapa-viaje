// Incorpora la lista de curiosidades/lugares del usuario:
//  1) EXPANSIONS: filas EXISTENTES a las que se añade texto en description/highlights.
//  2) NEW PLACES: lugares que NO existían y se crean (assigned_date = null).
// Uso: node scripts/merge-user-places.mjs
import { client } from './helper-rest.mjs'

const db = client()
const TAG = '[merge-user-places]'

// ─────────────────────────────────────────────────────────────
// 1) Ampliaciones sobre lugares que YA existen (por substring del nombre)
// ─────────────────────────────────────────────────────────────
const EXPANSIONS = [
  {
    match: 'Basílica de San Pedro',
    addDescription:
      ' Curiosidades: aquí están la Piedad de Miguel Ángel (1499, tras el vidrio a la derecha de la entrada), la Cátedra de San Pedro de Bernini suspendida bajo el vitral de la Paloma del Espíritu Santo, la tumba de Alejandro VII —un esqueleto de la Muerte asomando por una cortina de bronce con reloj de arena y daga— y la estatua vaticana de San Pedro con los pies gastados por siglos de besos de peregrinos.',
  },
  {
    match: 'Coliseo',
    addDescription:
      ' Curiosidad: en un arco del anillo exterior hay una pintura al fresco con una "vista de Jerusalén" (mapa de la ciudad santa documentado desde el s. XVI), asociada a los Via Crucis de peregrinos cristianos: se busca cerca del crucifijo y las inscripciones de la construcción de Constanza.',
  },
  {
    match: 'Duomo di Milano',
    addDescription:
      ' Curiosidad: bajo el altar mayor cuelga el Reliquiario del Santo Chiodo — uno de los clavos de la Cruz de Jesús, guardado en un cristal suspendido a varios metros de altura dentro de una "máquina" que sube y baja cada 14 de septiembre. Es visible desde el altar; el resto (terrazas, vitrales) tiene entradas aparte.',
  },
  {
    match: 'Basilica di San Giovanni in Laterano',
    addDescription:
      ' Curiosidad: el Baptisterio Lateranense anexo (San Giovanni in Fonte, s. IV–V) es el PRIMER baptisterio del cristianismo: octogonal, con la pila central de porfirio donde se bautizaba por inmersión total, mosaicos paleocristianos y columnas de recuperación romana. Gratis y casi siempre vacío.',
  },
  {
    match: 'Caffetteria Italia al Vittoriano',
    addDescription:
      ' TIP: su terraza da un mirador gratis de los Foros Imperiales y el Coliseo desde arriba — mejor relación esfuerzo/vista de Roma sin pagar el ascensor del Vittoriano.',
  },
  {
    match: "Chiesa di Sant\\'Ignazio di Loyola",
    addDescription:
      ' Curiosidad extra: el falso domo de Pozzo solo funciona UN punto de vista concreto (marcado con un disco de bronce en el suelo): si te desvías un metro la perspectiva "se rompe" — es el truco trompe-l\'œil más famoso del mundo y el espejo permite apreciar el techo sin tortícolis.',
  },
  {
    match: 'Plaza del Popolo',
    addDescription:
      ' Curiosidad: en el pórtico curvo de la piazza funciona un efecto acústico tipo "muro del susurro": si susurras apoyado en el muro en un extremo, alguien al otro extremo lo oye nítido sin que el resto lo escuche. Experimento barroco que casi ningún turista conoce.',
  },
  {
    match: 'Palazzo Barberini',
    addDescription:
      ' Curiosidad: las TRES ABEJAS de la Barberini están escondidas por toda Roma (hay guía aparte en la app); aquí además se guarda el segundo "Judith beheada Holofernes" de Caravaggio y una de las dos únicas escaleras helicoidales de Borromini.',
  },
  {
    match: 'Basílica de Santa María la Mayor',
    addDescription:
      ' Curiosidad: junto al altar está la tumba del papa Inocencio VIII de Antonio del Pollaiuolo — única tumba papal en Roma con doble efigie: el papa vivo de rodillas abajo y el muerto recostado arriba.',
  },
  {
    match: 'Galleria Borghese',
    addDescription:
      ' Detalles a buscar: en Apolo y Dafne los dedos de Dafne se convierten en laurel con hojas y corteza visibles, y en el Rapto de Proserpina la mano de Plutón "hunde" el mármol de la piel — Bernini conseguía el efecto con presión y pulido milimétricos. Reserva horaria obligatoria con semanas de antelación.',
  },
  {
    match: 'Iglesia de San Luis de los Franceses',
    addDescription:
      ' TIP: el ciclo de Caravaggio (Vocación, Martirio y San Mateo y el ángel) se ilumina insertando €1 en la caja — acércate al mediodía: con luz natural ya no hace falta pagar y el clima da color más "real" a los lienzos.',
  },
  {
    match: 'Torre Eiffel',
    addDescription:
      ' Punto de vista clásico: el Trocadéro (esplanade du Trocadéro) da la foto del amanecer mejor gratis; de noche, el chapiteau del Champ de Mars para el parpadeo completo de 5 minutos al filo de cada hora.',
  },
  {
    match: 'Museo del Louvre',
    addDescription:
      ' Curiosidad: la pirámide de vidrio de I. M. Pei tiene exactamente 673 rombos y 118 triángulos de vidrio; la pirámide INVERTIDA del Carrousel (la de El código da Vinci) se ve desde la galería subterránea del centro comercial.',
  },
  {
    match: 'Museo Rodin',
    addDescription:
      ' Curiosidad: "El Pensador" se llamaba originalmente "El Poeta" y representaba a Dante sentado sobre las Puertas del Infierno; también en el jardín está "La Catedral" (dos manos derechas entrelazadas, oda a la artesanía).',
  },
  {
    match: 'Ópera de París (Palais Garnier)',
    addDescription:
      ' Curiosidades: el techo de la sala lo pintó Marc Chagall en 1964 debajo del clásico dorado y la araña de 8 toneladas; bajo el edificio hay un TANQUE DE AGUA real (el "lago" que inspiró El fantasma de la ópera) que hoy usan los bomberos. Se visita interior de día sin función: escalera de mármol + Grand Foyer dorado.',
  },
  {
    match: 'Basilica di San Giovanni in Laterano',
    addHighlights: '',
  },
]

// ⚠ Filas que deben quedar por código (no se eliminan): la "opcional" del Louvre,
// la trocadéro de la app y el "Panteón de París" ya existen y tienen sus datos.

// ─────────────────────────────────────────────────────────────
// 2) Lugares nuevos (assigned_date = null)
// ─────────────────────────────────────────────────────────────
const NEW_PLACES = [
  // ── PARÍS ──
  { name: 'Bourse de Commerce (Pinault Collection)', city: 'París', country: 'Francia',
    lat: 48.86295, lng: 2.34498, category: 'museo',
    description: 'Museo de arte contemporáneo de la colección Pinault (Murakami, Koons, Arte Povera) diseñado por Tadao Ando (2020): un gran cilindro de hormigón insertado dentro de la rotonda de la antigua Bolsa de Comercio de París (1889).',
    highlights: 'Cilindro de hormigón de Ando dentro de la rotonda de la bolsa, cúpula de vidrio histórica, colección Pinault.',
    opening_hours: 'Típicamente Mié–Lun ~11:00–19:00 (martes cerrado). Verificar en boursedecommerce.com.',
    reservation_required: false,
    reservation_notes: 'Entrada ~€15 (verificar).',
    price: '€15 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Musée Albert-Kahn', city: 'París (Boulogne-Billancourt)', country: 'Francia',
    lat: 48.84775, lng: 2.22870, category: 'museo',
    description: 'Museo y jardines de Albert Kahn: 4 ha con jardín japonés (con casa de té), inglés y francés, y el archivo "Les Archives de la Planète" con las primeras fotografías a color del mundo (autochromes de Lumière, 1909–1931).',
    highlights: 'Jardín japonés con casa de té, jardines inglés y francés, museo de las primeras fotos a color (72.000 autochromes).',
    opening_hours: 'Típicamente Mar–Dom ~11:00–18:00 (lunes cerrado). Verificar antes del viaje.',
    reservation_required: false,
    reservation_notes: 'Entrada ~€9. Metro línea 10, Boulogne–Pont de Saint-Cloud.',
    price: '€9 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Fondation Louis Vuitton', city: 'París (Bois de Boulogne)', country: 'Francia',
    lat: 48.87662, lng: 2.26282, category: 'museo',
    description: 'Fundación de arte del grupo LVMH en un edificio de Frank Gehry (2014): 12 "velas" de vidrio curvado en el Bois de Boulogne; exposiciones temporales de gran formato y terrazas con vista al Arco de Triunfo.',
    highlights: 'Arquitectura de Gehry (velas de cristal), terraza superior con vista del Arco, Jardin d\'Acclimatation infantil al lado.',
    opening_hours: 'Típicamente ~10:00–20:00, viernes noches . Verificar antes del viaje.',
    reservation_required: true,
    reservation_notes: 'Reserva online recomendada. ~€16 (verificar). Metro Les Sablons (línea 1).',
    price: '€16 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Petit Palais (Bellas Artes de la Ville de Paris)', city: 'París', country: 'Francia',
    lat: 48.86580, lng: 2.31350, category: 'museo',
    description: 'Museo de Bellas Artes de la ciudad, enfrentado al Grand Palais y junto al Pont Alexandre III (Exposición de 1900): patio-jardín con mosaicos y palmeras, colección desde la antigüedad a 1900 (Boucher, Rembrandt, Rodin, Cézanne, Monet). Colección permanente GRATUITA.',
    highlights: 'Patio-jardín con mosaicos bizantinos y palmeras, escalera monumental, colección gratuita (Rodin, Cézanne, Monet, Rembrandt).',
    opening_hours: 'Típicamente Mar–Dom 10:00–18:00 (lunes cerrado). Verificar antes del viaje.',
    reservation_required: false,
    reservation_notes: 'Permanente gratuita; temporales de pago.',
    price: 'Gratis (permanente)', must_see: false, added_by: 'Precarga' },

  { name: 'Palais de Tokyo', city: 'París', country: 'Francia',
    lat: 48.86345, lng: 2.30135, category: 'museo',
    description: 'Centro de creación contemporánea en el ala del Palais de Nueva York, frente a la Torre Eiffel: grandes salas de hormigón con instalaciones a escala monumental, arte experimental y la menor multitud de los museos "top" de París.',
    highlights: 'Instalaciones contemporáneas a gran escala, terraza con vista de la Torre Eiffel, el Musée d\'Art Moderne de París al lado.',
    opening_hours: 'Típicamente Mar–Dom 12:00–0:00 (medianoche); lunes cerrado. Verificar.',
    reservation_required: false,
    reservation_notes: 'Entrada ~€12 (verificar).',
    price: '€12 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Grand Palais', city: 'París', country: 'Francia',
    lat: 48.86610, lng: 2.31370, category: 'monumento',
    description: 'Palacio de la Exposición de 1900: la Nef central de 45 m de altura bajo bóveda de hierro y vidrio art nouveau; reabierto en 2024 tras obras y sede de grandes exposiciones temporales; en 2024 fue recinto olímpico (esgrima y taekwondo).',
    highlights: 'Nef de 45 m con bóveda de hierro y vidrio, exposiciones temporales de gran formato, junto al Pont Alexandre III.',
    opening_hours: 'Según exposición (típicamente Mié–Lun). Verificar en grandpalais.fr.',
    reservation_required: false,
    reservation_notes: 'Entradas según exposición (~€12–20 — verificar).',
    price: '€12–20 (según exposición — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Musée d\'Orsay', city: 'París', country: 'Francia',
    lat: 48.86000, lng: 2.32660, category: 'museo',
    description: 'El museo del Impresionismo, montado en la antigua estación Gare d\'Orsay (1900): el reloj gigante como pieza museal y las salas con Monet, Renoir, Van Gogh, Manet, Degas; esculturas de Rodin y Maillol; mirador con vista de Montmartre.',
    highlights: 'Impresionismo en el 5º piso (Monet, Van Gogh, Manet, Degas, Renoir), reloj de la estación, esculturas de Rodin, vista de Montmartre.',
    opening_hours: 'Típicamente Mar–Dom 9:30–18:00 (jueves hasta 21:45); lunes cerrado. Verificar en musee-orsay.fr.',
    reservation_required: true,
    reservation_notes: 'Reserva horaria online recomendada (se agota). ~€16 (verificar).',
    price: '€16 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'La Défense + Grande Arche', city: 'París', country: 'Francia',
    lat: 48.89000, lng: 2.23700, category: 'monumento',
    description: 'El distrito de rascacielos al oeste, alineado con el eje histórico: la Grande Arche de von Spreckelsen (1989), un cubo hueco de 110 m; esplanada con esculturas de Miró, Calder y Moore y skyline de vidrio. Cambio total de ritmo respecto del centro.',
    highlights: 'Grande Arche (cubo hueco de 110 m), esplanada con esculturas contemporáneas, vista nocturna del skyline.',
    opening_hours: 'Esplanade siempre accesible; subir al Arche (~€15) con reserva si está abierto.',
    reservation_required: false,
    reservation_notes: 'Gratis pasear. Metro M1/RER A a 6 min del Arco de Triunfo.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: "Noisy-le-Grand — Espaces d'Abraxas (Bofill)", city: 'París (Noisy-le-Grand)', country: 'Francia',
    lat: 48.84240, lng: 2.54773, category: 'monumento',
    description: 'Conjunto habitacional postmoderno de Ricardo Bofill (1982) en hormigón rosado: el Théâtre (semicírculo teatral), el Arche (arcada de 12 pisos) y el Palacio; apariencia de "ciudad de ciencia ficción" usada en The Hunger Games.',
    highlights: 'Théâtre, Arche y Palacio de Bofill en hormigón rosado, fotogenia brutalista total, RER A a ~25 min.',
    opening_hours: 'Siempre accesible (espacio público).',
    reservation_required: false,
    reservation_notes: 'Gratis; RER A a Noisy-Champs + 10 min a pie.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Montmartre y Sacré-Cœur', city: 'París', country: 'Francia',
    lat: 48.88640, lng: 2.34250, category: 'otro',
    description: 'La colina de los artistas: calles empedradas, la escalera Rue Foyatier, Place du Tertre con retratistas, viñedos, Place Dalida, el mur des je t\'aime ("te amo" en 250 idiomas) y la basílica blanca del Sacré-Cœur con vista panorámica sobre París.',
    highlights: 'Sacré-Cœur, Place du Tertre, escaleras y teleférico, viñedos, muro de los te amo, café des 2 Moulins (Amélie).',
    opening_hours: 'Barrio siempre accesible; Sacré-Cœur 6:30–22:30 (gratis; cúpula aparte).',
    reservation_required: false,
    reservation_notes: 'Gratis; calzado cómodo: calles empinadas.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Paseo por las orillas del Sena', city: 'París', country: 'Francia',
    lat: 48.85570, lng: 2.35190, category: 'otro',
    description: 'Las suas del Sena, Patrimonio de la Humanidad: caminar de Notre-Dame al Trocadéro por los quais — buquinistas (cajas verdes de libros), artistas en los puentes, el Parque de la Muette y el atardecer con la Torre parpadeante. Crucero opcional (bateau mouche).',
    highlights: 'Bouquinistas, Pont des Arts y Pont Alexandre III, atardecer con la Torre Eiffel, cruceros (bateaux mouches).',
    opening_hours: 'Siempre accesible.',
    reservation_required: false,
    reservation_notes: 'Gratis; crucero opcional ~€14–18.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Île Saint-Louis', city: 'París', country: 'Francia',
    lat: 48.85220, lng: 2.35930, category: 'otro',
    description: 'La isla tranquila del Sena: hôtels particuliers del XVII con puertas de hierro, Rue Saint-Louis-en-l\'Île, la heladería Berthillon (desde 1954) y orillas con escalones para sentarse frente al agua. 10 min de Notre-Dame cruzando el Pont Saint-Louis.',
    highlights: 'Berthillon (el helado clásico), Rue Saint-Louis-en-l\'Île, orillas con escalones, vista de Notre-Dame desde el puente.',
    opening_hours: 'Siempre accesible; tiendas en horario comercial.',
    reservation_required: false,
    reservation_notes: 'Gratis; Berthillon cierra en agosto pero se vende en puntos asociados.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: "Musée de l'Orangerie (Nenúfares de Monet)", city: 'París', country: 'Francia',
    lat: 48.86376, lng: 2.32005, category: 'museo',
    description: 'Museo en el Jardin des Tuileries con dos salas ovaladas diseñadas por Monet mismo para sus 8 murales de Nenúfares (las llamó "mi capilla sixtina"); planta baja con colección Walter-Guillaume (Cézanne, Renoir, Picasso, Matisse, Modigliani).',
    highlights: 'Salas ovaladas con luz cenital para los Nenúfares, colección Walter-Guillaume, en el Tuileries.',
    opening_hours: 'Típicamente Mié–Lun 9:00–18:00; martes cerrado. Verificar.',
    reservation_required: false,
    reservation_notes: 'Entrada ~€12,5 (verificar).',
    price: '€12,5 (aprox. — verificar)', must_see: false, added_by: 'Precarga' },

  // ── ROMA ──
  { name: 'Ristorante Pancrazio', city: 'Roma', country: 'Italia',
    lat: 41.89905, lng: 12.47665, category: 'comida',
    description: 'Trattoria histórica (1922) en un callejón a 2 calles del Panteón, con bodega de piedra donde se ven los restos del Estadio de Domiciano (un arco romano cruza la sala). Cocina romana clásica: cacio e pepe, carbonara, saltimbocca.',
    highlights: 'Sótano con arco romano del Estadio de Domiciano visible, platos romanos, ambiente familiar.',
    opening_hours: 'Típicamente 12:00–15:00 y 19:00–23:00. Verificar.',
    reservation_required: true,
    reservation_notes: 'Reservar mesa (la sala del sótano llena; preguntar arriba vs abajo).',
    price: '€€ (pasta €12–18 — verificar)', must_see: false, added_by: 'Precarga' },

  { name: "Sant'Andrea delle Fratte (ángeles de Bernini)", city: 'Roma', country: 'Italia',
    lat: 41.90355, lng: 12.47765, category: 'iglesia',
    description: 'Iglesia donde Bernini dejó sus DOS ángeles originales del puente Sant\'Angelo (los del título de la cruz y la corona de espinas: en el puente hay copias). Aquí también se convirtió San Maximiliano Kolbe bajo una aparición vespertina, y los frescos son de Pozzo.',
    highlights: 'Dos ángeles originales de Bernini del puente, frescos de Pozzo, memoria de Maximiliano Kolbe.',
    opening_hours: 'Típicamente 7:30–19:30. Verificar.',
    reservation_required: false,
    reservation_notes: 'Gratis.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Piazza della Minerva (elefante de Bernini)', city: 'Roma', country: 'Italia',
    lat: 41.89895, lng: 12.47555, category: 'monumento',
    description: 'Plaza tras el Panteón con el obelisco egipcio más pequeño de Roma montado sobre un elefantito de Bernini ("Pulcino della Minerva"). Al lado: Santa Maria sopra Minerva — la única iglesia gótica de Roma, construida sobre un templo de Isis.',
    highlights: 'Elefante+obelisco de Bernini, Santa Maria sopra Minerva (gótica única en Roma), a un paso del Panteón.',
    opening_hours: 'Plaza siempre; iglesia ~7:30–19:00.',
    reservation_required: false,
    reservation_notes: 'Gratis.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Tumba del Papa Alejandro VII (San Pedro)', city: 'Roma (Vaticano)', country: 'Italia',
    lat: 41.90240, lng: 12.45420, category: 'monumento',
    description: 'Monumento funerario de Bernini (1678) en la nave izquierda de la Basílica de San Pedro: la Muerte como esqueleto asoma de una cortina de bronce con el reloj de arena y la daga, flanqueada por la Caridad y la Verdad.',
    highlights: 'Esqueleto de la Muerte con reloj y daga, bronce con cortina, Caridad y Verdad a los lados.',
    opening_hours: 'Igual que la Basílica de San Pedro.',
    reservation_required: false,
    reservation_notes: 'Gratis (dentro de la basílica).',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Cátedra de San Pedro (Cathedra Petri)', city: 'Roma (Vaticano)', country: 'Italia',
    lat: 41.90240, lng: 12.45420, category: 'monumento',
    description: 'El fondo del ábside de San Pedro: la Cátedra de San Pedro de Bernini (1650) suspendida en bronce con los cuatro doctores de la Iglesia (Ambrosio, Agustín, Atanasio, Juan Crisóstomo) y sobre ella la ventanita oval de alabastro con la Paloma del Espíritu Santo bañando de luz el trono.',
    highlights: 'Cátedra de Bernini suspendida con los cuatro doctores, ventana de la Paloma del Espíritu Santo.',
    opening_hours: 'Igual que la Basílica de San Pedro.',
    reservation_required: false,
    reservation_notes: 'Gratis.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Tumba del Papa Inocencio VIII (doble efigie)', city: 'Roma', country: 'Italia',
    lat: 41.89900, lng: 12.47560, category: 'monumento',
    description: 'Monumento del papa Inocencio VIII (c.1498) de Antonio del Pollaiuolo, hoy en la iglesia de San Pietro in Vincoli: única tumba papal de Roma con doble efigie — el papa vivo de rodillas abajo y el deceso recostado arriba. Estaba destinada a San Pedro y se reubicó aquí.',
    highlights: 'Doble efigie del papa (vivo de rodillas + muerto recostado), bronces de Pollaiuolo, en San Pietro in Vincoli junto al Moisés de Miguel Ángel.',
    opening_hours: 'Igual que la Basílica de San Pietro in Vincoli (verificar ~7:00–12:30 / 15:30–19:00).',
    reservation_required: false,
    reservation_notes: 'Gratis (dentro de la basílica).',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Casina delle Civette (casa de las lechuzas)', city: 'Roma', country: 'Italia',
    lat: 41.91105, lng: 12.49695, category: 'monumento',
    description: 'Casa del príncipe Giovanni Torlonia dentro de la Villa Torlonia: un cottage "medievalista" con vitrales de lechuzas del estilo "Marie Louise设计"; tras restaurar en 1919 se convirtió en museo de vidrios y vitrales quirúrgicos — vitrales, murales y detalles de disciplina fantástica.',
    highlights: 'Vitrales de lechuzas, murales, la casa medievalista más curiosa de Roma, dentro de la Villa Torlonia (residencia de Mussolini).',
    opening_hours: 'Típicamente 9:00–19:00; lunes cerrado. Verificar.',
    reservation_required: false,
    reservation_notes: 'Entrada combinada con la Villa Torlonia (~€8–12 — verificar).',
    price: '€8–12 (combinada — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Little London (Piccola Londra)', city: 'Roma', country: 'Italia',
    lat: 41.90505, lng: 12.47655, category: 'otro',
    description: 'Callejón de fachadas victorianas de ladrillo rojo con balcones de hierro y ventanas gemelas cerca de la Plaza del Popolo — parece una calle de Londres en medio de Roma, diseñada tras un viaje del arquitecto del Parlamento de Westminster.',
    highlights: 'Fachadas de ladrillo rojo tipo victoriano, balcones de hierro, 5 min del Popolo.',
    opening_hours: 'Siempre accesible (calles residenciales).',
    reservation_required: false,
    reservation_notes: 'Gratis; respetar vecinos.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Palazzo Zuccari (puerta grutesca)', city: 'Roma', country: 'Italia',
    lat: 41.90710, lng: 12.47700, category: 'monumento',
    description: 'Palazzo del pintor Federico Zuccari (1590–1593) cerca de Trinità dei Monti: la fachada tiene ventanas modeladas como máscaras grutescas con bocas y ojos (el "Muro del Infierno" del paseo barroco). Hoy es la Bibliotheca Hertziana.',
    highlights: 'Ventanas grutescas con máscaras, sede de la Bibliotheca Hertziana, calle Gregoriana bajo Trinità dei Monti.',
    opening_hours: 'Fachada siempre visible; interior por cita bibliotecaria.',
    reservation_required: false,
    reservation_notes: 'Gratis (fachada).',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Quartiere Coppedè', city: 'Roma', country: 'Italia',
    lat: 41.91010, lng: 12.50720, category: 'otro',
    description: 'Microbarrio Art Nouveau de los años 1910–1920 diseñado por Gino Coppedè: el Villino delle Fate (casita de las hadas), arco de "castillo", palacios con mosaicos y fachadas que mezclan gótico veneciano y fantasía. Escondido, silencioso y casi sin turistas.',
    highlights: 'Villino delle Fate, arcos de cuento, fachadas Art Nouveau y medievales, respiro fuera del circuito.',
    opening_hours: 'Siempre accesible (calles residenciales).',
    reservation_required: false,
    reservation_notes: 'Gratis; todo dentro de la vía pública.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: "Sant'Ivo alla Sapienza (cúpula espiralada de Borromini)", city: 'Roma', country: 'Italia',
    lat: 41.89865, lng: 12.47610, category: 'iglesia',
    description: 'Iglesia de Borromini (1660) en el patio de la antigua Universidad: planta compuesta por dos triángulos superpuestos y cúpula helicoidal con espiral que se sigue 360°. El Barroco más extremo de Roma; abre solo algunos días.',
    highlights: 'Planta triangular superpuesta, cúpula espiralada con lanterna, patio de la Sapienza, 2 pasos de San Luigi dei Francesi.',
    opening_hours: 'Suele abrir domingos ~9:00–12:00 y 14:00–19:00. Verificar.',
    reservation_required: false,
    reservation_notes: 'Gratis.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Piazza Navona', city: 'Roma', country: 'Italia',
    lat: 41.89935, lng: 12.47295, category: 'monumento',
    description: 'La gran plaza ovalada de Roma edificada sobre el Estadio de Domiciano: la Fuente de los Cuatro Ríos de Bernini (1651) con el obelisco egipcio, Santa Agnese in Agone de Borromini al fondo y la Fuente del Moro. Bajo el pavimento quedan restos del estadio visitables.',
    highlights: 'Fuente dei Quattro Fiumi (Danubio, Ganges, Nilo, Río de la Plata), Santa Agnese de Borromini, restos del Estadio de Domiciano bajo el suelo.',
    opening_hours: 'Siempre accesible (plaza).',
    reservation_required: false,
    reservation_notes: 'Gratis; museo del estadio bajo la plaza ~€12 si interesa.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Basilica dei Santi Ambrogio e Carlo al Corso', city: 'Roma', country: 'Italia',
    lat: 41.90275, lng: 12.47835, category: 'iglesia',
    description: 'Basílica nacional de los lombardos (1612–1619) en pleno Via del Corso: fachada de Pietro da Cortona, cúpula luminosa y el corazón de Carlos Borromeo en una urna de plata en la cripta. Respiro de silencio entre las tiendas del Corso.',
    highlights: 'Fachada de Pietro da Cortona, cúpula con frescos, corazón de Carlo Borromeo en la cripta.',
    opening_hours: 'Típicamente 7:00–19:00. Verificar.',
    reservation_required: false,
    reservation_notes: 'Gratis.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Piazza di Spagna (Barcaccia y Trinità dei Monti)', city: 'Roma', country: 'Italia',
    lat: 41.90570, lng: 12.48290, category: 'monumento',
    description: 'El corazón comercial de Roma desde el Barroco: la Fontana della Barcaccia de Bernini padre e hijo (una barca hundida tras la crecida del Tíber de 1598), los 135 escalones de la Trinità dei Monti (1723–1726) y las tiendas de la Via dei Condotti.',
    highlights: 'Barcaccia de Bernini, escalinata de la Trinità dei Monti, Via dei Condotti, vista de la cúpula de San Pedro al fondo de los tejados.',
    opening_hours: 'Siempre accesible; prohibido sentarse en la escalera.',
    reservation_required: false,
    reservation_notes: 'Gratis; no sentarse en la escalera (multa ~€400).',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  { name: 'Palazzo di Propaganda Fide (Capilla dei Re)', city: 'Roma', country: 'Italia',
    lat: 41.90190, lng: 12.47835, category: 'monumento',
    description: 'Sede del dicasterio vaticano de misiones en la Piazza di Spagna: la Capilla dei Re de Bernini (1660) con la Adoración de los Reyes Magos en mármoles bicolores, corregida en la fachada por Borromini en 1662. Solo visitable con cita guiada.',
    highlights: 'Capilla dei Re de Bernini con marmolados bicolores, fachada de Borromini.',
    opening_hours: 'Solo con visita guiada en días concretos (verificar / pedir cita).',
    reservation_required: true,
    reservation_notes: 'Pedir cita por email/web oficial. ~€10 (verificar).',
    price: '€10 (visita guiada — verificar)', must_see: false, added_by: 'Precarga' },

  { name: 'Santa Maria in Aracoeli (escalinata del Capitolio)', city: 'Roma', country: 'Italia',
    lat: 41.89390, lng: 12.47695, category: 'iglesia',
    description: 'Iglesia franciscana en la cima del Capitolio: 124 escalones de mármol levantados en 1348 como voto por el fin de la peste, un techo dorado traído tras Lepanto, tabernacles con mosaicos del s. XI–XII y la imagen del "Bambino Gesù" (madera de olivo, s. XV).',
    highlights: 'Escalinata de 124 escalones, techo dorado, mosaicos medievales, Bambino Gesù de madera de olivo.',
    opening_hours: 'Típicamente 9:00–16:30 (invierno). Verificar.',
    reservation_required: false,
    reservation_notes: 'Gratis; la terraza del Vittoriano al lado gratis con ascensor opcional.',
    price: 'Gratis', must_see: false, added_by: 'Precarga' },

  // ── MILÁN (nuevo sub-contenido; el Duomo ya existe y se amplía arriba) ──
  // ── FLORENCIA (el "disco de mármol" ya existe y se amplía arriba) ──
]

// ─────────────────────────────────────────────────────────────
// 3) Ejecución
// ─────────────────────────────────────────────────────────────
console.log(TAG, 'cargando places…')
const rows = await db.get('places', 'select=id,name,description,highlights&order=name')
if (!Array.isArray(rows)) throw new Error('No se pudo leer la tabla')
console.log(TAG, 'places actuales:', rows.length)

// ── 3a) Ampliaciones
let upd = 0
for (const ex of EXPANSIONS) {
  const row = rows.find((r) => r.name.includes(ex.match))
  if (!row) { console.log(TAG, 'NO ENCONTRADO para ampliar:', ex.match); continue }
  const fields = {}
  if (ex.addDescription && !row.description.includes(ex.addDescription.trim().slice(0, 40))) {
    fields.description = (row.description || '') + ' ' + ex.addDescription.trim()
  }
  if (ex.addHighlights) fields.highlights = (row.highlights || '') + ' ' + ex.addHighlights.trim()
  if (!Object.keys(fields).length) { console.log(TAG, 'sin cambios:', row.name); continue }
  const res = await db.patch('places', 'id=eq.' + row.id, fields, row.name)
  if (res) { upd++; console.log(TAG, 'ampliado:', row.name) }
}
console.log(TAG, 'ampliaciones hechas:', upd)

// ── 3b) Lugares nuevos
let inserted = 0
for (const p of NEW_PLACES) {
  const exists = rows.find((r) => r.name.toLowerCase() === p.name.toLowerCase())
  if (exists) { console.log(TAG, 'ya existe:', p.name); continue }
  const res = await db.post('places', [{ ...p, assigned_date: null }], p.name)
  if (res) { inserted++; console.log(TAG, 'insertado:', p.name) }
}
console.log(TAG, 'nuevos insertados:', inserted)
console.log(TAG, 'listo.')
