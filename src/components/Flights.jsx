import { useEffect, useState } from 'react'
import { FLIGHT_LEGS, fmtDate } from '../constants'
import { flightsDb, configured } from '../supabaseClient'

const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition'

export default function Flights({ whoAmI }) {
  const [legs, setLegs] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  // Cargar y suscribirse a cambios en tiempo real
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try { setLegs(await flightsDb.list()) } catch { /* tabla puede no existir aún */ }
      unsub = flightsDb.subscribe((row) => {
        setLegs((cur) => ({ ...cur, [row.id]: row }))
      })
    })()
    return () => unsub()
  }, [])

  const startEdit = (legId) => {
    const row = legs[legId] || {}
    setDraft({
      departure_time: row.departure_time || '',
      arrival_time: row.arrival_time || '',
      flight_number: row.flight_number || '',
      notes: row.notes || '',
    })
    setEditingId(legId)
  }

  const save = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const meta = FLIGHT_LEGS.find(l => l.id === editingId)
      const saved = await flightsDb.save({
        id: editingId,
        label: meta.label,
        ...draft,
        updated_by: whoAmI || null,
      })
      setLegs((cur) => ({ ...cur, [saved.id]: saved }))
      setEditingId(null)
    } catch (e) {
      alert('No se pudo guardar: ' + e.message + '\n(Si la tabla flights aún no existe, ejecuta migration-visited-flights.sql en Supabase)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-3 pb-24">
      <h2 className="text-lg font-bold text-slate-900 mb-0.5">Vuelos y traslados</h2>
      <p className="text-xs text-slate-500 mb-3">
        Horas editables por todos{configured ? '' : ' · modo demo (no se guardan)'} · los cambios se sincronizan al instante
      </p>

      {FLIGHT_LEGS.map((leg) => {
        const row = legs[leg.id] || {}
        const editing = editingId === leg.id
        return (
          <section key={leg.id} className="mb-2.5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-3.5 py-2.5 flex items-center gap-2.5">
              <span className="text-xl">{leg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-[15px] leading-snug">{leg.label}</div>
                <div className="text-xs text-slate-500">{fmtDate(leg.date)}</div>
              </div>
              {!editing && (
                <button
                  onClick={() => startEdit(leg.id)}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            {!editing && (row.departure_time || row.arrival_time || row.flight_number || row.notes || row.updated_by) && (
              <div className="px-3.5 pb-3 pt-0 text-sm text-slate-700 grid grid-cols-2 gap-x-3 gap-y-1">
                {row.departure_time && (
                  <div><span className="text-[11px] font-bold uppercase text-slate-400 block">Salida</span>{row.departure_time}</div>
                )}
                {row.arrival_time && (
                  <div><span className="text-[11px] font-bold uppercase text-slate-400 block">Llegada</span>{row.arrival_time}</div>
                )}
                {row.flight_number && (
                  <div><span className="text-[11px] font-bold uppercase text-slate-400 block">Vuelo</span>{row.flight_number}</div>
                )}
                {row.updated_by && (
                  <div className="text-xs text-slate-400 self-end">Editó: {row.updated_by}</div>
                )}
                {row.notes && (
                  <div className="col-span-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">{row.notes}</div>
                )}
              </div>
            )}

            {editing && (
              <div className="px-3.5 pb-3.5 space-y-2 bg-slate-50 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-3 gap-2">
                  <label>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Salida</span>
                    <input value={draft.departure_time} onChange={(e) => setDraft((d) => ({ ...d, departure_time: e.target.value }))} className={inputCls} placeholder="15:30" />
                  </label>
                  <label>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Llegada</span>
                    <input value={draft.arrival_time} onChange={(e) => setDraft((d) => ({ ...d, arrival_time: e.target.value }))} className={inputCls} placeholder="18:30" />
                  </label>
                  <label>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Nº vuelo</span>
                    <input value={draft.flight_number} onChange={(e) => setDraft((d) => ({ ...d, flight_number: e.target.value }))} className={inputCls} placeholder="AV254" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Notas</span>
                  <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} className={inputCls + ' resize-y'} placeholder="Terminal, equipaje, traslados…" />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-60 transition-colors">
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
