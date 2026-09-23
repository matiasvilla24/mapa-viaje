import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { db, contributionsDb, configured, onPendingChange } from './supabaseClient'
import QuickAdd from './components/QuickAdd'
import { CATEGORIES, CATEGORY_KEYS, ITINERARY, fmtDate } from './constants'
import MapView from './components/MapView'
import Agenda from './components/Agenda'
import RouteView from './components/RouteView'
import Flights from './components/Flights'
import PlaceModal from './components/PlaceModal'
import PlaceForm from './components/PlaceForm'

export default function App() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [view, setView] = useState('mapa') // mapa | agenda | ruta | vuelos
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)   // null | 'new' | place
  const [quickAdd, setQuickAdd] = useState(false)

  // Operaciones pendientes de sincronizar (hechas sin conexión)
  const [pending, setPending] = useState(0)
  useEffect(() => onPendingChange(setPending), [])

  // Modo "tocar mapa": el callback vive en un ref (no en estado, porque React
  // interpretaría una función pasada al setter como updater y la ejecutaría).
  const pickCallbackRef = useRef(null)
  const [pickMode, setPickMode] = useState(false)
  const startPick = useCallback((cb) => { pickCallbackRef.current = cb; setPickMode(true) }, [])
  const cancelPick = useCallback(() => { pickCallbackRef.current = null; setPickMode(false) }, [])
  const handlePick = useCallback((coords) => {
    const cb = pickCallbackRef.current
    pickCallbackRef.current = null
    setPickMode(false)
    cb?.(coords)
  }, [])

  const [cityFilter, setCityFilter] = useState('todas')
  const [catFilter, setCatFilter] = useState('todas')

  const focusCity = useCallback((city) => {
    setCityFilter(city)
    setView('mapa')
  }, [])

  // Cargar datos y suscribirse a cambios en tiempo real
  useEffect(() => {
    let unsub = () => {}
    let unsubContribs = () => {}
    ;(async () => {
      try {
        const data = await db.list()
        setPlaces(data)
      } catch (e) {
        setError('No se pudo cargar la base de datos: ' + e.message)
      } finally {
        setLoading(false)
      }
      unsub = db.subscribe({
        onInsert: (row) => setPlaces((cur) => (cur.some((p) => p.id === row.id) ? cur : [row, ...cur])),
        onUpdate: (row) => setPlaces((cur) => cur.map((p) => (p.id === row.id ? row : p))),
        onDelete: (id) => setPlaces((cur) => cur.filter((p) => p.id !== id)),
      })
      // Contribuciones (imágenes/enlaces/contactos/notas) en tiempo real:
      // se reparten al estado del modal si está abierto para ese lugar.
      unsubContribs = contributionsDb.subscribe({
        onInsert: (row) => {
          setSelected((sel) => (sel && sel.id === row.place_id ? { ...sel, __contribInsert: row } : sel))
        },
      })
    })()
    return () => { unsub(); unsubContribs() }
  }, [])

  // ── CRUD ──
  const savePlace = async (values) => {
    try {
      if (editing === 'new') {
        await db.insert(values)
      } else if (editing) {
        await db.update(editing.id, values)
      }
      setEditing(null)
      cancelPick()
    } catch (e) {
      alert('Error al guardar: ' + e.message)
    }
  }

  const deletePlace = async (id) => {
    try {
      await db.remove(id)
      setSelected(null)
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  // Marcar/desmarcar visitado (sincroniza en tiempo real)
  const toggleVisited = async (place) => {
    try {
      await db.update(place.id, { visited: !place.visited })
    } catch (e) {
      alert('Error al marcar visitado: ' + e.message)
    }
  }

  // ── Filtros ──
  const cities = useMemo(
    () => ['todas', ...[...new Set(places.map((p) => p.city).filter(Boolean))].sort()],
    [places],
  )

  const filtered = useMemo(
    () =>
      places.filter(
        (p) =>
          (cityFilter === 'todas' || p.city === cityFilter) &&
          (catFilter === 'todas' || p.category === catFilter),
      ),
    [places, cityFilter, catFilter],
  )

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {/* ── Cabecera ── */}
      <header className="flex-shrink-0 bg-slate-900 text-white px-4 py-2.5 flex items-center gap-3 z-20 shadow-md">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold leading-tight text-[15px]">
            🗺️ Mapa del viaje <span className="text-slate-400 font-normal">· dic 25 – ene 10</span>
          </h1>
          <p className="text-[11px] text-slate-400 leading-tight">
            {places.length} {places.length === 1 ? 'lugar' : 'lugares'}{!configured && ' · modo demo (sin Supabase)'}
            {configured && pending > 0 && (
              <span className="text-amber-400"> · ⏳ {pending} pendiente{pending !== 1 ? 's' : ''} de sincronizar</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setQuickAdd(true); cancelPick() }}
          className="flex-shrink-0 bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white font-bold text-sm px-3 py-2 rounded-xl transition-colors shadow"
          title="Agregar desde un link, texto o captura (con IA)"
        >
          ✨
        </button>
        <button
          onClick={() => { setEditing('new'); cancelPick() }}
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-900 font-bold text-sm px-3.5 py-2 rounded-xl transition-colors shadow"
        >
          ➕ Agregar
        </button>
      </header>

      {error && (
        <div className="bg-red-100 text-red-700 text-xs px-4 py-2">{error}</div>
      )}

      {/* ── Filtros ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex gap-2 overflow-x-auto thin-scroll z-10">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-emerald-500"
        >
          {cities.map((c) => (
            <option key={c} value={c}>{c === 'todas' ? '🌍 Todas las ciudades' : c}</option>
          ))}
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-emerald-500"
        >
          <option value="todas">🎨 Todas las categorías</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>{CATEGORIES[k].label}</option>
          ))}
        </select>
        {(cityFilter !== 'todas' || catFilter !== 'todas') && (
          <button
            onClick={() => { setCityFilter('todas'); setCatFilter('todas') }}
            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            ✕ Quitar filtros
          </button>
        )}
      </div>

      {/* ── Contenido ── */}
      <main className="flex-1 relative min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Cargando lugares…
          </div>
        ) : view === 'mapa' ? (
          <MapView
            places={filtered}
            selected={selected}
            onSelect={(p) => setSelected(p)}
            pickMode={pickMode}
            onPick={handlePick}
          />
        ) : view === 'agenda' ? (
          <Agenda places={filtered} onOpen={(p) => setSelected(p)} />
        ) : view === 'vuelos' ? (
          <Flights whoAmI="Matías" />
        ) : (
          <RouteView places={places} onOpenCity={focusCity} />
        )}
      </main>

      {/* ── Navegación inferior ── */}
      <nav className="flex-shrink-0 bg-white border-t border-slate-200 flex z-20 pb-[env(safe-area-inset-bottom)]">
        {[
          ['mapa', '🗺️', 'Mapa'],
          ['agenda', '📅', 'Agenda'],
          ['vuelos', '✈️', 'Vuelos'],
          ['ruta', '🧭', 'Ruta'],
        ].map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2.5 text-center transition-colors ${
              view === key ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="block text-lg leading-none">{icon}</span>
            <span className="text-[11px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Modales ── */}
      {quickAdd && (
        <QuickAdd
          onClose={() => setQuickAdd(false)}
          onSaved={(row) => { setQuickAdd(false); setSelected(row) }}
        />
      )}
      {selected && !editing && !quickAdd && (
        <PlaceModal
          place={places.find((p) => p.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(places.find((p) => p.id === selected.id) || selected)}
          onDelete={() => deletePlace(selected.id)}
          onToggleVisited={toggleVisited}
        />
      )}
      {editing && (
        <PlaceForm
          initial={editing === 'new' ? { added_by: '' } : editing}
          onSave={savePlace}
          onCancel={() => { setEditing(null); cancelPick() }}
          onPickCoords={startPick}
          onCancelPick={cancelPick}
        />
      )}
    </div>
  )
}
