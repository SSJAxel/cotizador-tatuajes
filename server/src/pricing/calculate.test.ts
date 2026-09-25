import { describe, expect, it } from "vitest";
import { calcularCotizacion } from "./calculate.js";
import { EJEMPLO_CONFIG } from "./fixtures.js";
import type { QuoteInput } from "./types.js";

const baseInput: QuoteInput = {
  tamanoCm: 10,
  zona: "brazo",
  tecnica: "lineas_finas",
  especializacion: "cualquiera_del_estudio",
  calidadProducto: "estandar",
  horario: "horario_habitual",
};

describe("calcularCotizacion", () => {
  it("calcula el caso base: horas × tarifa horaria", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, baseInput);
    // horas = 10cm / 4cm-por-hora = 2.5h (brazo y líneas finas no ajustan)
    // precio = 2.5h * 25000/h = 62500
    expect(resultado.desglose.horasEstimadas).toBe(2.5);
    expect(resultado.precioEstimado).toBe(62500);
  });

  it("la especialización ajusta la tarifa efectiva, no un subtotal por tamaño", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      tecnica: "realismo",
      especializacion: "soy_el_unico",
    });
    // horas = 2.5h * 1.6 (realismo) = 4h
    // tarifa efectiva = 25000 * 1.7 (soy_el_unico) = 42500
    // precio = 4h * 42500 = 170000
    expect(resultado.desglose.horasEstimadas).toBe(4);
    expect(resultado.desglose.tarifaEfectiva).toBe(42500);
    expect(resultado.precioEstimado).toBe(170000);
  });

  it("redondea las horas estimadas hacia arriba en pasos de media hora", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, tamanoCm: 11 });
    // horas = 11/4 = 2.75 -> redondea a 3
    expect(resultado.desglose.horasEstimadas).toBe(3);
    expect(resultado.precioEstimado).toBe(75000);
  });

  it("aplica el mínimo de estudio como piso cuando el trabajo es muy chico", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, tamanoCm: 1 });
    // horas = 1/4 = 0.25 -> redondea a 0.5 -> 0.5 * 25000 = 12500, pero el
    // mínimo de estudio (15000) es mayor y gana.
    expect(resultado.desglose.horasEstimadas).toBe(0.5);
    expect(resultado.precioEstimado).toBe(15000);
  });

  it("suma el extra de calidad de producto por encima del precio base", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      calidadProducto: "premium",
    });
    expect(resultado.precioEstimado).toBe(70500);
  });

  it("aplica el recargo porcentual de horario al final", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      horario: "urgente_mismo_dia",
    });
    // 62500 * 1.30
    expect(resultado.precioEstimado).toBe(81250);
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
