export const ZONAS_EXCLUIDAS = ["pene", "ano", "paladar", "esclerotica"] as const;

/**
 * Modelo de precio basado en TIEMPO, no en tamaño (ver investigación de
 * mercado 2026-09-24 en el README — casi ningún tatuador serio cobra por
 * cm²: cobran tarifa horaria × horas estimadas, con un mínimo de estudio
 * como piso). Tamaño, zona y técnica ajustan la ESTIMACIÓN DE HORAS, no un
 * precio directo. La especialización ajusta la TARIFA (un artista más
 * solicitado cobra más por hora, no aplica un multiplicador sobre un precio
 * compartido). Cantidad de tintas/agujas no son variables de cotización acá
 * — son costo de insumos del tatuador, ya diluido en su tarifa horaria.
 */
export interface TenantPricingConfig {
  nombre: string;
  moneda: string;
  /** $/hora base del estudio, antes de ajustar por especialización. */
  tarifaHoraria: number;
  /** Piso de precio aunque el trabajo sea muy rápido (shop minimum). */
  minimoEstudio: number;
  /** Cuántos cm cubre el tatuador por hora a dificultad/técnica base (referencia de velocidad, no un precio). */
  cmPorHora: number;
  /** >1 = zona más lenta/difícil de tatuar (curvas, movimiento de piel); <1 = más rápida. */
  dificultadPorZona: { zona: string; multiplicador: number }[];
  /** >1 = técnica que lleva más horas para el mismo tamaño (más detalle/sombreado/color). */
  tecnicas: { nombre: string; multiplicadorHoras: number }[];
  /** Multiplica la tarifa horaria, no el subtotal — refleja qué tan solicitado/único es el artista para ese trabajo. */
  especializacion: { nivel: string; multiplicadorTarifa: number }[];
  /** Extra fijo opcional real (ej. tinta premium/vegana) — no confundir con costo de insumos regulares. */
  calidadProducto: { nivel: string; costoFijo: number }[];
  horarios: { franja: string; recargoPorcentual: number }[];
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
  especializacion: string[];
  calidadProducto: string[];
  horarios: string[];
}

/** Lo que completa el CLIENTE final en el formulario público de cotización. */
export interface QuoteInput {
  tamanoCm: number;
  zona: string;
  tecnica: string;
  especializacion: string;
  calidadProducto: string;
  horario: string;
}

export interface AuthResponse {
  token: string;
}

export interface QuoteResult {
  precioEstimado: number;
  desglose: {
    horasEstimadas: number;
    tarifaHoraria: number;
    multEspecializacion: number;
    tarifaEfectiva: number;
    minimoEstudio: number;
    precioBase: number;
    costoCalidadProducto: number;
    precioConExtras: number;
    recargoPorcentual: number;
    precioFinal: number;
  };
}
