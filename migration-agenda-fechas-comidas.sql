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
alter table public.day_notes add column if not exists breakfast text;
alter table public.day_notes add column if not exists lunch text;
alter table public.day_notes add column if not exists dinner text;
