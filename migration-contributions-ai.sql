-- ============================================================
-- MIGRACIÓN: contribuciones de la familia + IA
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede ejecutar más de una vez sin error.
--
-- Añade:
--   1. places.source_url  → "Extraído de:" para lugares creados con Quick Add
--   2. tabla contributions → imágenes, enlaces, contactos y notas por lugar
--   3. bucket de Storage 'place-images' (público) con sus permisos
-- ============================================================

-- 1) Columna source_url en places
alter table public.places add column if not exists source_url text;

-- 2) Tabla contributions
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  kind text not null check (kind in ('imagen', 'enlace', 'contacto', 'nota')),
  value text,            -- texto: nota, nombre del contacto, descripción del enlace
  url text,              -- url del enlace o de la imagen subida a Storage
  author text,
  created_at timestamptz not null default now()
);

alter table public.contributions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'contributions' and policyname = 'contributions_select') then
    create policy contributions_select on public.contributions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contributions' and policyname = 'contributions_insert') then
    create policy contributions_insert on public.contributions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contributions' and policyname = 'contributions_update') then
    create policy contributions_update on public.contributions for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contributions' and policyname = 'contributions_delete') then
    create policy contributions_delete on public.contributions for delete using (true);
  end if;
end $$;

-- Realtime para contributions
alter publication supabase_realtime add table public.contributions;

-- 3) Bucket de imágenes (público para lectura; subida abierta a los que tienen la anon key)
insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'place_images_read') then
    create policy place_images_read on storage.objects for select using (bucket_id = 'place-images');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'place_images_insert') then
    create policy place_images_insert on storage.objects for insert to anon, authenticated with check (bucket_id = 'place-images');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'place_images_delete') then
    create policy place_images_delete on storage.objects for delete to anon, authenticated using (bucket_id = 'place-images');
  end if;
end $$;
