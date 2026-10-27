// PASO 1: flights + accommodations según los datos objetivos del repo (App Europa 2026).
import { client } from './helper-rest.mjs'
const db = client()

// ── FLIGHTS: la tabla estaba vacía; se insertan los 11 tramos reales (AOJ4ZK + SEPARADOS) ──
const FLIGHTS = [
  ['mde-mad-25dic', '✈️ Medellín → Madrid (vuelo nocturno)', '25 dic 22:20', '26 dic 13:55', 'AV16 (Avianca)',
    'Reserva AOJ4ZK (Booking.com), ida+vuelta los 4 tramos: COP 19.225.051 (tarifa 15.620.087 + impuestos 3.604.964). Asientos 25K/25J/25G/25F · llegan a Barajas Terminal 4 Satélite (T4S), confirmar en el pasabordo · check-in en línea 24 h antes con el código de reserva · equipaje por persona: artículo personal + maleta de mano 10 kg + maleta de bodega 23 kg (esta última solo al regreso). Salir de casa 18:30, estar en el aeropuerto 19:20.'],
  ['mad-par-28dic', '✈️ Madrid (Barajas) → París (Orly)', '28 dic 20:45', '28 dic 22:50', 'TO4639 (Transavia)',
    'Reserva UEEJTZ (Booking, compra conjunta con el easyJet del 2-ene: COP 3.077.754 en total). Asientos 2B/2C/2D/2E · solo artículo personal (mochila): comprar maleta de mano aparte antes del vuelo · check-in 24 h antes. Antes de volar: Bernabéu 9:00 y Palacio Real 12:00; taxi al aeropuerto con tarifa fija de ~30 €.'],
  ['par-lin-02ene', '✈️ París (Orly) → Milán (Linate)', '2 ene 6:45', '2 ene 8:15', 'U24959 (easyJet)',
    'Reserva KDLKK48 (Booking, compra conjunta con Transavia). Asientos 3B/3C/3D/3E · solo artículo personal; revisar en easyjet.com si los asientos ya incluyen maleta de cabina antes de pagarla · Orly terminal 3 → Linate (terminal única). Llegar a Orly el 1-ene en la tarde (Disney termina temprano) o en la madrugada del 2-ene.'],
  ['lin-var-02ene', '🚆 Milano Centrale → Varenna (Trenord, Lago de Como)', '2 ene 9:20', '2 ene 10:24', 'Trenord 2818',
    'Regreso de Varenna 13:35 (Trenord 2827) → Milano Centrale 14:43. ~7 € por persona por trayecto; comprar en la app Trenord o en máquinas la noche antes. Alternativa: ida 10:20 · regreso 14:35 → 15:43. Confirmar horarios tras el cambio de horario de mediados de diciembre.'],
  ['var-blg-02ene', '⛴️ Varenna → Bellagio (ferry, Lago de Como)', '2 ene 10:35', '2 ene 10:45', 'Ferry Navigazione Laghi',
    'Regreso Bellagio 12:25 → Varenna 12:35 (cruce 10 min). Boleto en la taquilla del muelle (~5 € por persona por trayecto). Confirmar el horario de invierno unos días antes en navigazionelaghi.it.'],
  ['lin-vce-02ene', '🚆 Milano Centrale → Venezia S. Lucia', '2 ene 18:35', '2 ene 21:03', 'Italo 8995',
    'Alternativa: Frecciarossa 9757 de las 19:15, llega 21:42. Comprar con anticipación en italotreno.com o trenitalia.com. Las maletas quedan en la consigna KiPoint de Milano Centrale (Piazza Duca d\'Aosta 1, planta baja de la galería comercial; todos los días 7:00–21:00; ~6 € por maleta las primeras 5 h y 1 € por hora extra) y se recogen justo antes del tren.'],
  ['vce-flo-04ene', '🚆 Venezia S. Lucia → Firenze SMN', '4 ene 12:30', '4 ene 14:35', 'Frecciarossa',
    'Maletas: consigna KiPoint de Santa Lucia (andén 1, junto a la boletería; todos los días 6:00–23:00; ~6 € por maleta) desde las ~8:15, recoger cerca de las 12:00. Murano en la mañana; volver con el vaporetto 4.1 o 4.2 de Murano a Ferrovia.'],
  ['flo-rom-05ene', '🚆 Firenze SMN → Roma Termini', '5 ene 18:00', '5 ene 19:35', 'Frecciarossa',
    'Maletas: plan A guardadas en la Locanda; plan B consigna KiPoint Santa Maria Novella (largo del andén 16; 7:00–21:00). Recoger hacia las 16:45.'],
  ['rom-mad-10ene', '✈️ Roma Fiumicino → Madrid Barajas', '10 ene 21:35', '11 ene 0:05', 'AV6203 (operado por ITA)',
    'Mismo código AOJ4ZK. Sin asientos asignados: se eligen en el check-in (24 h antes). Leonardo Express de Termini al aeropuerto desde ~18:05 (andenes 23–24; 32 min; 14 €/persona o Mini Group 4 personas por 40 €). Llegan a Barajas T2 (operado ITA) y pasan a la T4S. Escala nocturna: Sala VIP Avianca Neptuno, T4S (abierta 24 h; acceso con Business INSIGNIA o LifeMiles Elite — confirmar estatus). Maletas del día: se entregan al anfitrión del Airbnb (plan A) o consigna KiPoint de Roma Termini, Via Giolitti 34, junto al andén 24 (plan B).'],
  ['mad-bog-11ene', '✈️ Madrid Barajas T4S → Bogotá', '11 ene 8:10', '11 ene 12:30', 'AV27 (Avianca)',
    'Reserva AOJ4ZK · asientos 25K/25J/25G/25F · en la puerta a las 7:30 (la noche previa se pasa en la Sala VIP Neptuno, en la misma T4S).'],
  ['bog-mde-11ene', '✈️ Bogotá → Medellín', '11 ene 15:45', '11 ene 16:50', 'AV9324 (Avianca)',
    'Reserva AOJ4ZK · conexión de 3 h 15 min en El Dorado: migración, recoger maletas y volver a entregarlas · asientos 4B/4C/4D/4E · llegada a Medellín el 11-ene a las 16:50. FIN DEL VIAJE.'],
]
await db.remove('flights', 'id=not.is.null', 'flights: borrar todo')
db.post('flights', FLIGHTS.map(([id, label, dep, arr, num, notes]) => ({
  id, label, departure_time: dep, arrival_time: arr, flight_number: num, notes,
})), 'flights insert ' + FLIGHTS.length)

