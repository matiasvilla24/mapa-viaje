// Registra (y lee) suscripciones de web-push de la familia.
// El servidor (check-alerts) lee esta tabla para enviar las alertas push.
export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, error: 'faltan SUPABASE_URL/ANON_KEY en el entorno de la función' })
  }

  if (req.method === 'POST') {
    const { endpoint, keys, user_agent } = await parseBody(req)
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ ok: false, error: 'falta endpoint o keys p256dh/auth' })
    }
    const r = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: (user_agent || '').slice(0, 250),
      }),
    })
    if (!r.ok) return res.status(200).json({ ok: false, error: 'HTTP ' + r.status })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ ok: false, error: 'método no soportado' })
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => { data += c })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
    })
  })
}
