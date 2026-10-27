// Migración de esquema para la fusión con "App Europa 2026" (shepavilla/First-):
// - day_notes gana columnas para el plan completo de cada día (actividades, tips,
//   reservas, traslados, estadía).
// - bookings: checklist de 64 reservas del repo externo.
// - alerts + alert_checks: resultados del monitoreo diario de ventas (Cenacolo, AS Roma).
// - push_subscriptions: suscripciones web-push.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'mzicekseuzzgnkkkuwix'
const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }

const q = async (sql, label = sql.slice(0, 60)) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  if (!r.ok || t.trim().startsWith('[') === false || /^\[error/.test(t)) console.log('!!', label, '->', t.slice(0, 800))
  else console.log('OK', label, t.length > 4 ? t.slice(0, 300) : '')
}

const DDL = [
  // ── day_notes: texto completo del día (repo externo) ──
  `alter table public.day_notes
     add column if not exists title text,
     add column if not exists activities jsonb,
     add column if not exists tips text,
     add column if not exists reservas text,
     add column if not exists legs jsonb,
     add column if not exists stay_name text,
     add column if not exists stay_details text`,

  // ── Checklist de reservas ──
  `create table if not exists public.bookings (
     id text primary key,
     sort_order int not null default 0,
     sec text not null default '',
     date date,
     cat text not null default '',
     title text not null default '',
     need text not null default '',
     done boolean not null default false,
     info text not null default '',
     mode text not null default '',
     cancel_by date,
     cancel_note text not null default '',
     platform text not null default '',
     web text not null default '',
     updated_by text,
     updated_at timestamptz not null default now())`,
  `alter table public.bookings enable row level security`,
  `drop policy if exists "anon full access bookings" on public.bookings`,
  `create policy "anon full access bookings" on public.bookings for all to public using (true) with check (true)`,

  // ── Alertas del monitoreo (eventos que la app muestra con campana/banner) ──
  `create table if not exists public.alerts (
     id uuid primary key default gen_random_uuid(),
     key text not null unique,
     title text not null,
     body text not null default '',
     url text not null default '',
     status text not null default 'nuevo',
     active boolean not null default true,
     done boolean not null default false,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now())`,
  `alter table public.alerts enable row level security`,
  `drop policy if exists "anon full access alerts" on public.alerts`,
  `create policy "anon full access alerts" on public.alerts for all to public using (true) with check (true)`,

  // ── Estado de cada chequeo del monitor ──
  `create table if not exists public.alert_checks (
     key text primary key,
     label text not null default '',
     last_checked timestamptz,
     last_status text not null default '',
     last_result text not null default '')`,
  `alter table public.alert_checks enable row level security`,
  `drop policy if exists "anon full access alert_checks" on public.alert_checks`,
  `create policy "anon full access alert_checks" on public.alert_checks for all to public using (true) with check (true)`,

  // ── Suscripciones web-push ──
  `create table if not exists public.push_subscriptions (
     endpoint text primary key,
     p256dh text not null,
     auth text not null,
     user_agent text not null default '',
     created_at timestamptz not null default now())`,
  `alter table public.push_subscriptions enable row level security`,
  `drop policy if exists "anon full access push_subscriptions" on public.push_subscriptions`,
  `create policy "anon full access push_subscriptions" on public.push_subscriptions for all to public using (true) with check (true)`,
]

const PUBLICATION = [
  `do $$ begin
     if not exists (select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.tablename='bookings' and p.schemaname='public') then
       execute 'alter publication supabase_realtime add table public.bookings'; end if;
   end $$`,
  `do $$ begin
     if not exists (select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.tablename='alerts' and p.schemaname='public') then
       execute 'alter publication supabase_realtime add table public.alerts'; end if;
   end $$`,
  `do $$ begin
     if not exists (select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.tablename='alert_checks' and p.schemaname='public') then
       execute 'alter publication supabase_realtime add table public.alert_checks'; end if;
   end $$`,
  `do $$ begin
     if not exists (select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.tablename='push_subscriptions' and p.schemaname='public') then
       execute 'alter publication supabase_realtime add table public.push_subscriptions'; end if;
   end $$`,
]

for (const s of DDL) await q(s)
for (const s of PUBLICATION) await q(s)
// Verificación
await q("select column_name from information_schema.columns where table_name='day_notes' and table_schema='public' order by ordinal_position", 'day_notes cols')
await q("select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename", 'realtime tables')
console.log('FIN esquema')
