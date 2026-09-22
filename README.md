# 🗺️ Mapa del viaje · App familiar

Aplicación web colaborativa y privada para planear el viaje de la familia (25 dic – 10 ene):
mapa interactivo, agenda día por día, ruta de ciudades y edición colaborativa en tiempo real.

- **Frontend:** React + Vite + Tailwind CSS
- **Mapa:** Leaflet + OpenStreetMap (gratis, sin API key)
- **Datos en tiempo real:** Supabase (Postgres + Realtime)
- **PWA instalable:** se instala como app en el celular y funciona sin conexión
- **Cola offline:** los cambios hechos sin señal se guardan y se suben solos al reconectar
- **Acceso:** solo con el link — sin cuentas ni códigos
- **Deploy:** Vercel

> **Modo demo:** sin variables de Supabase, la app corre con los datos precargados en memoria (los cambios no se guardan ni se sincronizan). Ideal para probar la interfaz.

---

## 1) Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) → **New project** (el plan gratuito sobra).
2. Guarda la contraseña de la base de datos (no se usa en la app, solo para administración).
3. Cuando termine el aprovisionamiento, ve a **Project Settings → API** y anota:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** (Project API keys) → será `VITE_SUPABASE_ANON_KEY`

## 2) Crear la tabla y cargar los datos

1. En Supabase, abre **SQL Editor → New query**.
2. Copia **todo** el contenido del archivo [`schema.sql`](schema.sql) de este repositorio y ejecútalo (Run).
   Esto crea:
   - el enum `place_category` con las 8 categorías,
   - la tabla `places` con todos los campos del modelo,
   - las políticas RLS (lectura/escritura para `anon` — mantener el link en privado es la barrera de entrada),
   - la publicación **Realtime** de la tabla,    - los **56 lugares precargados** del viaje (Roma, Pompeya, Florencia, Venecia, Verona, Milán, París, Madrid).
3. Verifica en **Table Editor → places** que hay 56 filas.

> ⚠️ El SQL usa fechas de 2026-12-25 a 2027-01-10. Si tus fechas reales son distintas, edítalas en el SQL antes de ejecutarlo (o reasígnalas después desde la propia app).

## 3) Configurar las variables de Supabase

Solo hacen falta las dos variables del proyecto de Supabase (no hay código de acceso).

- **Local:** copia `.env.example` a `.env.local` y rellena:

  ```
  VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (tu anon key)
  ```

- **Vercel:** Project → Settings → Environment Variables → añade las **dos** variables (ver §4).

## 4) Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub (p. ej. `mapa-viaje`).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
3. Vercel detecta Vite automáticamente. **Antes de pulsar Deploy**, abre
   **Environment Variables** y añade:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | tu anon key de Supabase |

4. **Deploy**. En ~1 minuto tendrás `https://mapa-viaje.vercel.app`.
5. Comparte la URL con la familia (el acceso es simplemente tener el link; manténlo privado). Todos entran con permisos completos de lectura/escritura y los cambios se sincronizan en tiempo real (Supabase Realtime por WebSockets).

> Cada vez que cambies una variable de entorno en Vercel, hay que hacer **Redeploy** para que surta efecto.

## 5) Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173

npm run build      # build de producción en dist/
npm run preview    # sirve el build localmente
```

- Sin `.env.local` con Supabase: **modo demo** (datos en memoria, sin sincronización).
- Con las dos variables: comportamiento idéntico a producción.

---

## Estructura

```
mapa-viaje/
├── schema.sql                 # SQL completo: tabla + RLS + realtime + 56 lugares
├── public/icon.svg            # ícono de la PWA
├── .env.example               # plantilla de variables de entorno
├── vite.config.js             # Vite + Tailwind + PWA (manifest y service worker)
├── src/
│   ├── main.jsx               # entrada
│   ├── App.jsx                # estado global, filtros, vistas, CRUD, realtime
│   ├── supabaseClient.js      # capa de datos (Supabase + realtime, fallback demo)
│   ├── constants.js           # categorías, cronograma base, ruta, fechas
│   ├── seed.js                # mismos datos precargados (para modo demo)
│   ├── vite-env.d.ts          # tipos de los módulos virtuales de la PWA
│   └── components/
│       ├── MapView.jsx        # mapa Leaflet, marcadores por categoría, pick de coordenadas
│       ├── Agenda.jsx         # agenda agrupada por día (asignado y sin asignar)
│       ├── RouteView.jsx      # cronograma del viaje con enlaces por ciudad
│       ├── PlaceModal.jsx     # ficha completa + editar/eliminar
│       └── PlaceForm.jsx      # formulario de alta/edición (todos los campos)
```

## 6) Instalar como app en el celular (PWA)

Una vez desplegada en Vercel, cada viajero abre el link y:

- **Android (Chrome):** menú ⋮ → «Añadir a pantalla de inicio» / «Instalar aplicación».
- **iPhone (Safari):** botón Compartir □↑ → «Añadir a pantalla de inicio».

La app se abre a pantalla completa, con ícono propio, como una app más. No requiere tienda
ni cuentas.

## 7) Funcionamiento sin conexión

- La interfaz se cachea en el dispositivo (service worker), así que la app abre aunque no haya señal.
- La última copia de los lugares queda guardada localmente: se puede consultar el mapa, la agenda y la ruta sin internet.
- **Los cambios hechos sin señal no se pierden:** se guardan en una cola local y se suben
  automáticamente al recuperar la conexión (al volver la señal, al reabrir la app, o cada 30 s).
  El encabezado muestra «⏳ N pendientes de sincronizar» mientras haya algo en cola.
- Cuando vuelve la conexión, todos los demás dispositivos reciben los cambios al instante (realtime).

> Nota: los tiles del mapa (las imágenes de los mapas) sí necesitan internet la primera vez;
> las zonas ya visitadas suelen quedar cacheadas por el propio Leaflet/navegador.

## Detalles de uso

- **Agregar lugar:** botón `➕ Agregar`. Si no conoces las coordenadas, pulsa «📍 Tocar mapa» y
  luego toca el punto exacto en el mapa; se capturan solas.
- **Marcar día:** el selector «Día asignado» lista el cronograma del viaje (25 dic → 10 ene).
  La agenda agrupa por esos días y muestra aparte los «sin día asignado».
- **Filtros:** por ciudad y por categoría arriba; combinables y con botón para quitarlos.
- **⭐ Imperdible** agranda el marcador en el mapa; 🎟️ indica «requiere reserva».
- **Realtime:** todos los dispositivos con la app abierta ven los cambios al instante.
- Los horarios/precios precargados son de referencia pública: **verificar antes del viaje**
  (así está marcado en cada campo dudoso).
