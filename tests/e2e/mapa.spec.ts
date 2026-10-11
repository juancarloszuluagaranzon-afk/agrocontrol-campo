import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

test.beforeEach(async ({ page }) => {
  await elegirPlanta(page); // entra directo al mapa de Riopaila
});

test("mapa: buscar una suerte y abrir un tablón muestra sus atributos", async ({
  page,
}) => {
  await page.goto("/mapa");

  // El mapa MapLibre se monta.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Buscar por código de suerte → aparecen sus tablones.
  await page.getByPlaceholder("Buscar suerte o hacienda").fill("3111-020");
  await page.getByRole("button", { name: "3111-020-T1" }).click();

  // El panel muestra el tablón con sus atributos oficiales (§5).
  const panel = page.getByRole("dialog", { name: "Tablón 3111-020-T1" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Suerte 3111-020");
  await expect(panel).toContainText("Tablón 1");
  await expect(panel).toContainText("de 5");
  await expect(panel).toContainText("PERALONSO");
  // El área de la suerte completa (maestro), además del área del tablón.
  await expect(panel).toContainText("Área de la suerte");

  // Sección de agronomía del maestro (variedad de la suerte).
  await expect(panel).toContainText("Agronomía");
  await expect(panel).toContainText("CC 05-430");
});

test("mapa: el modo Plano muestra la leyenda de haciendas", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  // La leyenda sólo existe en modo Plano y dentro del panel de Capas.
  await page.getByRole("button", { name: "🗺️ Plano" }).click();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("button", { name: /Leyenda/ }).click();
  // Encabezado exacto de la leyenda; "Haciendas (límites)" es otra capa de contexto.
  await expect(page.getByText("Haciendas", { exact: true })).toBeVisible();
  await expect(page.getByText("PERALONSO")).toBeVisible();
});

test("mapa: modo Plano muestra la marca de agua del nombre de hacienda (ADR-0014)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Espera a que el mapa termine de montar todas sus capas (map.on("load"))
  // antes de interactuar, para no correr contra el efecto de baseMode a mitad
  // de carga (el propio mapa expone __e2eMap solo en E2E, ver MapView.tsx).
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  await page.getByRole("button", { name: "🗺️ Plano" }).click();

  // La capa se llena de forma asíncrona (fetch del JSON de etiquetas); espera
  // a que la fuente tenga datos y la capa esté visible.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = window as unknown as {
            __e2eMap?: {
              querySourceFeatures: (
                id: string,
              ) => { properties: { hacienda: string } }[];
              getLayoutProperty: (id: string, prop: string) => unknown;
            };
          };
          const map = w.__e2eMap;
          if (!map) return null;
          // querySourceFeatures puede repetir features en bordes de tiles
          // internos (comportamiento documentado de MapLibre); deduplica.
          const nombres = new Set(
            map
              .querySourceFeatures("hacienda-label")
              .map((f) => f.properties.hacienda),
          );
          return {
            featureCount: nombres.size,
            visibility: map.getLayoutProperty(
              "hacienda-label-layer",
              "visibility",
            ),
          };
        }),
      { timeout: 10_000 },
    )
    .toMatchObject({ featureCount: 17, visibility: "visible" });

  // Al volver a Satélite, se apaga junto con el color por hacienda.
  await page.getByRole("button", { name: "🛰️ Satélite" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as {
          __e2eMap?: { getLayoutProperty: (id: string, p: string) => unknown };
        };
        return w.__e2eMap?.getLayoutProperty(
          "hacienda-label-layer",
          "visibility",
        );
      }),
    )
    .toBe("none");
});

test("mapa: en móvil el buscador y el conmutador no se solapan", async ({
  page,
}) => {
  // Viewport de un teléfono típico de campo.
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const buscador = page.getByPlaceholder("Buscar suerte o hacienda");
  const base = page.getByRole("button", { name: "🗺️ Plano" });
  await expect(buscador).toBeVisible();
  await expect(base).toBeVisible();

  // El buscador (arriba) y el conmutador (debajo) no deben solaparse.
  const b = await buscador.boundingBox();
  const c = await base.boundingBox();
  expect(b).not.toBeNull();
  expect(c).not.toBeNull();
  if (b && c) expect(c.y).toBeGreaterThanOrEqual(b.y + b.height - 1);

  // El menú de herramientas funciona en pantalla angosta.
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();
});

