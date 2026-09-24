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

// Cadena de modelos: el primero saturado o sin cuota salta al siguiente.
// (el plan gratuito tiene límites muy justos por minuto y picos de demanda)
const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest']

async function callGeminiOnce(model, contents, { system, useSearch = true, retriesLeft = 1 } = {}) {
  const body = { contents, model }
  if (system) body.systemInstruction = { parts: [{ text: system }] }
  if (useSearch) body.tools = [{ google_search: {} }]

  const doFetch = () => fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  })

  // Reintento único tras una pausa ante 429 (cuota por minuto) o 503 (saturación)
  let res = await doFetch()
  if ((res.status === 429 || res.status === 503) && retriesLeft > 0) {
    await new Promise((r) => setTimeout(r, 8000))
    res = await doFetch()
  }
  return res
}

async function callGemini(contents, { system, useSearch = true } = {}) {
  if (!aiConfigured) throw new Error('IA no configurada: falta VITE_GEMINI_API_KEY')
  let lastErr = null
  for (const model of MODELS) {
    const res = await callGeminiOnce(model, contents, { system, useSearch })
    if (res.ok) {
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
    const t = await res.text().catch(() => '')
    lastErr = new Error(
      res.status === 429
        ? 'Se alcanzó el límite gratuito de la IA por ahora (se renueva cada minuto). Espera un momentito y vuelve a preguntar. 🙏'
        : res.status === 503
          ? 'La IA está saturada ahora mismo. Prueba de nuevo en un minuto. 🙏'
          : `Gemini respondió ${res.status}: ${t.slice(0, 180)}`,
    )
  }
  throw lastErr
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
  try {
    return await callGemini(contents, { system, useSearch: true })
  } catch (e) {
    // Cuota de búsqueda agotada o modelo saturado: responder igual con
    // conocimiento propio (sin citas en vivo) en vez de bloquear al usuario.
    const r = await callGemini(contents, { system, useSearch: false, retriesLeft: 0 })
    return { ...r, text: `⚠️ _Respuesta sin búsqueda web en vivo (límite temporal de Google alcanzado — puede estar desactualizada)._\n\n${r.text}` }
  }
}

// ── Lectura del contenido real de un enlace ─────────────────────
// Instagram/TikTok bloquean el acceso directo; se intenta primero la
// vía oficial (oEmbed de YouTube) y después un lector público. Si nada
// funciona, se devuelve null y la IA NO debe inventar el lugar.
async function fetchPageText(url) {
  try {
    if (/youtube\.com|youtu\.be/.test(url)) {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      if (r.ok) {
        const j = await r.json()
        return `Título del video: "${j.title}". Canal: ${j.author_name}.`
      }
    }
    const r = await fetch('https://r.jina.ai/' + url, { headers: { Accept: 'text/plain' } })
    if (r.ok) {
      const t = await r.text()
      if (t && t.length > 40) return t.slice(0, 6000)
    }
  } catch { /* sin acceso: devolver null */ }
  return null
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
    'REGLA CRÍTICA contra inventar: si solo tienes el enlace pero NO el contenido real (no venió texto, título ni imagen del post), ' +
    'NO supongas ni deduzcas el lugar — responde con "name":"" y en extraction_summary escribe que no se pudo acceder al contenido del enlace. ' +
    'Inventar un lugar plausibles (ej. deducir "Coliseo" por ser un reel de Roma) es un error grave.\n\n' +
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

  // Si pegaron un enlace, intentar leer su contenido real y adjuntarlo
  const urlMatch = (text || '').match(/https?:\/\/[^\s]+/)
  let pageFailed = false
  if (urlMatch) {
    const pageText = await fetchPageText(urlMatch[0])
    if (pageText) {
      parts.push({ text: `Contenido real obtenido del enlace (${urlMatch[0]}):\n${pageText}\n\nUsa ESTE contenido como fuente principal de la extracción.` })
    } else {
      pageFailed = true
      parts.push({ text: 'NOTA: el contenido del enlace NO pudo ser accedido (la plataforma lo bloquea). Si no hay suficiente contexto en el resto del mensaje, responde con name vacío en vez de inventar.' })
    }
  }

  const contents = [{ role: 'user', parts }]

  // Intento 1: con búsqueda de Google (datos precisos y citas).
  // Si la cuota de búsqueda falla, intento 2: sin búsqueda — el modelo
  // extrae el lugar con su conocimiento y deja los precios/horarios
  // marcados como "verificar antes del viaje". Nunca bloquea al usuario.
  let raw, sources = []
  try {
    ;({ text: raw, sources } = await callGemini(contents, { system, useSearch: true }))
  } catch {
    ;({ text: raw, sources } = await callGemini(contents, {
      system: system + '\n\nNOTA: la búsqueda web no está disponible en este momento; usa tu conocimiento propio. Ante cualquier dato que pueda haber cambiado (precios, horarios), anótalo en reservation_notes con la advertencia "verificar antes del viaje".',
      useSearch: false,
    }))
  }

  // Extraer el JSON aunque venga con texto alrededor o en un bloque ```json
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('La IA no devolvió un lugar identificable. Intenta con más contexto (título, canal, ciudad).')
  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('No pude interpretar la respuesta de la IA. Intenta de nuevo.')
  }
  if (!parsed.name) {
    throw new Error(
      pageFailed
        ? 'No se pudo leer el contenido del enlace (Instagram/TikTok bloquean el acceso automático). Truco: copia el TEXTO del post/caption y pégalo aquí, o sube una captura de pantalla del reel. 📸'
        : 'La IA no identificó un lugar claro en el contenido. Prueba con más contexto.',
    )
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
