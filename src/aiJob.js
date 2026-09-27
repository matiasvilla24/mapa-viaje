// Análisis de Quick Add en segundo plano: el trabajo de la IA vive FUERA del
// modal, así que el usuario puede cerrarlo, seguir usando la app, minimizar
// la pestaña o bloquear el celular — al volver, el resultado lo espera.
// (Un fetch en curso sigue ejecutándose aunque se desmonte el componente;
// al terminar dispara una notificación y guarda el resultado para reabrirlo.)
import { extractMultiplePlacesFromContent } from './aiClient'

const RESULT_KEY = 'mv_quickadd_result'

let current = null // { input, startedAt } | null
const listeners = new Set()

export const onJobChange = (cb) => {
  listeners.add(cb)
  cb(getState())
  return () => listeners.delete(cb)
}

const notify = () => listeners.forEach((cb) => cb(getState()))
const getState = () => ({
  running: Boolean(current),
  input: current?.input || '',
  result: readResult(),
})

function readResult() {
  try { return JSON.parse(localStorage.getItem(RESULT_KEY)) } catch { return null }
}
function writeResult(r) {
  try {
    if (r) localStorage.setItem(RESULT_KEY, JSON.stringify(r))
    else localStorage.removeItem(RESULT_KEY)
  } catch { /* storage lleno: ignorar */ }
}

// Lanza el análisis. Devuelve true si arrancó (no hay otro en curso).
export function startQuickAddJob({ text, imageBase64, imageMime, input }) {
  if (current) return false
  current = { input, startedAt: Date.now() }
  notify()
  extractMultiplePlacesFromContent({ text, imageBase64, imageMime })
    .then(({ places, sources }) => {
      writeResult({
        input,
        places,
        sources,
        finishedAt: Date.now(),
        error: places.length && places[0].name ? null : 'La IA no identificó lugares. Prueba con más contexto.',
      })
    })
    .catch((e) => {
      writeResult({ input, places: [], sources: [], finishedAt: Date.now(), error: e.message })
    })
    .finally(() => {
      current = null
      notify()
    })
  return true
}

export function clearQuickAddResult() {
  writeResult(null)
  notify()
}

// Suma de años no; título del badge: segundos transcurridos los maneja el UI.
export const isJobRunning = () => Boolean(current)
