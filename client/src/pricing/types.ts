// Duplicado a mano del server (server/src/pricing/types.ts) hasta que el
// proyecto tenga un paquete compartido cliente/servidor.

export interface TenantPricingConfig {
  nombre: string;
  moneda: string;
  precioPorCmPorZona: { zona: string; precioPorCm: number }[];
  // costoInsumoTintas: cuánto sale en tintas hacer esta técnica — el cliente
  // no elige cantidad de tintas, se deriva de la técnica que pidió.
  tecnicas: { nombre: string; multiplicador: number; costoInsumoTintas: number }[];
  especializacion: { nivel: string; multiplicador: number }[];
  agujas: { incluidas: number; precioPorAgujaExtra: number };
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
  agujasIncluidas: number;
  calidadProducto: string[];
  horarios: string[];
}

/** Lo que completa el CLIENTE final en el formulario público de cotización. */
export interface QuoteInput {
  tamanoCm: number;
  zona: string;
  tecnica: string;
  especializacion: string;
  cantidadAgujas: number;
  calidadProducto: string;
  horario: string;
}

export interface AuthResponse {
  token: string;
}

export interface QuoteResult {
  precioEstimado: number;
  desglose: {
    base: number;
    multTecnica: number;
    multEspecializacion: number;
    subtotal: number;
    costoInsumoTintas: number;
    extraAgujas: number;
    costoCalidadProducto: number;
    extras: number;
    recargoPorcentual: number;
    precioFinal: number;
  };
}
