import { createClient } from '@supabase/supabase-js'
import { SEED_PLACES } from './seed'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// ¿Hay credenciales reales configuradas?
export const configured = Boolean(url && key)

const supabase = configured ? createClient(url, key) : null

// ─────────────────────────────────────────────────────────────
// Persistencia local (localStorage): caché de datos + cola offline
// ─────────────────────────────────────────────────────────────
const QUEUE_KEY = 'mv_offline_queue' // operaciones hechas sin conexión, por subir
const CACHE_KEY = 'mv_places_cache'  // última copia conocida de la tabla places

const readJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback }
}
const writeJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage lleno: ignorar */ }
}

// ─────────────────────────────────────────────────────────────
// Modo demo (sin Supabase): mismos datos precargados, cambios en memoria.
// Se asignan ids estables de sesión porque el seed no los trae (en producción
// los genera Postgres).
// ─────────────────────────────────────────────────────────────
let demoRows = SEED_PLACES.map(p => ({ ...p, id: p.id || crypto.randomUUID() }))
const demoHandlers = new Set()
const emitDemo = (type, payload) => demoHandlers.forEach(h => h({ type, payload }))

// ─────────────────────────────────────────────────────────────
// Modo Supabase: estado local optimista + cola offline
//
// - localRows: copia local de la tabla (se cachea para abrir la app sin señal)
// - queue: operaciones pendientes de subir (persistidas en localStorage)
// Todo cambio se aplica localmente al instante y emite un evento como si
// viniera del realtime; luego se intenta subir y, si falla, queda en cola.
// ─────────────────────────────────────────────────────────────
let localRows = configured ? readJSON(CACHE_KEY, []) : []
let queue = configured ? readJSON(QUEUE_KEY, []) : []

const pendingHandlers = new Set() // callbacks para el contador de pendientes (UI)
const localHandlers = new Set()   // suscriptores de eventos optimistas

const notifyPending = () => pendingHandlers.forEach(h => h(queue.length))
const saveQueue = () => { writeJSON(QUEUE_KEY, queue); notifyPending() }
const saveCache = () => writeJSON(CACHE_KEY, localRows)

const emitLocal = (type, payload) => localHandlers.forEach(h => h({ type, payload }))

// Aplica un cambio a la copia local (upsert / delete)
function applyLocal(type, row) {
  if (type === 'INSERT' || type === 'UPDATE') {
    const exists = localRows.some(p => p.id === row.id)
    localRows = exists
      ? localRows.map(p => (p.id === row.id ? { ...p, ...row } : p))
      : [row, ...localRows]
  } else if (type === 'DELETE') {
    localRows = localRows.filter(p => p.id !== row.id)
  }
  saveCache()
}

function enqueue(op) {
  queue.push({ ...op, queuedAt: Date.now() })
  saveQueue()
}

// ── Sincronización de la cola ────────────────────────────────
let flushing = false
export async function flushQueue() {
  if (!configured || flushing || !queue.length || !navigator.onLine) return
  flushing = true
  try {
    while (queue.length && navigator.onLine) {
      const item = queue[0]
      let serverError = null
      try {
        if (item.op === 'insert') {
          // El payload ya trae el id generado en local
          const { error } = await supabase.from('places').insert(item.payload)
          serverError = error
        } else if (item.op === 'update') {
          const { error } = await supabase.from('places').update(item.patch).eq('id', item.id)
          serverError = error
        } else if (item.op === 'remove') {
          const { error } = await supabase.from('places').delete().eq('id', item.id)
          serverError = error
        }
      } catch {
        break // fallo de red: dejar el ítem en cola y reintentar luego
      }
      if (serverError) {
        // Error real del servidor (p. ej. esquema): reintentar sería infinito.
        // Se descarta el ítem y se deja constancia en consola.
        console.warn('Operación offline descartada tras error del servidor:', serverError.message)
        queue.shift()
        saveQueue()
        continue
      }
      queue.shift()
      saveQueue()
    }
  } finally {
    flushing = false
  }
}

// Reintentos automáticos: al recuperar conexión, al volver a la pestaña,
// periódicamente y al arrancar la app.
if (configured && typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushQueue()
  })
  setInterval(flushQueue, 30_000)
  setTimeout(flushQueue, 1_500)
}

