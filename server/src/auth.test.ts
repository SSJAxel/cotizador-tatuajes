import "dotenv/config";
import { describe, expect, it } from "vitest";
import { generarTokenReset, hashearTokenReset } from "./auth.js";

describe("generarTokenReset", () => {
  it("genera un token crudo cuyo hash coincide con el hash devuelto", () => {
    const { tokenCrudo, tokenHash } = generarTokenReset();
    expect(hashearTokenReset(tokenCrudo)).toBe(tokenHash);
  });

  it("nunca repite el token crudo entre llamadas", () => {
    const a = generarTokenReset();
    const b = generarTokenReset();
    expect(a.tokenCrudo).not.toBe(b.tokenCrudo);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("un token distinto al original produce un hash distinto", () => {
    const { tokenHash } = generarTokenReset();
    const otroToken = generarTokenReset().tokenCrudo;
    expect(hashearTokenReset(otroToken)).not.toBe(tokenHash);
  });
});
