import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, FLIGHT_LEGS, ITINERARY, fmtDate } from '../constants'
import { accommodationsDb, budgetDb } from '../supabaseClient'

// Buscador interno del viaje: un solo campo que filtra lugares, alojamientos,
// vuelos, días del itinerario e ítems de presupuesto. Ignora acentos y
// mayúsculas y busca en todos los campos de texto relevantes.

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const has = (texts, q) => texts.some((t) => norm(t).includes(q))

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

  const q = norm(query.trim())

  const results = useMemo(() => {
    if (q.length < 2) return null
    return {
      places: places.filter((p) =>
        has([p.name, p.city, p.country, p.address, p.description, p.highlights, p.notes], q),
      ),
      stays: stays.filter((r) =>
        has([r.name, r.city, r.country, r.booking_ref, r.address, r.url, r.notes], q),
      ),
      flights: FLIGHT_LEGS.filter((l) => has([l.label, l.date, fmtDate(l.date)], q)),
      days: ITINERARY.filter((d) => has([d.label, d.city, d.date, fmtDate(d.date)], q)),
      budget: budget.filter((r) => has([r.label, r.notes], q)),
    }
  }, [q, places, stays, budget])

  const total = results
    ? results.places.length + results.stays.length + results.flights.length + results.days.length + results.budget.length
    : 0

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
          {q.length < 2 ? (
            <p className="text-xs text-slate-400 text-center py-8">Escribe al menos 2 letras para buscar…</p>
          ) : total === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Sin resultados para «{query.trim()}»</p>
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
                          {p.name} {p.must_see && '⭐'} {p.visited && '✅'}
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