test("mapa: crear un marcador privado lo lista", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Marcadores", exact: true }).click();
  await page.getByRole("button", { name: /Nuevo marcador/ }).click();
  await page.getByPlaceholder("Nombre del punto").fill("Compuerta dañada");
  await page.getByRole("button", { name: "Guardar aquí" }).click();

  // Vuelve a la lista y aparece el marcador recién creado.
  await expect(
    page.getByRole("button", { name: "Compuerta dañada", exact: true }),
  ).toBeVisible();
});

test("mapa: planilla de lluvia por técnico guarda y acumula", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Lluvia (precipitación)" }).click();

  // Elige el primer técnico → aparecen sus pluviómetros.
  const tecnico = page.getByLabel("Técnico");
  await expect(tecnico.locator("option").nth(1)).toBeAttached();
  await tecnico.selectOption({ index: 1 });

  // Anota los mm del primer pluviómetro de su lista y guarda la planilla.
  const mm = page.locator('input[type="number"]').first();
  await mm.fill("12.5");
  await page.getByRole("button", { name: "Guardar planilla" }).click();

  // El acumulado del mes/año refleja la lectura recién guardada.
  await expect(page.getByText(/mes 12\.5 mm/)).toBeVisible();
});

test("mapa: el reporte de lluvia muestra la tabla y descarga el XLSX", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Reporte de lluvia" }).click();

  // Panel de pantalla completa con la tabla del consolidado (encabezados de semana).
  await expect(page.getByText("Reporte de lluvia")).toBeVisible();
  await expect(page.getByText(/SEMANA \d+/).first()).toBeVisible();
  await expect(page.getByText("RIOPAILA AGRICOLA S.A.")).toBeVisible();

  // Descargar XLSX no rompe la página (se dispara la descarga del archivo).
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar XLSX" }).click();
  const download = await descarga;
  expect(download.suggestedFilename()).toMatch(/^reporte_lluvia_.*\.xlsx$/);

  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("mapa: se pueden conmutar las capas de contexto", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  const redHidrica = page.getByRole("checkbox").first();
  await redHidrica.check();
  await expect(redHidrica).toBeChecked();
});

test("mapa: un deep-link compartido vuela al punto, lo marca y limpia la URL (ADR-0018)", async ({
  page,
}) => {
  // Link recibido por WhatsApp: planta + primer punto de referencia + nombre.
  await page.goto(
    "/mapa?p=riopaila&lat=4.31&lon=-76.119&n=Punto%20de%20prueba",
  );
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // El mapa termina de montar (map.on("load") expone __e2eMap).
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  // (a) Vuela al punto: el centro del mapa queda sobre esas coordenadas.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const map = (
            window as unknown as {
              __e2eMap?: { getCenter: () => { lng: number; lat: number } };
            }
          ).__e2eMap;
          if (!map) return null;
          const c = map.getCenter();
          return {
            lng: Math.round(c.lng * 100) / 100,
            lat: Math.round(c.lat * 100) / 100,
          };
        }),
      { timeout: 10_000 },
    )
    .toMatchObject({ lng: -76.12, lat: 4.31 });

  // (b) Aparece el pin del punto compartido con el nombre del link.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const map = (
            window as unknown as {
              __e2eMap?: {
                querySourceFeatures: (
                  id: string,
                ) => { properties: { nombre: string } }[];
              };
            }
          ).__e2eMap;
          if (!map) return null;
          return map
            .querySourceFeatures("punto-compartido")
            .map((f) => f.properties.nombre);
        }),
      { timeout: 10_000 },
    )
    .toContain("Punto de prueba");

  // (c) La URL queda limpia: un refresh no re-dispara el vuelo ni deja el pin pegado.
  await expect.poll(() => new URL(page.url()).search).toBe("");
});

