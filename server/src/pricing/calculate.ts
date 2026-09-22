import { ZONAS_EXCLUIDAS, type TenantPricingConfig, type QuoteInput, type QuoteResult } from "./types.js";

export function calcularCotizacion(config: TenantPricingConfig, input: QuoteInput): QuoteResult {
  if ((ZONAS_EXCLUIDAS as readonly string[]).includes(input.zona)) {
    throw new Error(`La zona "${input.zona}" no está permitida.`);
  }

  const zonaConfig = config.precioPorCmPorZona.find((z) => z.zona === input.zona);
  if (!zonaConfig) {
    throw new Error(`No hay precio configurado para la zona "${input.zona}".`);
  }

  const tecnicaConfig = config.tecnicas.find((t) => t.nombre === input.tecnica);
  if (!tecnicaConfig) {
    throw new Error(`No hay multiplicador configurado para la técnica "${input.tecnica}".`);
  }

  const especializacionConfig = config.especializacion.find((e) => e.nivel === input.especializacion);
  if (!especializacionConfig) {
    throw new Error(`No hay multiplicador configurado para la especialización "${input.especializacion}".`);
  }

  const calidadConfig = config.calidadProducto.find((c) => c.nivel === input.calidadProducto);
  if (!calidadConfig) {
    throw new Error(`No hay costo configurado para la calidad de producto "${input.calidadProducto}".`);
  }

  const horarioConfig = config.horarios.find((h) => h.franja === input.horario);
  if (!horarioConfig) {
    throw new Error(`No hay recargo configurado para el horario "${input.horario}".`);
  }

  const base = input.tamanoCm * zonaConfig.precioPorCm;
  const subtotal = base * tecnicaConfig.multiplicador * especializacionConfig.multiplicador;

  const agujasExtra = Math.max(0, input.cantidadAgujas - config.agujas.incluidas);
  const extraAgujas = agujasExtra * config.agujas.precioPorAgujaExtra;

  const extras = tecnicaConfig.costoInsumoTintas + extraAgujas + calidadConfig.costoFijo;

  const precioFinal = (subtotal + extras) * (1 + horarioConfig.recargoPorcentual / 100);

  return {
    precioEstimado: Math.round(precioFinal * 100) / 100,
    desglose: {
      base,
      multTecnica: tecnicaConfig.multiplicador,
      multEspecializacion: especializacionConfig.multiplicador,
      subtotal,
      costoInsumoTintas: tecnicaConfig.costoInsumoTintas,
      extraAgujas,
      costoCalidadProducto: calidadConfig.costoFijo,
      extras,
      recargoPorcentual: horarioConfig.recargoPorcentual,
      precioFinal: Math.round(precioFinal * 100) / 100,
    },
  };
}
