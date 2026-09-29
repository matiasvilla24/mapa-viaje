import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, FLIGHT_LEGS, ITINERARY, fmtDate } from '../constants'
import { accommodationsDb, budgetDb } from '../supabaseClient'

// Buscador interno del viaje: un solo campo que filtra lugares, alojamientos,
// vuelos, días del itinerario e ítems de presupuesto. Ignora acentos y
// mayúsculas; si no hay coincidencias exactas sugiere «¿Te refieres a…?»
// con correcciones por distancia de edición (Levenshtein), como un buscador web.

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Distancia de edición entre dos palabras (DP, O(n·m))
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// Tolerancia de error según largo de la palabra (estilo buscadores web)
const maxDist = (len) => (len <= 3 ? 0 : len <= 5 ? 1 : 2)

// ¿El texto bate la consulta (con subcadena o tolerancia por palabra)?
function matches(text, qWords) {
  const t = norm(text)
  if (!t) return false
  const tokens = t.split(/[^a-z0-9]+/).filter(Boolean)
  return qWords.every((qw) => {
    if (t.includes(qw)) return true // subcadena directa
    return tokens.some((tok) => {
      const d = maxDist(qw.length)
      return d > 0 && tok.length > 2 && Math.abs(tok.length - qw.length) <= d && levenshtein(tok, qw) <= d
    })
  })
}

function Section({ title, children }) {
  return (
    <div className="mb-1.5">
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</div>
      {children}
    </div>
  )
}

const rowCls = 'w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors'

