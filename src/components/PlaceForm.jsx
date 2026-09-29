import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS, PEOPLE } from '../constants'
import { useSheetDismiss, SheetClose } from './sheetDismiss'

const input = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition'

export default function PlaceForm({ initial, onSave, onCancel, onPickCoords, onCancelPick, existingPlaces = [] }) {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({
    name: initial?.name || '',
    city: initial?.city || '',
    country: initial?.country || '',
    address: initial?.address || '',
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
    assigned_time: initial?.assigned_time || '',
    must_see: initial?.must_see || false,
    notes: initial?.notes || '',
    added_by: initial?.added_by || 'Mati',
    added_by_tag: initial?.added_by_tag || 'mati',
    interest_tags: initial?.interest_tags || [],
  })
  const [picking, setPicking] = useState(false)
  const sheet = useSheetDismiss(onCancel)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Detecta si la franja fecha+hora elegida ya está ocupada por otro lugar.
  const timeBusy = useMemo(() => {
    if (!f.assigned_date || !f.assigned_time) return null
    return (
      existingPlaces.find(
        (p) => p.id !== initial?.id && p.assigned_date === f.assigned_date && p.assigned_time === f.assigned_time,
      ) || null
    )
  }, [f.assigned_date, f.assigned_time, existingPlaces, initial?.id])

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
      <div className="fixed inset-x-0 top-3 z-[1001] flex justify-center px-4">
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
    if (!f.added_by_tag) return alert('La etiqueta de quién agrega es obligatoria (Papá, Mamá, Susi o Mati)')
    const person = PEOPLE.find((p) => p.key === f.added_by_tag)
    onSave({
      ...f,
      name: f.name.trim(),
      city: f.city.trim(),
      country: f.country.trim() || '',
      address: f.address.trim() || null,
      lat: f.lat === '' ? null : Number(f.lat),
      lng: f.lng === '' ? null : Number(f.lng),
      added_by: person?.label || f.added_by,
      added_by_tag: f.added_by_tag,
      interest_tags: f.interest_tags,
    })
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <form
        onSubmit={submit}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
        {...sheet.handlers}
      >
        {/* Grabber: arrastrar hacia abajo para cerrar (estilo iOS) */}
        <div className="sm:hidden flex-shrink-0 flex justify-center pt-2 cursor-grab" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>
        <div className="p-4 pt-2 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {editing ? '✏️ Editar lugar' : '➕ Agregar lugar'}
          </h2>
          <SheetClose onClick={onCancel} />
        </div>

        <div className="overflow-y-auto thin-scroll p-4 space-y-3">
          {/* Nombre + etiqueta obligatoria de quién agrega */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Nombre *</span>
              <input required value={f.name} onChange={set('name')} className={input + ' mt-0.5'} placeholder="Ej. Coliseo" />
            </label>
            <div>
              <span className="text-xs font-semibold text-slate-600">Agregado por *</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {PEOPLE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setF((s) => ({ ...s, added_by_tag: p.key }))}
                    className={`px-2 py-1 rounded-full text-[11px] font-bold border-2 transition ${
                      f.added_by_tag === p.key ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                    style={f.added_by_tag === p.key ? { background: p.color } : {}}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* De interés de quién (multi-select) */}
          <div>
            <span className="text-xs font-semibold text-slate-600">De interés de (pueden ser varias)</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {PEOPLE.map((p) => {
                const on = f.interest_tags.includes(p.key)
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setF((s) => ({
                      ...s,
                      interest_tags: on ? s.interest_tags.filter((k) => k !== p.key) : [...s.interest_tags, p.key],
                    }))}
                    className={`px-2 py-1 rounded-full text-[11px] font-bold border-2 transition ${
                      on ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                    style={on ? { background: p.color } : {}}
                  >
                    {on ? '● ' : ''}{p.label}
                  </button>
                )
              })}
            </div>
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

          {/* Dirección convencional (para Waze/Google Maps) */}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Dirección (calle, número, ciudad)</span>
            <input value={f.address} onChange={set('address')} className={input + ' mt-0.5'} placeholder="Via Merulana 117, Roma" />
            {f.address.trim() && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-600 hover:underline mt-1 inline-block"
              >
                🗺️ Probar en Google Maps
              </a>
            )}
          </label>

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

          {/* Fecha + hora asignada */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <span className="text-xs font-semibold text-slate-600">Día y hora de la visita</span>
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                value={f.assigned_date}
                onChange={set('assigned_date')}
                className={input}
              />
              <input
                type="time"
                value={f.assigned_time}
                onChange={set('assigned_time')}
                className={input}
              />
            </div>
            {timeBusy && (
              <div className="mt-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 text-xs text-amber-900">
                ⚠️ <b>Franja comprometida:</b> ya hay algo planeado a esa fecha y hora —{' '}
                <b>{timeBusy.name}</b>
                {timeBusy.city ? ` (${timeBusy.city})` : ''}. Elegí otra hora o reprogramá uno de los dos.
              </div>
            )}
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

          {/* Imperdible (solo el usuario lo marca) */}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.must_see} onChange={set('must_see')} className="w-4 h-4 accent-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">⭐ Imperdible (must-see)</span>
          </label>

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
