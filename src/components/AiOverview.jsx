import { useState, useRef, useEffect } from 'react'
import { askAboutPlace, aiConfigured } from '../aiClient'

// Sección "AI Overview": preguntas sobre el lugar respondidas con
// búsqueda web de Google y citas con enlaces a las fuentes.
export default function AiOverview({ place }) {
  const [messages, setMessages] = useState([]) // { role: 'user'|'model', text, sources }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const ask = async (q) => {
    const question = q.trim()
    if (!question || loading) return
    setInput('')
    setError(null)
    const userMsg = { role: 'user', text: question }
    setMessages((m) => [...m, userMsg])
    setLoading(true)
    try {
      const history = messages.map(({ role, text }) => ({ role, text }))
      const { text, sources } = await askAboutPlace(place, question, history)
      setMessages((m) => [...m, { role: 'model', text, sources }])
    } catch (e) {
      setError(e.message)
      setMessages((m) => m.filter((x) => x !== userMsg))
    } finally {
      setLoading(false)
    }
  }

  if (!aiConfigured) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700">
        🤖 <b>AI Overview</b> — para activarla, agrega la variable <code>VITE_GEMINI_API_KEY</code> (gratis en aistudio.google.com/apikey) en Vercel y redespliega.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 bg-violet-100/70">
        <span className="text-sm">🤖</span>
        <h3 className="text-[12px] font-bold text-violet-900">AI Overview</h3>
        <span className="text-[10px] text-violet-500">pregúntale lo que quieras · responde con fuentes</span>
      </div>

      {/* Conversación */}
      {messages.length > 0 && (
        <div className="px-3 py-2 space-y-2.5 max-h-72 overflow-y-auto thin-scroll">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[92%] ${
                m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-violet-100'
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
                        className="text-[10px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 truncate max-w-[180px]"
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
          {loading && (
            <div className="text-[12px] text-violet-500 animate-pulse">🔍 Buscando en la web…</div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Sugerencias iniciales */}
      {messages.length === 0 && !loading && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5">
          {['¿Cuánto cuesta entrar y hay que reservar?', '¿Qué no me puedo perder?', '¿Cómo llegar desde el centro?'].map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-[11px] bg-white hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2.5 py-1"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-3 pt-1.5 text-[11px] text-red-600">{error}</p>}

      {/* Entrada */}
      <form
        onSubmit={(e) => { e.preventDefault(); ask(input) }}
        className="p-2.5 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pregunta sobre ${place.name}…`}
          className="flex-1 min-w-0 text-[13px] px-3 py-2 rounded-lg border border-violet-200 bg-white outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-violet-500"
          aria-label="Preguntar"
        >
          ➤
        </button>
      </form>
    </div>
  )
}
