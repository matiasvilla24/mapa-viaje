import { useRef, useEffect } from 'react'
import { askAboutTrip, aiConfigured } from '../aiClient'
import { useChat } from '../aiChats'
import { useSheetDismiss, SheetClose } from './sheetDismiss'

// Chat libre con la IA sobre el viaje (botón ❓):
// el historial persiste y la respuesta sigue su curso aunque se cierre el
// modal (al reabrir, la conversación completa sigue ahí).
export default function AskAI({ onClose, places = [] }) {
  // Resumen corto del mapa para dar contexto a la IA (máx ~60 lugares)
  const tripSummary = places
    .slice(0, 60)
    .map((p) => `- ${p.name}${p.city ? ` (${p.city})` : ''}${p.price ? ` · ${p.price}` : ''}`)
    .join('\n')

  const chat = useChat('general', (q, history) => askAboutTrip(q, history, tripSummary))
  const messages = chat.messages
  const loading = chat.loading
  const error = chat.error
  const endRef = useRef(null)
  const sheet = useSheetDismiss(onClose)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, loading])

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl h-[85vh] sm:h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        {...sheet.handlers}
      >
        {/* Grabber (móvil) */}
        <div className="sm:hidden flex-shrink-0 flex justify-center pt-2 cursor-grab" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="p-4 pt-2 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">❓</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Pregunta a la IA</h2>
            <p className="text-[11px] text-slate-500">precios, horarios, transporte, clima… (se cierra sin perder la conversación)</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={chat.clear}
              className="flex-shrink-0 text-[11px] font-semibold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg"
              title="Borrar este historial"
            >
              🧹
            </button>
          )}
          <SheetClose onClick={onClose} />
        </div>

        {!aiConfigured ? (
          <div className="p-4 text-[13px] text-violet-700 bg-violet-50 rounded-xl m-4">
            🤖 Para activar la IA, agrega la variable <code>VITE_GEMINI_API_KEY</code> (gratis en aistudio.google.com/apikey) y redespliega.
          </div>
        ) : (
          <>
            {/* Conversación */}
            <div className="flex-1 overflow-y-auto thin-scroll px-3 py-3 space-y-2.5">
              {messages.length === 0 && !loading && (
                <div className="pt-2 pb-1">
                  <p className="text-[12px] text-slate-400 mb-2 px-1">Prueba preguntando:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '¿Qué clima vamos a encontrar en dic/ene?',
                      '¿Cuánto cuesta el tren Roma → Pompeya?',
                      '¿Qué documentación necesitamos?',
                      '¿Se puede pagar con tarjeta en Italia?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => chat.ask(q)}
                        className="text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2.5 py-1.5"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                  <div className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[92%] ${
                    m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-slate-700 border border-violet-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.sources?.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-violet-100 flex flex-wrap gap-1">
                        {m.sources.slice(0, 6).map((s, j) => (
                          <a
                            key={j}
                            href={s.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-white hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 truncate max-w-[180px]"
                            title={s.uri}
                          >
                            🔗 {s.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="text-[12px] text-violet-500 animate-pulse">🔍 Buscando en la web…</div>}
              {error && <p className="text-[11px] text-red-600">{error}</p>}
              <div ref={endRef} />
            </div>

            {/* Entrada */}
            <form
              onSubmit={(e) => { e.preventDefault(); const el = e.target.elements.q; chat.ask(el.value); el.value = '' }}
              className="flex-shrink-0 p-3 border-t border-slate-100 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <input
                name="q"
                defaultValue=""
                placeholder="Escribe tu pregunta…"
                className="flex-1 min-w-0 text-[13px] px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-violet-500"
                aria-label="Preguntar"
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
