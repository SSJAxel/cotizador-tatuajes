import { ZONAS_EXCLUIDAS, type TenantPricingConfig } from "./types.js";

function requiereListaNoVacia(campo: string, lista: unknown[]) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error(`"${campo}" tiene que tener al menos un elemento.`);
  }
}

function requiereSinDuplicados(campo: string, valores: string[]) {
  const vistos = new Set<string>();
  for (const v of valores) {
    if (vistos.has(v)) throw new Error(`"${campo}" tiene un valor duplicado: "${v}".`);
    vistos.add(v);
  }
}

function requiereNumeroNoNegativo(campo: string, valor: unknown) {
  if (typeof valor !== "number" || Number.isNaN(valor) || valor < 0) {
    throw new Error(`"${campo}" tiene que ser un número mayor o igual a 0.`);
  }
}

function requiereTextoNoVacio(campo: string, valor: unknown) {
  if (typeof valor !== "string" || valor.trim().length === 0) {
    throw new Error(`"${campo}" no puede estar vacío.`);
  }
}

/** Tira un Error con mensaje legible en español ante el primer problema encontrado. */
export function validarConfigTenant(config: TenantPricingConfig) {
  requiereTextoNoVacio("nombre", config.nombre);
  requiereTextoNoVacio("moneda", config.moneda);

  requiereListaNoVacia("precioPorCmPorZona", config.precioPorCmPorZona);
  requiereSinDuplicados(
    "precioPorCmPorZona",
    config.precioPorCmPorZona.map((z) => z.zona),
  );
  for (const z of config.precioPorCmPorZona) {
    requiereTextoNoVacio("zona", z.zona);
    if ((ZONAS_EXCLUIDAS as readonly string[]).includes(z.zona)) {
      throw new Error(`La zona "${z.zona}" no está permitida (es una zona íntima excluida).`);
    }
    requiereNumeroNoNegativo(`precioPorCm de "${z.zona}"`, z.precioPorCm);
  }

  requiereListaNoVacia("tecnicas", config.tecnicas);
  requiereSinDuplicados(
    "tecnicas",
    config.tecnicas.map((t) => t.nombre),
  );
  for (const t of config.tecnicas) {
    requiereTextoNoVacio("nombre de técnica", t.nombre);
    requiereNumeroNoNegativo(`multiplicador de "${t.nombre}"`, t.multiplicador);
    requiereNumeroNoNegativo(`costoInsumoTintas de "${t.nombre}"`, t.costoInsumoTintas);
  }

  requiereListaNoVacia("especializacion", config.especializacion);
  requiereSinDuplicados(
    "especializacion",
    config.especializacion.map((e) => e.nivel),
  );
  for (const e of config.especializacion) {
    requiereTextoNoVacio("nivel de especialización", e.nivel);
    requiereNumeroNoNegativo(`multiplicador de "${e.nivel}"`, e.multiplicador);
  }

  requiereNumeroNoNegativo("agujas.incluidas", config.agujas.incluidas);
  requiereNumeroNoNegativo("agujas.precioPorAgujaExtra", config.agujas.precioPorAgujaExtra);

  requiereListaNoVacia("calidadProducto", config.calidadProducto);
  requiereSinDuplicados(
    "calidadProducto",
    config.calidadProducto.map((c) => c.nivel),
  );
  for (const c of config.calidadProducto) {
    requiereTextoNoVacio("nivel de calidad de producto", c.nivel);
    requiereNumeroNoNegativo(`costoFijo de "${c.nivel}"`, c.costoFijo);
  }

  requiereListaNoVacia("horarios", config.horarios);
  requiereSinDuplicados(
    "horarios",
    config.horarios.map((h) => h.franja),
  );
  for (const h of config.horarios) {
    requiereTextoNoVacio("franja horaria", h.franja);
    if (typeof h.recargoPorcentual !== "number" || Number.isNaN(h.recargoPorcentual)) {
      throw new Error(`"recargoPorcentual" de "${h.franja}" tiene que ser un número.`);
    }
  }
}
