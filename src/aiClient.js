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

// ── Fusión: info nueva sobre un lugar que ya existe en el mapa ──
// Devuelve un patch con los campos combinados (sin repetir contenido)
// y una línea de nota explicando qué se añadió y de dónde.
export async function mergePlaceInfo(existing, incoming, sourceUrl) {
  const system =
    'Fusiona información de un lugar turístico. Recibes el lugar YA GUARDADO y datos NUEVOS extraídos de un enlace/artículo/video. ' +
    'PRIMERO decide si hablan del MISMO lugar: lugares distintos pueden estar muy cerca (una iglesia frente a un castillo no son el mismo sitio). ' +
    'Si NO es el mismo lugar, responde {"same_place":false} y nada más.\n' +
    'Si ES el mismo lugar, responde ÚNICAMENTE con JSON: {"same_place":true,"description":"","highlights":"","price":"","opening_hours":"","reservation_notes":"","note_line":""}\n' +
    'Reglas: description = versión combinada SIN repetir contenido (máx 5 frases, español). highlights = lista combinada separada por comas, sin duplicar ítems. ' +
    'price/opening_hours/reservation_notes: solo reemplaza si el dato nuevo es concreto y el guardado está vacío o dice "verificar"; si no, copia el valor guardado intacto. ' +
    'note_line = UNA línea tipo "🔄 Añadido desde <fuente>: <qué se sumó>". Si la info nueva no aporta nada nuevo, devuelve los campos del guardado sin cambios y dilo en note_line.'

  const payload = {
    guardado: {
      name: existing.name, city: existing.city,
      description: existing.description || '', highlights: existing.highlights || '',
      price: existing.price || '', opening_hours: existing.opening_hours || '',
      reservation_notes: existing.reservation_notes || '', notes: existing.notes || '',
    },
    nuevo: {
      description: incoming.description || '', highlights: incoming.highlights || '',
      price: incoming.price || '', opening_hours: incoming.opening_hours || '',
      reservation_notes: incoming.reservation_notes || '',
      resumen_extraccion: incoming.extraction_summary || '',
    },
    fuente: sourceUrl || 'recurso pegado',
  }

  const { text: raw } = await callGemini(
    [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 1) }] }],
    { system, useSearch: false },
  )
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('La IA no devolvió la fusión esperada.')
  const p = JSON.parse(match[0])
  if (p.same_place === false) return { samePlace: false, patch: {}, noteLine: '' }
  return {
    samePlace: true,
    patch: {
      description: p.description || existing.description || null,
      highlights: p.highlights || existing.highlights || null,
      ...(p.price ? { price: p.price } : {}),
      ...(p.opening_hours ? { opening_hours: p.opening_hours } : {}),
      ...(p.reservation_notes ? { reservation_notes: p.reservation_notes } : {}),
    },
    noteLine: p.note_line || '🔄 Información adicional incorporada.',
  }
}

// ── Chat general: cualquier pregunta sobre el viaje (botón ❓) ──
export async function askAboutTrip(question, history = [], tripSummary = '') {
  const system =
    'Eres el asistente de viaje de una familia colombiana (Papá, Mamá, Susi y Mati) que visita Europa del 25 dic 2026 al 10 ene 2027: ' +
    'Medellín → Madrid (26 dic) → París (27–31 dic, fin de año allá) → Milán (1–2 ene) → Verona → Venecia (3 ene) → Florencia (4 ene) → Roma (5–8 ene) → Pompeya (7 ene) → Madrid (9 ene) → Medellín (10 ene).\n' +
    (tripSummary ? `Lugares guardados en su mapa:\n${tripSummary}\n\n` : '') +
    'Responde en español, breve y práctico (máximo ~180 palabras), con datos actuales verificados mediante búsqueda. ' +
    'Pueden preguntarte por precios, horarios, cómo moverse, clima en diciembre/enero, documentación, propinas, qué empacar, etc. ' +
    'Si el dato puede cambiar (precios, horarios, reservas), aclarar que lo confirmen en la fuente oficial antes de ir.'

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ]
  try {
    return await callGemini(contents, { system, useSearch: true })
  } catch {
    const r = await callGemini(contents, { system, useSearch: false, retriesLeft: 0 })
    return { ...r, text: `⚠️ _Respuesta sin búsqueda web en vivo (límite temporal de Google alcanzado — puede estar desactualizada)._\n\n${r.text}` }
  }
}

// ── Quick Add: extraer un lugar desde un link / texto / captura / descripción ──
export const QUICK_ADD_CATEGORIES = [
  'museo', 'iglesia', 'monumento', 'ruina_arqueologica',
  'parque', 'comida', 'otro',
]

const CATEGORY_MENU = 'museo|iglesia|monumento|ruina_arqueologica|parque|comida|otro'

