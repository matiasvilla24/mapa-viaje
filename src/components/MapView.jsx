import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { CATEGORIES } from '../constants'

const EMOJI = {
  museo: '🏛️', iglesia: '⛪', monumento: '🗿', ruina_arqueologica: '🏚️',
  parque: '🌳', paseo_barrio: '🚶', comida: '🍽️', otro: '📍',
}

function makeIcon(place, dimmed) {
  const color = CATEGORIES[place.category]?.color || CATEGORIES.otro.color
  const emoji = EMOJI[place.category] || EMOJI.otro
  const size = place.must_see ? 38 : 32
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50% 50% 50% 4px;
      transform:rotate(-45deg);
      background:${color};
      border:2.5px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.4), 0 0 0 ${place.must_see ? 3 : 0}px ${color}55;
      display:flex;align-items:center;justify-content:center;
      opacity:${dimmed ? 0.25 : 1};
    ">
      <span style="transform:rotate(45deg);font-size:${place.must_see ? 17 : 15}px;line-height:1">${emoji}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export default function MapView({ places, selected, onSelect, pickMode, onPick }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef(new Map())   // id -> marker
  const pickModeRef = useRef(pickMode)
  pickModeRef.current = pickMode
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  // Crear el mapa una vez
  useEffect(() => {
    const map = L.map(mapRef.current, {
      center: [44.5, 8.0],
      zoom: 5,
      zoomControl: true,
      tap: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)
    map.on('click', (e) => {
      if (pickModeRef.current && onPickRef.current) {
        onPickRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) })
      }
    })
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null; markersRef.current = new Map() }
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

  // Modo pick: cambiar cursor y mostrar aviso flotante
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const container = map.getContainer()
    const apply = (on) => {
      container.style.cursor = on ? 'crosshair' : ''
      let el = container.querySelector('.pick-hint')
      if (on) {
        if (!el) {
          el = L.DomUtil.create('div', 'pick-hint')
          el.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:1000;background:#0f172a;color:#fff;padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.4);white-space:nowrap'
          el.textContent = '👆 Toca el mapa para capturar las coordenadas'
          container.appendChild(el)
        }
      } else {
        el?.remove()
      }
    }
    apply(pickMode)
    return () => apply(false)
  }, [pickMode])

  // Enfocar el lugar seleccionado
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !selected) return
    if (Number.isFinite(selected.lat) && Number.isFinite(selected.lng)) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14), { duration: 0.8 })
    }
  }, [selected])

  return (
    <>
      <div ref={mapRef} className="h-full w-full" />
      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-[11px] leading-relaxed pointer-events-none max-w-[210px]">
        <div className="font-bold text-slate-700 mb-1">Categorías</div>
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
