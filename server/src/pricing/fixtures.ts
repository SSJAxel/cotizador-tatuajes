import type { TenantPricingConfig } from "./types.js";

/** Config de ejemplo para desarrollo local y tests — no son valores reales de ningún tenant. */
export const EJEMPLO_CONFIG: TenantPricingConfig = {
  nombre: "Estudio Demo",
  moneda: "ARS",
  precioPorCmPorZona: [
    { zona: "brazo", precioPorCm: 8000 },
    { zona: "espalda", precioPorCm: 7000 },
    { zona: "pierna", precioPorCm: 7500 },
    { zona: "pecho", precioPorCm: 8500 },
    { zona: "cuello", precioPorCm: 10000 },
  ],
  tecnicas: [
    { nombre: "lineas_finas", multiplicador: 1.0, costoInsumoTintas: 1500 },
    { nombre: "blackwork", multiplicador: 1.1, costoInsumoTintas: 1500 },
    { nombre: "realismo", multiplicador: 1.4, costoInsumoTintas: 6000 },
    { nombre: "acuarela", multiplicador: 1.3, costoInsumoTintas: 8000 },
  ],
  especializacion: [
    { nivel: "cualquiera_del_estudio", multiplicador: 1.0 },
    { nivel: "pocos_en_la_zona", multiplicador: 1.2 },
    { nivel: "soy_el_unico", multiplicador: 1.5 },
  ],
  agujas: { incluidas: 1, precioPorAgujaExtra: 1500 },
  calidadProducto: [
    { nivel: "estandar", costoFijo: 0 },
    { nivel: "premium", costoFijo: 5000 },
  ],
  horarios: [
    { franja: "horario_habitual", recargoPorcentual: 0 },
    { franja: "fuera_de_horario", recargoPorcentual: 15 },
    { franja: "urgente_mismo_dia", recargoPorcentual: 25 },
  ],
};
