import { useEffect, useMemo, useState } from 'react'
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_KEYS } from '../constants'
import { budgetDb, configured } from '../supabaseClient'

const input = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition'

const emptyForm = { category: 'varios', label: '', estimated: '', spent: '', currency: 'EUR', notes: '' }

export default function Budget() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try { setItems(await budgetDb.list()) } catch { /* tabla puede no existir aún */ }
      unsub = budgetDb.subscribe((row) => {
        setItems((cur) => {
          const i = cur.findIndex((r) => r.id === row.id)
          if (i >= 0) return cur.map((r) => (r.id === row.id ? row : r))
          return [...cur, row]
        })
      })
    })()
    return () => unsub()
  }, [])

  const totals = useMemo(() => {
    const est = items.reduce((s, r) => s + (Number(r.estimated) || 0), 0)
    const spent = items.reduce((s, r) => s + (Number(r.spent) || 0), 0)
    return { est, spent, diff: est - spent }
  }, [items])

  const byCategory = useMemo(() => {
    const map = {}
    for (const k of BUDGET_CATEGORY_KEYS) map[k] = { est: 0, spent: 0, items: [] }
    items.forEach((r) => {
      const k = BUDGET_CATEGORIES[r.category] ? r.category : 'varios'
      map[k].est += Number(r.estimated) || 0
      map[k].spent += Number(r.spent) || 0
      map[k].items.push(r)
    })
    return map
  }, [items])

  const startEdit = (r) => {
    setForm({
      category: r.category || 'varios', label: r.label || '',
      estimated: r.estimated ?? '', spent: r.spent ?? '',
      currency: r.currency || 'EUR', notes: r.notes || '',
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
        estimated: Number(form.estimated) || 0,
        spent: Number(form.spent) || 0,
      }
      if (editingId) await budgetDb.save({ id: editingId, ...payload })
      else await budgetDb.save(payload)
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      alert('No se pudo guardar: ' + err.message + '\n(Si la tabla budget_items aún no existe, ejecuta migration-personas-budget.sql en Supabase)')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r) => {
    if (!confirm(`¿Eliminar «${r.label}»?`)) return
    try { await budgetDb.remove(r.id) } catch (e) { alert(e.message) }
  }

  // Registro rápido de gasto real (input inline en la fila)
  const quickSpend = async (r, value) => {
    try { await budgetDb.save({ id: r.id, spent: Number(value) || 0 }) } catch (e) { alert(e.message) }
  }

  const fmt = (n) => `€${(Number(n) || 0).toLocaleString('es')}`

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-3 pb-24">
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-lg font-bold text-slate-900">💰 Presupuesto</h2>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) { setForm(emptyForm); setEditingId(null) } }}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-400 transition-colors"
        >
          {showForm && !editingId ? '✕ Cerrar' : '➕ Agregar ítem'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {configured ? 'Estimado vs. real · sincronizado' : 'modo demo'}
      </p>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Estimado</div>
          <div className="font-bold text-slate-900 text-[15px]">{fmt(totals.est)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gastado real</div>
          <div className="font-bold text-amber-600 text-[15px]">{fmt(totals.spent)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Disponible</div>
          <div className={`font-bold text-[15px] ${totals.diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totals.diff)}</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Categoría</span>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={input}>
                {BUDGET_CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>{BUDGET_CATEGORIES[k].icon} {BUDGET_CATEGORIES[k].label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Ítem *</span>
              <input required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={input} placeholder="Ej. Vuelo MDE-MAD" />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Presupuesto estimado</span>
              <input type="number" step="any" value={form.estimated} onChange={(e) => setForm((f) => ({ ...f, estimated: e.target.value }))} className={input} placeholder="1200" />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Gasto real</span>
              <input type="number" step="any" value={form.spent} onChange={(e) => setForm((f) => ({ ...f, spent: e.target.value }))} className={input} placeholder="0" />
            </label>
            <label className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Notas</span>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={input} placeholder="Opcional…" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="flex-1 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-400 disabled:opacity-60">
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 italic">Sin ítems aún. Agrega el primero: tiquetes, comidas, entradas…</p>
      )}

      {/* Por categoría */}
      {BUDGET_CATEGORY_KEYS.map((k) => {
        const g = byCategory[k]
        if (!g.items.length) return null
        const cat = BUDGET_CATEGORIES[k]
        const over = g.spent > g.est && g.est > 0
        return (
          <section key={k} className="mb-4">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-sm font-extrabold text-slate-900">{cat.icon} {cat.label}</span>
              <span className={`text-[11px] font-bold ${over ? 'text-red-500' : 'text-slate-400'}`}>
                {fmt(g.spent)} / {fmt(g.est)}{over ? ' · ¡pasado!' : ''}
              </span>
            </div>
            {g.items.map((r) => {
              const full = Number(r.spent) >= Number(r.estimated) && Number(r.estimated) > 0
              return (
                <div key={r.id} className="mb-1.5 bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{r.label}</div>
                    {r.notes && <div className="text-[11px] text-slate-500 truncate">{r.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${full ? 'text-red-500' : 'text-slate-900'}`}>
                      {fmt(r.spent)} <span className="text-[10px] font-normal text-slate-400">/ {fmt(r.estimated)}</span>
                    </div>
                  </div>
                  <input
                    type="number" step="any"
                    defaultValue={r.spent ?? 0}
                    onBlur={(e) => { if (String(r.spent ?? 0) !== e.target.value) quickSpend(r, e.target.value) }}
                    className="w-20 flex-shrink-0 px-2 py-1 rounded-lg border border-slate-200 text-xs outline-none focus:border-amber-400"
                    title="Registrar gasto real"
                    placeholder="€ real"
                  />
                  <button onClick={() => startEdit(r)} className="text-[11px] font-bold px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">✏️</button>
                  <button onClick={() => remove(r)} className="text-[11px] font-bold px-1.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
