import { NextResponse, type NextRequest } from "next/server";
import { sentinelHubOAuth } from "@/lib/env";
import {
  catalogSearchBody,
  parseCatalogDates,
  type Bbox,
} from "@/lib/geo/sentinelCatalog";

/**
 * Fechas de adquisición Sentinel-2 sobre un AOI, con nubosidad (ADR-0025).
 *
 * La Catalog API (STAC) de CDSE exige OAuth, así que el secreto vive aquí (nunca
 * en el cliente). Sin credenciales, responde `{configured:false}` y el calendario
 * degrada a un mes normal sin marcar días (no rompe nada).
 *
 * GET /api/sentinel-dates?bbox=W,S,E,N&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const dynamic = "force-dynamic";

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const CATALOG_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search";

// Token cacheado a nivel de módulo (se reusa entre invocaciones calientes).
let cachedToken: { value: string; exp: number } | null = null;

async function getToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now + 30_000) return cachedToken.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  cachedToken = {
    value: json.access_token,
    exp: now + (json.expires_in ?? 600) * 1000,
  };
  return cachedToken.value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const oauth = sentinelHubOAuth();
  if (!oauth) return NextResponse.json({ configured: false, dates: [] });

  const sp = req.nextUrl.searchParams;
  const bboxRaw = sp.get("bbox");
  const from = sp.get("from");
  const to = sp.get("to");

  const bbox = bboxRaw?.split(",").map(Number);
  const bboxOk = bbox?.length === 4 && bbox.every((n) => Number.isFinite(n));
  if (!bboxOk || !from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return NextResponse.json(
      { configured: true, dates: [], error: "params" },
      { status: 400 },
    );
  }

  try {
    const token = await getToken(oauth.clientId, oauth.clientSecret);
    const res = await fetch(CATALOG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(catalogSearchBody(bbox as Bbox, from, to)),
    });
    if (!res.ok) {
      // token vencido u otro error: no fijar caché envenenada
      if (res.status === 401) cachedToken = null;
      return NextResponse.json({
        configured: true,
        dates: [],
        error: `catalog ${res.status}`,
      });
    }
    const json = (await res.json()) as { features?: unknown[] };
    const dates = parseCatalogDates(
      (json.features ?? []) as Parameters<typeof parseCatalogDates>[0],
    );
    return NextResponse.json(
      { configured: true, dates },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ configured: true, dates: [], error: "fetch" });
  }
}