// ── ACCOMMODATIONS ──
const before = (await db.get('accommodations', 'select=id,name,checkin_date,checkout_date,booking_ref&order=checkin_date.asc')) || []
console.log('ACOMODACIONES ANTES:')
for (const a of before) console.log('  ·', a.checkin_date, '→', a.checkout_date, a.name, '[' + (a.booking_ref || '') + ']')

const patches = [
  ['38 Quai Henri 4', {
    name: 'Airbnb París — 38 Quai Henri IV',
    checkin_date: '2026-12-28', checkout_date: '2027-01-02',
    address: '38 Quai Henri IV, 75004 Paris', free_cancellation: true,
    notes: 'Reserva 5 noches (28-dic al 2-ene, ajustadas al itinerario de la App Europa 2026: el vuelo Madrid→París sale el 28 a las 20:45). Código del edificio: 93A04. Cerradura: C1504. WiFi: «Berrebs A Pan AM» (0760706060). Incluye: 1 habitación, 2 camas, 1 baño, internet. Junto al Sena, a pasos de Notre-Dame y del Isla de San Luis. Cancelación gratis hasta el 22-dic a las 15:00. Check-in autónomo con caja de llaves.',
  }],
  ['Salimbecco', {
    checkin_date: '2027-01-04', checkout_date: '2027-01-05',
    address: 'Via Canto dei Nelli 14, 50123 Firenze',
    notes: 'Reserva 1 noche (4 al 5-ene), desayuno e internet incluidos. Confirmación #6433506772, PIN 1102. Cancelación gratis hasta el 30-dic. Al lado de las Cappelle Medicee y a 3 min del Mercato Centrale.',
  }],
  ['Casa Merlo', {
    city: 'Roma', checkin_date: '2027-01-05', checkout_date: '2027-01-10',
    address: 'Via Merulana 117, 00185 Roma',
    notes: 'Reserva 5 noches (5 al 10-ene). Código de puerta: PXQ97A4G. Código de confirmación: HMHEQAJCBQ. Cancelación gratis hasta el 31-dic a las 15:00. Incluye: 2 habitaciones, 3 camas, 2 baños, internet. Ubicación: entre Termini y el Coliseo (Via Merulana 117).',
  }],
]
for (const [match, fields] of patches) {
  await db.patch('accommodations', 'name=ilike.' + db.searchLike(match), fields, 'acc: ' + match)
}

