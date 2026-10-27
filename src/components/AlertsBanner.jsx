// Banner de alertas activas que "sufre por encima" de cualquier vista:
// - 🚨 venta-abierta: el servidor detectó que abrieron la venta (Cenacolo / AS Roma)
// - ⏰ recordatorio: cancelación a punto de vencer (≤14 días, del cron diario)
// se muestra arriba de la app mientras haya alertas no atendidas; la lista se
// expande cuando hay más de una.
import { useState } from 'react'
import { alertsDb } from '../supabaseClient'

export const ALERT_EMOJI = { 'venta-abierta': '🚨', recordatorio: '⏰', vencido: '⛔', nuevo: '🚨' }

export default function AlertsBanner({ alerts = [] }) {
  const activas = alerts.filter((a) => a.active && !a.done)
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? activas : activas.slice(0, 1)
  if (!activas.length) return null

  return (
    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[650] w-[92%] max-w-sm space-y-1.5">
      {shown.map((a) => (
        <div key={a.id} className={`${a.status === 'venta-abierta' ? 'bg-rose-600/95' : 'bg-amber-500/95 text-slate-900'} backdrop-blur text-white rounded-xl shadow-lg px-3 py-2 flex items-start gap-2`}>
          <button onClick={() => setExpanded((o) => !o)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className={a.status === 'venta-abierta' ? 'animate-pulse text-sm' : 'text-sm'}>{ALERT_EMOJI[a.status] || '🔔'}</span>
              <span className="text-[13px] font-bold leading-tight line-clamp-2">{a.title}</span>
            </div>
            {a.body && <div className={`text-[11px] mt-0.5 leading-snug ${a.status === 'venta-abierta' ? 'text-rose-50/90' : 'text-amber-900/90'}`}>{a.body.length > 110 ? a.body.slice(0, 110) + '…' : a.body}</div>}
            {a.url && expanded && (
              <a href={a.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="mt-1 inline-block text-[11px] font-bold bg-white text-slate-800 rounded-lg px-2 py-0.5">
                {a.status === 'venta-abierta' ? 'Ir a comprar →' : 'Ver reservas →'}
              </a>
            )}
          </button>
          <button
            onClick={async () => { try { await alertsDb.save({ ...a, done: true }) } catch { /* offline */ } }}
            title="Marcar como atendida"
            className={`flex-shrink-0 w-6 h-6 mt-0.5 grid place-items-center rounded-md text-xs font-bold ${a.status === 'venta-abierta' ? 'bg-white/15 hover:bg-white/30' : 'bg-black/10 hover:bg-black/20'}`}
          >
            ✔️
          </button>
        </div>
      ))}
      {activas.length > 1 && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="w-full text-center text-[11px] font-bold text-slate-700 bg-white/90 backdrop-blur rounded-full py-0.5 shadow"
        >
          {expanded ? '▲ menos' : `▼ ver las otras ${activas.length - 1}`}
        </button>
      )}
    </div>
  )
}
