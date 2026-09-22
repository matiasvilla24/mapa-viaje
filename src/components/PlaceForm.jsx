import { useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS, DATE_OPTIONS } from '../constants'

const input = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition'

export default function PlaceForm({ initial, onSave, onCancel, onPickCoords, onCancelPick }) {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({
    name: initial?.name || '',
    city: initial?.city || '',
    country: initial?.country || '',
    lat: initial?.lat ?? '',
    lng: initial?.lng ?? '',
    category: initial?.category || 'otro',
    description: initial?.description || '',
    highlights: initial?.highlights || '',
    opening_hours: initial?.opening_hours || '',
    reservation_required: initial?.reservation_required || false,
    reservation_notes: initial?.reservation_notes || '',
    price: initial?.price || '',
    assigned_date: initial?.assigned_date || '',
    must_see: initial?.must_see || false,
    notes: initial?.notes || '',
    added_by: initial?.added_by || '',
  })
  const [picking, setPicking] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Activar modo captura: el formulario se minimiza, el usuario toca el mapa y
  // el callback rellena lat/lng y restaura el formulario.
  const startPicking = () => {
    if (picking) return
    setPicking(true)
    onPickCoords?.((coords) => {
      setF((s) => ({ ...s, lat: coords.lat, lng: coords.lng }))
      setPicking(false)
    })
  }
  const stopPicking = () => {
    setPicking(false)
    onCancelPick?.()
  }

  // Minimizado mientras se capturan coordenadas
  if (picking) {
    return (
      <div className="fixed inset-x-0 top-14 z-[1001] flex justify-center px-4">
        <div className="bg-slate-900 text-white rounded-full pl-4 pr-2 py-2 shadow-2xl flex items-center gap-3 text-sm font-semibold ring-1 ring-white/20">
          <span className="animate-pulse">👆 Toca el mapa para capturar las coordenadas</span>
          <button
            type="button"
            onClick={stopPicking}
            className="bg-white/15 hover:bg-white/25 rounded-full px-3 py-1 text-xs font-bold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return alert('El nombre es obligatorio')
    onSave({
      ...f,
      name: f.name.trim(),
      city: f.city.trim(),
      country: f.country.trim() || '',
      lat: f.lat === '' ? null : Number(f.lat),
      lng: f.lng === '' ? null : Number(f.lng),
      assigned_date: f.assigned_date || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <form
        onSubmit={submit}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {editing ? '✏️ Editar lugar' : '➕ Agregar lugar'}
          </h2>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-2xl leading-none" aria-label="Cerrar">✕</button>
        </div>

        <div className="overflow-y-auto thin-scroll p-4 space-y-3">
          {/* Nombre + quién lo agrega */}
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 block">
              <span className="text-xs font-semibold text-slate-600">Nombre *</span>
              <input required value={f.name} onChange={set('name')} className={input + ' mt-0.5'} placeholder="Ej. Coliseo" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Agregado por</span>
              <input value={f.added_by} onChange={set('added_by')} className={input + ' mt-0.5'} placeholder="Tu nombre" />
            </label>
          </div>

          {/* Ciudad + país */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Ciudad</span>
              <input value={f.city} onChange={set('city')} className={input + ' mt-0.5'} placeholder="Roma" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">País</span>
              <input value={f.country} onChange={set('country')} className={input + ' mt-0.5'} placeholder="Italia" />
            </label>
          </div>

          {/* Categoría */}
          <div>
            <span className="text-xs font-semibold text-slate-600">Categoría</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORY_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setF((s) => ({ ...s, category: k }))}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                    f.category === k
                      ? 'text-white border-transparent'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                  style={f.category === k ? { background: CATEGORIES[k].color } : {}}
                >
                  {CATEGORIES[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* Coordenadas + pick en mapa */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <span className="text-xs font-semibold text-slate-600">Coordenadas</span>
            <div className="flex gap-2 mt-1">
              <input
                type="number" step="any" inputMode="decimal" value={f.lat} onChange={set('lat')}
                className={input} placeholder="lat"
              />
              <input
                type="number" step="any" inputMode="decimal" value={f.lng} onChange={set('lng')}
                className={input} placeholder="lng"
              />
              <button
                type="button"
                onClick={startPicking}
                className="flex-shrink-0 px-3 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
              >
                📍 Tocar mapa
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Si no las conoces, pulsa «Tocar mapa» y luego toca el punto exacto en el mapa de fondo.
            </p>
          </div>

          {/* Descripción */}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Descripción</span>
            <textarea value={f.description} onChange={set('description')} rows={3} className={input + ' mt-0.5 resize-y'} placeholder="Qué es y por qué vale la pena" />
          </label>

          {/* Highlights */}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Highlights (obras, curiosidades)</span>
            <textarea value={f.highlights} onChange={set('highlights')} rows={2} className={input + ' mt-0.5 resize-y'} placeholder="Lo que no hay que perderse dentro" />
          </label>

          {/* Horario + precio */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Horario</span>
              <input value={f.opening_hours} onChange={set('opening_hours')} className={input + ' mt-0.5'} placeholder="9:00–18:00" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Precio</span>
              <input value={f.price} onChange={set('price')} className={input + ' mt-0.5'} placeholder="€17 · Gratis" />
            </label>
          </div>

          {/* Reserva */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.reservation_required} onChange={set('reservation_required')} className="w-4 h-4 accent-amber-500" />
              <span className="text-sm font-semibold text-slate-700">🎟️ Requiere reserva</span>
            </label>
            {f.reservation_required && (
              <textarea value={f.reservation_notes} onChange={set('reservation_notes')} rows={2} className={input + ' resize-y'} placeholder="Dónde y cuándo reservar, costos de la reserva…" />
            )}
          </div>

          {/* Día asignado + imperdible */}
          <div className="grid grid-cols-1 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Día asignado (agenda)</span>
              <select value={f.assigned_date} onChange={set('assigned_date')} className={input + ' mt-0.5'}>
                <option value="">— Sin día asignado —</option>
                {DATE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.must_see} onChange={set('must_see')} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">⭐ Imperdible (must-see)</span>
            </label>
          </div>

          {/* Notas */}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Notas libres</span>
            <textarea value={f.notes} onChange={set('notes')} rows={2} className={input + ' mt-0.5 resize-y'} placeholder="Acuerdos de la familia, tips, transportes…" />
          </label>
        </div>

        <div className="p-4 pt-3 border-t border-slate-100 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors">
            {editing ? 'Guardar cambios' : 'Agregar lugar'}
          </button>
        </div>
      </form>
    </div>
  )
}