const now = (await db.get('accommodations', 'select=name')) || []
const has = (frag) => now.some((a) => a.name.toLowerCase().includes(frag.toLowerCase()))
const inserts = []
if (!has('almendro') && !has('pz mayor')) {
  inserts.push({
    name: 'Airbnb Madrid — Charming Apartment Pz Mayor / La Latina (Calle del Almendro)', city: 'Madrid', country: 'España',
    booking_ref: 'HMTKFM5JDC', cost: 1692758, cost_currency: 'COP', accommodation_type: 'airbnb', free_cancellation: true,
    checkin_date: '2026-12-26', checkout_date: '2026-12-28', address: 'Calle del Almendro, 28005 Madrid',
    notes: 'Reserva 2 noches, 4 huéspedes (26 al 28-dic). Anfitrión: Carlos Vicente (Familia R. Tellez). COP 1.692.758 total / 846.379 por noche. Check-in desde las 15:00 con caja de seguridad de llaves: avisar la hora de llegada con 2 días de anticipación (se llega de noche, desde El Molar). Check-out 11:00. Cancelación gratis hasta el 21-dic a las 15:00. Sin guardaequipaje: locker Lockerinthecity a 3 min (Calle de la Sierpe 5, descuento «essence10»). Desde Barajas: taxi 25 min (tarifa plana centro 30 €) o metro 8 → Nuevos Ministerios, 10 → Alonso Martínez, 5 → La Latina.',
  })
}
if (!has('cavalletto') && !has('doge orseolo')) {
  inserts.push({
    name: 'Albergo Cavalletto & Doge Orseolo (Venecia)', city: 'Venecia', country: 'Italia',
    booking_ref: 'Agoda 1066356014', cost: 734.84, cost_currency: 'USD', accommodation_type: 'hotel', free_cancellation: false,
    checkin_date: '2027-01-02', checkout_date: '2027-01-04', address: 'Calle del Cavalletto 1107, 30124 Venezia',
    notes: 'Reserva CONFIRMADA (nueva): 2 noches (2 al 4-ene). 694,68 USD + 40,16 USD de tasa municipal al llegar = 734,84 USD; cargo automático a la tarjeta el 28-dic-2026. 2 habitaciones Classic Double or Twin, 4 adultos, titular Carlos Villa. Check-in desde las 14:00, check-out 11:00. WiFi y desayuno incluidos; no fumadores; camas contiguas (sujeto a disponibilidad). Tel. +39 041 520 0955 · cavalletto@sanmarcohotels.com. Cancelación gratis hasta el 29-dic 23:59 (hora de Venecia); desde el 30-dic se cobra el 70 % y desde el 2-ene el 100 %. Llevar el voucher y avisar la llegada (21:00–22:00).',
  })
}
db.post('accommodations', inserts, 'acc nuevas: ' + inserts.map((a) => a.name).join(' · ') || 'ninguna')

const after = (await db.get('accommodations', 'select=name,checkin_date,checkout_date&order=checkin_date.asc')) || []
console.log('ACOMODACIONES DESPUÉS:')
for (const a of after) console.log('  ·', a.checkin_date, '→', a.checkout_date, a.name)
console.log('FIN PASO 1')
