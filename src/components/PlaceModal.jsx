import { useState, useEffect } from 'react'
import { CATEGORIES, fmtDate } from '../constants'
import { contributionsDb } from '../supabaseClient'
import AiOverview from './AiOverview'
import FamilyData from './FamilyData'

export default function PlaceModal({ place, onClose, onEdit, onDelete, onToggleVisited }) {
  const c = CATEGORIES[place.category] || CATEGORIES.otro
  const [tab, setTab] = useState('info') // info | familia | ai
  const [contribs, setContribs] = useState([])
  const [contribsLoaded, setContribsLoaded] = useState(false)

  // Cargar contribuciones del lugar al abrir (y cuando lleguen por realtime
  // se manejan desde App; aquí refrescamos al cambiar de lugar)
  useEffect(() => {
    let alive = true
    setContribsLoaded(false)
    contributionsDb.list(place.id)
      .then((rows) => { if (alive) { setContribs(rows); setContribsLoaded(true) } })
      .catch(() => { if (alive) setContribsLoaded(true) })
    return () => { alive = false }
  }, [place.id])

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 pb-3 border-b border-slate-100 flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: c.color + '22', color: c.color }}
          >
            {c.label[0]}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-bold leading-tight ${place.visited ? 'text-slate-400 line-through decoration-2' : 'text-slate-900'}`}>
              {place.name} {place.must_see && <span title="Imperdible">⭐</span>}
            </h2>
            <p className="text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: c.color }} />
              {c.label} · {place.city}, {place.country}
              {place.assigned_date ? ` · ${fmtDate(place.assigned_date)}` : ' · sin día asignado'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none -mt-1" aria-label="Cerrar">✕</button>
        </div>

        {/* Pestañas */}
        <div className="flex-shrink-0 flex border-b border-slate-200 bg-slate-50">
          {[
            ['info', '📋', 'Info'],
            ['familia', '👨‍👩‍👧‍👦', 'Datos de la familia'],
            ['ai', '🤖', 'AI Overview'],
          ].map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                tab === key ? 'text-emerald-700 bg-white border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="text-[13px]">{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto thin-scroll p-4 space-y-3.5 text-sm">
          {tab === 'info' && (
            <>
              {/* Checkbox visitado */}
              <button
                onClick={() => onToggleVisited?.(place)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 border transition-colors ${
                  place.visited
                    ? 'bg-emerald-500 border-emerald-600 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  place.visited ? 'bg-white text-emerald-600' : 'border-2 border-slate-300 bg-white'
                }`}>
                  {place.visited ? '✓' : ''}
                </span>
                <span className="font-bold text-[15px]">
                  {place.visited ? '¡Visitado! 🎉' : 'Marcar como visitado'}
                </span>
              </button>

              {place.description && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Descripción</h3>
                  <p className="text-slate-700 leading-relaxed">{place.description}</p>
                </section>
              )}
              {place.highlights && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Highlights</h3>
                  <p className="text-slate-700 leading-relaxed">{place.highlights}</p>
                </section>
              )}
              <div className="grid grid-cols-2 gap-3">
                {place.price && (
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Precio</h3>
                    <p className="text-slate-800 font-semibold">{place.price}</p>
                  </section>
                )}
                {place.opening_hours && (
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Horario</h3>
                    <p className="text-slate-700">{place.opening_hours}</p>
                  </section>
                )}
              </div>
              {(place.reservation_required || place.reservation_notes) && (
                <section className={`rounded-xl p-3 ${place.reservation_required ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <h3 className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${place.reservation_required ? 'text-amber-600' : 'text-slate-400'}`}>
                    {place.reservation_required ? '🎟️ Requiere reserva' : 'Reservas'}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{place.reservation_notes || 'Consultar.'}</p>
                </section>
              )}
              {place.notes && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Notas</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{place.notes}</p>
                </section>
              )}
              {place.source_url && (
                <section className="rounded-xl p-3 bg-violet-50 border border-violet-200">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-violet-600 mb-1">✨ Extraído de</h3>
                  <a href={place.source_url} target="_blank" rel="noreferrer" className="text-[13px] text-blue-600 hover:underline break-all">
                    {place.source_url}
                  </a>
                </section>
              )}
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                Agregado por <b>{place.added_by || '—'}</b>
                {place.created_at ? ` · ${new Date(place.created_at).toLocaleDateString('es')}` : ''}
              </p>
            </>
          )}

          {tab === 'familia' && (
            <FamilyData place={place} contribs={contribs} setContribs={setContribs} />
          )}

          {tab === 'ai' && <AiOverview place={place} />}
        </div>

        {/* Acciones */}
        <div className="p-4 pt-3 border-t border-slate-100 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => { if (confirm(`¿Eliminar \"${place.name}\"?`)) onDelete() }}
            className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold hover:bg-red-100 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
