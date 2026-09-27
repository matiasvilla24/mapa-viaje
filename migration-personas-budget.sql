-- ═════════════════════════════════════════════════════════════
-- Migración: etiquetas de persona + itinerario libre + alojamientos
-- + presupuesto + notas de día (inicio/fin/dormir)
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ═════════════════════════════════════════════════════════════

-- 1) Etiquetas de persona en places
--    added_by_tag  : quién agregó el lugar (obligatorio en la UI)
--    interest_tags : de interés de quién (multi-select)
alter table public.places
  add column if not exists added_by_tag text,
  add column if not exists interest_tags text[] default '{}';

-- 2) Liberar el itinerario: quitar fechas de todos los lugares puntuales.
--    Solo quedan fechas en los vuelos (tabla flights / ITINERARY).
update public.places set assigned_date = null;

-- 3) Alojamientos
create table if not exists public.accommodations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  country text,
  booking_ref text,
  cost numeric,
  cost_currency text default 'EUR',
  accommodation_type text default 'hotel',      -- hotel | airbnb | otro
  free_cancellation boolean default false,
  checkin_date date,
  checkout_date date,
  address text,
  url text,
  notes text,
  created_at timestamptz default now()
);
alter table public.accommodations enable row level security;
drop policy if exists "anon full access accommodations" on public.accommodations;
create policy "anon full access accommodations" on public.accommodations
  for all using (true) with check (true);

-- 4) Presupuesto: ítems con estimado y gasto real
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'varios',      -- tiquetes|alojamiento|comidas|entradas|transporte|varios
  label text not null,
  estimated numeric default 0,
  spent numeric default 0,
  currency text default 'EUR',
  notes text,
  created_at timestamptz default now()
);
alter table public.budget_items enable row level security;
drop policy if exists "anon full access budget_items" on public.budget_items;
create policy "anon full access budget_items" on public.budget_items
  for all using (true) with check (true);

-- 5) Notas por día de la agenda: dónde empieza, termina y se duerme
create table if not exists public.day_notes (
  date date primary key,
  start_place text,
  end_place text,
  sleep_place text,
  updated_by text,
  updated_at timestamptz default now()
);
alter table public.day_notes enable row level security;
drop policy if exists "anon full access day_notes" on public.day_notes;
create policy "anon full access day_notes" on public.day_notes
  for all using (true) with check (true);
