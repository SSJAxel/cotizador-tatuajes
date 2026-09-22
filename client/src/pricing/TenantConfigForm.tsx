import { useState, type FormEvent } from "react";
import type { AuthResponse, TenantPricingConfig } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const PASSWORD_MIN_LARGO = 8;

const CONFIG_VACIA: TenantPricingConfig = {
  nombre: "",
  moneda: "ARS",
  precioPorCmPorZona: [{ zona: "", precioPorCm: 0 }],
  tecnicas: [{ nombre: "", multiplicador: 1, costoInsumoTintas: 0 }],
  especializacion: [{ nivel: "", multiplicador: 1 }],
  agujas: { incluidas: 1, precioPorAgujaExtra: 0 },
  calidadProducto: [{ nivel: "", costoFijo: 0 }],
  horarios: [{ franja: "", recargoPorcentual: 0 }],
};

function actualizarEnLista<T>(lista: T[], index: number, cambios: Partial<T>): T[] {
  return lista.map((item, i) => (i === index ? { ...item, ...cambios } : item));
}

type Modo = "elegir_slug" | "registro" | "login" | "editar";

export function TenantConfigForm() {
  const [slug, setSlug] = useState("demo");
  const [modo, setModo] = useState<Modo>("elegir_slug");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<TenantPricingConfig | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Paso 1: el slug NO es secreto (el formulario público ya lo expone vía
  // /options), así que usamos esa misma llamada sin auth solo para decidir
  // si hay que mostrar "iniciar sesión" o "crear tenant nuevo".
  async function buscarSlug() {
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/options`);
      setPassword("");
      setModo(res.ok ? "login" : "registro");
    } catch {
      setError("No se pudo conectar con el servidor. ¿Está corriendo en " + API_URL + "?");
    } finally {
      setCargando(false);
    }
  }

  async function loguear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error iniciando sesión.");

      const { token: nuevoToken } = data as AuthResponse;
      const resConfig = await fetch(`${API_URL}/tenants/${slug}/config`, {
        headers: { Authorization: `Bearer ${nuevoToken}` },
      });
      const dataConfig = await resConfig.json();
      if (!resConfig.ok) throw new Error(dataConfig.error ?? "Error cargando la config.");

      setToken(nuevoToken);
      setConfig(dataConfig as TenantPricingConfig);
      setModo("editar");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando el tenant.");

      const { token: nuevoToken } = data as AuthResponse;
      setToken(nuevoToken);
      setConfig({ ...CONFIG_VACIA });
      setModo("editar");
      setMensaje(`Cuenta creada. Completá los datos y guardá para terminar de configurar "${slug}".`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!config || !token) return;
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error guardando la config.");
      setConfig(data as TenantPricingConfig);
      setMensaje("Guardado.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    setToken(null);
    setConfig(null);
    setModo("elegir_slug");
    setPassword("");
    setMensaje(null);
    setError(null);
  }

  return (
    <div className="tenant-config">
      <h1>Configuración del tatuador</h1>

      {modo === "elegir_slug" && (
        <div className="slug-picker">
          <label>
            Slug del tenant
            <input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <button type="button" onClick={buscarSlug} disabled={cargando}>
            Continuar
          </button>
        </div>
      )}

      {modo === "login" && (
        <form onSubmit={loguear}>
          <p className="disclaimer">
            El tenant "{slug}" ya existe. Iniciá sesión para editarlo.
          </p>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={cargando}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
          <button type="button" onClick={() => setModo("elegir_slug")}>
            Volver
          </button>
        </form>
      )}

      {modo === "registro" && (
        <form onSubmit={registrar}>
          <p className="disclaimer">
            El tenant "{slug}" no existe todavía — elegí una contraseña para crearlo. Vas a poder
            cargar precios y opciones después de crearlo.
          </p>
          <label>
            Contraseña (mínimo {PASSWORD_MIN_LARGO} caracteres)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={PASSWORD_MIN_LARGO}
              required
            />
          </label>
          <button type="submit" disabled={cargando}>
            {cargando ? "Creando..." : "Crear tenant"}
          </button>
          <button type="button" onClick={() => setModo("elegir_slug")}>
            Volver
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {modo === "editar" && config && (
        <form onSubmit={guardar}>
          <div className="slug-picker">
            <span>
              Editando <strong>{slug}</strong>
            </span>
            <button type="button" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>

          <label>
            Nombre del estudio
            <input
              value={config.nombre}
              onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
              required
            />
          </label>

          <label>
            Moneda
            <input
              value={config.moneda}
              onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
              required
            />
          </label>

          <fieldset>
            <legend>Agujas</legend>
            <label>
              Incluidas en el precio base
              <input
                type="number"
                min={0}
                value={config.agujas.incluidas}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agujas: { ...config.agujas, incluidas: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Precio por aguja extra
              <input
                type="number"
                min={0}
                value={config.agujas.precioPorAgujaExtra}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    agujas: { ...config.agujas, precioPorAgujaExtra: Number(e.target.value) },
                  })
                }
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Precio por zona del cuerpo (por cm)</legend>
            {config.precioPorCmPorZona.map((z, i) => (
              <div className="fila-lista" key={i}>
                <input
                  placeholder="zona (ej. brazo)"
                  value={z.zona}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      precioPorCmPorZona: actualizarEnLista(config.precioPorCmPorZona, i, {
                        zona: e.target.value,
                      }),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  placeholder="precio por cm"
                  value={z.precioPorCm}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      precioPorCmPorZona: actualizarEnLista(config.precioPorCmPorZona, i, {
                        precioPorCm: Number(e.target.value),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      precioPorCmPorZona: config.precioPorCmPorZona.filter((_, j) => j !== i),
                    })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  precioPorCmPorZona: [...config.precioPorCmPorZona, { zona: "", precioPorCm: 0 }],
                })
              }
            >
              + Agregar zona
            </button>
          </fieldset>

          <fieldset>
            <legend>Técnicas</legend>
            {config.tecnicas.map((t, i) => (
              <div className="fila-lista" key={i}>
                <input
                  placeholder="nombre (ej. realismo)"
                  value={t.nombre}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tecnicas: actualizarEnLista(config.tecnicas, i, { nombre: e.target.value }),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="multiplicador"
                  value={t.multiplicador}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tecnicas: actualizarEnLista(config.tecnicas, i, {
                        multiplicador: Number(e.target.value),
                      }),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  placeholder="costo insumo tintas"
                  value={t.costoInsumoTintas}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tecnicas: actualizarEnLista(config.tecnicas, i, {
                        costoInsumoTintas: Number(e.target.value),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, tecnicas: config.tecnicas.filter((_, j) => j !== i) })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  tecnicas: [
                    ...config.tecnicas,
                    { nombre: "", multiplicador: 1, costoInsumoTintas: 0 },
                  ],
                })
              }
            >
              + Agregar técnica
            </button>
          </fieldset>

          <fieldset>
            <legend>Niveles de especialización</legend>
            {config.especializacion.map((esp, i) => (
              <div className="fila-lista" key={i}>
                <input
                  placeholder="nivel (ej. soy_el_unico)"
                  value={esp.nivel}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      especializacion: actualizarEnLista(config.especializacion, i, {
                        nivel: e.target.value,
                      }),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="multiplicador"
                  value={esp.multiplicador}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      especializacion: actualizarEnLista(config.especializacion, i, {
                        multiplicador: Number(e.target.value),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      especializacion: config.especializacion.filter((_, j) => j !== i),
                    })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  especializacion: [...config.especializacion, { nivel: "", multiplicador: 1 }],
                })
              }
            >
              + Agregar nivel
            </button>
          </fieldset>

          <fieldset>
            <legend>Calidad de producto</legend>
            {config.calidadProducto.map((c, i) => (
              <div className="fila-lista" key={i}>
                <input
                  placeholder="nivel (ej. premium)"
                  value={c.nivel}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      calidadProducto: actualizarEnLista(config.calidadProducto, i, {
                        nivel: e.target.value,
                      }),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  placeholder="costo fijo"
                  value={c.costoFijo}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      calidadProducto: actualizarEnLista(config.calidadProducto, i, {
                        costoFijo: Number(e.target.value),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      calidadProducto: config.calidadProducto.filter((_, j) => j !== i),
                    })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  calidadProducto: [...config.calidadProducto, { nivel: "", costoFijo: 0 }],
                })
              }
            >
              + Agregar nivel de calidad
            </button>
          </fieldset>

          <fieldset>
            <legend>Horarios</legend>
            {config.horarios.map((h, i) => (
              <div className="fila-lista" key={i}>
                <input
                  placeholder="franja (ej. urgente_mismo_dia)"
                  value={h.franja}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      horarios: actualizarEnLista(config.horarios, i, { franja: e.target.value }),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="recargo %"
                  value={h.recargoPorcentual}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      horarios: actualizarEnLista(config.horarios, i, {
                        recargoPorcentual: Number(e.target.value),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, horarios: config.horarios.filter((_, j) => j !== i) })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  horarios: [...config.horarios, { franja: "", recargoPorcentual: 0 }],
                })
              }
            >
              + Agregar horario
            </button>
          </fieldset>

          <button type="submit" disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}
