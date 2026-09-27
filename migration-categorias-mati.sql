-- ═════════════════════════════════════════════════════════════
-- Migración: categorías simplificadas + lugares actuales = Mati
-- 1) 'paseo_barrio' desaparece → esos lugares pasan a 'otro'
-- 2) Todos los lugares existentes quedan a nombre de Mati
--    (los demás miembros de la familia aún no han agregado)
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ═════════════════════════════════════════════════════════════

-- 1) Reasignar los paseos/barrios a 'otro'
update public.places
set category = 'otro'
where category = 'paseo_barrio';

-- Extra: los parques/jardines urbanos que quedaron en 'otro' van a 'parque'
update public.places set category = 'parque'
where category = 'otro' and lower(name) ~ 'parque|jardín|jardin|park';

-- 2) Todos los lugares existentes: agregados por Mati
update public.places
set added_by_tag = 'mati',
    added_by = 'Mati'
where added_by_tag is null or added_by_tag <> 'mati';
