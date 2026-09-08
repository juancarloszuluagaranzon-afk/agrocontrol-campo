import { NextResponse, type NextRequest } from "next/server";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  getSentinelToken,
  invalidateSentinelToken,
} from "@/lib/sentinel/token";
import {
  isStatIndex,
  parseStats,
  parseStatsSeries,
  statsBody,
  type StatIndex,
} from "@/lib/geo/sentinelStats";

/**
 * Estadísticas (media/mín/máx) de un índice sobre un tablón, vía la Statistical
 * API de Sentinel Hub (ADR-0027). Reutiliza el OAuth del calendario. Sin
 * credenciales → `{configured:false}`.
 *
 * GET /api/sentinel-stats?tab_id=...&planta=riopaila&index=NDVI&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const dynamic = "force-dynamic";

const STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLANTAS = new Set(["riopaila", "castilla"]);

// geojson de tablones cacheado por planta (evita re-descargar/parsear).
const tablonesCache = new Map<string, FeatureCollection>();

async function tablonGeometry(
  origin: string,
  planta: string,
  tabId: string,
): Promise<Geometry | null> {
  let fc = tablonesCache.get(planta);
  if (!fc) {
    const res = await fetch(`${origin}/data/tablones_${planta}.geojson`);
    if (!res.ok) return null;
    fc = (await res.json()) as FeatureCollection;
    tablonesCache.set(planta, fc);
  }
  const f = fc.features.find(
    (feat: Feature) => feat.properties?.tab_id === tabId,
  );
  return f?.geometry ?? null;
}

export async function GET(req: NextRequest) {
  const token = await getSentinelToken();
  if (!token) return NextResponse.json({ configured: false, stats: null });

  const sp = req.nextUrl.searchParams;
  const tabId = sp.get("tab_id");
  const planta = sp.get("planta");
  const index = sp.get("index");
  const from = sp.get("from");
  const to = sp.get("to");
  // Nubosidad máxima de escena admitida (0–100). Con SCL enmascarando nubes por
  // píxel (ADR-0028), el valor por defecto es alto; se puede afinar por query.
  const maxccRaw = sp.get("maxcc");
  const maxcc =
    maxccRaw && /^\d{1,3}$/.test(maxccRaw)
      ? Math.min(100, Number(maxccRaw))
      : 60;
  // Modo **serie temporal**: intervalo de agregación (`P<n>D`) → devuelve la
  // curva `[{from,to,stats}]` en vez de un único `{stats}` (ADR-0029).
  const intervalRaw = sp.get("interval");
  const interval =
    intervalRaw && /^P\d{1,3}D$/.test(intervalRaw) ? intervalRaw : undefined;

  if (
    !tabId ||
    !planta ||
    !PLANTAS.has(planta) ||
    !index ||
    !isStatIndex(index) ||
    !from ||
    !to ||
    !ISO_DATE.test(from) ||
    !ISO_DATE.test(to)
  ) {
    return NextResponse.json(
      { configured: true, stats: null, error: "params" },
      { status: 400 },
    );
  }

  try {
    const geometry = await tablonGeometry(req.nextUrl.origin, planta, tabId);
    if (!geometry) {
      return NextResponse.json({
        configured: true,
        stats: null,
        error: "tablon",
      });
    }

    const res = await fetch(STATS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        statsBody(geometry, from, to, index as StatIndex, maxcc, interval),
      ),
    });
    if (!res.ok) {
      if (res.status === 401) invalidateSentinelToken();
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return NextResponse.json({
        configured: true,
        stats: null,
        error: `stats ${res.status}`,
        detail,
      });
    }
    const json = await res.json();
    const payload = interval
      ? { configured: true, series: parseStatsSeries(json) }
      : { configured: true, stats: parseStats(json) };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ configured: true, stats: null, error: "fetch" });
  }
}
