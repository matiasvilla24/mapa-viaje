// Chats de IA en segundo plano con historial persistente.
// Cada chat (el general ❓ o el de un lugar en su modal) vive FUERA del
// componente que lo abre: se puede cerrar la conversación, seguir usando la
// app e incluso bloquear el celular — la respuesta llega igual y, al reabrir,
// todo el historial del chat sigue ahí (localStorage).
import { useEffect, useState } from 'react'

const KEY = 'mv_ai_chats'
const MAX_MESSAGES = 60 // historial máximo por chat

let threads = (() => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
})()
const listeners = new Map() // chatId -> Set de callbacks suscritos

const notify = (id) => { (listeners.get(id) || []).forEach((cb) => cb()) }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(threads)) } catch { /* storage lleno: ignorar */ }
}

function getThread(id) {
  return threads[id] || { messages: [], loading: false, error: null }
}

function setThread(id, patch) {
  threads = { ...threads, [id]: { ...getThread(id), ...patch } }
  persist()
  notify(id)
}

// Hook: suscribe un componente a un chat. `asker(question, history)` debe
// devolver una promesa { text, sources } (askAboutTrip, askAboutPlace, …).
export function useChat(chatId, asker) {
  const [, force] = useState(0)
  useEffect(() => {
    let set = listeners.get(chatId)
    if (!set) { set = new Set(); listeners.set(chatId, set) }
    const cb = () => force((n) => n + 1)
    set.add(cb)
    return () => set.delete(cb)
  }, [chatId])

  const ask = (q) => {
    const question = (q || '').trim()
    if (!question || getThread(chatId).loading) return
    const cur = getThread(chatId)
    const history = cur.messages.map(({ role, text }) => ({ role, text }))
    setThread(chatId, {
      messages: [...cur.messages, { role: 'user', text: question }].slice(-MAX_MESSAGES),
      loading: true,
      error: null,
    })
    Promise.resolve(asker(question, history))
      .then(({ text, sources }) => {
        const c2 = getThread(chatId)
        setThread(chatId, {
          messages: [...c2.messages, { role: 'model', text, sources }].slice(-MAX_MESSAGES),
          loading: false,
        })
      })
      .catch((e) => {
        setThread(chatId, { loading: false, error: e.message })
      })
  }

  const clear = () => setThread(chatId, { messages: [], error: null })

  return { ...getThread(chatId), ask, clear }
}

// ¿Cuántos mensajes tiene cada chat? (para badges futuros)
export const chatStats = () =>
  Object.fromEntries(Object.entries(threads).map(([k, v]) => [k, v.messages?.length || 0]))