test("mapa: el Maestro nativo busca una suerte, abre su ficha y 'Ver en el mapa' cierra el panel (ADR-0019)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Abrir el Maestro desde el menú de Herramientas.
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Maestro de suertes" }).click();

  const panel = page.getByRole("dialog", { name: "Maestro de suertes" });
  await expect(panel).toBeVisible();

  // Buscar una suerte conocida y abrir su ficha.
  await panel.getByPlaceholder("Buscar suerte o hacienda…").fill("3111-020");
  await panel
    .getByRole("button", { name: /3111-020/ })
    .first()
    .click();

  // La ficha muestra la agronomía del maestro y el botón de ubicación.
  await expect(panel.getByText("Agronomía")).toBeVisible();
  await expect(panel.getByText("Variedad")).toBeVisible();
  const verEnMapa = panel.getByRole("button", { name: /Ver en el mapa/ });
  await expect(verEnMapa).toBeVisible();

  // "Ver en el mapa" cierra el panel y el mapa sigue en pie.
  await verEnMapa.click();
  await expect(panel).toBeHidden();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("mapa: la capa Sentinel-2 (EOX) se enciende desde Capas (ADR-0021)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  const sentinel = page.getByRole("checkbox", { name: /Sentinel-2/ });
  await sentinel.check();
  await expect(sentinel).toBeChecked();

  // La capa raster s2cloudless queda visible en el estilo del mapa.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const m = (
          window as unknown as {
            __e2eMap?: {
              getLayoutProperty: (id: string, p: string) => unknown;
            };
          }
        ).__e2eMap;
        return m?.getLayoutProperty("s2cloudless", "visibility");
      }),
    )
    .toBe("visible");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("mapa: la capa de lluvia (gotas) se activa desde Capas sin romper el mapa", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  // Cualquier usuario enciende la lluvia de hoy desde el panel de Capas.
  const lluvia = page.getByRole("checkbox", {
    name: "Pluviómetros (lluvia hoy)",
  });
  await lluvia.check();
  await expect(lluvia).toBeChecked();
  // El mapa sigue en pie (la capa de gotas no lo desestabiliza).
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("mapa: la capa 'Edad de la caña' colorea las suertes y muestra su leyenda (ADR-0034)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  const edad = page.getByRole("checkbox", { name: /Edad de la caña/ });
  await edad.check();
  await expect(edad).toBeChecked();

  // La capa queda visible y su color es un `match` por sec_ste (maestro cargado).
  await expect
    .poll(() =>
      page.evaluate(() => {
        const m = (
          window as unknown as {
            __e2eMap?: {
              getLayoutProperty: (id: string, p: string) => unknown;
              getPaintProperty: (id: string, p: string) => unknown;
            };
          }
        ).__e2eMap;
        const vis = m?.getLayoutProperty("suertes-edad", "visibility");
        const color = m?.getPaintProperty("suertes-edad", "fill-color");
        return `${String(vis)}|${Array.isArray(color) ? color[0] : "plano"}`;
      }),
    )
    .toBe("visible|match");

  // Leyenda con los cuatro rangos y conteos.
  const leyenda = page.getByRole("region", { name: "Edad de la caña" });
  await expect(leyenda.getByText("Menor a 4 meses")).toBeVisible();
  await expect(leyenda.getByText("De 4 a 10 meses")).toBeVisible();
  await expect(leyenda.getByText("De 10 a 11,8 meses")).toBeVisible();
  await expect(
    leyenda.getByText("Para cosecha (11,8 meses o más)"),
  ).toBeVisible();
  await expect(leyenda.getByText("Renovación / sin dato")).toBeVisible();
  await expect(leyenda.getByText(/\d+ suertes?/).first()).toBeVisible();

  // Apagarla la oculta y retira la leyenda.
  await edad.uncheck();
  await expect(leyenda).toBeHidden();
});

