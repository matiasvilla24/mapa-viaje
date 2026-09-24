import { useState, useRef } from 'react'
import { extractPlaceFromContent, mergePlaceInfo } from '../aiClient'
import { CATEGORIES, CATEGORY_KEYS, DATE_OPTIONS, fmtDate } from '../constants'
import { db, configured } from '../supabaseClient'

// Duplicado EXPLÍCITO: mismo nombre normalizado (sin acentos/puntuación).
// La proximidad NO decide — lugares distintos pueden estar a 50 m (una
// iglesia frente a un castillo). La cercanía solo genera un aviso suave.
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

// Modal "Quick Add": pegar un link (YouTube, Instagram, TikTok, artículo),
// un texto o una captura → la IA extrae el lugar → previsualizar → guardar.
export default function QuickAdd({ onClose, onSaved, existingPlaces = [] }) {
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setFilePreview] = useState(null)
  const [author, setAuthor] = useState(() => localStorage.getItem('mv_whoami') || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)   // { place, sources }
  const [editName, setEditName] = useState(null) // edición rápida post-extracción
  const [duplicate, setDuplicate] = useState(null)
  const [nearby, setNearby] = useState(null)
  const [mergeNote, setMergeNote] = useState(null)
  const fileInputRef = useRef(null)
  const saveAuthor = (v) => { setAuthor(v); localStorage.setItem('mv_whoami', v) }

  const pickFile = (f) => {
    if (!f) return
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
  }

  const analyze = async () => {
    setErr(null)
    const t = input.trim()
    if (!t && !file) { setErr('Pega un link, un texto o elige una captura.'); return }
    setBusy(true)
    setResult(null)
    try {
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
      const r = await extractPlaceFromContent({ text: t, imageBase64, imageMime })
      if (!r.place.name) throw new Error('La IA no identificó un lugar. Prueba con más contexto (título, canal, ciudad).')
      const dup = findDuplicate(existingPlaces, r.place)
      setResult(r)
      setDuplicate(dup)
      setNearby(dup ? null : findNearby(existingPlaces, r.place))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const save = async (overrides = {}) => {
    if (!result) return
    setBusy(true)
    setErr(null)
    try {
      const p = result.place
      const sourceUrl = input.trim() || null
      // extraction_summary es interno (ya se integra en notes); no es columna de la tabla
      const { extraction_summary: _summary, ...placeCols } = p

      // ── ¿Ya existe? → fusionar la info nueva en el pin existente ──
      if (duplicate) {
        const { patch, noteLine, samePlace } = await mergePlaceInfo(duplicate, p, sourceUrl)
        if (samePlace === false) {
          // La IA determinó que son lugares distintos: crear pin nuevo
          setDuplicate(null)
          const row = await db.insert({
            ...placeCols,
            ...overrides,
            notes: [
              p.extraction_summary ? `🤖 ${p.extraction_summary}` : null,
              p.notes,
            ].filter(Boolean).join('\n').slice(0, 2000) || null,
            source_url: sourceUrl,
            added_by: author.trim() || 'Anónimo',
          })
          onSaved?.(row)
          return
        }
        const newNotes = [duplicate.notes, noteLine].filter(Boolean).join('\n').slice(0, 2000)
        const row = await db.update(duplicate.id, {
          ...patch,
          notes: newNotes,
          ...(sourceUrl && !duplicate.source_url ? { source_url: sourceUrl } : {}),
          ...(p.must_see && !duplicate.must_see ? { must_see: true } : {}),
        })
        setMergeNote(noteLine)
        setBusy(false)
        setTimeout(() => onSaved?.(row), 1600)
        return
      }

      const row = await db.insert({
        ...placeCols,
        ...overrides,
        notes: [
          p.extraction_summary ? `🤖 ${p.extraction_summary}` : null,
          p.notes,
        ].filter(Boolean).join('\n').slice(0, 2000) || null,
        source_url: sourceUrl,
        added_by: author.trim() || 'Anónimo',
      })
      onSaved?.(row)
    } catch (e) {
      setErr('Error al guardar: ' + e.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Quick Add</h2>
            <p className="text-[11px] text-slate-500">pega un link, texto o captura — la IA extrae el lugar</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none -mt-1" aria-label="Cerrar">✕</button>
        </div>

        {/* Paso 1: entrada */}
        {!result && (
          <div className="p-4 space-y-3 overflow-y-auto thin-scroll">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'https://youtube.com/watch?v=…  ·  https://instagram.com/p/…  ·  https://tiktok.com/@…/video/…\n\n…o pega un texto: "este restaurante en Trastevere que vi en un reel"'}
              rows={4}
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-violet-500 resize-none"
            />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">y/o</span>
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
                📷 Subir captura
              </button>
              {file && (
                <div className="flex items-center gap-1.5">
                  <img src={preview} alt="" className="h-8 w-8 object-cover rounded border" />
                  <button onClick={() => { setFile(null); setFilePreview(null) }} className="text-[11px] text-red-500">quitar</button>
                </div>
              )}
            </div>

            {err && <p className="text-[12px] text-red-600">{err}</p>}

            <button
              onClick={analyze}
              disabled={busy || (!input.trim() && !file)}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-500 disabled:opacity-40"
            >
              {busy ? '🔍 Analizando con IA…' : '✨ Analizar con IA'}
            </button>

            <p className="text-[10px] text-slate-400 leading-snug">
              La IA busca en la web los datos reales del lugar (coordenadas, precios, horarios) y los completa por ti.
              Si el video/post menciona varios lugares, extrae el principal.
            </p>
          </div>
        )}

        {/* Paso 2: previsualización editable */}
        {result && (
          <div className="p-4 space-y-2.5 overflow-y-auto thin-scroll">
            <div className="flex items-center gap-1.5 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
              <span>🤖</span>
              <span className="flex-1">{result.place.extraction_summary || 'Lugar extraído por la IA'}</span>
              <button onClick={() => { setResult(null); setDuplicate(null); setMergeNote(null) }} className="font-bold text-violet-500 hover:text-violet-700">↺ volver</button>
            </div>

            {/* Aviso de lugar ya existente */}
            {duplicate && !mergeNote && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-[13px] font-bold text-amber-800">
                  ⚠️ Este lugar ya está en el mapa: <b>«{duplicate.name}»</b>
                  <span className="font-normal text-amber-700"> ({duplicate.city}{duplicate.added_by ? ` · agregado por ${duplicate.added_by}` : ''})</span>
                </p>
                <p className="text-[12px] text-amber-700 mt-1">
                  Al guardar, <b>no se duplica</b>: la IA incorporará la información nueva (datos curiosos, horarios, highlights) a la ficha existente.
                </p>
              </div>
            )}
            {nearby && !mergeNote && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[12px] text-slate-600">
                  📍 Queda a <b>{Math.round(distM(nearby, result.place))} m</b> de «{nearby.name}» — verifícalo en el mapa si crees que es el mismo sitio; si lo es, guarda igual y la IA los fusionará.
                </p>
              </div>
            )}
            {mergeNote && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                <p className="text-[13px] font-bold text-emerald-800">✅ Información fusionada con «{duplicate.name}»</p>
                <p className="text-[12px] text-emerald-700 mt-1">{mergeNote}</p>
              </div>
            )}

            {result.sources?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.sources.slice(0, 5).map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-100 hover:bg-slate-200 rounded-full px-2 py-0.5 text-slate-600 truncate max-w-[200px]" title={s.uri}>
                    🔗 {s.title}
                  </a>
                ))}
              </div>
            )}

            {/* Campos clave, editables antes de guardar */}
            <Field label="Nombre">
              <input value={editName ?? result.place.name} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ciudad"><input value={result.place.city} onChange={(e) => setResult({ ...result, place: { ...result.place, city: e.target.value } })} className={inputCls} /></Field>
              <Field label="País"><input value={result.place.country} onChange={(e) => setResult({ ...result, place: { ...result.place, country: e.target.value } })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lat">
                <input type="number" step="any" value={result.place.lat ?? ''} onChange={(e) => setResult({ ...result, place: { ...result.place, lat: e.target.value ? Number(e.target.value) : null } })} className={inputCls} />
              </Field>
              <Field label="Lng">
                <input type="number" step="any" value={result.place.lng ?? ''} onChange={(e) => setResult({ ...result, place: { ...result.place, lng: e.target.value ? Number(e.target.value) : null } })} className={inputCls} />
              </Field>
            </div>
            <Field label="Categoría">
              <select value={result.place.category} onChange={(e) => setResult({ ...result, place: { ...result.place, category: e.target.value } })} className={inputCls}>
                {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
              </select>
            </Field>
            <Field label="Descripción">
              <textarea value={result.place.description} onChange={(e) => setResult({ ...result, place: { ...result.place, description: e.target.value } })} rows={3} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Día asignado">
              <select value={result.place.assigned_date || ''} onChange={(e) => setResult({ ...result, place: { ...result.place, assigned_date: e.target.value || null } })} className={inputCls}>
                <option value="">— sin día —</option>
                {DATE_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={result.place.must_see} onChange={(e) => setResult({ ...result, place: { ...result.place, must_see: e.target.checked } })} className="w-4 h-4 accent-emerald-600" />
              ⭐ Imperdible
            </label>

            {err && <p className="text-[12px] text-red-600">{err}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => save()}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 disabled:opacity-40"
              >
                {busy ? (duplicate ? '🔄 Fusionando con el lugar existente…' : 'Guardando…') : duplicate ? '🔄 Actualizar el lugar existente' : '✅ Guardar en el mapa'}
              </button>
              <button onClick={() => { setResult(null); setDuplicate(null); setMergeNote(null) }} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
