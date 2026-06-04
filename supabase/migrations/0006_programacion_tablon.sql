-- ============================================================
-- AgroControl · Maquinaria por tablón (§5)
-- La unidad de asignación pasa de suerte a TABLÓN. La programación referencia
-- el tablón (tab_id, ej. "3111-020-T3") además de la suerte (sec_ste).
-- ============================================================

alter table public.programacion
  add column if not exists tab_id text,
  add column if not exists tablon smallint;

create index if not exists programacion_tab_id_idx on public.programacion (tab_id);

-- La geometría de los tablones vive en el GeoJSON estático de la app; tab_id es
-- la referencia. (Si en el futuro se requieren consultas espaciales server-side,
-- se puede añadir una tabla `tablones` con su seed.)
