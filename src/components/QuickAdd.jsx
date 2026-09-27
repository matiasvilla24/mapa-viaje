import { useState, useRef, useEffect } from 'react'
import { mergePlaceInfo } from '../aiClient'
import { startQuickAddJob, onJobChange, clearQuickAddResult } from '../aiJob'
import { CATEGORIES, CATEGORY_KEYS, PEOPLE } from '../constants'
import { db } from '../supabaseClient'
import { useSheetDismiss, SheetClose } from './sheetDismiss'

// Duplicado EXPLÍCITO: mismo nombre normalizado (sin acentos/puntuación).
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const distM = (a, b) => {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return Infinity
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function findDuplicate(existingPlaces, candidate) {
  const n = norm(candidate.name)
  if (!n) return null
  return existingPlaces.find((p) => norm(p.name) === n) || null
}
function findNearby(existingPlaces, candidate) {
  return existingPlaces.find((p) => p !== undefined && distM(p, candidate) < 200) || null
}
function looksMulti(places) {
  if (places.length < 2) return false
  const cities = new Set(places.map((p) => p.city).filter(Boolean))
  if (cities.size > 1) return true
  const names = places.map((p) => norm(p.name)).filter(Boolean)
  return new Set(names).size === names.length
}

// Modal "Quick Add": link, texto, captura o descripción libre ("los 13
// obeliscos egipcios de Roma"). La IA trabaja en segundo plano: el modal
// puede cerrarse y el resultado queda listo al volver (MultiAdd).
export default function QuickAdd({ onClose, onSaved, existingPlaces = [] }) {
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setFilePreview] = useState(null)
  const [authorTag, setAuthorTag] = useState(() => localStorage.getItem('mv_whoami_tag') || 'mati')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [results, setResults] = useState(null) // { items, sources, multi }
  const [addedCount, setAddedCount] = useState(0)
  const [done, setDone] = useState(false)
  const [mergeNote, setMergeNote] = useState(null)
  const [editName, setEditName] = useState(null)
  const [current, setCurrent] = useState(0)
  const fileInputRef = useRef(null)
  const sheet = useSheetDismiss(onClose)
  const saveAuthor = (v) => { setAuthorTag(v); localStorage.setItem('mv_whoami_tag', v) }
  const authorLabel = (k) => PEOPLE.find((p) => p.key === k)?.label || ''

  // Resultado pendiente de un análisis previo (o en curso)
  useEffect(() => onJobChange(({ running: r, result }) => {
    setRunning(r)
    if (result) {
      if (result.error) { setErr(result.error); clearQuickAddResult() ; return }
      if (!results) {
        const items = (result.places || []).map((place) => ({
          place,
          duplicate: findDuplicate(existingPlaces, place),
          nearby: findDuplicate(existingPlaces, place) ? null : findNearby(existingPlaces, place),
        }))
        setResults({ items, sources: result.sources || [], multi: looksMulti(result.places || []) })
        setCurrent(0)
        setAddedCount(0)
        setDone(false)
        clearQuickAddResult()
      }
    }
  }), [existingPlaces, results])

  // Cronómetro del análisis en curso
  useEffect(() => {
    if (!running) return
    const t0 = Date.now()
    const iv = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [running])

  const pickFile = (f) => {
    if (!f) return
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
  }

  const resetResults = () => {
    setResults(null)
    setMergeNote(null)
    setEditName(null)
    setCurrent(0)
  }

  const analyze = async () => {
    setErr(null)
    const t = input.trim()
    if (!t && !file) { setErr('Pega un link, texto, captura o escribe qué buscar.'); return }
    if (running) { setErr('Ya hay un análisis en curso.'); return }

    let imageBase64 = null
    let imageMime = null
    if (file) {
      imageMime = file.type || 'image/jpeg'
      const buf = await file.arrayBuffer()
      let binary = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      imageBase64 = btoa(binary)
    }
    // El trabajo sigue aunque cierres el modal o bloques el celular
    startQuickAddJob({ text: t, imageBase64, imageMime, input: t || 'captura' })
  }

  const approveCurrent = async () => {
    const it = results.items[current]
    if (!it) return
    setBusy(true)
    setErr(null)
    try {
      const p = it.place
      const sourceUrl = /^https?:\/\//.test(results.input || '') ? results.input : null
      const { extraction_summary: _s, ...placeCols } = p
      const nameFinal = editName != null ? editName : p.name

      let row
      if (it.duplicate) {
        const { patch, noteLine, samePlace } = await mergePlaceInfo(it.duplicate, p, sourceUrl)
        if (samePlace === false) {
          row = await db.insert({
            ...placeCols,
            name: nameFinal,
            notes: [p.extraction_summary ? `🤖 ${p.extraction_summary}` : null, p.notes].filter(Boolean).join('\n').slice(0, 2000) || null,
            source_url: sourceUrl,
            added_by: authorLabel(authorTag),
            added_by_tag: authorTag,
          })
        } else {
          const newNotes = [it.duplicate.notes, noteLine].filter(Boolean).join('\n').slice(0, 2000)
          row = await db.update(it.duplicate.id, {
            ...patch,
            notes: newNotes,
            ...(sourceUrl && !it.duplicate.source_url ? { source_url: sourceUrl } : {}),
          })
        }
      } else {
        row = await db.insert({
          ...placeCols,
          name: nameFinal,
          notes: [p.extraction_summary ? `🤖 ${p.extraction_summary}` : null, p.notes].filter(Boolean).join('\n').slice(0, 2000) || null,
          source_url: sourceUrl,
          added_by: authorLabel(authorTag),
          added_by_tag: authorTag,
        })
      }
      setAddedCount((c) => c + 1)
      setEditName(null)
      nextItem()
      return row
    } catch (e) {
      setErr('Error al guardar: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const nextItem = () => {
    if (current + 1 >= results.items.length) setDone(true)
    else {
      setCurrent((c) => c + 1)
      setMergeNote(null)
      setEditName(null)
    }
  }

  const item = results?.items[current]

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={running ? undefined : onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        {...(running ? {} : sheet.handlers)}
      >
        {/* Grabber (móvil) */}
        <div className="sm:hidden flex-shrink-0 flex justify-center pt-2 cursor-grab" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="p-4 pt-2 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Quick Add</h2>
            <p className="text-[11px] text-slate-500">link, texto, captura o descripción</p>
          </div>
          {!running && <SheetClose onClick={onClose} />}
        </div>

        {/* Análisis en segundo plano */}
        {running && (
          <div className="p-6 text-center space-y-2">
            <div className="text-4xl animate-pulse">🔍</div>
            <p className="text-sm font-bold text-slate-800">Buscando lugares…</p>
            <p className="text-[12px] text-slate-500">{elapsed}s · puedes cerrar esto, seguir usando el mapa o bloquear el celular: el resultado te espera al volver.</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200">
              Dejar trabajando
            </button>
          </div>
        )}

        {/* Paso 1: entrada */}
        {!running && !results && (
          <div className="p-4 space-y-3 overflow-y-auto thin-scroll">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'https://instagram.com/p/… · un texto copiado · una captura\n\n…o describe lo que buscas: "los 13 obeliscos egipcios de Roma"'}
              rows={4}
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-violet-500 resize-none"
            />

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold"
              >
                📷 Captura
              </button>
              {file && (
                <div className="flex items-center gap-1.5">
                  <img src={preview} alt="" className="h-8 w-8 object-cover rounded border" />
                  <button onClick={() => { setFile(null); setFilePreview(null) }} className="text-[11px] text-red-500">quitar</button>
                </div>
              )}
            </div>

            {/* Etiqueta de quién agrega (Mati por defecto) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">¿Quién lo agrega?</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PEOPLE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => saveAuthor(p.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                      authorTag === p.key ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                    style={authorTag === p.key ? { background: p.color } : {}}
                  >
                    {authorTag === p.key ? '● ' : ''}{p.label}
                  </button>
                ))}
              </div>
            </div>

            {err && <p className="text-[12px] text-red-600">{err}</p>}

            <button
              onClick={analyze}
              disabled={(!input.trim() && !file)}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-500 disabled:opacity-40"
            >
              ✨ Buscar
            </button>
          </div>
        )}

        {/* Paso 2: MultiAdd — un lugar a la vez */}
        {results && item && !done && (
          <div className="p-4 space-y-2.5 overflow-y-auto thin-scroll">
            {results.multi && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-[13px] font-bold text-violet-800">
                  🎯 {results.items.length} lugares encontrados
                </p>
                <p className="text-[12px] text-violet-700 mt-0.5">
                  Aprueba o descarta cada uno. {results.items.length - current} restante{results.items.length - current !== 1 ? 's' : ''} · {addedCount} agregado{addedCount !== 1 ? 's' : ''}.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {results.items.map((it, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        i < current ? 'bg-emerald-100 text-emerald-700'
                          : i === current ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {i < current ? '✓ ' : ''}{it.place.name.slice(0, 24) || `#${i + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!results.multi && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
                <span>🤖</span>
                <span className="flex-1">{item.place.extraction_summary || 'Lugar encontrado'}</span>
                <button onClick={resetResults} className="font-bold text-violet-500 hover:text-violet-700">↺</button>
              </div>
            )}

            {item.duplicate && !mergeNote && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-[13px] font-bold text-amber-800">
                  ⚠️ Ya está en el mapa: <b>«{item.duplicate.name}»</b>
                </p>
                <p className="text-[12px] text-amber-700 mt-1">Al aprobar, la IA suma la info nueva a la ficha existente.</p>
              </div>
            )}
            {item.nearby && !mergeNote && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[12px] text-slate-600">
                  📍 A <b>{Math.round(distM(item.nearby, item.place))} m</b> de «{item.nearby.name}» — revísalo si crees que es el mismo sitio.
                </p>
              </div>
            )}
            {mergeNote && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                <p className="text-[13px] font-bold text-emerald-800">✅ Fusionado con «{item.duplicate.name}»</p>
                <p className="text-[12px] text-emerald-700 mt-1">{mergeNote}</p>
              </div>
            )}

            {results.sources?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {results.sources.slice(0, 5).map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-100 hover:bg-slate-200 rounded-full px-2 py-0.5 text-slate-600 truncate max-w-[200px]" title={s.uri}>
                    🔗 {s.title}
                  </a>
                ))}
              </div>
            )}

            <Field label="Nombre">
              <input value={editName ?? item.place.name} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ciudad"><input value={item.place.city} onChange={(e) => patchPlace({ city: e.target.value })} className={inputCls} /></Field>
              <Field label="País"><input value={item.place.country} onChange={(e) => patchPlace({ country: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lat">
                <input type="number" step="any" value={item.place.lat ?? ''} onChange={(e) => patchPlace({ lat: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
              </Field>
              <Field label="Lng">
                <input type="number" step="any" value={item.place.lng ?? ''} onChange={(e) => patchPlace({ lng: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
              </Field>
            </div>
            <Field label="Categoría">
              <select value={item.place.category} onChange={(e) => patchPlace({ category: e.target.value })} className={inputCls}>
                {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
              </select>
            </Field>
            <Field label="Descripción">
              <textarea value={item.place.description} onChange={(e) => patchPlace({ description: e.target.value })} rows={3} className={inputCls + ' resize-none'} />
            </Field>

            <label className="flex items-center gap-2 text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
              <input
                type="checkbox"
                checked={Boolean(item.place.must_see)}
                onChange={(e) => patchPlace({ must_see: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
              ⭐ Imperdible <span className="text-[10px] text-slate-400">(lo decides tú)</span>
            </label>

            {err && <p className="text-[12px] text-red-600">{err}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={approveCurrent}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 disabled:opacity-40"
              >
                {busy ? (item.duplicate ? '🔄 Fusionando…' : 'Guardando…') : item.duplicate ? '🔄 Aprobar (actualizar)' : '✅ Aprobar'}
              </button>
              <button
                onClick={nextItem}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
              >
                ⏭{results.multi && current + 1 < results.items.length ? ' Siguiente' : ''}
              </button>
            </div>
          </div>
        )}

        {/* MultiAdd terminado */}
        {results && done && (
          <div className="p-6 space-y-3 text-center">
            <p className="text-4xl">🎉</p>
            <h3 className="text-lg font-bold text-slate-900">Listo</h3>
            <p className="text-sm text-slate-600">
              {addedCount > 0
                ? `${addedCount} ${addedCount === 1 ? 'lugar agregado' : 'lugares agregados'}.`
                : 'No se agregó ningún lugar.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={resetResults} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                ↺ Otra búsqueda
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500">
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  function patchPlace(patch) {
    setResults({
      ...results,
      items: results.items.map((it, i) => (i === current ? { ...it, place: { ...it.place, ...patch } } : it)),
    })
  }
}

const inputCls = 'w-full text-[13px] px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:border-violet-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}
