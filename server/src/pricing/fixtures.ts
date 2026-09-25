import type { TenantPricingConfig } from "./types.js";

/**
 * Config de ejemplo para desarrollo local y tests — no son valores reales de
 * ningún tenant. Números grounded en investigación de mercado 2026-09-24
 * (ver README): tarifa horaria ~$25.000 ARS/h, mínimo de estudio ~$15.000,
 * dificultad por zona y horas por técnica en vez de precio directo.
 */
export const EJEMPLO_CONFIG: TenantPricingConfig = {
  nombre: "Estudio Demo",
  moneda: "ARS",
  tarifaHoraria: 25000,
  minimoEstudio: 15000,
  cmPorHora: 4,
  dificultadPorZona: [
    { zona: "brazo", multiplicador: 1.0 },
    { zona: "espalda", multiplicador: 0.85 },
    { zona: "pierna", multiplicador: 1.0 },
    { zona: "pecho", multiplicador: 1.15 },
    { zona: "cuello", multiplicador: 1.35 },
  ],
  tecnicas: [
    { nombre: "lineas_finas", multiplicadorHoras: 1.0 },
    { nombre: "blackwork", multiplicadorHoras: 1.15 },
    { nombre: "realismo", multiplicadorHoras: 1.6 },
    { nombre: "acuarela", multiplicadorHoras: 1.4 },
  ],
  especializacion: [
    { nivel: "cualquiera_del_estudio", multiplicadorTarifa: 1.0 },
    { nivel: "pocos_en_la_zona", multiplicadorTarifa: 1.3 },
    { nivel: "soy_el_unico", multiplicadorTarifa: 1.7 },
  ],
  calidadProducto: [
    { nivel: "estandar", costoFijo: 0 },
    { nivel: "premium", costoFijo: 8000 },
  ],
  horarios: [
    { franja: "horario_habitual", recargoPorcentual: 0 },
    { franja: "fuera_de_horario", recargoPorcentual: 15 },
    { franja: "urgente_mismo_dia", recargoPorcentual: 30 },
  ],
};
