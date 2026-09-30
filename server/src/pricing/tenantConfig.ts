import { prisma } from "../db.js";
import type { TenantPricingConfig, TenantPublicOptions } from "./types.js";
import { validarConfigTenant } from "./validateConfig.js";

/**
 * Carga la config de precio COMPLETA de un tenant (incluye multiplicadores
 * y precios internos). Uso exclusivo: calcular una cotización server-side
 * y poblar la pantalla de configuración del propio tatuador (autenticado).
 * Nunca exponer esto tal cual al formulario público — para eso existe
 * cargarOpcionesPublicas.
 */
export async function cargarConfigTenant(slug: string): Promise<TenantPricingConfig | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      zonas: true,
      tecnicas: true,
      calidadesProducto: true,
      horarios: true,
    },
  });

  if (!tenant) return null;

  return {
    nombre: tenant.nombre,
    moneda: tenant.moneda,
    tarifaHoraria: tenant.tarifaHoraria,
    minimoEstudio: tenant.minimoEstudio,
    cmPorHora: tenant.cmPorHora,
    dificultadPorZona: tenant.zonas.map((z) => ({ zona: z.zona, multiplicador: z.multiplicador })),
    tecnicas: tenant.tecnicas.map((t) => ({
      nombre: t.nombre,
      multiplicadorHoras: t.multiplicadorHoras,
    })),
    calidadProducto: tenant.calidadesProducto.map((c) => ({
      nivel: c.nivel,
      costoFijo: c.costoFijo,
    })),
    horarios: tenant.horarios.map((h) => ({
      franja: h.franja,
      recargoPorcentual: h.recargoPorcentual,
    })),
  };
}

/**
 * Carga solo las OPCIONES públicas de un tenant (nombres, sin precios ni
 * multiplicadores) — lo que usa el formulario de cotización del cliente
 * final para poblar sus selects. Es lo único que debería servir un
 * endpoint sin autenticación.
 */
export async function cargarOpcionesPublicas(slug: string): Promise<TenantPublicOptions | null> {
  const config = await cargarConfigTenant(slug);
  if (!config) return null;

  return {
    nombre: config.nombre,
    moneda: config.moneda,
    zonas: config.dificultadPorZona.map((z) => z.zona),
    tecnicas: config.tecnicas.map((t) => t.nombre),
    calidadProducto: config.calidadProducto.map((c) => c.nivel),
    horarios: config.horarios.map((h) => h.franja),
  };
}

/** Datos de un tenant necesarios para el login (nunca exponer passwordHash vía API). */
export async function buscarTenantParaLogin(
  slug: string,
): Promise<{ id: string; passwordHash: string } | null> {
  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, passwordHash: true },
  });
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Crea un token de reset para el tenant si tiene email cargado. Devuelve
 * `null` si el tenant no existe o no tiene email — el llamador (ruta HTTP)
 * responde igual en ambos casos para no filtrar cuáles slugs existen.
 */
export async function crearTokenResetPassword(
  slug: string,
  tokenHash: string,
): Promise<{ email: string } | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, email: true },
  });
  if (!tenant?.email) return null;

  await prisma.passwordResetToken.create({
    data: {
      tenantId: tenant.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { email: tenant.email };
}

/**
 * Valida el token (existe, no vencido, no usado) y si es válido actualiza
 * la contraseña del tenant dueño y marca el token como usado, todo en una
 * transacción. Devuelve `false` si el token no es válido por cualquier motivo.
 */
export async function resetearPasswordConToken(
  tokenHash: string,
  passwordHashNueva: string,
): Promise<boolean> {
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    return false;
  }

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: token.tenantId },
      data: { passwordHash: passwordHashNueva },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return true;
}

/** Cambia email y/o contraseña de un tenant ya autenticado (sesión activa). */
export async function actualizarCuentaTenant(
  slug: string,
  cambios: { email?: string; passwordHash?: string },
): Promise<void> {
  await prisma.tenant.update({ where: { slug }, data: cambios });
}

/** Reemplaza por completo las listas de precios de un tenant ya existente. */
async function reemplazarListasDePrecio(tenantId: string, config: TenantPricingConfig) {
  await prisma.zonaDificultad.deleteMany({ where: { tenantId } });
  await prisma.tecnica.deleteMany({ where: { tenantId } });
  await prisma.calidadProducto.deleteMany({ where: { tenantId } });
  await prisma.horario.deleteMany({ where: { tenantId } });

  await prisma.zonaDificultad.createMany({
    data: config.dificultadPorZona.map((z) => ({
      tenantId,
      zona: z.zona,
      multiplicador: z.multiplicador,
    })),
  });
  await prisma.tecnica.createMany({
    data: config.tecnicas.map((t) => ({
      tenantId,
      nombre: t.nombre,
      multiplicadorHoras: t.multiplicadorHoras,
    })),
  });
  await prisma.calidadProducto.createMany({
    data: config.calidadProducto.map((c) => ({
      tenantId,
      nivel: c.nivel,
      costoFijo: c.costoFijo,
    })),
  });
  await prisma.horario.createMany({
    data: config.horarios.map((h) => ({
      tenantId,
      franja: h.franja,
      recargoPorcentual: h.recargoPorcentual,
    })),
  });
}

/**
 * Crea la CUENTA de un tenant nuevo (slug + contraseña), sin config de
 * precio todavía — esa se completa después con actualizarConfigTenant,
 * ya autenticado, que sí valida que las listas tengan contenido real.
 * Falla si el slug ya existe.
 */
export async function crearTenant(slug: string, passwordHash: string): Promise<void> {
  const yaExiste = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (yaExiste) {
    throw new Error(`El tenant "${slug}" ya existe. Iniciá sesión para editarlo.`);
  }

  await prisma.tenant.create({
    data: { slug, passwordHash, nombre: "", moneda: "ARS" },
  });
}

/**
 * Reemplaza la config de precio de un tenant EXISTENTE. Falla si el slug
 * no existe todavía — para eso está crearTenant. El llamador (ruta HTTP)
 * es responsable de haber verificado el token de auth antes de llamar acá.
 */
export async function actualizarConfigTenant(
  slug: string,
  config: TenantPricingConfig,
): Promise<TenantPricingConfig> {
  validarConfigTenant(config);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { slug },
      data: {
        nombre: config.nombre,
        moneda: config.moneda,
        tarifaHoraria: config.tarifaHoraria,
        minimoEstudio: config.minimoEstudio,
        cmPorHora: config.cmPorHora,
      },
    });
    await reemplazarListasDePrecio(tenant.id, config);
  });

  const guardado = await cargarConfigTenant(slug);
  if (!guardado) throw new Error("No se pudo leer la config recién guardada.");
  return guardado;
}
