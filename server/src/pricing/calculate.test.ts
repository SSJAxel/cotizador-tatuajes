import { describe, expect, it } from "vitest";
import { calcularCotizacion } from "./calculate.js";
import { EJEMPLO_CONFIG } from "./fixtures.js";
import type { QuoteInput } from "./types.js";

const baseInput: QuoteInput = {
  tamanoCm: 10,
  zona: "brazo",
  tecnica: "lineas_finas",
  especializacion: "cualquiera_del_estudio",
  cantidadAgujas: 1,
  calidadProducto: "estandar",
  horario: "horario_habitual",
};

describe("calcularCotizacion", () => {
  it("calcula el caso base sumando el insumo de tintas de la técnica", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, baseInput);
    // base 10cm * 8000 = 80000, + costoInsumoTintas de lineas_finas (1500)
    expect(resultado.precioEstimado).toBe(81500);
  });

  it("aplica multiplicadores de técnica y especialización", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      tecnica: "realismo",
      especializacion: "soy_el_unico",
    });
    // base 80000 * 1.4 (realismo) * 1.5 (unico) = 168000, + insumo tintas realismo (6000)
    expect(resultado.precioEstimado).toBe(174000);
  });

  it("suma el extra de agujas por encima de lo incluido", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      cantidadAgujas: 3,
    });
    // base 80000 + insumo tintas 1500 + (2 agujas extra * 1500) = 84500
    expect(resultado.precioEstimado).toBe(84500);
  });

  it("aplica el recargo porcentual de horario al final", () => {
    const resultado = calcularCotizacion(EJEMPLO_CONFIG, {
      ...baseInput,
      horario: "urgente_mismo_dia",
    });
    // (80000 + 1500) * 1.25
    expect(resultado.precioEstimado).toBe(101875);
  });

  it("rechaza zonas íntimas excluidas", () => {
    expect(() => calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, zona: "pene" })).toThrow(
      /no está permitida/,
    );
  });

  it("rechaza una zona sin precio configurado", () => {
    expect(() => calcularCotizacion(EJEMPLO_CONFIG, { ...baseInput, zona: "oreja" })).toThrow(
      /No hay precio configurado/,
    );
  });
});