export default function Search({ places, onClose, onSelectPlace, onGoTab }) {
  const [query, setQuery] = useState('')
  const [stays, setStays] = useState([])
  const [budget, setBudget] = useState([])

  // Alojamientos y presupuesto se cargan aquí (App no los tiene en estado)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try { if (alive) setStays(await accommodationsDb.list()) } catch { /* tabla puede no existir */ }
      try { if (alive) setBudget(await budgetDb.list()) } catch { /* idem */ }
    })()
    return () => { alive = false }
  }, [])

  const qWords = useMemo(() => norm(query.trim()).split(/\s+/).filter(Boolean), [query])

  const searchIn = (rows, fieldsOf) =>
    rows.filter((r) => fieldsOf(r).some((f) => matches(f, qWords)))

  const results = useMemo(() => {
    if (!qWords.length) return null
    return {
      places: searchIn(places, (p) => [p.name, p.city, p.country, p.address, p.description, p.highlights, p.notes]),
      stays: searchIn(stays, (r) => [r.name, r.city, r.country, r.booking_ref, r.address, r.url, r.notes]),
      flights: FLIGHT_LEGS.filter((l) => [l.label, l.city_from || l.from, l.city_to || l.to].some((f) => matches(f, qWords)) || matches(fmtDate(l.date), qWords)),
      days: ITINERARY.filter((d) => [d.label, d.city, fmtDate(d.date)].some((f) => matches(f, qWords))),
      budget: searchIn(budget, (r) => [r.label, r.notes]),
    }
  }, [qWords, places, stays, budget])

  const total = results
    ? results.places.length + results.stays.length + results.flights.length + results.days.length + results.budget.length
    : 0

  // Sugerencia «¿Te refieres a…?»: cuando la consulta exacta no da resultados,
  // se relaja la tolerancia (+1 de distancia) y se comparan frases completas
  // contra cada campo buscable; se propone la mejor coincidencia.
  const suggestion = useMemo(() => {
    if (!qWords.length || total > 0) return null
    const candidates = []
    const relax = (text) => {
      const t = norm(text)
      if (!t) return false
      const tokens = t.split(/[^a-z0-9]+/).filter(Boolean)
      return qWords.every((qw) => {
        if (t.includes(qw)) return true
        const d = maxDist(qw.length) + 1
        return tokens.some((tok) => tok.length > 2 && Math.abs(tok.length - qw.length) <= d && levenshtein(tok, qw) <= d)
      })
    }
    const push = (label, action, arr, fieldsOf) => {
      if (label) { candidates.push({ label, action }); return }
      for (const r of arr) {
        const hit = fieldsOf(r).find((fld) => relax(fld))
        if (hit) { candidates.push({ label: hit, action }); break }
      }
    }
    push(places.map((p) => p.name).find((n) => relax(n)), 'place', places, (p) => [p.name])
    if (!candidates.length) {
      push(stays.map((r) => r.name).find((n) => relax(n)), 'stays', stays, (r) => [r.name])
      push(FLIGHT_LEGS.map((l) => l.label).find((n) => relax(n)), 'flights', FLIGHT_LEGS, (l) => [l.label])
      push(ITINERARY.map((d) => d.label).find((n) => relax(n)), 'days', ITINERARY, (d) => [d.label])
      push(budget.map((r) => r.label).find((n) => relax(n)), 'budget', budget, (r) => [r.label])
    }
    return candidates[0] || null
  }, [qWords, total, places, stays, budget])

  const suggest = (s) => {
    if (!s) return
    if (s.action === 'place') {
      const p = places.find((p) => norm(p.name) === norm(s.label))
      if (p) onSelectPlace(p)
    } else {
      const tab = s.action === 'stays' ? 'alojamientos' : s.action === 'days' ? 'agenda' : s.action === 'budget' ? 'presupuesto' : 'vuelos'
      onGoTab(tab)
    }
  }

  return (
    <div className="fixed inset-0 z-[900] flex flex-col bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-3 mt-8 mb-auto max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Campo de búsqueda */}
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-slate-100 flex-shrink-0">
          <span className="text-lg">🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Lugares, hoteles, vuelos, días, presupuesto…"
            className="flex-1 text-[15px] text-slate-800 outline-none placeholder:text-slate-300"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold" aria-label="Cerrar búsqueda">✕</button>
        </div>

        {/* Resultados */}
        <div className="overflow-y-auto thin-scroll px-2 py-2">
          {!qWords.length ? (
            <p className="text-xs text-slate-400 text-center py-8">Escribe para buscar lugares, hoteles, vuelos, días…</p>
          ) : total === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">Sin resultados para «{query.trim()}»</p>
              {suggestion && (
                <button
                  onClick={() => suggest(suggestion)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  ¿Te refieres a <b>{suggestion.label}</b>?
                </button>
              )}
            </div>
          ) : (
            <>
              {results.places.length > 0 && (
                <Section title={`📍 Lugares (${results.places.length})`}>
                  {results.places.map((p) => (
                    <button key={p.id} onClick={() => onSelectPlace(p)} className={rowCls}>
                      <span
                        className="mt-1 w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow"
                        style={{ background: CATEGORIES[p.category]?.color || CATEGORIES.otro.color }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">
                          {p.name} {p.visited && '✅'}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {p.city || '—'}
                          {p.assigned_date ? ` · ${fmtDate(p.assigned_date)}` : ' · sin día'}
                          {p.address ? ` · ${p.address}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </Section>
              )}

              {results.stays.length > 0 && (
                <Section title={`🏨 Alojamientos (${results.stays.length})`}>
                  {results.stays.map((r) => (
                    <button key={r.id} onClick={() => onGoTab('alojamientos')} className={rowCls}>
                      <span className="mt-0.5 text-lg flex-shrink-0">🏨</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {[r.city, r.country].filter(Boolean).join(', ')}
                          {r.booking_ref ? ` · reserva ${r.booking_ref}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </Section>
              )}

              {results.flights.length > 0 && (
                <Section title={`🚄 Vuelos y traslados (${results.flights.length})`}>
                  {results.flights.map((l) => (
                    <button key={l.id} onClick={() => onGoTab('vuelos')} className={rowCls}>
                      <span className="mt-0.5 text-lg flex-shrink-0">{l.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{l.label}</span>
                        <span className="block text-xs text-slate-500">{fmtDate(l.date)}</span>
                      </span>
                    </button>
                  ))}
                </Section>
              )}

              {results.days.length > 0 && (
                <Section title={`📅 Días del viaje (${results.days.length})`}>
                  {results.days.map((d) => (
                    <button key={d.date} onClick={() => onGoTab('agenda')} className={rowCls}>
                      <span className="mt-0.5 text-lg flex-shrink-0">{d.travel ? '✈️' : '📍'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{d.label}</span>
                        <span className="block text-xs text-slate-500">{fmtDate(d.date)} · {d.city}</span>
                      </span>
                    </button>
                  ))}
                </Section>
              )}

              {results.budget.length > 0 && (
                <Section title={`💰 Presupuesto (${results.budget.length})`}>
                  {results.budget.map((r) => (
                    <button key={r.id} onClick={() => onGoTab('presupuesto')} className={rowCls}>
                      <span className="mt-0.5 text-lg flex-shrink-0">💰</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{r.label}</span>
                        {r.notes && <span className="block text-xs text-slate-500 truncate">{r.notes}</span>}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
