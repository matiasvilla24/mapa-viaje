// Banner de alertas activas (ventas abiertas detectadas por el servidor de
// monitoreo). Se muestra arriba de la app mientras haya alertas no atendidas.
// La campana flotante se autogestiona: expandir/contraer la lista.
import { useState } from 'react'
import { alertsDb } from '../supabaseClient'

export default function AlertsBanner({ alerts = [] }) {
  const [open, setOpen] = useState(false)
  const activas = alerts.filter((a) => a.active && !a.done)
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? activas : activas.slice(0, 1)
  if (!activas.length) return null

  return (
    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[650] w-[92%] max-w-sm space-y-1.5">
      {shown.map((a) => (
        <div key={a.id} className="bg-rose-600/95 backdrop-blur text-white rounded-xl shadow-lg px-3 py-2 flex items-start gap-2">
          <button onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="animate-pulse text-sm">🚨</span>
              <span className="text-[13px] font-bold leading-tight">{a.title}</span>
            </div>
            {a.body && <div className="text-[11px] text-rose-50/90 mt-0.5 leading-snug">{a.body.length > 120 ? a.body.slice(0, 120) + '…' : a.body}</div>}
            {a.url && expanded && (
              <a href={a.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="mt-1 inline-block text-[11px] font-bold bg-white text-rose-700 rounded-lg px-2 py-0.5">Ir a comprar →</a>
            )}
          </button>
          <button
            onClick={async () => { try { await alertsDb.save({ ...a, done: true }) } catch { /* offline */ } }}
            title="Marcar como atendida"
            className="flex-shrink-0 w-6 h-6 mt-0.5 grid place-items-center rounded-md bg-white/15 hover:bg-white/30 text-xs font-bold"
          >
            ✔️
          </button>
        </div>
      ))}
      {activas.length > 1 && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="w-full text-center text-[11px] font-bold text-rose-600/95 hover:text-rose-700 bg-white/90 backdrop-blur rounded-full py-0.5 shadow"
        >
          {expanded ? '▲ menos' : `▼ ver las otras ${activas.length - 1}`}
        </button>
      )}
    </div>
  )
}
