// Monitoreo diario para el viaje (cron Vercel, 12:00 UTC = 07:00 Bogotá):
// 1) Ventas abiertas: Cenacolo Vinciano (Milán) y AS Roma vs Milan (Serie A).
// 2) Recordatorios de cancelación: para cada reserva con fecha límite
//    (bookings.cancel_by) que siga pendiente, crea una alerta cuando faltan
//    14 días o menos. Si el usuario ya la marcó ✔️ (done=true), se respeta;
//    si la reserva se completa o la ventana pasa, la alerta se silencia.
// Las alertas nuevas se envían por web-push a los dispositivos suscritos
// (SOLO cuando hay novedades: no envía push en cada corrida).
import webpush from 'web-push'

const MONITORS = [
  {
    key: 'cenacolo',
    label: 'La Última Cena (Cenacolo Vinciano) — Milán, 2 ene',
    url: 'https://cenacolovinciano.vivaticket.it/',
    soldOutHints: ['sold out', 'terminato', 'esaurito', 'non disponibile', 'chiuso'],
  },
  {
    key: 'asroma',
    label: 'AS Roma vs AC Milan — Serie A, Olímpico 9 ene 18:00',
    url: 'https://www.asroma.com/it/biglietti/maschile',
    soldOutHints: ['sold out', 'esaurito', 'esaurita', 'non disponibile', 'ripristino'],
  },
]

const REMINDER_DAYS = 14 // aviso desde 2 semanas antes de perder reembolso

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
    let url = `${supabaseUrl}/rest/v1/${table}${query}`
    const headers = {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      'content-type': 'application/json',
    }
    if (method === 'POST' && onConflict) {
      url += (query.includes('?') ? '&' : '?') + 'on_conflict=' + onConflict
      headers.prefer = 'resolution=merge-duplicates,return=minimal'
    }
    const r = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const data = r.ok ? await r.json().catch(() => null) : null
    return { ok: r.ok, status: r.status, data }
  }

  const newAlerts = [] // notificaciones nuevas de esta corrida (para web-push)
  const results = []

  // ── 1) Monitores de ventas abiertas ──
  for (const m of MONITORS) {
    const page = await fetchPage(m.url)
    const state = pageState(page, m)
    results.push({ key: m.key, state, http: page.status, err: page.err })

    if (state === 'venta-abierta') {
      const existing = await rest('alerts', { query: `?select=id,key,status,active&key=like.${m.key}:%&order=created_at.desc&limit=1` })
      const prev = Array.isArray(existing.data) ? existing.data[0] : null
      if (!prev || !prev.active || prev.status !== 'venta-abierta') {
        const alert = {
          key: m.key + ':' + Date.now(), // única por detección (la columna key es unique)
          title: '🚨 ¡La venta abrió! ' + m.label,
          body: 'Ya se pueden comprar los boletos. Los cupos se agotan rápido; entra desde la app.',
          url: m.url,
          status: 'venta-abierta',
          active: true,
        }
        const ins = await rest('alerts', { method: 'POST', body: alert })
        if (ins.ok) newAlerts.push(alert)
        else results.push({ key: m.key, error: 'insert alerts falló HTTP ' + ins.status })
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

  // ── 2) Recordatorios de cancelación (bookings.cancel_by) ──
  const bksRes = await rest('bookings', { query: '?select=id,title,done,date,cancel_by,cancel_note,web&cancel_by=not.is.null' })
  const bookings = Array.isArray(bksRes.data) ? bksRes.data : []
  const remind = []
  for (const b of bookings) {
    const key = `bk:${b.id}:cancel:${b.cancel_by}`
    const days = Math.round((new Date(b.cancel_by + 'T23:59:59') - Date.now()) / 86400000)
    const existing = await rest('alerts', { query: `?select=id,done,active&key=eq.${key}&limit=1` })
    const prev = Array.isArray(existing.data) ? existing.data[0] : null

    if (!prev && !b.done && days <= REMINDER_DAYS) {
      const title =
        days < 0
          ? `⛔ Ya venció la fecha de cancelación: ${b.title}`
          : days === 0
            ? `⏰ HOY vence la cancelación de: ${b.title}`
            : `⏰ En ${days} día${days === 1 ? '' : 's'} vence la cancelación: ${b.title}`
      const body = `${b.cancel_note ? b.cancel_note + '. ' : ''}Después del ${b.cancel_by} ya no hay reembolso — decide en Reservas.`
      const alert = {
        key,
        title,
        body,
        url: b.web || '',
        status: days < 0 ? 'vencido' : 'recordatorio',
        active: true,
      }
      const ins = await rest('alerts', { method: 'POST', body: alert })
      if (ins.ok) newAlerts.push(alert)
      remind.push({ id: b.id, days, action: ins.ok ? 'creada' : 'error HTTP ' + ins.status })
    } else if (prev) {
      if (b.done || days > REMINDER_DAYS) {
        if (prev.active) {
          await rest('alerts', { query: `?key=eq.${key}`, method: 'PATCH', body: { active: false, updated_at: new Date().toISOString() } })
        }
        remind.push({ id: b.id, days, action: b.done ? 'ignorada (reserva hecha)' : 'silenciada' })
      } else if (!prev.active && !prev.done) {
        await rest('alerts', { query: `?key=eq.${key}`, method: 'PATCH', body: { active: true, updated_at: new Date().toISOString() } })
        remind.push({ id: b.id, days, action: 're-activada' })
      }
    }
  }
  results.push({ key: 'recordatorios', revisadas: bookings.length, cambios: remind })

  // ── 3) web-push: SOLO si hubo alertas/recordatorios nuevos ──
  let pushOk = 0
  let pushTotal = 0
  if (newAlerts.length) {
    const subsRes = await rest('push_subscriptions', { query: '?select=endpoint,p256dh,auth' })
    const subs = Array.isArray(subsRes.data) ? subsRes.data : []
    const vpub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
    const vpriv = process.env.VAPID_PRIVATE_KEY
    if (subs.length && vpub && vpriv) {
      webpush.setVapidDetails('mailto:matiasvilla24@gmail.com', vpub, vpriv)
      pushTotal = subs.length
      for (const a of newAlerts) {
        for (const s of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({
                title: a.title,
                body: a.body || 'Abre la app para verla.',
                data: { url: '/' },
              }),
              { TTL: 86400 },
            )
            pushOk++
          } catch { /* un push que falla no detiene los demás */ }
        }
      }
    }
  }

  return res.status(200).json({ ok: true, results, newAlerts: newAlerts.length, pushSentTo: pushOk, pushTotal })
}
