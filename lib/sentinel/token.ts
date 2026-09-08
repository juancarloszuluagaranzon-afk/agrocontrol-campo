import { sentinelHubOAuth } from "@/lib/env";

/**
 * Token OAuth de CDSE (`client_credentials`), **compartido** por las rutas que
 * usan APIs autenticadas de Sentinel Hub (fechas del catálogo, estadísticas por
 * suerte). El secreto vive solo en el servidor (`SENTINELHUB_CLIENT_ID/SECRET`).
 * Cacheado a nivel de módulo entre invocaciones calientes.
 */

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

let cached: { value: string; exp: number } | null = null;

/** Devuelve un token válido, o `null` si no hay credenciales configuradas. */
export async function getSentinelToken(): Promise<string | null> {
  const oauth = sentinelHubOAuth();
  if (!oauth) return null;

  const now = Date.now();
  if (cached && cached.exp > now + 30_000) return cached.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  cached = {
    value: json.access_token,
    exp: now + (json.expires_in ?? 600) * 1000,
  };
  return cached.value;
}

/** Invalida el token cacheado (p. ej. tras un 401 del backend). */
export function invalidateSentinelToken(): void {
  cached = null;
}
