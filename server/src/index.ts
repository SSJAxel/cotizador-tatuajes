import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  firmarToken,
  generarTokenReset,
  hashPassword,
  hashearTokenReset,
  requireAuthDeTenant,
  verificarPassword,
} from "./auth.js";
import { enviarMailResetPassword } from "./mailer.js";
import { calcularCotizacion } from "./pricing/calculate.js";
import {
  actualizarConfigTenant,
  actualizarCuentaTenant,
  buscarTenantParaLogin,
  cargarConfigTenant,
  cargarOpcionesPublicas,
  crearTenant,
  crearTokenResetPassword,
  resetearPasswordConToken,
} from "./pricing/tenantConfig.js";
import type { QuoteInput, TenantPricingConfig } from "./pricing/types.js";

const SLUG_VALIDO = /^[a-z0-9-]{3,50}$/;
const PASSWORD_MIN_LARGO = 8;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Registro: crea la cuenta del tenant (slug + contraseña). La config de
// precio se completa después con PUT /config, ya autenticado — así la
// validación de listas no vacías no bloquea la creación de la cuenta.
app.post("/tenants/:slug/register", async (req, res) => {
  const { slug } = req.params;

  if (!SLUG_VALIDO.test(slug)) {
    res.status(400).json({
      error: "El slug tiene que tener 3-50 caracteres: minúsculas, números o guiones.",
    });
    return;
  }

  const { password } = req.body as { password?: string };

  if (!password || password.length < PASSWORD_MIN_LARGO) {
    res
      .status(400)
      .json({ error: `La contraseña tiene que tener al menos ${PASSWORD_MIN_LARGO} caracteres.` });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    await crearTenant(slug, passwordHash);
    res.status(201).json({ token: firmarToken(slug) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Login: devuelve un token corto para editar la config de ESE tenant.
app.post("/tenants/:slug/login", async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body as { password?: string };

  const tenant = await buscarTenantParaLogin(slug);
  const ok = tenant && password ? await verificarPassword(password, tenant.passwordHash) : false;

  if (!ok) {
    // Mensaje genérico: no distinguir "no existe el tenant" de "contraseña
    // incorrecta" para no facilitar enumerar slugs con fuerza bruta.
    res.status(401).json({ error: "Slug o contraseña incorrectos." });
    return;
  }

  res.json({ token: firmarToken(slug) });
});

// Cambiar email y/o contraseña con sesión activa. Cambiar la contraseña
// exige repetir la actual (no alcanza con el JWT: si alguien deja la sesión
// abierta en una compu compartida, no puede tomar la cuenta sin la password).
app.put("/tenants/:slug/account", requireAuthDeTenant, async (req, res) => {
  const { slug } = req.params;
  const { email, currentPassword, newPassword } = req.body as {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const cambios: { email?: string; passwordHash?: string } = {};

  if (email !== undefined) {
    if (!EMAIL_VALIDO.test(email)) {
      res.status(400).json({ error: "El email no tiene un formato válido." });
      return;
    }
    cambios.email = email;
  }

  if (newPassword !== undefined) {
    if (newPassword.length < PASSWORD_MIN_LARGO) {
      res
        .status(400)
        .json({ error: `La contraseña nueva tiene que tener al menos ${PASSWORD_MIN_LARGO} caracteres.` });
      return;
    }

    const tenant = await buscarTenantParaLogin(slug);
    const actualOk =
      tenant && currentPassword ? await verificarPassword(currentPassword, tenant.passwordHash) : false;
    if (!actualOk) {
      res.status(401).json({ error: "La contraseña actual no coincide." });
      return;
    }

    cambios.passwordHash = await hashPassword(newPassword);
  }

  await actualizarCuentaTenant(slug, cambios);
  res.status(204).end();
});

// "Olvidé mi contraseña": si el tenant tiene email cargado, le manda un link
// de un solo uso que vence en 1 hora. Responde el mismo mensaje genérico
// exista o no el tenant/email, para no dejar enumerar slugs por acá.
app.post("/tenants/:slug/forgot-password", async (req, res) => {
  const { tokenCrudo, tokenHash } = generarTokenReset();
  const resultado = await crearTokenResetPassword(req.params.slug, tokenHash);

  if (resultado) {
    const link = `${CLIENT_URL}/reset-password?slug=${req.params.slug}&token=${tokenCrudo}`;
    await enviarMailResetPassword(resultado.email, req.params.slug, link);
  }

  res.json({ mensaje: "Si el tenant tiene un email cargado, le llegó un link para restablecer la contraseña." });
});

app.post("/tenants/:slug/reset-password", async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !newPassword || newPassword.length < PASSWORD_MIN_LARGO) {
    res
      .status(400)
      .json({ error: `Faltan datos o la contraseña nueva tiene menos de ${PASSWORD_MIN_LARGO} caracteres.` });
    return;
  }

  const passwordHashNueva = await hashPassword(newPassword);
  const ok = await resetearPasswordConToken(hashearTokenReset(token), passwordHashNueva);

  if (!ok) {
    res.status(400).json({ error: "El link de reset es inválido, ya se usó o venció." });
    return;
  }

  res.status(204).end();
});

// Solo para la pantalla de configuración del propio tatuador (autenticada)
// — expone precios y multiplicadores internos. Nunca usar esto para poblar
// el formulario público de cotización, para eso existe /options.
app.get("/tenants/:slug/config", requireAuthDeTenant, async (req, res) => {
  const config = await cargarConfigTenant(req.params.slug);

  if (!config) {
    res.status(404).json({ error: `No existe el tenant "${req.params.slug}".` });
    return;
  }

  res.json(config);
});

// Endpoint público: solo nombres de opciones, nunca precios ni
// multiplicadores. Es lo que debe consumir el formulario de cotización
// del cliente final.
app.get("/tenants/:slug/options", async (req, res) => {
  const opciones = await cargarOpcionesPublicas(req.params.slug);

  if (!opciones) {
    res.status(404).json({ error: `No existe el tenant "${req.params.slug}".` });
    return;
  }

  res.json(opciones);
});

app.put("/tenants/:slug/config", requireAuthDeTenant, async (req, res) => {
  const { config } = req.body as { config?: TenantPricingConfig };

  if (!config) {
    res.status(400).json({ error: 'Falta "config" en el body.' });
    return;
  }

  try {
    const guardado = await actualizarConfigTenant(req.params.slug, config);
    res.json(guardado);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/tenants/:slug/quote", async (req, res) => {
  const config = await cargarConfigTenant(req.params.slug);

  if (!config) {
    res.status(404).json({ error: `No existe el tenant "${req.params.slug}".` });
    return;
  }

  const input = req.body as QuoteInput;

  try {
    const resultado = calcularCotizacion(config, input);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Cotizador server escuchando en http://localhost:${PORT}`);
});
