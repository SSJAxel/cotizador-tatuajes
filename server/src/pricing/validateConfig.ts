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

function requiereNumeroPositivo(campo: string, valor: unknown) {
  if (typeof valor !== "number" || Number.isNaN(valor) || valor <= 0) {
    throw new Error(`"${campo}" tiene que ser un número mayor a 0.`);
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

  requiereNumeroPositivo("tarifaHoraria", config.tarifaHoraria);
  requiereNumeroNoNegativo("minimoEstudio", config.minimoEstudio);
  requiereNumeroNoNegativo("fijoPreparacion", config.fijoPreparacion);
  // cmPorHora es un divisor en el cálculo de horas — no puede ser 0 ni negativo.
  requiereNumeroPositivo("cmPorHora", config.cmPorHora);

  requiereListaNoVacia("dificultadPorZona", config.dificultadPorZona);
  requiereSinDuplicados(
    "dificultadPorZona",
    config.dificultadPorZona.map((z) => z.zona),
  );
  for (const z of config.dificultadPorZona) {
    requiereTextoNoVacio("zona", z.zona);
    if ((ZONAS_EXCLUIDAS as readonly string[]).includes(z.zona)) {
      throw new Error(`La zona "${z.zona}" no está permitida (es una zona íntima excluida).`);
    }
    requiereNumeroNoNegativo(`multiplicador de dificultad de "${z.zona}"`, z.multiplicador);
  }

  requiereListaNoVacia("tecnicas", config.tecnicas);
  requiereSinDuplicados(
    "tecnicas",
    config.tecnicas.map((t) => t.nombre),
  );
  for (const t of config.tecnicas) {
    requiereTextoNoVacio("nombre de técnica", t.nombre);
    requiereNumeroNoNegativo(`multiplicadorHoras de "${t.nombre}"`, t.multiplicadorHoras);
  }
}