test("mapa: en 'Edad de la caña' se pueden apagar rangos y solo se pintan los encendidos (ADR-0034)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("checkbox", { name: /Edad de la caña/ }).check();

  const leyenda = page.getByRole("region", { name: "Edad de la caña" });
  const cosecha = leyenda.getByRole("button", { name: /Para cosecha/ });
  await expect(cosecha).toHaveAttribute("aria-pressed", "true");

  /** Colores presentes en el `match` de la capa. */
  const colores = () =>
    page.evaluate(() => {
      const m = (
        window as unknown as {
          __e2eMap?: { getPaintProperty: (id: string, p: string) => unknown };
        }
      ).__e2eMap;
      const c = m?.getPaintProperty("suertes-edad", "fill-color");
      return Array.isArray(c)
        ? c.filter(
            (x): x is string => typeof x === "string" && x.startsWith("#"),
          )
        : [];
    });

  // El maestro llega por fetch: bajo carga puede tardar más de 10 s.
  await expect.poll(colores, { timeout: 30_000 }).toContain("#dc2626");
  await cosecha.click();
  await expect(cosecha).toHaveAttribute("aria-pressed", "false");
  await expect.poll(colores).not.toContain("#dc2626");
  // Los conteos siguen visibles aunque el rango esté apagado.
  await expect(cosecha).toContainText(/\d+ suertes?/);

  // Apagar todos muestra el aviso y deja la capa sin colores.
  for (const nombre of [
    /Menor a 4 meses/,
    /De 4 a 10 meses/,
    /De 10 a 11,8 meses/,
    /Renovación/,
  ]) {
    await leyenda.getByRole("button", { name: nombre }).click();
  }
  await expect(leyenda.getByRole("status")).toHaveText(
    "Ningún rango seleccionado.",
  );
  await expect.poll(colores).toEqual([]);
});

test("mapa: con 'Edad de la caña' e índice encendidos, el índice solo se ve en los rangos filtrados (ADR-0034)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  // Edad: solo "Para cosecha".
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("checkbox", { name: /Edad de la caña/ }).check();
  const leyenda = page.getByRole("region", { name: "Edad de la caña" });
  for (const nombre of [
    /Menor a 4 meses/,
    /De 4 a 10 meses/,
    /De 10 a 11,8 meses/,
    /Renovación/,
  ]) {
    await leyenda.getByRole("button", { name: nombre }).click();
  }

  /** Estado de las capas de edad en el estilo del mapa. */
  const estado = () =>
    page.evaluate(() => {
      const m = (
        window as unknown as {
          __e2eMap?: {
            getLayoutProperty: (id: string, p: string) => unknown;
            getPaintProperty: (id: string, p: string) => unknown;
          };
        }
      ).__e2eMap;
      const relleno = m?.getPaintProperty("suertes-edad", "fill-color");
      return {
        borde: m?.getLayoutProperty("suertes-edad-borde", "visibility"),
        // modo normal: match con color por defecto transparente;
        // modo índice: match con velo por defecto.
        porDefecto: Array.isArray(relleno) ? relleno.at(-1) : relleno,
      };
    });
  await expect
    .poll(estado)
    .toEqual({ borde: "none", porDefecto: "rgba(0,0,0,0)" });

  // Encender NDMI: la edad pasa a modo índice (velo fuera del filtro + bordes).
  await page.getByRole("button", { name: "Cerrar" }).first().click();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Índices satelitales" }).click();
  await page.getByText("NDMI (humedad)").click();
  await expect
    .poll(estado)
    .toEqual({ borde: "visible", porDefecto: "#0a0f1a" });
  await expect(
    leyenda.getByText("Índice visible solo en los rangos encendidos."),
  ).toBeVisible();

  // Apagar el índice vuelve al modo normal.
  await page.getByText("NDMI (humedad)").click();
  await expect
    .poll(estado)
    .toEqual({ borde: "none", porDefecto: "rgba(0,0,0,0)" });
});

