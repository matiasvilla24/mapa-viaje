// Reservas: checklist de TODAS las cosas que dependen de reservación o compra
// antelada (vuelos, hoteles, entradas, tours). El estado sincroniza por realtime
// entre toda la familia. Datos importados del repo "App Europa 2026" (64 ítems).
import { useEffect, useMemo, useState } from 'react'
import { bookingsDb, alertsDb, configured } from '../supabaseClient'
import { fmtDate, wiki } from '../constants'

const CAT_ICONS = { transporte: '🚄', alojamiento: '🏨', entradas: '🎟️', comidas: '🍽️', paquetes: '🧳', compras: '🛍️', otros: '📎' }

const diasHasta = (iso) => Math.round((new Date(iso + 'T23:59:59') - new Date()) / 86400000)

export default function Reservas({ alerts = [], onAlertToggle, onGoAlerts }) {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('todo') // todo | pendientes
  const [error, setError] = useState(null)

  // Carga inicial + suscripción realtime
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try { setRows(await bookingsDb.list()) } catch (e) { setError(e.message) }
      unsub = bookingsDb.subscribe((row) => {
        setRows((cur) => (cur.some((r) => r.id === row.id) ? cur.map((r) => (r.id === row.id ? row : r)) : [...cur, row]))
      })
    })()
    return () => unsub()
  }, [])

  const visible = useMemo(
    () => (filter === 'pendientes' ? rows.filter((r) => !r.done && r.need === 'ob') : rows),
    [rows, filter],
  )

  // Agrupar por sección (sec) manteniendo el orden de la base
  const groups = useMemo(() => {
    const g = []
    let cur = null
    for (const r of visible) {
      if (cur === null || r.sec !== cur.sec) { cur = { sec: r.sec, items: [] }; g.push(cur) }
      cur.items.push(r)
    }
    return g
  }, [visible])

  const toggle = async (row) => {
    const next = !row.done
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, done: next } : r)))
    try {
      await bookingsDb.save({ ...row, done: next, updated_by: 'app' })
    } catch (e) {
      setRows((cur) => cur.map((r) => (r.id === row.id ? row : r)))
      setError(e.message)
      alert('No se pudo guardar: ' + e.message)
    }
  }

  const pendientes = rows.filter((r) => !r.done && r.need === 'ob')
  const activas = alerts.filter((a) => a.active && !a.done)

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-3 pb-24">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-0.5">🎟️ Reservas del viaje</h2>
          <p className="text-xs text-slate-500">
            {configured ? 'Se sincroniza con toda la familia' : 'demo'} · toca la casilla para marcar
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter(filter === 'pendientes' ? 'todo' : 'pendientes')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'pendientes' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Ver solo las pendientes obligatorias"
          >
            ⏳ {pendientes.length} pendientes
          </button>
          {onGoAlerts && (
            <button
              onClick={onGoAlerts}
              className="relative text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Ver alertas del monitoreo"
            >
              🔔 Alertas
              {activas.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {activas.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mt-2">⚠️ {error}</p>}

      {/* ── Alertas activas: boca de la app cuando el servidor detecta que abrió una venta ── */}
      {activas.length > 0 && (
        <div className="mt-3 bg-rose-50 border-l-4 border-rose-500 rounded-lg p-3 space-y-2.5">
          {activas.map((a) => (
            <div key={a.id} className="flex items-start gap-2">
              <span className="animate-pulse mt-0.5">🚨</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-rose-800 leading-snug">{a.title}</div>
                {a.body && <div className="text-xs text-rose-700 mt-0.5 whitespace-pre-wrap">{a.body}</div>}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-2.5 py-1">Ir a comprar →</a>
                )}
              </div>
              <button onClick={() => onAlertToggle?.(a.id, true)} className="flex-shrink-0 text-xs font-bold text-rose-600 hover:bg-rose-100 rounded-md px-2 py-1" title="Marcar alerta como atendida">✔️</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Checklist por ciudad / fecha ── */}
      {groups.map((group, gi) => (
        <section key={gi} className="mt-3.5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <details open={filter === 'pendientes'} className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="px-3.5 py-2.5 flex items-center gap-2 cursor-pointer select-none">
              <span className="text-base">📍</span>
              <span className="text-sm font-bold text-slate-800 flex-1">{group.sec}</span>
              <span className="text-[11px] font-semibold text-slate-400">
                {group.items.filter((r) => !r.done).length ? `${group.items.filter((r) => !r.done).length} pend.` : '✅'}
              </span>
              <span className="text-slate-400 group-open:rotate-90 transition-transform text-[10px]">▶</span>
            </summary>
            <div>
              {group.items.map((r) => {
                const d = r.cancel_by ? diasHasta(r.cancel_by) : null
                const warn = d != null && !r.done && d >= 0 && d <= 7
                const overdue = d != null && !r.done && d < 0
                return (
                  <div key={r.id} className="border-t border-slate-100 px-3.5 py-2.5 flex items-start gap-2.5">
                    <button
                      onClick={() => toggle(r)}
                      title={r.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                      className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-md border-2 transition-colors font-bold text-[13px] grid place-items-center ${
                        r.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : r.need === 'ob'
                            ? 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                            : 'border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {r.done ? '✔' : ''}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold leading-snug ${r.done ? 'text-slate-400 line-through' : r.need === 'ob' ? 'text-slate-800' : 'text-slate-600'}`}>
                        {(CAT_ICONS[r.cat] || '📎')} {wiki(r.title)}
                        {r.need === 'ob' && !r.done && (
                          <span className="ml-1.5 text-[10px] font-bold text-rose-500 align-top">● OBLIGATORIA</span>
                        )}
                        {r.need === 'op' && !r.done && (
                          <span className="ml-1.5 text-[10px] font-bold text-slate-400 align-top">○ opcional</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                        {r.date && <span>🗓️ {fmtDate(r.date)}</span>}
                        {r.cancel_by && (
                          <span className={overdue ? 'text-rose-600 font-bold' : warn ? 'text-amber-600 font-bold' : ''}>
                            {overdue ? '⚠️ cancelación vencida' : warn ? `⏰ cancela en ${d} d` : `♻️ cancela ${fmtDate(r.cancel_by)}`}
                            {warn && r.cancel_note ? ` (${r.cancel_note})` : ''}
                          </span>
                        )}
                        {r.mode && <span>🚩 {wiki(r.mode)}</span>}
                        {r.platform && <span>🏷️ {wiki(r.platform)}</span>}
                        {r.cancel_note && !warn && !overdue && r.cancel_by && <span className="text-slate-400">· {r.cancel_note}</span>}
                      </div>                        {r.info && (
                          <div className={`text-xs mt-1 whitespace-pre-wrap rounded-lg px-2.5 py-1.5 ${r.done ? 'text-slate-400 bg-slate-50' : 'text-slate-600 bg-slate-50'}`}>
                            {wiki(r.info)}
                          </div>
                        )}
                      {r.web && (
                        <a href={r.web} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-bold underline text-sky-600 hover:text-sky-700">
                          abrir enlace ↗
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </section>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400 italic mt-6 text-center">Aún no hay reservas registradas</p>
      )}
    </div>
  )
}
