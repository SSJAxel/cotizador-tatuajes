import { prisma } from "../db.js";

/**
 * Niveles de relación del tatuador con un estilo. El quiz es el mismo para
 * los tres — el nivel queda guardado y los tiempos que responda reflejan
 * naturalmente la diferencia (practicando = más lento). Más adelante el
 * nivel sirve para mostrarle distinto al cliente ("especialidad" vs "también
 * lo hago").
 */
export const NIVELES_VALIDOS = ["sabe", "practicando", "se_anima"] as const;
export type Nivel = (typeof NIVELES_VALIDOS)[number];

/** ESTILOS (look que elige el cliente). Lista real de LusiTattoo (2026-10-07). */
export const ESTILOS_VALIDOS = [
  "lettering",
  "neotribal",
  "cybersigilism",
  "tradicional",
  "neotradicional",
  "blackwork",
  "new_school",
  "chicano",
  "blackout",
  "bodysuit",
  "trash_polka",
  "maori",
  "geometrico",
  "ornamental",
  "realismo",
  "microrealismo",
  "dotwork",
] as const;

/** TÉCNICAS (método de ejecución, donde vive el tiempo). Lista real de LusiTattoo. */
export const TECNICAS_VALIDAS = [
  "linea_hiperfina",
  "linea_fina",
  "linea_gruesa",
  "relleno_chico",
  "relleno_mediano",
  "relleno_grande",
  "sombra_chica",
  "sombra_mediana",
  "sombra_grande",
  "puntillismo_arrastre",
  "color",
  "handpoke",
] as const;

/** Zonas válidas para el quiz (las 28 del sistema). */
export const ZONAS_VALIDAS = [
  "brazo",
  "antebrazo",
  "triceps",
  "hombro",
  "abdomen",
  "pantorrilla",
  "espalda_alta",
  "espalda_media",
  "muslo",
  "gluteo",
  "zona_lumbar",
  "pecho",
  "nuca",
  "muslo_interno",
  "cuello",
  "cadera",
  "muneca",
  "axila",
  "espinilla",
  "clavicula",
  "columna",
  "tobillo",
  "mano",
  "pie",
  "costillas",
  "codo",
  "rodilla",
  "esternon",
] as const;

export interface TiempoZona {
  zona: string;
  minutos: number;
}

export interface CalibracionEstilo {
  estilo: string;
  nivel: Nivel;
  /** Técnicas (método de ejecución) que combina este estilo. */
  tecnicas: string[];
  tiempos: TiempoZona[];
}

/** Devuelve todos los estilos calibrados de un tenant con sus tiempos por zona. */
export async function cargarCalibracion(slug: string): Promise<CalibracionEstilo[] | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      estilos: {
        include: { tiempos: true },
        orderBy: { estilo: "asc" },
      },
    },
  });

  if (!tenant) return null;

  return tenant.estilos.map((e) => ({
    estilo: e.estilo,
    nivel: e.nivel as Nivel,
    tecnicas: e.tecnicas,
    tiempos: e.tiempos.map((t) => ({ zona: t.zona, minutos: t.minutos })),
  }));
}

/**
 * Guarda (crea o reemplaza) la calibración de UN estilo de un tenant: su
 * nivel + los minutos por zona respondidos en el quiz. Valida estilo, nivel
 * y zonas contra las listas conocidas. Reemplaza por completo los tiempos
 * anteriores de ese estilo.
 */
export async function guardarCalibracionEstilo(
  slug: string,
  estilo: string,
  nivel: string,
  tecnicas: string[],
  tiempos: TiempoZona[],
): Promise<CalibracionEstilo> {
  if (!(ESTILOS_VALIDOS as readonly string[]).includes(estilo)) {
    throw new Error(`Estilo desconocido: "${estilo}".`);
  }
  if (!(NIVELES_VALIDOS as readonly string[]).includes(nivel)) {
    throw new Error(`Nivel inválido: "${nivel}". Debe ser sabe, practicando o se_anima.`);
  }
  for (const tec of tecnicas) {
    if (!(TECNICAS_VALIDAS as readonly string[]).includes(tec)) {
      throw new Error(`Técnica desconocida: "${tec}".`);
    }
  }
  for (const t of tiempos) {
    if (!(ZONAS_VALIDAS as readonly string[]).includes(t.zona)) {
      throw new Error(`Zona desconocida: "${t.zona}".`);
    }
    if (!Number.isFinite(t.minutos) || !Number.isInteger(t.minutos) || t.minutos <= 0) {
      throw new Error(`Los minutos de "${t.zona}" tienen que ser un entero mayor a 0.`);
    }
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) throw new Error(`No existe el tenant "${slug}".`);

  await prisma.$transaction(async (tx) => {
    const estiloTenant = await tx.estiloTenant.upsert({
      where: { tenantId_estilo: { tenantId: tenant.id, estilo } },
      create: { tenantId: tenant.id, estilo, nivel, tecnicas },
      update: { nivel, tecnicas },
    });
    await tx.tiempoEstiloZona.deleteMany({ where: { estiloTenantId: estiloTenant.id } });
    if (tiempos.length > 0) {
      await tx.tiempoEstiloZona.createMany({
        data: tiempos.map((t) => ({
          estiloTenantId: estiloTenant.id,
          zona: t.zona,
          minutos: t.minutos,
        })),
      });
    }
  });

  const calibracion = await cargarCalibracion(slug);
  const guardado = calibracion?.find((c) => c.estilo === estilo);
  if (!guardado) throw new Error("No se pudo leer la calibración recién guardada.");
  return guardado;
}

/** Borra la calibración de un estilo (el tatuador dejó de hacerlo). */
export async function borrarCalibracionEstilo(slug: string, estilo: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) throw new Error(`No existe el tenant "${slug}".`);
  await prisma.estiloTenant.deleteMany({ where: { tenantId: tenant.id, estilo } });
}
