// Duplicado a mano del server (server/src/pricing/types.ts) hasta que el
// proyecto tenga un paquete compartido cliente/servidor.

/**
 * Modelo de precio basado en TIEMPO, no en tamaño (ver investigación de
 * mercado 2026-09-24/25 en el README del server). Tamaño, zona y técnica
 * ajustan la ESTIMACIÓN DE HORAS. Sin "nivel de especialización" (sacado
 * 2026-09-25): la reputación/demanda de un artista ya está reflejada en su
 * única tarifaHoraria, no es un multiplicador aparte elegible por cotización.
 */
export interface TenantPricingConfig {
  nombre: string;
  moneda: string;
  tarifaHoraria: number;
  minimoEstudio: number;
  /** Costo fijo de arranque (preparación del estudio + colocación del stencil). */
  fijoPreparacion: number;
  cmPorHora: number;
  dificultadPorZona: { zona: string; multiplicador: number }[];
  tecnicas: { nombre: string; multiplicadorHoras: number }[];
}

/**
 * Lo que ve el CLIENTE final para poblar el formulario público: solo
 * nombres/opciones, nunca precios, multiplicadores ni recargos internos
 * del tatuador (eso vive únicamente en TenantPricingConfig).
 */
export interface TenantPublicOptions {
  nombre: string;
  moneda: string;
  zonas: string[];
  tecnicas: string[];
}

/** Lo que completa el CLIENTE final en el formulario público de cotización. */
export interface QuoteInput {
  tamanoCm: number;
  zona: string;
  tecnica: string;
}

export interface AuthResponse {
  token: string;
}

export interface QuoteResult {
  precioEstimado: number;
  desglose: {
    horasEstimadas: number;
    tarifaHoraria: number;
    costoTiempo: number;
    fijoPreparacion: number;
    minimoEstudio: number;
    aplicoMinimo: boolean;
    precioFinal: number;
  };
}