// ─────────────────────────────────────────────────────────────
// API pública db
// ─────────────────────────────────────────────────────────────
export const db = {
  async list() {
    if (!configured) return demoRows.map(p => ({ ...p }))
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      localRows = data ?? []
      saveCache()
      return localRows.map(p => ({ ...p }))
    } catch (e) {
      if (navigator.onLine) throw e           // error real del servidor
      return localRows.map(p => ({ ...p }))   // sin señal: servir la caché
    }
  },

  async insert(place) {
    if (!configured) {
      const row = { ...place, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      demoRows = [row, ...demoRows]
      emitDemo('INSERT', row)
      return row
    }
    // El id se genera en el cliente para poder usar la fila al instante
    // incluso antes de que llegue al servidor.
    const row = { ...place, id: place.id || crypto.randomUUID(), created_at: place.created_at || new Date().toISOString() }
    applyLocal('INSERT', row)
    emitLocal('INSERT', row)
    if (!navigator.onLine) {
      enqueue({ op: 'insert', id: row.id, payload: row })
      return row
    }
    try {
      const { data, error } = await supabase.from('places').insert(row).select().single()
      if (error) throw error
      applyLocal('UPDATE', data) // datos canónicos del servidor (timestamps, etc.)
      emitLocal('UPDATE', data)
      return data
    } catch (e) {
      if (!navigator.onLine || /fetch|network/i.test(e?.message || '')) {
        enqueue({ op: 'insert', id: row.id, payload: row })
        return row
      }
      throw e
    }
  },

  async update(id, patch) {
    if (!configured) {
      const row = { ...demoRows.find(p => p.id === id), ...patch }
      demoRows = demoRows.map(p => (p.id === id ? row : p))
      emitDemo('UPDATE', row)
      return row
    }
    const current = localRows.find(p => p.id === id) || {}
    const row = { ...current, ...patch, id }
    applyLocal('UPDATE', row)
    emitLocal('UPDATE', row)
    if (!navigator.onLine) {
      enqueue({ op: 'update', id, patch })
      return row
    }
    try {
      const { data, error } = await supabase.from('places').update(patch).eq('id', id).select().single()
      if (error) throw error
      applyLocal('UPDATE', data)
      emitLocal('UPDATE', data)
      return data
    } catch (e) {
      if (!navigator.onLine || /fetch|network/i.test(e?.message || '')) {
        enqueue({ op: 'update', id, patch })
        return row
      }
      throw e
    }
  },

  async remove(id) {
    if (!configured) {
      demoRows = demoRows.filter(p => p.id !== id)
      emitDemo('DELETE', { id })
      return
    }
    applyLocal('DELETE', { id })
    emitLocal('DELETE', { id })
    if (!navigator.onLine) {
      enqueue({ op: 'remove', id })
      return
    }
    try {
      const { error } = await supabase.from('places').delete().eq('id', id)
      if (error) throw error
    } catch (e) {
      if (!navigator.onLine || /fetch|network/i.test(e?.message || '')) {
        enqueue({ op: 'remove', id })
        return
      }
      throw e
    }
  },

  // Suscripción en tiempo real; devuelve función para desuscribirse.
  // Combina los eventos del servidor (Supabase Realtime) con los eventos
  // optimistas locales, para que la UI reaccione también sin conexión.
  subscribe({ onInsert, onUpdate, onDelete }) {
    if (!configured) {
      const handler = ({ type, payload }) => {
        if (type === 'INSERT') onInsert(payload)
        if (type === 'UPDATE') onUpdate(payload)
        if (type === 'DELETE') onDelete(payload.id)
      }
      demoHandlers.add(handler)
      return () => demoHandlers.delete(handler)
    }

    const dispatchLocal = ({ type, payload }) => {
      if (type === 'INSERT') onInsert(payload)
      if (type === 'UPDATE') onUpdate(payload)
      if (type === 'DELETE') onDelete(payload.id)
    }
    localHandlers.add(dispatchLocal)

    // Cada evento del servidor actualiza también la caché offline
    const cacheFromServer = (type, row) => {
      if (type === 'DELETE') {
        localRows = localRows.filter(p => p.id !== row?.id)
      } else if (row?.id) {
        applyLocal(type === 'INSERT' ? 'INSERT' : 'UPDATE', row)
        return
      }
      saveCache()
    }

    // Nombre único por suscripción: si React remonta el componente (StrictMode),
    // reusar el mismo topic devolvería el canal anterior y fallaría el .on()
    const channel = supabase
      .channel(`places-changes-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'places' },
        payload => {
          if (payload.eventType === 'INSERT' && payload.new) { cacheFromServer('INSERT', payload.new); onInsert(payload.new) }
          if (payload.eventType === 'UPDATE' && payload.new) { cacheFromServer('UPDATE', payload.new); onUpdate(payload.new) }
          if (payload.eventType === 'DELETE' && payload.old) { cacheFromServer('DELETE', payload.old); onDelete(payload.old.id) }
        },
      )
      .subscribe()

    return () => {
      localHandlers.delete(dispatchLocal)
      supabase.removeChannel(channel)
    }
  },
}

// Contador de operaciones pendientes de sincronizar (para el aviso en la UI)
export function onPendingChange(cb) {
  if (!configured) return () => {}
  pendingHandlers.add(cb)
  cb(queue.length)
  return () => pendingHandlers.delete(cb)
}

// ─────────────────────────────────────────────────────────────
// Tabla flights: horas editables de los tramos del itinerario
// (mismo patrón: upsert con realtime; sin cola offline porque los
// tramos son fijos y siempre existen en la base)
// ─────────────────────────────────────────────────────────────
let demoFlights = {}
const flightHandlers = new Set()

export const flightsDb = {
  async list() {
    if (!configured) return { ...demoFlights }
    const { data, error } = await supabase.from('flights').select('*')
    if (error) throw error
    return Object.fromEntries((data ?? []).map(f => [f.id, f]))
  },

  async save(leg) {
    if (!configured) {
      demoFlights = { ...demoFlights, [leg.id]: { ...demoFlights[leg.id], ...leg } }
      flightHandlers.forEach(h => h(leg))
      return demoFlights[leg.id]
    }
    const { data, error } = await supabase
      .from('flights')
      .upsert({ ...leg, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Suscripción realtime: llega el tramo actualizado desde otro dispositivo
  subscribe(onUpdate) {
    if (!configured) {
      const handler = (leg) => onUpdate(leg)
      flightHandlers.add(handler)
      return () => flightHandlers.delete(handler)
    }
    const channel = supabase
      .channel(`flights-changes-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flights' },
        payload => {
          const row = payload.new
          if (row) onUpdate(row)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}
