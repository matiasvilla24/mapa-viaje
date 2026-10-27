// Monitoreo diario de ventas para el viaje (Apuntes Europa 2026):
// - La Última Cena (Cenacolo Vinciano, Milán) — la venta con fecha fija solo abre
//   en los canales oficiales unas semanas antes.
// - AS Roma vs AC Milan (Serie A, Olímpico de Roma) — disponibilidad de entradas.
// Cron: `vercel.json` lo programa UNA vez al día a las 12:00 UTC (07:00 Bogotá).
// Al detectar "venta abierta" inserta una alerta en Supabase (la app la muestra
// por realtime + web-push a los dispositivos suscritos vía /api/push-subscribe).
const webpush = require('web-push')

const MONITORS = [
  {
    key: 'cenacolo',
    label: 'La Última Cena (Cenacolo Vinciano) — Milán, 2 ene',
    url: 'https://cenacolovinciano.vivaticket.it/',
    openHints: ['biglietti', 'ticket', 'acquista', 'compra', 'scegli', 'prevendita'],
    soldOutHints: ['sold out', 'terminato', 'esaurito', 'non disponibile', 'chiuso'],
  },
  {
    key: 'asroma',
    label: 'AS Roma vs AC Milan — Serie A, Olímpico 9 ene 18:00',
    url: 'https://www.asroma.com/it/biglietti/maschile',
    openHints: ['biglietti', 'on sale', 'acquista', 'disponibili', 'compra', 'roma-milan'],
    soldOutHints: ['sold out', 'esaurito', 'esaurita', 'non disponibile', 'ripristino'],
  },
]

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ViajeAlertsBot/1.0)',
        'accept-language': 'es,en,it;q=0.8',
      },
      redirect: 'follow',
    })
    const text = await res.text()
    return { status: res.status, text, err: null }
  } catch (e) {
    return { status: 0, text: '', err: e.message || String(e) }
  }
}

function pageState(page, { soldOutHints }) {
  const t = (page.text || '').toLowerCase()
  if (!t) return 'warning'
  const open = ['biglietti', 'ticket', 'on sale', 'acquista', 'disponibili'].some((h) => t.includes(h))
  const closed = soldOutHints.some((h) => t.includes(h))
  if (open && !closed) return 'venta-abierta'
  if (closed) return 'sold-out'
  return 'unknown'
}

export default async function handler(_req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, error: 'faltan SUPABASE_URL/ANON_KEY en el entorno de la función' })
  }

  const rest = async (table, { query = '', method = 'GET', body, onConflict } = {}) => {
  const rest = async (table, { query = '', method = 'GET', body, onConflict } = {}) => {
    let url = `${supabaseUrl}/rest/v1/${table}${query}`
    const headers = {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      'content-type': 'application/json',
    }
    if (method === 'POST' && onConflict) {
      url += (query.includes('?') ? '&' : '?') + 'on_conflict=' + onConflict
      headers.prefer = 'resolution=merge-duplicates,return=minimal'
      body = body ?? null
    }
    const r = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const data = r.ok ? await r.json().catch(() => null) : null
    return { ok: r.ok, status: r.status, data }
  }

  const results = []
  for (const m of MONITORS) {
    const page = await fetchPage(m.url)
    const state = pageState(page, m)
    results.push({ key: m.key, state, http: page.status, err: page.err })

    // Solo si estamos seguros de que la venta abrió y no existe ya una alerta activa
    if (state === 'venta-abierta') {
      const existing = await rest('alerts', { query: `?select=id,key,status,active&key=like.${m.key}:%&order=created_at.desc&limit=1` })
      const prev = Array.isArray(existing.data) ? existing.data[0] : null
      if (!prev || !prev.active || prev.status !== 'venta-abierta') {
        const ins = await rest('alerts', {
          method: 'POST',
          body: {
            key: m.key + ':' + Date.now(), // única por detección (la columna key es unique)
            title: '🚨 ¡La venta abrió! ' + m.label,
            body: 'Ya se pueden comprar los boletos. Los cupos se agotan rápido; entra desde la app.',
            url: m.url,
            status: 'venta-abierta',
            active: true,
          },
        })
        if (!ins.ok) results.push({ key: m.key, error: 'insert alerts falló HTTP ' + ins.status })
      }
    }

    // UPSERT del estado del chequeo (la key del monitor es su PK)
    await rest('alert_checks', {
      method: 'POST',
      onConflict: 'key',
      body: {
        key: m.key,
        label: m.label,
        last_status: state,
        last_checked: new Date().toISOString(),
        last_result: page.err ? 'Error: ' + page.err : 'HTTP ' + page.status,
      },
    })
  }

  // Enviar web-push a todos los dispositivos suscritos
  const subsRes = await rest('push_subscriptions', { query: '?select=endpoint,p256dh,auth' })
  const subs = Array.isArray(subsRes.data) ? subsRes.data : []
  const vpub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  const vpriv = process.env.VAPID_PRIVATE_KEY
  let pushOk = 0
  if (subs.length && vpub && vpriv) {
    webpush.setVapidDetails('mailto:mati@example.com', vpub, vpriv)
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({
            title: '🚨 Alerta del viaje',
            body: 'Se detectó una venta abierta para el viaje. Abre la app para verla.',
            data: { url: '/' },
          }),
          { TTL: 86400 },
        )
        pushOk++
      } catch { /* un push que falla no detiene los demás */ }
    }
  }

  return res.status(200).json({ ok: true, results, pushSentTo: pushOk, pushTotal: subs.length })
}
