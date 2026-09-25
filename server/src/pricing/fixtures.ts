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
  // 28 zonas (2026-09-25) en vez de 5 genéricas — ver README "Rediseño del
  // motor de precio" para la investigación detrás de cada multiplicador.
  // "brazo" se mantiene en 1.0 a propósito: es el ancla histórica de
  // cmPorHora y de los tests de calculate.test.ts, no cambiar sin actualizar
  // esos tests también.
  dificultadPorZona: [
    { zona: "espalda_alta", multiplicador: 0.85 },
    { zona: "espalda_media", multiplicador: 0.85 },
    { zona: "muslo", multiplicador: 0.85 },
    { zona: "gluteo", multiplicador: 0.85 },
    { zona: "pantorrilla", multiplicador: 0.9 },
    { zona: "zona_lumbar", multiplicador: 0.95 },
    { zona: "brazo", multiplicador: 1.0 },
    { zona: "antebrazo", multiplicador: 1.0 },
    { zona: "triceps", multiplicador: 1.0 },
    { zona: "hombro", multiplicador: 1.0 },
    { zona: "abdomen", multiplicador: 1.0 },
    { zona: "pecho", multiplicador: 1.05 },
    { zona: "nuca", multiplicador: 1.05 },
    { zona: "muslo_interno", multiplicador: 1.1 },
    { zona: "cuello", multiplicador: 1.15 },
    { zona: "cadera", multiplicador: 1.15 },
    { zona: "muneca", multiplicador: 1.15 },
    { zona: "axila", multiplicador: 1.2 },
    { zona: "espinilla", multiplicador: 1.2 },
    { zona: "clavicula", multiplicador: 1.3 },
    { zona: "columna", multiplicador: 1.3 },
    { zona: "tobillo", multiplicador: 1.3 },
    { zona: "mano", multiplicador: 1.35 },
    { zona: "pie", multiplicador: 1.4 },
    { zona: "costillas", multiplicador: 1.4 },
    { zona: "codo", multiplicador: 1.5 },
    { zona: "rodilla", multiplicador: 1.5 },
    { zona: "esternon", multiplicador: 1.55 },
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
