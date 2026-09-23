import { useState, useRef, useEffect } from 'react'
import { contributionsDb } from '../supabaseClient'
import { configured } from '../supabaseClient'

const KIND_META = {
  imagen:   { icon: '🖼️', label: 'Imagen' },
  enlace:   { icon: '🔗', label: 'Enlace' },
  contacto: { icon: '👤', label: 'Contacto' },
  nota:     { icon: '📝', label: 'Nota' },
}

// Sección "Datos de la familia": lo que cada viajero agrega al lugar
// (imágenes de referencia, enlaces web, contactos y notas de interés).
export default function FamilyData({ place, contribs, setContribs }) {
  const [author, setAuthor] = useState(() => localStorage.getItem('mv_whoami') || '')
  const [kind, setKind] = useState('nota')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef(null)

  const saveAuthor = (v) => { setAuthor(v); localStorage.setItem('mv_whoami', v) }

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    const value = text.trim()
    const theUrl = url.trim()
    if (!value && !theUrl && kind !== 'imagen') return
    setBusy(true)
    try {
      let finalUrl = theUrl || null
      // Imagen: subida directa por archivo
      if (kind === 'imagen' && fileRef.current?.files?.[0]) {
        const file = fileRef.current.files[0]
        if (!configured) { setErr('Conecta Supabase para subir imágenes.'); setBusy(false); return }
        finalUrl = await contributionsDb.uploadImage(place.id, file)
        if (!finalUrl) { setErr('No se pudo subir la imagen.'); setBusy(false); return }
      }
      if (kind === 'enlace' && finalUrl && !/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl

      const row = await contributionsDb.add({
        place_id: place.id,
        kind,
        value: value || null,
        url: finalUrl,
        author: author.trim() || 'Anónimo',
      })
      setContribs((cur) => [...cur, row])
      setText('')
      setUrl('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const del = async (id) => {
    try {
      await contributionsDb.remove(id)
      setContribs((cur) => cur.filter((c) => c.id !== id))
    } catch (e) { setErr(e.message) }
  }

  const isImage = kind === 'imagen'

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
      <div className="px-3 py-2 bg-emerald-100/70">
        <h3 className="text-[12px] font-bold text-emerald-900">👨‍👩‍👧‍👦 Datos de la familia</h3>
        <p className="text-[10px] text-emerald-700">imágenes, enlaces, contactos y notas de los viajeros</p>
      </div>

      {/* Lista */}
      {contribs.length > 0 && (
        <div className="p-3 space-y-2.5">
          {contribs.map((c) => {
            const meta = KIND_META[c.kind] || KIND_META.nota
            return (
              <div key={c.id} className="flex items-start gap-2.5 group">
                <span className="text-sm leading-5 flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  {c.kind === 'imagen' && c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer">
                      <img src={c.url} alt={c.value || 'Imagen del lugar'} className="rounded-lg max-h-44 w-auto border border-emerald-100 mb-1" />
                    </a>
                  )}
                  {c.value && <p className="text-[13px] text-slate-700 leading-snug whitespace-pre-wrap">{c.value}</p>}
                  {c.url && c.kind !== 'imagen' && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-[12px] text-blue-600 hover:underline break-all">
                      {c.value ? c.url : c.url.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {meta.label} · {c.author}
                  </p>
                </div>
                <button
                  onClick={() => del(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-red-400 hover:text-red-600 flex-shrink-0 px-1"
                  title="Eliminar"
                >✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={submit} className="p-3 pt-1 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(KIND_META).map(([k, m]) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                kind === k ? 'bg-emerald-600 text-white border-emerald-600 font-bold' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {isImage && (
          <input
            ref={(el) => (fileRef.current = el)}
            type="file"
            accept="image/*"
            className="w-full text-[12px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[12px] file:font-semibold file:cursor-pointer"
          />
        )}

        {kind !== 'imagen' && (
          <input
            value={kind === 'enlace' || kind === 'contacto' ? url : ''}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={kind === 'enlace' ? 'https://… (enlace web)' : 'enlace o referencia del contacto (opcional)'}
            className="w-full text-[13px] px-3 py-2 rounded-lg border border-emerald-200 bg-white outline-none focus:border-emerald-400"
          />
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={{
            nota: 'Dato de interés, tip, experiencia…',
            enlace: '¿Por qué es útil este enlace? (opcional)',
            contacto: 'Nombre, teléfono, horario de contacto…',
            imagen: 'Descripción de la imagen (opcional)',
          }[kind]}
          rows={2}
          className="w-full text-[13px] px-3 py-2 rounded-lg border border-emerald-200 bg-white outline-none focus:border-emerald-400 resize-none"
        />

        <div className="flex items-center gap-2">
          <input
            value={author}
            onChange={(e) => saveAuthor(e.target.value)}
            placeholder="Tu nombre"
            className="w-28 text-[12px] px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Agregar'}
          </button>
        </div>

        {err && <p className="text-[11px] text-red-600">{err}</p>}
      </form>
    </div>
  )
}
