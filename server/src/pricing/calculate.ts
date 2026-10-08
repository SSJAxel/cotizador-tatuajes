import { ZONAS_EXCLUIDAS, type TenantPricingConfig, type QuoteInput, type QuoteResult } from "./types.js";

/** Los estudios bloquean turnos en franjas de media hora, no minutos exactos. */
function redondearHorasArribaAMedia(horas: number): number {
  return Math.ceil(horas * 2) / 2;
}

export function calcularCotizacion(config: TenantPricingConfig, input: QuoteInput): QuoteResult {
  if ((ZONAS_EXCLUIDAS as readonly string[]).includes(input.zona)) {
    throw new Error(`La zona "${input.zona}" no está permitida.`);
  }

  const zonaConfig = config.dificultadPorZona.find((z) => z.zona === input.zona);
  if (!zonaConfig) {
    throw new Error(`No hay dificultad configurada para la zona "${input.zona}".`);
  }

  const tecnicaConfig = config.tecnicas.find((t) => t.nombre === input.tecnica);
  if (!tecnicaConfig) {
    throw new Error(`No hay técnica configurada "${input.tecnica}".`);
  }

  // Tamaño, zona y técnica ajustan cuántas HORAS lleva el trabajo — no un
  // precio directo. La zona pesa por dificultad/curvas, la técnica por
  // densidad de detalle/sombreado/color (ver README, investigación 2026-09-24).
  const horasBase = input.tamanoCm / config.cmPorHora;
  const horasEstimadas = redondearHorasArribaAMedia(
    horasBase * zonaConfig.multiplicador * tecnicaConfig.multiplicadorHoras,
  );

  // La tarifa horaria ya refleja reputación/experiencia del tatuador — sin
  // multiplicador aparte de "especialización" (sacado 2026-09-25). El fijo de
  // preparación (limpieza + stencil) se suma aparte del tiempo variable.
  const costoTiempo = config.tarifaHoraria * horasEstimadas;
  const subtotal = costoTiempo + config.fijoPreparacion;
  // El mínimo de estudio es un PISO DURO: el cliente nunca ve menos que esto.
  const precioFinal = Math.max(config.minimoEstudio, subtotal);

  return {
    precioEstimado: Math.round(precioFinal * 100) / 100,
    desglose: {
      horasEstimadas,
      tarifaHoraria: config.tarifaHoraria,
      costoTiempo: Math.round(costoTiempo * 100) / 100,
      fijoPreparacion: config.fijoPreparacion,
      minimoEstudio: config.minimoEstudio,
      aplicoMinimo: precioFinal > subtotal,
      precioFinal: Math.round(precioFinal * 100) / 100,
    },
  };
}
