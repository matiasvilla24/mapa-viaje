import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { db, contributionsDb, configured, onPendingChange } from './supabaseClient'
import { onJobChange } from './aiJob'
import QuickAdd from './components/QuickAdd'
import { CATEGORIES, CATEGORY_KEYS, PEOPLE, ITINERARY, fmtDate } from './constants'
import MapView from './components/MapView'
import Agenda from './components/Agenda'
import Flights from './components/Flights'
import Accommodations from './components/Accommodations'
import Budget from './components/Budget'
import AskAI from './components/AskAI'
import PlaceModal from './components/PlaceModal'
import PlaceForm from './components/PlaceForm'
import Search from './components/Search'

export default function App() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [view, setView] = useState('mapa') // mapa | agenda | vuelos | alojamientos | presupuesto | ruta
  const [personFilter, setPersonFilter] = useState('todos') // todos | papa | mama | susi | mati
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)   // null | 'new' | place
  const [quickAdd, setQuickAdd] = useState(false)
  const [askAI, setAskAI] = useState(false)
  const [search, setSearch] = useState(false)
  const [jobResult, setJobResult] = useState(false)

  // Resultado del Quick Add en segundo plano: badge en el botón ✨
  useEffect(() => onJobChange(({ running, result }) => setJobResult(Boolean(result) && !running)), [])

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
          (catFilter === 'todas' || p.category === catFilter) &&
          (personFilter === 'todos' ||
            p.added_by_tag === personFilter ||
            (Array.isArray(p.interest_tags) && p.interest_tags.includes(personFilter))),
      ),
    [places, cityFilter, catFilter, personFilter],
  )

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {error && (
        <div className="bg-red-100 text-red-700 text-xs px-4 py-2">{error}</div>
      )}

      {configured && pending > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-amber-100 text-amber-800 text-[11px] font-semibold px-3 py-1 rounded-full shadow">
          ⏳ {pending} pendiente{pending !== 1 ? 's' : ''} de sincronizar
        </div>
      )}

      {/* ── Contenido ── */}
      <main className="flex-1 relative min-h-0">
        {/* Filtros flotando sobre el mapa (sin fondo) */}
        {view === 'mapa' && !loading && (
          <div className="absolute top-2 inset-x-2 z-[600] flex gap-2 overflow-x-auto thin-scroll pointer-events-auto">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/95 backdrop-blur shadow-md outline-none focus:border-emerald-500"
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c === 'todas' ? '🌍 Ciudades' : c}</option>
              ))}
            </select>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/95 backdrop-blur shadow-md outline-none focus:border-emerald-500"
            >
              <option value="todas">🎨 Categorías</option>
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>{CATEGORIES[k].label}</option>
              ))}
            </select>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/95 backdrop-blur shadow-md outline-none focus:border-emerald-500"
            >
              <option value="todos">👪 Familia</option>
              {PEOPLE.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {(cityFilter !== 'todas' || catFilter !== 'todas' || personFilter !== 'todos') && (
              <button
                onClick={() => { setCityFilter('todas'); setCatFilter('todas'); setPersonFilter('todos') }}
                className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900/85 text-white shadow-md hover:bg-slate-800 backdrop-blur"
              >
                ✕ Quitar filtros
              </button>
            )}
          </div>
        )}

        {/* Buscador: disponible en todas las vistas, abajo a la izquierda */}
        {!loading && (
          <button
            onClick={() => { setSearch(true); cancelPick() }}
            className="absolute bottom-3 left-3 z-[600] flex-shrink-0 bg-white/95 hover:bg-white active:bg-slate-100 backdrop-blur text-slate-700 font-bold text-sm w-9 h-9 rounded-xl transition-colors shadow-lg"
            title="Buscar lugares, hoteles, vuelos, días…"
            aria-label="Buscar en el viaje"
          >
            🔍
          </button>
        )}

        {/* Acciones (❓ IA · ✨ Quick Add · ➕ Nuevo) abajo a la derecha, junto a la leyenda */}
        {view === 'mapa' && !loading && (
          <div className="absolute bottom-3 right-3 z-[600] flex items-center gap-1.5">
            <button
              onClick={() => { setAskAI(true); cancelPick() }}
              className="flex-shrink-0 bg-slate-700/95 hover:bg-slate-600 active:bg-slate-500 text-white font-bold text-sm w-9 h-9 rounded-xl transition-colors shadow-lg backdrop-blur"
              title="Preguntar a la IA sobre el viaje"
              aria-label="Preguntar a la IA sobre el viaje"
            >
              ❓
            </button>
            <button
              onClick={() => { setQuickAdd(true); cancelPick() }}
              className={`relative flex-shrink-0 font-bold text-sm w-9 h-9 rounded-xl transition-colors shadow-lg backdrop-blur ${
                jobResult ? 'bg-emerald-500 hover:bg-emerald-400 animate-bounce' : 'bg-violet-500 hover:bg-violet-400 active:bg-violet-600'
              } text-white`}
              title={jobResult ? 'Resultado listo — tócalo para revisar' : 'Agregar con IA'}
              aria-label="Quick Add con IA"
            >
              ✨
              {jobResult && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />}
            </button>
            <button
              onClick={() => { setEditing('new'); cancelPick() }}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-900 font-bold text-sm w-9 h-9 rounded-xl transition-colors shadow-lg"
              title="Agregar lugar manualmente"
              aria-label="Agregar lugar"
            >
              ➕
            </button>
          </div>
        )}

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
          <Agenda places={filtered} onOpen={(p) => setSelected(p)} onOpenCity={focusCity} />
        ) : view === 'vuelos' ? (
          <Flights whoAmI="Matías" />
        ) : view === 'alojamientos' ? (
          <Accommodations />
        ) : view === 'presupuesto' ? (
          <Budget />
        ) : (
          <MapView
            places={filtered}
            selected={selected}
            onSelect={(p) => setSelected(p)}
            pickMode={pickMode}
            onPick={handlePick}
          />
        )}
      </main>

      {/* ── Navegación inferior ── */}
      <nav className="flex-shrink-0 bg-white border-t border-slate-200 flex z-20 pb-[env(safe-area-inset-bottom)]">
        {[
          ['mapa', '🗺️'],
          ['agenda', '📅'],
          ['vuelos', '🚄'],
          ['alojamientos', '🏨'],
          ['presupuesto', '💰'],
        ].map(([key, icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-label={key}
            className={`flex-1 py-3.5 text-2xl leading-none text-center transition-colors ${
              view === key ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {icon}
          </button>
        ))}
      </nav>

      {/* ── Modales ── */}
      {quickAdd && (
        <QuickAdd
          existingPlaces={places}
          onClose={() => setQuickAdd(false)}
          onSaved={(row) => { setQuickAdd(false); setSelected(row) }}
        />
      )}
      {askAI && <AskAI onClose={() => setAskAI(false)} places={places} />}
      {search && (
        <Search
          places={places}
          onClose={() => setSearch(false)}
          onSelectPlace={(p) => { setSearch(false); setView('mapa'); setCityFilter('todas'); setCatFilter('todas'); setPersonFilter('todos'); setSelected(p) }}
          onGoTab={(tab) => { setSearch(false); setView(tab) }}
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
          existingPlaces={places}
        />
      )}
    </div>
  )
}
