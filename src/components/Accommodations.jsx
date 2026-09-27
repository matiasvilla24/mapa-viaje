import { useEffect, useState } from 'react'
import { accommodationsDb, configured } from '../supabaseClient'

const TYPES = {
  hotel: { label: 'Hotel', icon: '🏨' },
  airbnb: { label: 'Airbnb', icon: '🏡' },
  otro: { label: 'Otro', icon: '🛏️' },
}

const input = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition'

const emptyForm = {
  name: '', city: '', country: '', booking_ref: '', cost: '', cost_currency: 'EUR',
  accommodation_type: 'hotel', free_cancellation: false,
  checkin_date: '', checkout_date: '', address: '', url: '', notes: '',
}

export default function Accommodations() {
  const [rows, setRows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try { setRows(await accommodationsDb.list()) } catch { /* tabla puede no existir aún */ }
      unsub = accommodationsDb.subscribe((row) => {
        setRows((cur) => {
          const i = cur.findIndex((r) => r.id === row.id)
          if (i >= 0) return cur.map((r) => (r.id === row.id ? row : r))
          return [...cur, row]
        })
      })
    })()
    return () => unsub()
  }, [])

  const startEdit = (r) => {
    setForm({
      name: r.name || '', city: r.city || '', country: r.country || '',
      booking_ref: r.booking_ref || '', cost: r.cost ?? '', cost_currency: r.cost_currency || 'EUR',
      accommodation_type: r.accommodation_type || 'hotel', free_cancellation: Boolean(r.free_cancellation),
      checkin_date: r.checkin_date || '', checkout_date: r.checkout_date || '',
      address: r.address || '', url: r.url || '', notes: r.notes || '',
    })
    setEditingId(r.id)
    setShowForm(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        cost: form.cost === '' ? null : Number(form.cost),
        checkin_date: form.checkin_date || null,
        checkout_date: form.checkout_date || null,
      }
      if (editingId) await accommodationsDb.save({ id: editingId, ...payload })
      else await accommodationsDb.save(payload)
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      alert('No se pudo guardar: ' + err.message + '\n(Si la tabla accommodations aún no existe, ejecuta migration-personas-budget.sql en Supabase)')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r) => {
    if (!confirm(`¿Eliminar «${r.name}»?`)) return
    try { await accommodationsDb.remove(r.id) } catch (e) { alert(e.message) }
  }

  const fmtMoney = (n, cur) => (n == null ? '—' : `${cur === 'COP' ? '$' : '€'}${Number(n).toLocaleString('es')}`)

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-3 pb-24">
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-lg font-bold text-slate-900">🏨 Alojamientos</h2>
        {/* (sin subtítulo: el botón Agregar se explica solo) */}
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) { setForm(emptyForm); setEditingId(null) } }}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors"
        >
          {showForm && !editingId ? '✕ Cerrar' : '➕ Agregar'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {configured ? 'Sincronizado al instante' : 'modo demo'}
      </p>

      {showForm && (
        <form onSubmit={save} className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Nombre *</span>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={input} placeholder="Hotel Casa Valencia" />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Ciudad</span>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={input} placeholder="Roma" />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">País</span>
              <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={input} placeholder="Italia" />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5"># de reserva</span>
              <input value={form.booking_ref} onChange={(e) => setForm((f) => ({ ...f, booking_ref: e.target.value }))} className={input} placeholder="BK-123456" />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <label>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Costo</span>
                <input type="number" step="any" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className={input} placeholder="320" />
              </label>
              <label>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Moneda</span>
                <select value={form.cost_currency} onChange={(e) => setForm((f) => ({ ...f, cost_currency: e.target.value }))} className={input}>
                  <option value="EUR">EUR €</option>
                  <option value="COP">COP $</option>
                  <option value="USD">USD $</option>
                </select>
              </label>
            </div>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Tipo de acomodación</span>
              <select value={form.accommodation_type} onChange={(e) => setForm((f) => ({ ...f, accommodation_type: e.target.value }))} className={input}>
                {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.icon} {t.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-1.5">
              <input type="checkbox" checked={form.free_cancellation} onChange={(e) => setForm((f) => ({ ...f, free_cancellation: e.target.checked }))} className="w-4 h-4 accent-sky-500" />
              <span className="text-sm font-semibold text-slate-700">Free cancelación</span>
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Check-in</span>
              <input type="date" value={form.checkin_date} onChange={(e) => setForm((f) => ({ ...f, checkin_date: e.target.value }))} className={input} />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Check-out</span>
              <input type="date" value={form.checkout_date} onChange={(e) => setForm((f) => ({ ...f, checkout_date: e.target.value }))} className={input} />
            </label>
            <label className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Dirección / enlace</span>
              <input value={form.url || form.address} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className={input} placeholder="https://…" />
            </label>
            <label className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Notas</span>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={input + ' resize-y'} placeholder="Habitaciones, desayuno, traslados…" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="flex-1 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-sky-500 text-white text-sm font-bold hover:bg-sky-400 disabled:opacity-60">
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 italic">Sin alojamientos aún. Agrega el primero con «➕ Agregar».</p>
      )}

      {rows.map((r) => {
        const t = TYPES[r.accommodation_type] || TYPES.otro
        return (
          <section key={r.id} className="mb-2.5 bg-white rounded-xl border border-slate-200 shadow-sm px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-800 text-[15px]">{r.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.label}</span>
                  {r.free_cancellation && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Free cancelación</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{[r.city, r.country].filter(Boolean).join(', ')}</div>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {r.booking_ref && <span>🎫 Reserva: <b>{r.booking_ref}</b></span>}
                  {(r.checkin_date || r.checkout_date) && (
                    <span>📅 {r.checkin_date || '?'} → {r.checkout_date || '?'}</span>
                  )}
                </div>
                {r.notes && <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 mt-1.5 whitespace-pre-wrap">{r.notes}</div>}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-bold text-slate-900">{fmtMoney(r.cost, r.cost_currency)}</div>
                <div className="flex gap-1 mt-1">
                  <button onClick={() => startEdit(r)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">✏️</button>
                  <button onClick={() => remove(r)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
