import { CATEGORIES, fmtDate } from '../constants'

export default function PlaceModal({ place, onClose, onEdit, onDelete }) {
  const c = CATEGORIES[place.category] || CATEGORIES.otro
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col"
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
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
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

        {/* Contenido */}
        <div className="overflow-y-auto thin-scroll p-4 space-y-3.5 text-sm">
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
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Notas de la familia</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{place.notes}</p>
            </section>
          )}
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            Agregado por <b>{place.added_by || '—'}</b>
            {place.created_at ? ` · ${new Date(place.created_at).toLocaleDateString('es')}` : ''}
          </p>
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
            onClick={() => { if (confirm(`¿Eliminar "${place.name}"?`)) onDelete() }}
            className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold hover:bg-red-100 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
