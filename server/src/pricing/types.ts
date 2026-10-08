export const ZONAS_EXCLUIDAS = ["pene", "ano", "paladar", "esclerotica"] as const;

/**
 * Modelo de precio basado en TIEMPO, no en tamaño (ver investigación de
 * mercado 2026-09-24/25 en el README — casi ningún tatuador serio cobra por
 * cm²: cobran tarifa horaria × horas estimadas, con un mínimo de estudio
 * como piso). Tamaño, zona y técnica ajustan la ESTIMACIÓN DE HORAS, no un
 * precio directo. Cantidad de tintas/agujas no son variables de cotización
 * acá — son costo de insumos del tatuador, ya diluido en su tarifa horaria.
 *
 * Sin "nivel de especialización" (sacado 2026-09-25): la reputación/demanda
 * de un artista ya está reflejada en su ÚNICA tarifaHoraria — no es un
 * multiplicador aparte que el cliente elige por cotización. Un estudio con
 * varios tatuadores a tarifas distintas necesitaría soporte multi-artista
 * real (cada uno con su propia tarifa), no este campo.
 */
export interface TenantPricingConfig {
  nombre: string;
  moneda: string;
  /** $/hora del estudio — ya refleja reputación/experiencia, no hay multiplicador aparte. */
  tarifaHoraria: number;
  /** Piso de precio aunque el trabajo sea muy rápido (shop minimum). */
  minimoEstudio: number;
  /**
   * Costo fijo de arranque de CUALQUIER tatuaje: preparación del estudio +
   * colocación del stencil. Se suma aparte del tiempo variable del diseño —
   * el quiz de calibración mide tiempo de tatuaje PURO (sin prep ni stencil).
   */
  fijoPreparacion: number;
  /** Cuántos cm cubre el tatuador por hora a dificultad/técnica base (referencia de velocidad, no un precio). */
  cmPorHora: number;
  /** >1 = zona más lenta/difícil de tatuar (curvas, movimiento de piel); <1 = más rápida. */
  dificultadPorZona: { zona: string; multiplicador: number }[];
  /** >1 = técnica que lleva más horas para el mismo tamaño (más detalle/sombreado/color). */
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

/**
 * Lo que completa el CLIENTE final en el formulario público de cotización.
 * No se pregunta calidad de producto (decisión del tatuador, no del cliente)
 * ni horario del turno (capicotizador no maneja agenda).
 */
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
    /** true si el precio quedó "pisado" por el mínimo de estudio. */
    aplicoMinimo: boolean;
    precioFinal: number;
  };
}
