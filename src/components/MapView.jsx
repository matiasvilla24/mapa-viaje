import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { CATEGORIES, fmtDate } from '../constants'

const EMOJI = {
  museo: '🏛️', iglesia: '⛪', monumento: '🗿', ruina_arqueologica: '🏚️',
  parque: '🌳', comida: '🍽️', hotel: '🏨', otro: '📍',
}

function makeIcon(place, dimmed) {
  const color = CATEGORIES[place.category]?.color || CATEGORIES.otro.color
  const emoji = place.visited ? '✅' : (place.custom_icon || EMOJI[place.category] || EMOJI.otro)
  const size = 32
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50% 50% 50% 4px;
      transform:rotate(-45deg);
      background:${color};
      border:2.5px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
      opacity:${dimmed ? 0.25 : (place.visited ? 0.55 : 1)};
    ">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

// Número de parada sobre el pin (1, 2, 3…) en el color del día
function makeStopIcon(n, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      min-width:18px;height:18px;padding:0 3px;border-radius:9px;
      background:${color};color:#fff;border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.45);
      display:flex;align-items:center;justify-content:center;
      font:700 10px/1 ui-sans-serif,system-ui,sans-serif;
    ">${n}</div>`,
    iconSize: [22, 18],
    iconAnchor: [11, 26],
  })
}

export default function MapView({ places, selected, onSelect, routeDays = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef(new Map())   // id -> marker
  const routeRef = useRef(null)          // capa con las líneas de la ruta
  const lastRouteKey = useRef('')

  // Crear el mapa una vez
  useEffect(() => {
    const map = L.map(mapRef.current, {
      center: [44.5, 8.0],
      zoom: 5,
      zoomControl: false,
      tap: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null; markersRef.current = new Map(); routeRef.current = null }
  }, [])

  // Sincronizar marcadores con la lista de lugares
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const visibleIds = new Set(places.map((p) => p.id))

    // Quitar los que ya no están
    markersRef.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) { map.removeLayer(marker); markersRef.current.delete(id) }
    })

    // Agregar/actualizar
    places.forEach((p) => {
      if (!p.id || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return
      let marker = markersRef.current.get(p.id)
      if (marker) {
        marker.setLatLng([p.lat, p.lng])
        marker.setIcon(makeIcon(p, selected && selected.id !== p.id && false))
        marker.setTooltipContent(p.name)
      } else {
        marker = L.marker([p.lat, p.lng], { icon: makeIcon(p, false) })
          .bindTooltip(p.name, { direction: 'top', offset: [0, -8] })
          .on('click', () => onSelect(p))
        marker.addTo(map)
        markersRef.current.set(p.id, marker)
      }
    })
  }, [places, selected, onSelect])

  // Ruta por día (solo Roma): una polilínea por jornada, con paradas numeradas.
  // Se reencuadra solo cuando cambia la ruta (no al mover el mapa a mano).
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null }
    const days = routeDays.filter((d) => Array.isArray(d.places) && d.places.length > 1)
    if (!days.length) { lastRouteKey.current = ''; return }

    const group = L.layerGroup()
    const bounds = L.latLngBounds([])

    days.forEach((day) => {
      const points = day.places.map((p) => [p.lat, p.lng])
      points.forEach((pt) => bounds.extend(pt))

      // Sombra blanca debajo para que la línea se lea sobre el mapa
      L.polyline(points, { color: '#ffffff', weight: 7, opacity: 0.75, lineJoin: 'round' }).addTo(group)
      L.polyline(points, { color: day.color, weight: 3.5, opacity: 0.95, lineJoin: 'round' }).addTo(group)

      day.places.forEach((p, i) => {
        L.marker([p.lat, p.lng], {
          icon: makeStopIcon(i + 1, day.color),
          keyboard: false,
          zIndexOffset: 600,
        })
          .bindTooltip(`${p.rome_time ? p.rome_time + ' · ' : ''}${i + 1}. ${p.name}`, {
            direction: 'top',
            offset: [0, -18],
          })
          .on('click', () => onSelect(p))
          .addTo(group)
      })
    })

    group.addTo(map)
    routeRef.current = group

    const key = days.map((d) => d.date + ':' + d.places.length).join('|')
    if (key !== lastRouteKey.current && bounds.isValid()) {
      lastRouteKey.current = key
      map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15 })
    }
  }, [routeDays])

  // Enfocar el lugar seleccionado
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !selected) return
    if (Number.isFinite(selected.lat) && Number.isFinite(selected.lng)) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14), { duration: 0.8 })
    }
  }, [selected])

  const shownDays = routeDays.filter((d) => Array.isArray(d.places) && d.places.length > 1)

  return (
    <>
      <div ref={mapRef} className="h-full w-full" />

      {/* Leyenda de la ruta de Roma (un color por día) */}
      {shownDays.length > 0 && (
        <div className="absolute top-14 right-2 z-[550] bg-white/95 backdrop-blur rounded-xl shadow-lg px-2.5 py-2 text-[11px] max-w-[196px] pointer-events-none">
          <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
            🧭 Ruta de Roma
          </div>
          <div className="space-y-0.5 text-slate-600">
            {shownDays.map((d) => {
              const times = d.places.map((p) => p.rome_time).filter(Boolean)
              return (
                <div key={d.date} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="font-semibold text-slate-700 whitespace-nowrap">{fmtDate(d.date)}</span>
                  <span className="text-slate-500 whitespace-nowrap">
                    {times.length ? `${times[0]}–${times[times.length - 1]}` : `${d.places.length} paradas`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-[11px] leading-relaxed pointer-events-none max-w-[180px] text-slate-600">
        <div className="grid grid-cols-2 gap-x-2">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <div key={key} className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c.color }} />
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