// ¿Es una descripción libre del usuario (sin link ni captura)?
// Ej.: "los 13 obeliscos egipcios de Roma". La IA debe BUSCAR esos lugares.
const isFreeformRequest = ({ text, imageBase64 }) =>
  Boolean(text && !imageBase64 && !/https?:\/\/[^\s]+/.test(text))

export async function extractPlaceFromContent({ text, imageBase64, imageMime }) {
  const freeform = isFreeformRequest({ text, imageBase64 })
  const system =
    freeform
      ? 'El usuario describe en sus propias palabras lugar(es) que quiere agregar al mapa de su viaje. ' +
        'BÚSCALOS en Google y devuelve el lugar que mejor coincida con la descripción (el más famoso/turístico si hay ambigüedad). ' +
        'Ej.: "el obelisco egipcio de Roma" → Piazza del Popolo o San Juan de Letrán según lo que pida. ' +
        'Nunca inventes: si la descripción es demasiado vaga para identificar un lugar concreto, responde con "name":"" y explica en extraction_summary qué falta por aclarar. ' +
        'Usa la búsqueda de Google para coordenadas exactas, precios y horarios vigentes. ' +
        'El viaje es dic 2026 - ene 2027 por Madrid, París, Milán, Verona, Venecia, Florencia, Roma y Pompeya, pero el lugar puede ser cualquiera.\n\n' +
        'Responde ÚNICAMENTE con un objeto JSON (sin markdown) con esta forma exacta:\n' +
        '{"name":"","city":"","country":"","category":"' + CATEGORY_MENU + '",' +
        '"lat":0.0,"lng":0.0,"description":"","highlights":"","opening_hours":"","price":"",' +
        '"reservation_required":false,"reservation_notes":"",' +
        '"extraction_summary":""}\n\n' +
        'Reglas: lat/lng con 5+ decimales. description en español, 2-4 frases. NO decidas "imperdible" ni asignes días. ' +
        'Si no hay dato confiable de precio u horario, "" y anótalo en reservation_notes como "verificar antes del viaje". ' +
        'extraction_summary: 1 frase; si la descripción pide VARIOS lugares (ej. "los 13 obeliscos de Roma"), dilo aquí y devuelve el principal.'
      : 'Analiza el contenido (un enlace, texto o captura de pantalla sobre un lugar de interés para un viaje) ' +
        'e identifica el LUGAR TURÍSTICO principal que representa. Puede ser de YouTube, Instagram, TikTok, un blog o un artículo. ' +
        'Usa la búsqueda de Google para completar datos reales: coordenadas exactas, precios y horarios vigentes. ' +
        'El viaje es dic 2026 - ene 2027 por Madrid, París, Milán, Verona, Venecia, Florencia, Roma y Pompeya, pero el lugar puede ser cualquiera de esos destinos.\n\n' +
        'REGLA CRÍTICA contra inventar: si solo tienes el enlace pero NO el contenido real (no venió texto, título ni imagen del post), ' +
        'NO supongas ni deduzcas el lugar — responde con "name":"" y en extraction_summary escribe que no se pudo acceder al contenido del enlace. ' +
        'Inventar un lugar plausible (ej. deducir "Coliseo" por ser un reel de Roma) es un error grave.\n\n' +
        'Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin explicación) con esta forma exacta:\n' +
        '{"name":"","city":"","country":"","category":"' + CATEGORY_MENU + '",' +
        '"lat":0.0,"lng":0.0,"description":"","highlights":"","opening_hours":"","price":"",' +
        '"reservation_required":false,"reservation_notes":"",' +
        '"extraction_summary":""}\n\n' +
        'Reglas: lat/lng numéricos con 5+ decimales del punto exacto. description en español, 2-4 frases, mención breve de por qué es interesante (si viene de un video/red social, integre ese contexto). ' +
        'NO decidas si el lugar es "imperdible": eso lo decide la familia en la app. NO asignes días del itinerario. ' +
        'opening_hours y price con lo que encuentres en la web; si no hay dato confiable, "" y anótalo en reservation_notes como "verificar antes del viaje". ' +
        'extraction_summary: 1 frase sobre qué era el recurso original; si el contenido menciona VARIOS lugares independientes, dilo aquí.'

  const parts = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime || 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: text || (freeform ? '' : 'Extrae el lugar principal de esta captura/página.') })

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
  // REGLA DE LA FAMILIA: la IA NUNCA decide "imperdible" — solo el usuario
  // marca esa casilla, sin importar lo que diga el link o la captura.
  const toPlace = (p) => ({
    name: p.name || '',
    city: p.city || '',
    country: p.country || '',
    category: QUICK_ADD_CATEGORIES.includes(p.category) ? p.category : 'otro',
    lat: Number(p.lat) || null,
    lng: Number(p.lng) || null,
    description: p.description || '',
    highlights: p.highlights || '',
    opening_hours: p.opening_hours || '',
    price: p.price || '',
    reservation_required: Boolean(p.reservation_required),
    reservation_notes: p.reservation_notes || '',
    must_see: false, // siempre false desde la IA
    assigned_date: null, // itinerario liberado: la IA no asigna días
    extraction_summary: p.extraction_summary || '',
  })
  return { place: toPlace(parsed), sources }
}

