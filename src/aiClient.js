// ─────────────────────────────────────────────────────────────
// Cliente de IA (Gemini) con Google Search grounding.
// Devuelve respuestas con citas (enlaces a las fuentes) y permite
// extraer datos de lugares desde links/textos/capturas (Quick Add).
//
// La clave va en VITE_GEMINI_API_KEY (.env.local y Vercel).
// Es gratis en aistudio.google.com/apikey (límite diario generoso).
// ─────────────────────────────────────────────────────────────

const KEY = import.meta.env.VITE_GEMINI_API_KEY
export const aiConfigured = Boolean(KEY)

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

async function callGemini(contents, { system, useSearch = true } = {}) {
  if (!aiConfigured) throw new Error('IA no configurada: falta VITE_GEMINI_API_KEY')
  const body = { contents }
  if (system) body.systemInstruction = { parts: [{ text: system }] }
  if (useSearch) body.tools = [{ google_search: {} }]

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Gemini respondió ${res.status}: ${t.slice(0, 180)}`)
  }
  const data = await res.json()
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts || []).map((p) => p.text || '').join('')

  // Fuentes: formato clásico (groundingMetadata) y nuevo (annotations)
  const sources = []
  const pushSource = (uri, title) => {
    if (!uri || sources.some((s) => s.uri === uri)) return
    let host = title
    try { host = title || new URL(uri).hostname.replace('www.', '') } catch { /* url rara: usar tal cual */ }
    sources.push({ uri, title: host })
  }
  for (const c of cand?.groundingMetadata?.groundingChunks || []) {
    pushSource(c.web?.uri, c.web?.title)
  }
  for (const part of cand?.content?.parts || []) {
    for (const a of part.annotations || []) {
      if (a.type === 'url_citation') pushSource(a.url, a.title)
    }
  }
  return { text, sources }
}

// ── AI Overview: preguntar sobre un lugar, con búsqueda web y citas ──
export async function askAboutPlace(place, question, history = []) {
  const ctx = [
    `Lugar: ${place.name}`,
    `Ciudad: ${place.city || '—'} (${place.country || '—'})`,
    place.category && `Tipo: ${place.category}`,
    place.description && `Descripción conocida: ${place.description.slice(0, 400)}`,
    place.price && `Precio que tenemos anotado: ${place.price}`,
    place.opening_hours && `Horario anotado: ${place.opening_hours}`,
  ].filter(Boolean).join('\n')

  const system =
    'Eres el asistente de viaje de una familia colombiana que visita Europa en dic 2026 - ene 2027. ' +
    'Responde en español, breve y práctico (máximo ~150 palabras), con datos actuales y verificados mediante búsqueda. ' +
    'Si el dato puede cambiar (precios, horarios, reservas), aclárales que lo confirmen en la fuente oficial antes de ir.'

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: `Contexto del lugar:\n${ctx}\n\nPregunta: ${question}` }] },
  ]
  return callGemini(contents, { system, useSearch: true })
}

// ── Quick Add: extraer un lugar desde un link / texto / captura ──
export const QUICK_ADD_CATEGORIES = [
  'museo', 'iglesia', 'monumento', 'ruina_arqueologica',
  'parque', 'paseo_barrio', 'comida', 'otro',
]

export async function extractPlaceFromContent({ text, imageBase64, imageMime }) {
  const system =
    'Analiza el contenido (un enlace, texto o captura de pantalla sobre un lugar de interés para un viaje) ' +
    'e identifica el LUGAR TURÍSTICO principal que representa. Puede ser de YouTube, Instagram, TikTok, un blog o un artículo. ' +
    'Usa la búsqueda de Google para completar datos reales: coordenadas exactas, precios y horarios vigentes. ' +
    'El viaje es dic 2026 - ene 2027 por Madrid, París, Milán, Verona, Venecia, Florencia, Roma y Pompeya, pero el lugar puede ser cualquiera de esos destinos.\n\n' +
    'Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin explicación) con esta forma exacta:\n' +
    '{"name":"","city":"","country":"","category":"museo|iglesia|monumento|ruina_arqueologica|parque|paseo_barrio|comida|otro",' +
    '"lat":0.0,"lng":0.0,"description":"","highlights":"","opening_hours":"","price":"",' +
    '"reservation_required":false,"reservation_notes":"","must_see":false,' +
    '"assigned_date":null,"extraction_summary":""}\n\n' +
    'Reglas: lat/lng numéricos con 5+ decimales del punto exacto. description en español, 2-4 frases, mención breve de por qué es interesante (si viene de un video/red social, integre ese contexto). ' +
    'assigned_date: "YYYY-MM-DD" SOLO si el itinerario arriba coincide claramente; si no, null. opening_hours y price con lo que encuentres en la web; si no hay dato confiable, "" y anótalo en reservation_notes como "verificar antes del viaje". ' +
    'extraction_summary: 1 frase sobre qué era el recurso original.'

  const parts = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: text || 'Extrae el lugar principal de esta captura/página.' })

  const { text: raw, sources } = await callGemini([{ role: 'user', parts }], { system, useSearch: true })

  // Extraer el JSON aunque venga con texto alrededor o en un bloque ```json
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('La IA no devolvió un lugar identificable. Intenta con más contexto (título, canal, ciudad).')
  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('No pude interpretar la respuesta de la IA. Intenta de nuevo.')
  }
  return {
    place: {
      name: parsed.name || '',
      city: parsed.city || '',
      country: parsed.country || '',
      category: QUICK_ADD_CATEGORIES.includes(parsed.category) ? parsed.category : 'otro',
      lat: Number(parsed.lat) || null,
      lng: Number(parsed.lng) || null,
      description: parsed.description || '',
      highlights: parsed.highlights || '',
      opening_hours: parsed.opening_hours || '',
      price: parsed.price || '',
      reservation_required: Boolean(parsed.reservation_required),
      reservation_notes: parsed.reservation_notes || '',
      must_see: Boolean(parsed.must_see),
      assigned_date: parsed.assigned_date || null,
      extraction_summary: parsed.extraction_summary || '',
    },
    sources,
  }
}
