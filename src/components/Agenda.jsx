import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PEOPLE, personColor, personLabel, ITINERARY, fmtDate } from '../constants'
import { dayNotesDb, configured } from '../supabaseClient'

// Vista de calendario: rejilla mensual (dic 2026 – ene 2027, navegable) donde
// cada día muestra sus lugares; al tocar un día, debajo se lista su detalle
// (lugares, notas de inicio/fin/dormir y comidas).
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}` }
function isoDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

// Conteo de lugares por ciudad (para el bloque de ruta)
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
  // Notas por día: inicio, fin, dormir y comidas (editables + realtime)
  const [notes, setNotes] = useState({})
  const [editingDate, setEditingDate] = useState(null)
  const [draft, setDraft] = useState({ start_place: '', end_place: '', sleep_place: '', breakfast: '', lunch: '', dinner: '' })
  const [saving, setSaving] = useState(false)

  // Mes visible y día seleccionado en el calendario
  const today = new Date()
  const [ym, setYm] = useState({ y: 2026, m: 11 }) // dic 2026
  const [selectedDate, setSelectedDate] = useState('2026-12-25')

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
    setDraft({
      start_place: n.start_place || '',
      end_place: n.end_place || '',
      sleep_place: n.sleep_place || '',
      breakfast: n.breakfast || '',
      lunch: n.lunch || '',
      dinner: n.dinner || '',
    })
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

  // Ruta resumida: tramos del itinerario (para el bloque 🧭)
  const routeSteps = useMemo(() => {
    const seen = new Set()
    return ITINERARY.filter((d) => {
      if (seen.has(d.label)) return false
      seen.add(d.label)
      return true
    })
  }, [])

  // Lugares por fecha asignada
  const byDate = useMemo(() => {
    const map = {}
    places.forEach((p) => {
      if (!p.assigned_date) return
      ;(map[p.assigned_date] = map[p.assigned_date] || []).push(p)
    })
    return map
  }, [places])

  // Etiqueta del itinerario por fecha (ej. "París", "✈️ Madrid → París")
  const labelByDate = useMemo(() => {
    const map = {}
    ITINERARY.forEach((d) => { map[d.date] = d.label })
    return map
  }, [])

  const cityByDate = useMemo(() => {
    const map = {}
    ITINERARY.forEach((d) => { map[d.date] = d.city })
    return map
  }, [])

  // Construir la rejilla del mes visible (semana empieza lunes)
  const grid = useMemo(() => {
    const { y, m } = ym
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7 // 0 = lunes
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(y, m, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [ym])

  const shiftMonth = (delta) => {
    setYm(({ y, m }) => {
      const nm = m + delta
      if (nm < 0) return { y: y - 1, m: 11 }
      if (nm > 11) return { y: y + 1, m: 0 }
      return { y, m: nm }
    })
  }


  const selPlaces = byDate[selectedDate] || []
  const selNote = notes[selectedDate] || {}
  const isTravelDay = (labelByDate[selectedDate] || '').startsWith('✈️') || (labelByDate[selectedDate] || '').startsWith('🚆')

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
      <h2 className="text-lg font-bold text-slate-900 mb-0.5">📅 Calendario</h2>
      <p className="text-xs text-slate-500 mb-3">
        toca un día para ver su detalle{configured ? '' : ' · demo'}
      </p>

      {/* ── Calendario mensual ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4">
        <div className="flex items-center mb-2">
          <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 font-bold" aria-label="Mes anterior">‹</button>
          <span className="flex-1 text-center font-bold text-slate-900 capitalize text-[15px]">
            {MONTHS_ES[ym.m]} {ym.y}
          </span>
          <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 font-bold" aria-label="Mes siguiente">›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {WD.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((date, i) => {
            if (!date) return <div key={'e' + i} />
            const list = byDate[date] || []
            const label = labelByDate[date] || ''
            const isSel = date === selectedDate
            const isToday = date === isoDate(today.getFullYear(), today.getMonth(), today.getDate())
            const itinDay = Boolean(label)
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`relative rounded-lg py-1 flex flex-col items-center gap-0.5 transition-colors ${
                  isSel ? 'bg-emerald-600 text-white shadow' : itinDay ? 'bg-emerald-50 text-slate-800 hover:bg-emerald-100' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[13px] leading-none font-semibold ${isToday && !isSel ? 'text-emerald-700' : ''}`}>{Number(date.slice(-2))}</span>
                {list.length > 0 && (
                  <span className="flex gap-0.5">
                    {list.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isSel ? '#fff' : (CATEGORIES[p.category]?.color || CATEGORIES.otro.color) }}
                        title={p.name}
                      />
                    ))}
                    {list.length > 3 && <span className={`text-[8px] font-bold ${isSel ? 'text-white' : 'text-slate-400'}`}>+{list.length - 3}</span>}
                  </span>
                )}
                {list.length === 0 && (label.startsWith('✈️') || label.startsWith('🚆')) && (
                  <span className="text-[9px] leading-none">{isSel ? '✈️' : label.split(' ')[0]}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 mr-1 align-middle" />
          los puntos son lugares del día · los días verdes son del cronograma del viaje
        </p>
      </div>

      {/* ── Detalle del día seleccionado ── */}
      <section className="mb-4">
        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <span className="text-sm font-extrabold text-slate-900">{fmtDate(selectedDate)}</span>
          <span className="text-xs text-slate-500 flex-1 truncate">
            {labelByDate[selectedDate] || 'Día libre'}
            {cityByDate[selectedDate] ? ` · ${cityByDate[selectedDate]}` : ''}
          </span>
          {isTravelDay && <span className="text-[10px] font-bold text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">día de viaje</span>}
          <span className="text-[11px] font-semibold text-slate-400">{selPlaces.length ? `${selPlaces.length} lug.` : '—'}</span>
        </div>

        {/* Inicio / fin / dormir / comidas del día */}
        {!editingDate && (
          <div className="ml-1 mb-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => startEdit(selectedDate)}
              className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-sky-400 transition-colors flex flex-wrap items-center gap-1"
              title="Editar inicio, fin, alojamiento y comidas del día"
            >
              {selNote.start_place ? <span>🌅 <b>{selNote.start_place}</b></span> : <span className="text-slate-400">🌅 inicio</span>}
              <span className="text-slate-300">·</span>
              {selNote.end_place ? <span>🌇 <b>{selNote.end_place}</b></span> : <span className="text-slate-400">🌇 fin</span>}
              <span className="text-slate-300">·</span>
              {selNote.sleep_place ? <span>🛏️ <b>{selNote.sleep_place}</b></span> : <span className="text-slate-400">🛏️ dormir</span>}
              <span className="text-slate-300">·</span>
              {selNote.breakfast ? <span>🥐 <b>{selNote.breakfast}</b></span> : <span className="text-slate-400">🥐 desayuno</span>}
              <span className="text-slate-300">·</span>
              {selNote.lunch ? <span>🍝 <b>{selNote.lunch}</b></span> : <span className="text-slate-400">🍝 almuerzo</span>}
              <span className="text-slate-300">·</span>
              {selNote.dinner ? <span>🍕 <b>{selNote.dinner}</b></span> : <span className="text-slate-400">🍕 cena</span>}
              <span className="text-slate-300 ml-0.5">✏️</span>
            </button>
          </div>
        )}
        {editingDate === selectedDate && (
          <div className="ml-1 mb-2 bg-white rounded-xl border border-slate-200 shadow-sm p-2.5 space-y-1.5">
            {[
              ['start_place', '🌅 El día empieza en'],
              ['end_place', '🌇 El día termina en'],
              ['sleep_place', '🛏️ Se duerme en'],
              ['breakfast', '🥐 Desayuno'],
              ['lunch', '🍝 Almuerzo'],
              ['dinner', '🍕 Cena'],
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
              <button onClick={() => saveNote(selectedDate)} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-bold hover:bg-sky-400 disabled:opacity-60">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {selPlaces.length === 0 ? (
          <p className="text-xs text-slate-400 pl-5 py-1 italic">Sin lugares asignados a este día</p>
        ) : (
          selPlaces.map((p) => <PlaceRow key={p.id} p={p} />)
        )}
      </section>

      {/* Lugares sin día asignado */}
      {places.some((p) => !p.assigned_date) && (
        <details className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <summary className="px-3.5 py-2.5 flex items-center gap-2 cursor-pointer select-none">
            <span className="text-base">📌</span>
            <span className="text-sm font-bold text-slate-800 flex-1">Sin día asignado (itinerario libre)</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {places.filter((p) => !p.assigned_date).length}
            </span>
          </summary>
          <div className="px-3 pb-3">
            {places.filter((p) => !p.assigned_date).map((p) => <PlaceRow key={p.id} p={p} />)}
          </div>
        </details>
      )}

      {/* Ruta del viaje */}
      <details className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <summary className="px-3.5 py-2.5 flex items-center gap-2 cursor-pointer select-none">
          <span className="text-base">🧭</span>
          <span className="text-sm font-bold text-slate-800 flex-1">Ruta del viaje</span>
          <span className="text-[11px] text-slate-400">ver tramos</span>
        </summary>
        <ol className="relative border-l-2 border-slate-200 ml-6 mr-3 mb-3 mt-1 space-y-4">
          {routeSteps.map((d, i) => {
            const isFlight = d.travel
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
    </div>
  )
}
