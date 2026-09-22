import { useMemo } from 'react'
import { CATEGORIES, ITINERARY, fmtDate } from '../constants'

export default function Agenda({ places, onOpen }) {
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
          <span className="font-semibold text-slate-800 text-[15px] leading-snug">{p.name}</span>
          {p.must_see && <span title="Imperdible">⭐</span>}
          {p.reservation_required && <span title="Requiere reserva" className="text-[11px]">🎟️</span>}
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
      <h2 className="text-lg font-bold text-slate-900 mb-0.5">Agenda del viaje</h2>
      <p className="text-xs text-slate-500 mb-3">
        {places.filter((p) => p.assigned_date).length} lugares asignados · {unassigned.length} sin día
      </p>

      {groups.map((g) => (
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
          {g.places.length === 0 ? (
            <p className="text-xs text-slate-400 pl-5 py-1 italic">Sin lugares aún</p>
          ) : (
            g.places.map((p) => <PlaceRow key={p.id} p={p} />)
          )}
        </section>
      ))}

      {unassigned.length > 0 && (
        <section className="mb-4">
          <div className="border-t-2 border-dashed border-slate-300 pt-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-extrabold text-slate-700">📌 Sin día asignado</span>
              <span className="text-[11px] font-semibold text-slate-400">{unassigned.length}</span>
            </div>
            {unassigned.map((p) => <PlaceRow key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
