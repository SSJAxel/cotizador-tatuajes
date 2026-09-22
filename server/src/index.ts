import "dotenv/config";
import cors from "cors";
import express from "express";
import { firmarToken, hashPassword, requireAuthDeTenant, verificarPassword } from "./auth.js";
import { calcularCotizacion } from "./pricing/calculate.js";
import {
  actualizarConfigTenant,
  buscarTenantParaLogin,
  cargarConfigTenant,
  cargarOpcionesPublicas,
  crearTenant,
} from "./pricing/tenantConfig.js";
import type { QuoteInput, TenantPricingConfig } from "./pricing/types.js";

const SLUG_VALIDO = /^[a-z0-9-]{3,50}$/;
const PASSWORD_MIN_LARGO = 8;

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
