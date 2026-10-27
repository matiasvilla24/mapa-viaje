// Genera (o rota) la pareja de llaves VAPID para web-push y deja AMBAS en
// .env.local sin imprimirlas (el público también en la respuesta para
// copiarlo a Vercel fácilmente: VITE_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY).
import { createECDH } from 'node:crypto'
import fs from 'node:fs'

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const curve = createECDH('prime256v1')
curve.generateKeys()
const pub = b64u(curve.getPublicKey())   // 65 bytes "uncompressed"
const priv = b64u(curve.getPrivateKey()) // 32 bytes

const envPath = new URL('../.env.local', import.meta.url)
const ROATATE = (src) => src
  .replace(/^VITE_VAPID_PUBLIC_KEY=.*$/m, `VITE_VAPID_PUBLIC_KEY=${pub}`)
  .replace(/^VAPID_PRIVATE_KEY=.*$/m, `VAPID_PRIVATE_KEY=${priv}`)
try {
  let cur = fs.readFileSync(envPath, 'utf8')
  const before = cur
  cur = cur.includes('VITE_VAPID_PUBLIC_KEY=') ? ROATATE(cur) : cur.replace(/\s*$/, '\nVITE_VAPID_PUBLIC_KEY=' + pub)
  cur = cur.includes('VAPID_PRIVATE_KEY=') ? ROATATE(cur) : cur.replace(/\s*$/, '\nVAPID_PRIVATE_KEY=' + priv)
  if (cur !== before) fs.writeFileSync(envPath, cur)
  // OJO: si las llaves ya existían este script las ROTA — los clientes se resuscriben igual,
  // pero en Vercel hay que actualizar las 2 variables.
} catch (e) {
  console.log('(no se pudo leer .env.local de forma segura: ' + e.message + ')')
}

console.log('')
console.log('✔ Llaves VAPID listas en .env.local (no se imprimen). Copia a Vercel:')
console.log('     VITE_VAPID_PUBLIC_KEY=' + pub.slice(0, 12) + '…')
console.log('  (el valor completo está en .env.local: VITE_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY)')
