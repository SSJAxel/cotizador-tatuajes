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

  const calidadConfig = config.calidadProducto.find((c) => c.nivel === input.calidadProducto);
  if (!calidadConfig) {
    throw new Error(`No hay costo configurado para la calidad de producto "${input.calidadProducto}".`);
  }

  const horarioConfig = config.horarios.find((h) => h.franja === input.horario);
  if (!horarioConfig) {
    throw new Error(`No hay recargo configurado para el horario "${input.horario}".`);
  }

  // Tamaño, zona y técnica ajustan cuántas HORAS lleva el trabajo — no un
  // precio directo. La zona pesa por dificultad/curvas, la técnica por
  // densidad de detalle/sombreado/color (ver README, investigación 2026-09-24).
  const horasBase = input.tamanoCm / config.cmPorHora;
  const horasEstimadas = redondearHorasArribaAMedia(
    horasBase * zonaConfig.multiplicador * tecnicaConfig.multiplicadorHoras,
  );

  // La tarifa horaria ya refleja reputación/experiencia del tatuador — sin
  // multiplicador aparte de "especialización" (sacado 2026-09-25).
  const precioBase = Math.max(config.minimoEstudio, config.tarifaHoraria * horasEstimadas);
  const precioConExtras = precioBase + calidadConfig.costoFijo;
  const precioFinal = precioConExtras * (1 + horarioConfig.recargoPorcentual / 100);

  return {
    precioEstimado: Math.round(precioFinal * 100) / 100,
    desglose: {
      horasEstimadas,
      tarifaHoraria: config.tarifaHoraria,
      minimoEstudio: config.minimoEstudio,
      precioBase: Math.round(precioBase * 100) / 100,
      costoCalidadProducto: calidadConfig.costoFijo,
      precioConExtras: Math.round(precioConExtras * 100) / 100,
      recargoPorcentual: horarioConfig.recargoPorcentual,
      precioFinal: Math.round(precioFinal * 100) / 100,
    },
  };
}
