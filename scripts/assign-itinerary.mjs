// Script one-off: asigna fechas del itinerario fijo + direcciones a los lugares.
// (los datos vienen del Excel "Europa travel.xlsx")
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'mzicekseuzzgnkkkuwix'
const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }

const q = async (sql, label) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log('==', label, '=>', t.length > 30 ? t.slice(0, 200) : 'OK')
}

const ups = [
  // MADRID 26 dic
  ["(name ilike '%Bernabeu%' or name ilike '%bernab%')", '2026-12-26', 'Av. de Concha Espina 1, 28036 Madrid, España'],
  ["(name ilike '%Retiro%')", '2026-12-26', 'Plaza de la Independencia, 7, 28001 Madrid, España'],
  ["(name ilike '%Prado%')", '2026-12-26', 'Paseo del Prado, s/n, 28014 Madrid, España'],
  ["(name ilike '%Alcala%' and city = 'Madrid')", '2026-12-26', 'Plaza de la Independencia, 28001 Madrid, España'],
  ["(name ilike '%Cibeles%')", '2026-12-26', 'Plaza de Cibeles, 1, 28014 Madrid, España'],
  ["(name ilike '%Gran via%' and city = 'Madrid')", '2026-12-26', 'Calle Gran Vía, 28013 Madrid, España'],
  ["(name ilike '%Plaza mayor%' and city = 'Madrid')", '2026-12-26', 'Plaza Mayor, 28012 Madrid, España'],
  ["(name ilike '%Puerta del sol%' and city = 'Madrid')", '2026-12-26', 'Plaza de la Puerta del Sol, 28013 Madrid, España'],
  ["(name ilike '%Palacio real%' and city = 'Madrid')", '2026-12-26', 'Calle de Bailén, s/n, 28071 Madrid, España'],
  // PARIS 28 dic
  ["(name ilike '%Louvre%')", '2026-12-28', 'Rue de Rivoli, 75001 Paris, Francia'],
  ["(name ilike '%tuileries%' or name ilike '%tuyer%')", '2026-12-28', '113 Rue de Rivoli, 75001 Paris, Francia'],
  ["(name ilike '%concord%')", '2026-12-28', 'Place de la Concorde, 75008 Paris, Francia'],
  ["(name ilike '%triunfo%' and city ilike '%par%')", '2026-12-28', 'Place Charles de Gaulle, 75008 Paris, Francia'],
  ["(name ilike '%elysees%' or name ilike '%eliseos%')", '2026-12-28', 'Av. des Champs-Élysées, 75008 Paris, Francia'],
  ["(name ilike '%petit palais%' or name ilike '%peque%o palais%')", '2026-12-28', 'Avenue Winston Churchill, 75008 Paris, Francia'],
  // PARIS 29 dic
  ["(name ilike '%garnier%' or name ilike '%pera%' and city ilike '%par%')", '2026-12-29', "Place de l'Opéra, 75009 Paris, Francia"],
  ["(name ilike '%lafayette%' or name ilike '%lafallette%')", '2026-12-29', '40 Boulevard Haussmann, 75009 Paris, Francia'],
  ["(name ilike '%montmartre%' or name ilike '%mont martre%')", '2026-12-29', 'Place du Tertre, 75018 Paris, Francia'],
  ["(name ilike '%sacre%' and city ilike '%par%')", '2026-12-29', '35 Rue du Chevalier de la Barre, 75018 Paris, Francia'],
  ["(name ilike '%tertre%')", '2026-12-29', 'Place du Tertre, 75018 Paris, Francia'],
  // PARIS 30 dic
  ["(name ilike '%eiffel%')", '2026-12-30', 'Av. Gustave Eiffel, 75007 Paris, Francia'],
  ["(name ilike '%trocadero%' or name ilike '%trocad%')", '2026-12-30', 'Place du Trocadéro, 75016 Paris, Francia'],
  ["(name ilike '%champ%' and city ilike '%par%')", '2026-12-30', 'Av. des Champs-Élysées, 75008 Paris, Francia'],
  ["(name ilike '%escuela militar%' or name ilike '%militaire%')", '2026-12-30', 'Place Joffre, 75007 Paris, Francia'],
  // PARIS 31 dic
  ["(name ilike '%versalles%' or name ilike '%versailles%')", '2026-12-31', "Place d'Armes, 78000 Versailles, Francia"],
  ["(name ilike '%luxemburgo%' or name ilike '%luxembourg%')", '2026-12-31', '75006 Paris, Francia'],
  ["(name ilike '%orsay%')", '2026-12-31', "Esplanade Valéry Giscard d'Estaing, 75007 Paris, Francia"],
  ["(name ilike '%barrio latino%' or name ilike '%latin%')", '2026-12-31', '75005 Paris, Francia'],
  ["(name ilike '%sorbona%' or name ilike '%sorbonne%')", '2026-12-31', '1 Rue Victor Cousin, 75005 Paris, Francia'],
  ["(name ilike '%panth%' or name ilike '%panteon%' and city ilike '%par%')", '2026-12-31', 'Place du Panthéon, 75005 Paris, Francia'],
  ["(name ilike '%notre%')", '2026-12-31', '6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris, Francia'],
  // MILAN 1 ene
  ["(name ilike '%duomo%' and city ilike '%mil%')", '2027-01-01', 'Piazza del Duomo, 20122 Milano, Italia'],
  ["(name ilike '%vittorio emanuele%')", '2027-01-01', 'Piazza del Duomo, 20123 Milano, Italia'],
  ["(name ilike '%scala%')", '2027-01-01', 'Via Filodrammatici, 2, 20121 Milano, Italia'],
  ["(name ilike '%grazie%')", '2027-01-01', 'Piazza di Santa Maria delle Grazie, 20123 Milano, Italia'],
  // VERONA 2 ene
  ["(name ilike '%arena%' and city ilike '%verona%')", '2027-01-02', 'Piazza Bra, 1, 37121 Verona, Italia'],
  ["(name ilike '%puente%' and city ilike '%verona%')", '2027-01-02', 'Ponte Pietra, 37121 Verona, Italia'],
  ["(name ilike '%julieta%' or name ilike '%giulietta%')", '2027-01-02', 'Via Cappello, 23, 37121 Verona, Italia'],
  // VENECIA 3 ene
  ["(name ilike '%san marcos%' or (name ilike '%san marco%' and city ilike '%ven%'))", '2027-01-03', 'Piazza San Marco, 30124 Venezia, Italia'],
  ["(name ilike '%ducal%' or name ilike '%ducale%')", '2027-01-03', 'Piazza San Marco, 1, 30124 Venezia, Italia'],
  ["(name ilike '%canal grande%' or name ilike '%gran canal%')", '2027-01-03', 'Canal Grande, Venezia, Italia'],
  ["(name ilike '%murano%')", '2027-01-03', 'Murano, Venezia, Italia'],
  ["(name ilike '%burano%')", '2027-01-03', 'Burano, Venezia, Italia'],
  ["(name ilike '%acqua alta%')", '2027-01-03', 'Calle Longa Santa Maria Formosa, 5176B, 30122 Venezia, Italia'],
  ["(name ilike '%rezzonico%')", '2027-01-03', 'Dorsoduro 3136, 30123 Venezia, Italia'],
  ["(name ilike '%rialto%')", '2027-01-03', 'Ponte di Rialto, 30125 Venezia, Italia'],
  ["(name ilike '%suspiros%' or name ilike '%sospiri%')", '2027-01-03', 'Ponte dei Sospiri, 30124 Venezia, Italia'],
  ["(name ilike '%leonardo%' and city ilike '%ven%')", '2027-01-03', 'San Polo 3108, 30125 Venezia, Italia'],
  // FLORENCIA 4 ene
  ["(name ilike '%fiore%' or (name ilike '%duomo%' and city ilike '%flore%'))", '2027-01-04', 'Piazza del Duomo, 50122 Firenze, Italia'],
  ["(name ilike '%giotto%' or name ilike '%campanile%')", '2027-01-04', 'Piazza del Duomo, 50122 Firenze, Italia'],
  ["(name ilike '%signoria%' or name ilike '%se%or%a%' and city ilike '%flore%')", '2027-01-04', 'Piazza della Signoria, 50122 Firenze, Italia'],
  ["(name ilike '%vecchio%' or name ilike '%viejo%' and city ilike '%flore%')", '2027-01-04', 'Piazza della Signoria, 50122 Firenze, Italia'],
  ["(name ilike '%uffizi%')", '2027-01-04', 'Piazzale degli Uffizi, 6, 50122 Firenze, Italia'],
  ["(name ilike '%academia%' and city ilike '%flore%' or name ilike '%accademia%')", '2027-01-04', 'Via Ricasoli, 58, 50129 Firenze, Italia'],
  ["(name ilike '%michelangelo%' and city ilike '%flore%')", '2027-01-04', 'Piazzale Michelangelo, 50125 Firenze, Italia'],
  ["(name ilike '%santa croce%')", '2027-01-04', 'Piazza di Santa Croce, 16, 50122 Firenze, Italia'],
  ["(name ilike '%savonarola%' or name ilike '%disco%')", '2027-01-04', 'Piazza del Duomo, 50122 Firenze, Italia'],
  // ROMA 5 ene (Vaticano)
  ["(name ilike '%vatican%')", '2027-01-05', 'Viale Vaticano, 00165 Roma, Italia'],
  ["(name ilike '%sixtina%')", '2027-01-05', 'Viale Vaticano, 00165 Roma, Italia'],
  ["(name ilike '%san pedro%' and city = 'Roma')", '2027-01-05', 'Piazza San Pietro, 00120 Città del Vaticano'],
  ["(name ilike '%augusto%' and city = 'Roma')", '2027-01-05', 'Viale Vaticano, 00165 Roma, Italia'],
  ["(name ilike '%baldaquino%' or (name ilike '%abejas%' and city = 'Roma'))", '2027-01-05', 'Piazza San Pietro / Piazza Barberini (y 8 puntos más — ver descripción), Roma'],
  // ROMA 6 ene (centro antiguo)
  ["(name ilike '%coliseo%' or name ilike '%colosseo%')", '2027-01-06', 'Piazza del Colosseo, 1, 00184 Roma, Italia'],
  ["(name ilike '%foro%' and city = 'Roma' or name ilike '%palatino%')", '2027-01-06', 'Via della Salara Vecchia, 5/6, 00186 Roma, Italia'],
  ["(name ilike '%circo%')", '2027-01-06', 'Via del Circo Massimo, 00186 Roma, Italia'],
  ["(name ilike '%castel%' and city = 'Roma')", '2027-01-06', 'Lungotevere Castello, 50, 00193 Roma, Italia'],
  ["(name ilike '%trevi%')", '2027-01-06', 'Piazza di Trevi, 00187 Roma, Italia'],
  ["(name ilike '%ignazio%' or name ilike '%ignacio%')", '2027-01-06', 'Via del Caravita, 8a, 00186 Roma, Italia'],
  ["(name ilike '%panteon%' and city = 'Roma' or name ilike '%pantheon%' and city = 'Roma' or name ilike '%rotonda%')", '2027-01-06', 'Piazza della Rotonda, 00186 Roma, Italia'],
  ["(name ilike '%navona%')", '2027-01-06', 'Piazza Navona, 00186 Roma, Italia'],
  ["(name ilike '%obeliscos%')", '2027-01-06', '13 puntos por toda Roma (ver descripción del lugar)'],
  ["(name ilike '%spagna%' or name ilike '%espa%a%' and city = 'Roma')", '2027-01-06', 'Piazza di Spagna, 00187 Roma, Italia'],
  // ROMA 7 ene
  ["(name ilike '%pompei%')", '2027-01-07', 'Porta Marina, 80045 Pompei NA, Italia'],
  ["(name ilike '%lateran%' or (name ilike '%giovanni%' and city = 'Roma'))", '2027-01-07', 'Piazza di Porta San Giovanni, 4, 00184 Roma, Italia'],
  // ROMA 8 ene
  ["(name ilike '%tiberina%' or name ilike '%tiber%')", '2027-01-08', 'Isola Tiberina, 00186 Roma, Italia'],
  ["(name ilike '%vittoriano%' or name ilike '%vittorio%' and city = 'Roma')", '2027-01-08', 'Piazza Venezia, 00186 Roma, Italia'],
  ["(name ilike '%bocca%')", '2027-01-08', 'Piazza della Bocca della Verità, 18, 00186 Roma, Italia'],
  ["(name ilike '%trastevere%')", '2027-01-08', 'Trastevere, 00153 Roma, Italia'],
  ["(name ilike '%capitolino%' or name ilike '%campidoglio%')", '2027-01-08', 'Piazza del Campidoglio, 1, 00186 Roma, Italia'],
  ["(name ilike '%termas%' or name ilike '%diocleciano%')", '2027-01-08', 'Viale Enrico De Nicola, 78, 00184 Roma, Italia'],
]

let updated = 0
for (const [cond, date, addr] of ups) {
  const sql = `update public.places set assigned_date = '${date}', address = '${addr.replace(/'/g, "''")}' where ${cond} and assigned_date is null returning name;`
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  const data = await r.json()
  if (Array.isArray(data)) updated += data.length
  else console.log('ERR', cond, JSON.stringify(data).slice(0, 150))
}
console.log('lugares actualizados:', updated)

await q("select count(*) filter (where assigned_date is not null) as con_fecha, count(*) filter (where address is not null) as con_direccion, count(*) as total from public.places;", 'resumen')
