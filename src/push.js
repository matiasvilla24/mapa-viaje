// Suscripción web-push en el cliente: pide permiso y registra el endpoint en
// /api/push-subscribe para que el servidor envíe las alertas de ventas.
// VITE_VAPID_PUBLIC_KEY se genera con `node scripts/gen-vapid.mjs` y va en
// .env.local y en las variables de Vercel (VAPID_PRIVATE_KEY también allí).
import { useEffect } from 'react'

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function enablePush() {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !navigator.onLine) return
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    const ready = await navigator.serviceWorker.ready
    if (!ready) return
    if (Notification.requestPermission && (await Notification.requestPermission()) !== 'granted') return
    let sub = await ready.pushManager.getSubscription()
    if (!sub) {
      sub = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) })
    }
    const j = sub.toJSON()
    if (!j.keys?.p256dh || !j.keys?.auth) return
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: j.keys, user_agent: navigator.userAgent }),
    })
  } catch (e) {
    console.warn('[push] no se pudo suscribir:', e?.message || e)
  }
}

export function usePushNotifications() {
  useEffect(() => {
    // Pequeño retardo para no competir con la carga inicial de datos
    const t = setTimeout(() => { enablePush() }, 4000)
    return () => clearTimeout(t)
  }, [])
}
