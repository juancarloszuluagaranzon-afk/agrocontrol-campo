import { describe, it, expect } from "vitest";
import {
  primerPuntoMedicion,
  linkUbicacion,
  mensajeCompartir,
} from "@/lib/share/ubicacion";
import type { Geometry } from "geojson";

describe("primerPuntoMedicion", () => {
  it("distancia (LineString): devuelve el primer vértice, no el centroide", () => {
    const geom: Geometry = {
      type: "LineString",
      coordinates: [
        [-76.12, 4.31],
        [-76.1, 4.33],
      ],
    };
    expect(primerPuntoMedicion(geom)).toEqual([-76.12, 4.31]);
  });

  it("área (Polygon): devuelve el primer punto del anillo exterior", () => {
    const geom: Geometry = {
      type: "Polygon",
      coordinates: [
        [
          [-76.12, 4.31],
          [-76.1, 4.31],
          [-76.1, 4.33],
          [-76.12, 4.31],
        ],
      ],
    };
    expect(primerPuntoMedicion(geom)).toEqual([-76.12, 4.31]);
  });

  it("Point: devuelve sus coordenadas", () => {
    const geom: Geometry = { type: "Point", coordinates: [-76.2, 3.25] };
    expect(primerPuntoMedicion(geom)).toEqual([-76.2, 3.25]);
  });

  it("lanza si la geometría no tiene puntos", () => {
    const geom: Geometry = { type: "LineString", coordinates: [] };
    expect(() => primerPuntoMedicion(geom)).toThrow();
  });
});

describe("linkUbicacion", () => {
  it("arma la URL con planta, lat, lon y nombre codificado", () => {
    const url = linkUbicacion("https://riomap.vercel.app", {
      planta: "castilla",
      lon: -76.36,
      lat: 3.251,
      nombre: "Bocatoma La Isla",
    });
    expect(url).toContain("https://riomap.vercel.app/mapa?");
    expect(url).toContain("p=castilla");
    expect(url).toContain("lat=3.251000");
    expect(url).toContain("lon=-76.360000");
    // el espacio del nombre queda codificado (+ o %20)
    expect(url).toMatch(/n=Bocatoma(\+|%20)La(\+|%20)Isla/);
  });
});

describe("mensajeCompartir", () => {
  it("incluye el nombre y las coordenadas (lat, lon)", () => {
    const msg = mensajeCompartir({
      planta: "riopaila",
      lon: -76.119,
      lat: 4.31,
      nombre: "Punto A",
    });
    expect(msg).toContain("Punto A");
    expect(msg).toContain("4.310000, -76.119000");
  });
});
