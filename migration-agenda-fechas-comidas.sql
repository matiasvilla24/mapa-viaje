-- ═════════════════════════════════════════════════════════════
-- Migración: fechas/hora de visita + comidas por día
-- 1) places: columna assigned_time (hora de la visita, texto 'HH:MM')
--    para poder avisar cuando dos visitas pisan la misma franja.
-- 2) day_notes: 3 comidas por día (desayuno / almuerzo / cena).
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ═════════════════════════════════════════════════════════════

-- 1) Hora de visita por lugar (además de assigned_date que ya existe)
alter table public.places add column if not exists assigned_time text;

-- 2) Comidas del día en la agenda
-- (por si la tabla day_notes aún no existe — p.ej. si migration-personas-budget.sql
--  no se llegó a ejecutar completa, la crea con las 6 columnas)
create table if not exists public.day_notes (
  date date primary key,
  start_place text,
  end_place text,
  sleep_place text,
  breakfast text,
  lunch text,
  dinner text,
  updated_by text,
  updated_at timestamptz default now()
);
alter table public.day_notes enable row level security;
drop policy if exists "anon full access day_notes" on public.day_notes;
create policy "anon full access day_notes"
  on public.day_notes
  for all using (true) with check (true);
alter publication supabase_realtime add table public.day_notes;

alter table public.day_notes add column if not exists breakfast text;
alter table public.day_notes add column if not exists lunch text;
alter table public.day_notes add column if not exists dinner text;
