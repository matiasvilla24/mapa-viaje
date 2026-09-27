import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PEOPLE, personColor, personLabel, ITINERARY, fmtDate } from '../constants'
import { dayNotesDb, configured } from '../supabaseClient'

// Conteo de lugares por ciudad (para el bloque de ruta dentro de la agenda)
function useCityCounts(places) {
  return useMemo(() => {
    const c = {}
    places.forEach((p) => { if (p.city) c[p.city] = (c[p.city] || 0) + 1 })
    return c
  }, [places])
}

// Chips de persona (etiquetas azul/amarillo/morado/rojo)
function PersonChips({ tags, tag }) {
  const list = (Array.isArray(tags) && tags.length ? tags : (tag ? [tag] : []))
  if (!list.length) return null
  return (
    <span className="inline-flex gap-1 flex-shrink-0">
      {[...new Set(list)].map((k) => (
        <span
          key={k}
          className="w-2.5 h-2.5 rounded-full inline-block ring-1 ring-white shadow-sm"
          style={{ background: personColor(k) }}
          title={personLabel(k)}
        />
      ))}
    </span>
  )
}

export default function Agenda({ places, onOpen, onOpenCity }) {
  // Notas por día: dónde empieza, termina y se duerme (editables + realtime)
  const [notes, setNotes] = useState({})
  const [editingDate, setEditingDate] = useState(null)
  const [draft, setDraft] = useState({ start_place: '', end_place: '', sleep_place: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try {
        const rows = await dayNotesDb.list()
        setNotes(Object.fromEntries(rows.map((r) => [r.date, r])))
      } catch { /* tabla puede no existir aún */ }
      unsub = dayNotesDb.subscribe((row) => {
        setNotes((cur) => ({ ...cur, [row.date]: row }))
      })
    })()
    return () => unsub()
  }, [])

  const startEdit = (date) => {
    const n = notes[date] || {}
    setDraft({ start_place: n.start_place || '', end_place: n.end_place || '', sleep_place: n.sleep_place || '' })
    setEditingDate(date)
  }

  const saveNote = async (date) => {
    setSaving(true)
    try {
      const saved = await dayNotesDb.save({ date, ...draft, updated_by: 'familia' })
      setNotes((cur) => ({ ...cur, [date]: saved }))
      setEditingDate(null)
    } catch (e) {
      alert('No se pudo guardar: ' + e.message + '\n(Si la tabla day_notes aún no existe, ejecuta migration-personas-budget.sql en Supabase)')
    } finally {
      setSaving(false)
    }
  }

  const cityCounts = useCityCounts(places)

  // Ruta resumida: tramos de vuelo + rango de días por ciudad (ex-Ruta)
  const { routeSteps, routeCityRanges } = useMemo(() => {
    const seen = new Set()
    const cityRanges = {}
    ITINERARY.forEach((d) => {
      if (d.travel) return
      if (!cityRanges[d.city]) cityRanges[d.city] = [d.date, d.date]
      else cityRanges[d.city][1] = d.date
    })
    const steps = ITINERARY.filter((d) => {
      if (seen.has(d.label)) return false
      seen.add(d.label)
      return true
    })
    return { routeSteps: steps, routeCityRanges: cityRanges }
  }, [])

  const { groups, unassigned } = useMemo(() => {
    const byDate = new Map()
    const un = []
    places.forEach((p) => {
      if (!p.assigned_date) { un.push(p); return }
      if (!byDate.has(p.assigned_date)) byDate.set(p.assigned_date, [])
      byDate.get(p.assigned_date).push(p)
    })
    const groups = ITINERARY
      .map((d) => ({
        date: d.date,
        label: d.label,
        city: d.city,
        places: byDate.get(d.date) || [],
      }))
      .filter((g) => g.places.length > 0 || !g.label.startsWith('✈️'))
    // fechas asignadas que no están en el cronograma
    const extra = [...byDate.keys()].filter((d) => !ITINERARY.some((i) => i.date === d))
    extra.forEach((d) => {
      groups.push({ date: d, label: 'Día extra', city: '—', places: byDate.get(d) })
    })
    groups.sort((a, b) => a.date.localeCompare(b.date))
    return { groups, unassigned: un }
  }, [places])

  const PlaceRow = ({ p }) => (
    <button
      onClick={() => onOpen(p)}
      className="w-full text-left flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
    >
      <span
        className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow"
        style={{ background: CATEGORIES[p.category]?.color || CATEGORIES.otro.color }}
      />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className={`font-semibold text-[15px] leading-snug ${p.visited ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</span>
          {p.must_see && <span title="Imperdible">⭐</span>}
          {p.reservation_required && <span title="Requiere reserva" className="text-[11px]">🎟️</span>}
          {p.visited && <span title="Visitado" className="text-[11px]">✅</span>}
          <PersonChips tags={p.interest_tags} tag={p.added_by_tag} />
        </span>
        <span className="block text-xs text-slate-500 truncate">
          {p.city}
          {p.price && p.price !== '—' ? ` · ${p.price}` : ''}
        </span>
      </span>
    </button>
  )

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-3 pb-24">
      <h2 className="text-lg font-bold text-slate-900 mb-0.5">📅 Agenda</h2>
      <p className="text-xs text-slate-500 mb-3">
        {unassigned.length} sin día{configured ? '' : ' · demo'}
      </p>

      {/* Ruta del viaje (antes pestaña Ruta) */}
      <details className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <summary className="px-3.5 py-2.5 flex items-center gap-2 cursor-pointer select-none">
          <span className="text-base">🧭</span>
          <span className="text-sm font-bold text-slate-800 flex-1">Ruta del viaje</span>
          <span className="text-[11px] text-slate-400">ver tramos</span>
        </summary>
        <ol className="relative border-l-2 border-slate-200 ml-6 mr-3 mb-3 mt-1 space-y-4">
          {routeSteps.map((d, i) => {
            const isFlight = d.travel
            const range = routeCityRanges[d.city]
            const count = cityCounts[d.city] || 0
            return (
              <li key={i} className="ml-6">
                <span
                  className={`absolute -left-[11px] w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] ${
                    isFlight ? 'bg-sky-500' : 'bg-emerald-500'
                  }`}
                >
                  {isFlight ? '✈️' : '📍'}
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-500">{fmtDate(d.date)}</span>
                  <span className="font-bold text-slate-900">{d.label}</span>
                </div>
                {!isFlight && range && range[0] !== range[1] && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(range[0])} – {fmtDate(range[1])}</p>
                )}
                {!isFlight && count > 0 && (
                  <button
                    onClick={() => onOpenCity?.(d.city)}
                    className="mt-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full px-2.5 py-0.5 transition-colors"
                  >
                    {count} {count === 1 ? 'lugar' : 'lugares'} en el mapa →
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </details>

      {groups.map((g) => {
        const n = notes[g.date] || {}
        const editing = editingDate === g.date
        return (
          <section key={g.date} className="mb-4">
            <div className="sticky top-0 bg-slate-50/95 backdrop-blur py-1 -mx-1 px-1 z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {fmtDate(g.date)}
                </span>
                <span className="text-xs text-slate-500 flex-1 truncate">{g.label}</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {g.places.length ? `${g.places.length} lug.` : '—'}
                </span>
              </div>
            </div>

            {/* Inicio / fin / dormir del día */}
            {!editing && (
              <div className="ml-1 mb-1.5 flex flex-wrap gap-1.5">
                <button
                  onClick={() => startEdit(g.date)}
                  className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-sky-400 transition-colors flex items-center gap-1"
                  title="Editar inicio, fin y alojamiento del día"
                >
                  {n.start_place ? <span>🌅 <b>{n.start_place}</b></span> : <span className="text-slate-400">🌅 inicio</span>}
                  <span className="text-slate-300">·</span>
                  {n.end_place ? <span>🌇 <b>{n.end_place}</b></span> : <span className="text-slate-400">🌇 fin</span>}
                  <span className="text-slate-300">·</span>
                  {n.sleep_place ? <span>🛏️ <b>{n.sleep_place}</b></span> : <span className="text-slate-400">🛏️ dormir</span>}
                  <span className="text-slate-300 ml-0.5">✏️</span>
                </button>
              </div>
            )}
            {editing && (
              <div className="ml-1 mb-2 bg-white rounded-xl border border-slate-200 shadow-sm p-2.5 space-y-1.5">
                {[
                  ['start_place', '🌅 El día empieza en'],
                  ['end_place', '🌇 El día termina en'],
                  ['sleep_place', '🛏️ Se duerme en'],
                ].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 w-32 flex-shrink-0">{lbl}</span>
                    <input
                      value={draft[k]}
                      onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                      className="flex-1 px-2 py-1 rounded-lg border border-slate-300 text-xs outline-none focus:border-sky-500"
                      placeholder="Ej. hotel Roma, aeropuerto FCO…"
                    />
                  </label>
                ))}
                <div className="flex gap-1.5 pt-0.5">
                  <button onClick={() => setEditingDate(null)} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200">Cancelar</button>
                  <button onClick={() => saveNote(g.date)} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-bold hover:bg-sky-400 disabled:opacity-60">
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {g.places.length === 0 ? (
              <p className="text-xs text-slate-400 pl-5 py-1 italic">Sin lugares aún</p>
            ) : (
              g.places.map((p) => <PlaceRow key={p.id} p={p} />)
            )}
          </section>
        )
      })}

      {unassigned.length > 0 && (
        <section className="mb-4">
          <div className="border-t-2 border-dashed border-slate-300 pt-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-extrabold text-slate-700">📌 Sin día asignado (itinerario libre)</span>
              <span className="text-[11px] font-semibold text-slate-400">{unassigned.length}</span>
            </div>
            {unassigned.map((p) => <PlaceRow key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
