import { useState, type FormEvent } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const PASSWORD_MIN_LARGO = 8;

/**
 * Página que abre el link del mail de "olvidé mi contraseña"
 * (CLIENT_URL/reset-password?slug=...&token=...). No usa react-router —
 * App.tsx la monta a mano cuando detecta ese pathname, ver ahí.
 */
export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  if (!slug || !token) {
    return (
      <div className="tenant-config">
        <h1>Restablecer contraseña</h1>
        <p className="error">
          Este link no es válido — le faltan datos. Pedí uno nuevo desde "¿Olvidaste tu
          contraseña?" en la pantalla de Configuración.
        </p>
      </div>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmar) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo restablecer la contraseña.");
      }
      setListo(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="tenant-config">
        <h1>Restablecer contraseña</h1>
        <p className="mensaje">
          Contraseña actualizada para "{slug}". Ya podés iniciar sesión con la nueva.
        </p>
        <a href="/">Volver a la app</a>
      </div>
    );
  }

  return (
    <div className="tenant-config">
      <h1>Restablecer contraseña</h1>
      <form onSubmit={enviar}>
        <p className="disclaimer">Elegí una contraseña nueva para "{slug}".</p>
        <label>
          Contraseña nueva (mínimo {PASSWORD_MIN_LARGO} caracteres)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={PASSWORD_MIN_LARGO}
            required
          />
        </label>
        <label>
          Confirmar contraseña nueva
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            minLength={PASSWORD_MIN_LARGO}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
    </div>
  );
}
