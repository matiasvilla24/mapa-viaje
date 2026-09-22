import { ITINERARY, fmtDate } from '../constants'

export default function RouteView({ places, onOpenCity }) {
  const countByCity = {}
  places.forEach((p) => {
    if (!p.city) return
    countByCity[p.city] = (countByCity[p.city] || 0) + 1
  })

  // Días agrupados (sin repetir el mismo label consecutivo)
  const seen = new Set()
  const steps = ITINERARY.filter((d) => {
    if (seen.has(d.label)) return false
    seen.add(d.label)
    return true
  })

  const cityRanges = {}
  ITINERARY.forEach((d) => {
    if (d.travel) return
    if (!cityRanges[d.city]) cityRanges[d.city] = [d.date, d.date]
    else cityRanges[d.city][1] = d.date
  })

  return (
    <div className="h-full overflow-y-auto thin-scroll px-4 py-4 pb-24">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Ruta del viaje</h2>
      <p className="text-sm text-slate-500 mb-5">
        Del 25 de diciembre al 10 de enero · Medellín → Europa → Medellín
      </p>

      <ol className="relative border-l-2 border-slate-200 ml-3 space-y-6">
        {steps.map((d, i) => {
          const isFlight = d.travel
          const [from, to] = cityRanges[d.city] || []
          const count = countByCity[d.city] || 0
          return (
            <li key={i} className="ml-6">
              <span
                className={`absolute -left-[11px] w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] ${
                  isFlight ? 'bg-sky-500' : 'bg-emerald-500'
                }`}
              >
                {isFlight ? '✈️' : '📍'}
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500">{fmtDate(d.date)}</span>
                <span className="font-bold text-slate-900">{d.label}</span>
              </div>
              {!isFlight && count > 0 && (
                <button
                  onClick={() => onOpenCity?.(d.city)}
                  className="mt-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full px-2.5 py-0.5 transition-colors"
                >
                  {count} {count === 1 ? 'lugar' : 'lugares'} en el mapa →
                </button>
              )}
              {!isFlight && from && to && from !== to && (
                <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(from)} – {fmtDate(to)}</p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