test("mapa: lluvia acumulada reciente sobre las suertes filtradas por edad (ADR-0034)", async ({
  page,
}) => {
  // Lecturas de 2 mm/día en todos los pluviómetros los 3 días previos (día vencido).
  const ids: number[] = await (
    await page.request.get("/data/pluviometros_riopaila.json")
  )
    .json()
    .then((l: Array<{ id: number }>) => l.map((p) => p.id));
  await page.addInitScript((pluvs: number[]) => {
    const p = (n: number) => String(n).padStart(2, "0");
    const hoy = new Date();
    const items = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
      const fecha = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      for (const id of pluvs) {
        items.push({
          id: `e2e-${id}-${fecha}`,
          autor: "e2e",
          planta: "riopaila",
          pluviometro: id,
          fecha,
          mm: 2,
          nota: "",
          deleted: false,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        });
      }
    }
    localStorage.setItem(
      "agrocontrol-precipitaciones",
      JSON.stringify({
        state: { items, pending: [], syncing: false, userId: "" },
        version: 0,
      }),
    );
  }, ids);

  await page.goto("/mapa");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("checkbox", { name: /Edad de la caña/ }).check();

  const leyenda = page.getByRole("region", { name: "Edad de la caña" });
  for (const nombre of [
    /Menor a 4 meses/,
    /De 4 a 10 meses/,
    /De 10 a 11,8 meses/,
    /Renovación/,
  ]) {
    await leyenda.getByRole("button", { name: nombre }).click();
  }
  await leyenda
    .getByRole("checkbox", { name: /Lluvia de los últimos/ })
    .check();
  await expect(leyenda.getByRole("button", { name: "3 días" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(leyenda.getByText("Hasta 5 mm")).toBeVisible();

  /** Rótulos de lluvia en el mapa. */
  const rotulos = () =>
    page.evaluate(() => {
      const m = (
        window as unknown as {
          __e2eMap?: {
            getLayoutProperty: (id: string, p: string) => unknown;
            getSource: (id: string) =>
              | {
                  serialize: () => {
                    data?: {
                      features?: Array<{ properties: { etiqueta: string } }>;
                    };
                  };
                }
              | undefined;
          };
        }
      ).__e2eMap;
      const fc = m?.getSource("edad-lluvia")?.serialize().data;
      const et = (fc?.features ?? []).map((f) => f.properties.etiqueta);
      return {
        visible: m?.getLayoutProperty("edad-lluvia-label", "visibility"),
        n: et.length,
        etiquetas: [...new Set(et)],
      };
    });
  // Solo las suertes "Para cosecha", todas con 3 × 2 mm = 6 mm.
  await expect
    .poll(rotulos)
    .toMatchObject({ visible: "visible", etiquetas: ["6 mm"] });
  expect((await rotulos()).n).toBeGreaterThan(0);

  // 5 días: faltan 2 días de lecturas → asterisco.
  await leyenda.getByRole("button", { name: "5 días" }).click();
  await expect.poll(rotulos).toMatchObject({ etiquetas: ["6 mm*"] });

  // Apagar la lluvia oculta los rótulos.
  await leyenda
    .getByRole("checkbox", { name: /Lluvia de los últimos/ })
    .uncheck();
  await expect.poll(rotulos).toMatchObject({ visible: "none" });
});

test("mapa: en celular la leyenda de edad arranca plegada y abierta no pasa del 45 % de la pantalla (ADR-0034)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mapa");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("checkbox", { name: /Edad de la caña/ }).check();
  await page.getByRole("button", { name: "Cerrar" }).first().click();

  const leyenda = page.getByRole("region", { name: "Edad de la caña" });
  const barra = leyenda.getByRole("button", {
    name: "Mostrar la leyenda de edad",
  });
  await expect(barra).toBeVisible();
  await expect(barra).toContainText("5 de 5 rangos");
  // Plegada: una sola barra.
  expect((await leyenda.boundingBox())!.height).toBeLessThan(70);

  await barra.click();
  const cosecha = leyenda.getByRole("button", { name: /Para cosecha/ });
  await expect(cosecha).toBeVisible();
  await expect(cosecha).toContainText("Cosecha ≥ 11,8");
  expect((await leyenda.boundingBox())!.height).toBeLessThanOrEqual(
    844 * 0.45 + 60,
  );

  // Los interruptores siguen funcionando y la barra resume la selección.
  await cosecha.click();
  await expect(cosecha).toHaveAttribute("aria-pressed", "false");
  await leyenda
    .getByRole("button", { name: "Ocultar la leyenda de edad" })
    .click();
  await expect(
    leyenda.getByRole("button", { name: "Mostrar la leyenda de edad" }),
  ).toContainText("4 de 5 rangos");
});

