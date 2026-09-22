import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = (() => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('Falta la variable de entorno "JWT_SECRET" (ver .env.example).');
  return value;
})();

const TOKEN_EXPIRA_EN = "12h";
const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function firmarToken(slug: string): string {
  return jwt.sign({ slug }, JWT_SECRET, { expiresIn: TOKEN_EXPIRA_EN });
}

function verificarToken(token: string): { slug: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === "object" && typeof payload.slug === "string") {
      return { slug: payload.slug };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Exige un `Authorization: Bearer <token>` válido y emitido para el mismo
 * slug de la ruta (`req.params.slug`). Usar en cualquier endpoint que
 * devuelva o modifique la TenantPricingConfig completa de un tenant.
 */
export function requireAuthDeTenant(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Falta el header Authorization con el token del tenant." });
    return;
  }

  const payload = verificarToken(header.slice("Bearer ".length));
  if (!payload || payload.slug !== req.params.slug) {
    res.status(401).json({ error: "Token inválido o vencido." });
    return;
  }

  next();
}
