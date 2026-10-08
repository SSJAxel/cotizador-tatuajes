import { describe, expect, it } from "vitest";
import { calcularCotizacion } from "./calculate.js";
import { EJEMPLO_CONFIG } from "./fixtures.js";
import type { QuoteInput } from "./types.js";

const baseInput: QuoteInput = {
  tamanoCm: 10,
  zona: "brazo",
  tecnica: "lineas_finas",
};

describe("calcularCotizacion", () => {
  it("calcula el caso base: horas × tarifa + fijo de preparación", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, baseInput);
    // horas = 10cm / 4cm-por-hora = 2.5h (brazo y líneas finas no ajustan)
    // precio = 2.5h * 25000/h + 5000 (fijo prep) = 67500
    expect(resultado.desglose.horasEstimadas).toBe(2.5);
    expect(resultado.desglose.costoTiempo).toBe(62500);
    expect(resultado.desglose.fijoPreparacion).toBe(5000);
    expect(resultado.precioEstimado).toBe(67500);
  });

  it("una técnica con más multiplicadorHoras aumenta las horas, no la tarifa", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      tecnica: "realismo",
    });
    // horas = 2.5h * 1.6 (realismo) = 4h -> 4 * 25000 + 5000 = 105000
    expect(resultado.desglose.horasEstimadas).toBe(4);
    expect(resultado.desglose.tarifaHoraria).toBe(25000);
    expect(resultado.precioEstimado).toBe(105000);
  });

  it("redondea las horas estimadas hacia arriba en pasos de media hora", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, tamanoCm: 11 });
    // horas = 11/4 = 2.75 -> redondea a 3 -> 3 * 25000 + 5000 = 80000
    expect(resultado.desglose.horasEstimadas).toBe(3);
    expect(resultado.precioEstimado).toBe(80000);
  });

  it("aplica el mínimo de estudio como piso duro cuando el trabajo es muy chico", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, tamanoCm: 1 });
    // horas = 1/4 = 0.25 -> redondea a 0.5 -> 0.5*25000 + 5000 = 17500... pero
    // comparemos: con tamaño chico y tarifa baja el subtotal puede caer debajo
    // del mínimo. Acá 17500 > 15000, así que NO aplica el mínimo.
    expect(resultado.desglose.horasEstimadas).toBe(0.5);
    expect(resultado.desglose.aplicoMinimo).toBe(false);
    expect(resultado.precioEstimado).toBe(17500);
  });

  it("el mínimo de estudio nunca deja que el precio quede por debajo", () => {
    // Config con tarifa y fijo chicos para forzar que el subtotal < mínimo.
    const configBarata = { ...EJEMPLO_CONFIG, tarifaHoraria: 1000, fijoPreparacion: 0 };
    const resultado = calcularCotizacion(configBarata, { ...baseInput, tamanoCm: 1 });
    // subtotal = 0.5h * 1000 + 0 = 500, pero el mínimo (15000) manda.
    expect(resultado.desglose.aplicoMinimo).toBe(true);
    expect(resultado.precioEstimado).toBe(15000);
  });

  it("rechaza zonas íntimas excluidas", () => {
    expect(() => calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, zona: "pene" })).toThrow(
      /no está permitida/,
    );
  });

  it("rechaza una zona sin dificultad configurada", () => {
    expect(() => calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, zona: "oreja" })).toThrow(
      /No hay dificultad configurada/,
    );
  });
});
