// Handler de web-push para la PWA del mapa de viaje.
// Este archivo se importa desde el service worker que genera vite-plugin-pwa
// (ver workbox.importScripts en vite.config.js). Recibe las alertas push del
// servidor de monitoreo (Cenacolo / AS Roma) y las muestra como notificación
// nativa cuando la app está abierta en otro dispositivo o cerrada.

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 Alerta del viaje', {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'viaje-alerta',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus() }
      }
      return self.clients.openWindow(url)
    })
  )
})
