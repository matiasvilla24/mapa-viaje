-- ============================================================
-- MIGRACIÓN para la base ya desplegada (proyecto mapa-viaje).
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run.
-- Añade: places.visited + tabla flights con realtime y permisos.
-- Es idempotente: no da error si se ejecuta más de una vez.
-- ============================================================

-- 1) Columna visited en places
alter table public.places add column if not exists visited boolean not null default false;

-- 2) Tabla flights: horas editables de los tramos del itinerario
create table if not exists public.flights (
  id text primary key,
  label text not null,
  departure_time text,
  arrival_time text,
  flight_number text,
  notes text,
  updated_by text,
  updated_at timestamp with time zone default now()
);

alter table public.flights enable row level security;

drop policy if exists "flights_access" on public.flights;
create policy "flights_access"
  on public.flights
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 3) Realtime para flights
alter publication supabase_realtime add table public.flights;

-- 4) Precarga de los tramos del itinerario (solo si no existen)
insert into public.flights (id, label, departure_time, arrival_time, flight_number, notes) values
  ('mde-mad-25dic', '✈️ Medellín → Madrid', null, null, null, 'Noche en el avión.'),
  ('mad-26dic',     '🛬 Llegada a Madrid', null, null, null, 'Primer día: jet lag y paseo tranquilo.'),
  ('mad-par-27dic', '✈️ Madrid → París', null, null, null, null),
  ('par-fin-31dic', '🎆 Fin de año en París', null, null, null, 'Eiffel, Champs-Élysées o donde caiga la medianoche.'),
  ('par-mxp-01ene', '✈️ París → Milán', null, null, null, 'Año nuevo en Milán.'),
  ('mxp-vce-02ene', '🚆 Milán → Verona → Venecia', null, null, null, 'Verona es tránsito: Arena y centro a pie.'),
  ('vce-flo-03ene', '🚆 Venecia → Florencia', null, null, null, null),
  ('flo-roma-04ene', '🚆 Florencia → Roma', null, null, null, null),
  ('rom-nap-07ene', '🚆 Roma → Pompeya (ida y vuelta)', null, null, null, 'Día por confirmar dentro de la ventana de Roma.'),
  ('rom-mad-09ene', '✈️ Roma → Madrid', null, '18:30', null, 'Llegada 18:30. Última noche en Madrid.'),
  ('mad-mde-10ene', '✈️ Madrid → Medellín', '15:30', null, null, 'Vuelo de regreso a casa.')
on conflict (id) do nothing;
