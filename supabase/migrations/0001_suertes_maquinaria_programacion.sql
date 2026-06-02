-- ============================================================
-- AgroControl · Esquema geoespacial de campo (Supabase / PostGIS)
-- ============================================================
-- Requiere la extensión PostGIS (en Supabase: Database > Extensions > postgis).

create extension if not exists postgis;

-- ---------- Catálogo maestro de suertes ----------
create table if not exists suertes (
  sec_ste     text primary key,           -- ej: 3110-090
  suerte      text,
  sector      text,
  hacienda    text,
  planta      text,
  supervisor  text,
  jefe_zona   text,
  ha_oficial  numeric(10,3),
  lat         double precision,
  lon         double precision,
  geom        geometry(MultiPolygon, 4326)
);
create index if not exists suertes_geom_idx on suertes using gist (geom);
create index if not exists suertes_hacienda_idx on suertes (hacienda);

-- ---------- Inventario de maquinaria amarilla ----------
create table if not exists maquinaria (
  id          bigint generated always as identity primary key,
  tipo        text not null,              -- Retroexcavadora 130 (oruga), Doosan, Bulldozer...
  identificacion text,                    -- placa / código interno
  estado      text default 'disponible',
  creado_en   timestamptz default now()
);

-- ---------- Programación diaria de maquinaria ----------
create table if not exists programacion (
  id            bigint generated always as identity primary key,
  fecha         date not null,
  maquinaria_id bigint references maquinaria(id),
  sec_ste       text references suertes(sec_ste),
  operador      text,
  labor         text,                     -- Rectificación de drenaje, Limpieza corona...
  zona          smallint,                 -- 1 / 2
  avance        numeric(5,2),             -- % avance
  observaciones text,
  creado_en     timestamptz default now()
);
create index if not exists programacion_fecha_idx on programacion (fecha);

-- ============================================================
-- Carga de la capa de suertes desde el GeoJSON
-- ============================================================
-- Opción recomendada: ogr2ogr directo a Postgres (corre una sola vez).
-- Reemplaza HOST/DB/USER por los de tu Supabase (Connection string).
--
--   ogr2ogr -f PostgreSQL \
--     "PG:host=db.xxxx.supabase.co dbname=postgres user=postgres password=*** port=5432" \
--     suertes_riopaila.geojson \
--     -nln suertes_import -nlt MULTIPOLYGON -lco GEOMETRY_NAME=geom -overwrite
--
-- Luego normaliza dentro de la BD:
--
--   insert into suertes (sec_ste,suerte,sector,hacienda,planta,supervisor,jefe_zona,ha_oficial,lat,lon,geom)
--   select sec_ste, suerte, sector, hacienda, planta, supervisor, jefe_zona,
--          ha_oficial, lat, lon, st_multi(geom)
--   from suertes_import
--   on conflict (sec_ste) do update set
--     hacienda=excluded.hacienda, supervisor=excluded.supervisor,
--     jefe_zona=excluded.jefe_zona, ha_oficial=excluded.ha_oficial, geom=excluded.geom;
--   drop table suertes_import;
--
-- Alternativa sin ogr2ogr: cargar suertes_maestro.csv a una tabla staging
-- (atributos) y la geometría aparte vía st_geomfromgeojson por cada feature.