// ── MultiAdd: extraer VARIOS lugares independientes de un mismo contenido ──
// (p. ej. un video "10 cosas que hacer en Roma" o una captura con lista).
// Devuelve { places: [...], sources }. Con 1 solo lugar funciona igual que
// la extracción simple.
export async function extractMultiplePlacesFromContent({ text, imageBase64, imageMime }) {
  const freeform = isFreeformRequest({ text, imageBase64 })

  // Descripción libre con plural explícito ("los 13 obeliscos de Roma"):
  // una sola llamada CON búsqueda que devuelve la lista completa.
  const explicitMulti = freeform && /\b\d+\b/.test(text)
  if (explicitMulti) {
    const n = Math.min(parseInt(text.match(/\b\d+\b/)[0], 10) || 15, 15)
    const system =
      `El usuario pide ${n > 1 ? `alrededor de ${n}` : 'varios'} lugares con la descripción: "${text}". ` +
      'BÚSCALOS en Google y devuelve UNA lista JSON con esos lugares reales (los más conocidos/turísticos que coincidan). ' +
      'Nunca inventes: si no existen tantos lugares como se piden, devuelve solo los que existan de verdad. ' +
      'Cada lugar con todos sus datos reales: coordenadas exactas (5+ decimales), precio y horario si existen. ' +
      'NO decidas "imperdible" ni asignes días del itinerario.\n' +
      'Responde ÚNICAMENTE con JSON: {"places":[{"name":"","city":"","country":"","category":"' + CATEGORY_MENU + '","lat":0.0,"lng":0.0,"description":"","highlights":"","opening_hours":"","price":"","reservation_required":false,"reservation_notes":"","extraction_summary":""}]}\n' +
      'extraction_summary: 1 frase sobre la descripción original del usuario.'
    try {
      const { text: raw, sources } = await callGemini(
        [{ role: 'user', parts: [{ text }] }],
        { system, useSearch: true },
      )
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0])
        if (Array.isArray(parsed.places) && parsed.places.length) {
          return { places: parsed.places.slice(0, 15).map(toPlace), sources }
        }
      }
    } catch { /* cae al flujo simple de abajo */ }
  }

  const first = await extractPlaceFromContent({ text, imageBase64, imageMime })
  const places = [first.place]

  // Si el resumen sugiere que hay más lugares, pedir la lista completa.
  const summary = first.place.extraction_summary || ''
  const looksMultiple = /\b(\d+|varios|otros|más|multiples|múltiples|lista|guía|top|mejores|cosas|lugares)\b/i.test(summary) ||
    /\b\d+\b/.test(text || '')
  if (!looksMultiple) return { places, sources: first.sources }

  const system =
    'Analiza el contenido (enlace, texto o captura) y extrae TODOS los lugares turísticos INDEPENDIENTES que mencione, en orden de aparición. ' +
    'Reglas: solo lugares con nombre concreto y verificable (nunca inventar: si no puedes acceder al contenido, lista solo lo que veas). ' +
    'Descarta menciones genéricas ("el centro", "la catedral" sin ciudad). Cada lugar es independiente aunque estén cerca. ' +
    'Responde ÚNICAMENTE con JSON: {"places":[{"name":"","city":"","country":"","category":"' + CATEGORY_MENU + '","lat":0.0,"lng":0.0,"description":"","highlights":"","opening_hours":"","price":"","reservation_required":false,"reservation_notes":"","extraction_summary":""}]} ' +
    'Incluye SIEMPRE al menos el lugar principal; máximo 15 lugares. lat/lng con 5+ decimales.'

  const parts = []
  if (imageBase64) parts.push({ inlineData: { mimeType: imageMime || 'image/jpeg', data: imageBase64 } })
  parts.push({ text: text || 'Extrae todos los lugares de esta captura/página.' })
  const urlMatch = (text || '').match(/https?:\/\/[^\s]+/)
  if (urlMatch) {
    const pageText = await fetchPageText(urlMatch[0])
    if (pageText) parts.push({ text: `Contenido real del enlace (${urlMatch[0]}):\n${pageText}` })
  }

  try {
    const { text: raw2 } = await callGemini(
      [{ role: 'user', parts }],
      { system, useSearch: false }, // sin búsqueda: las coordenadas se completan al aprobar cada lugar
    )
    const m2 = raw2.match(/\{[\s\S]*\}/)
    if (!m2) return { places, sources: first.sources }
    const parsed2 = JSON.parse(m2[0])
    if (Array.isArray(parsed2.places) && parsed2.places.length > 1) {
      return {
        places: parsed2.places.slice(0, 15).map(toPlace),
        sources: first.sources,
      }
    }
  } catch { /* falla la lista: devolver el lugar simple */ }
  return { places, sources: first.sources }
}