test.describe("GPS tras una recarga", () => {
  test.use({
    geolocation: { latitude: 4.36, longitude: -76.11, accuracy: 8 },
    permissions: ["geolocation"],
  });

  test("mapa: si el GPS estaba encendido, se reanuda solo después de recargar", async ({
    page,
  }) => {
    await page.goto("/mapa");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.getByRole("button", { name: "Activar mi ubicación" }).click();
    const centrar = page.getByRole("button", {
      name: "Centrar en mi ubicación",
    });
    await expect(centrar).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    // Sin tocar nada: el GPS vuelve a estar activo y con posición.
    await expect(
      page.getByRole("button", { name: "Centrar en mi ubicación" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/± \d+ m/)).toBeVisible();
  });
});

test.describe("GPS: modo seguirme", () => {
  test.use({
    geolocation: { latitude: 4.36, longitude: -76.11, accuracy: 8 },
    permissions: ["geolocation"],
  });

  test("mapa: el mapa sigue al técnico; al arrastrar deja de seguir y el botón lo reactiva (ADR-0035)", async ({
    page,
    context,
  }) => {
    await page.goto("/mapa");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean((window as { __e2eMap?: unknown }).__e2eMap),
        ),
      )
      .toBe(true);

    /** Centro actual del mapa [lon, lat]. */
    const centro = () =>
      page.evaluate(() => {
        const m = (
          window as unknown as {
            __e2eMap: { getCenter: () => { lng: number; lat: number } };
          }
        ).__e2eMap;
        const c = m.getCenter();
        return [c.lng, c.lat];
      });
    const cerca = (c: number[], lon: number, lat: number) =>
      Math.abs(c[0]! - lon) < 0.0005 && Math.abs(c[1]! - lat) < 0.0005;

    await page.getByRole("button", { name: "Activar mi ubicación" }).click();
    await expect
      .poll(async () => cerca(await centro(), -76.11, 4.36), {
        timeout: 15_000,
      })
      .toBe(true);

    // El técnico camina ~250 m: el mapa lo acompaña.
    await context.setGeolocation({
      latitude: 4.3622,
      longitude: -76.1108,
      accuracy: 8,
    });
    await expect
      .poll(async () => cerca(await centro(), -76.1108, 4.3622), {
        timeout: 15_000,
      })
      .toBe(true);

    // Arrastra el mapa: deja de seguir y el botón ofrece "Seguir mi ubicación".
    const canvas = page.locator(".maplibregl-canvas");
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 160,
      box.y + box.height / 2 + 60,
      { steps: 8 },
    );
    await page.mouse.up();
    const seguir = page.getByRole("button", { name: "Seguir mi ubicación" });
    await expect(seguir).toBeVisible();
    const tras = await centro();
    await context.setGeolocation({
      latitude: 4.364,
      longitude: -76.112,
      accuracy: 8,
    });
    await page.waitForTimeout(1500);
    expect(cerca(await centro(), -76.112, 4.364)).toBe(false);
    expect(cerca(await centro(), tras[0]!, tras[1]!)).toBe(true);

    // Tocar el botón vuelve a seguir y centra.
    await seguir.click();
    await expect(
      page.getByRole("button", { name: "Centrar en mi ubicación" }),
    ).toBeVisible();
    await expect
      .poll(async () => cerca(await centro(), -76.112, 4.364), {
        timeout: 15_000,
      })
      .toBe(true);
  });
});

test("mapa: si el GPS tarda (tiempo agotado), no muestra error y sigue 'Afinando ubicación…' (ADR-0035)", async ({
  page,
}) => {
  // GPS falso: el primer intento agota el tiempo (código 3) y no hay posición
  // aproximada; la posición llega después por el seguimiento.
  await page.addInitScript(() => {
    let watchCb: ((p: GeolocationPosition) => void) | null = null;
    const fake = {
      getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) =>
        err({ code: 2 }),
      watchPosition: (
        ok: (p: GeolocationPosition) => void,
        err: (e: { code: number; PERMISSION_DENIED: number }) => void,
      ) => {
        watchCb = ok;
        setTimeout(() => err({ code: 3, PERMISSION_DENIED: 1 }), 50);
        return 1;
      },
      clearWatch: () => undefined,
    };
    Object.defineProperty(navigator, "geolocation", { value: fake });
    (window as unknown as { __entregarFix: () => void }).__entregarFix = () =>
      watchCb?.({
        coords: {
          latitude: 4.36,
          longitude: -76.11,
          accuracy: 6,
          heading: null,
        },
      } as unknown as GeolocationPosition);
  });
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Activar mi ubicación" }).click();

  await expect(page.getByText("Afinando ubicación…")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByText("No se pudo obtener la ubicación.")).toHaveCount(
    0,
  );

  await page.evaluate(() =>
    (window as unknown as { __entregarFix: () => void }).__entregarFix(),
  );
  await expect(page.getByText(/± 6 m/)).toBeVisible();
});
