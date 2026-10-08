import { useEffect, useState, type FormEvent } from "react";
import type { AuthResponse, TenantPricingConfig } from "./types";
import { PLANTILLA_ESTANDAR } from "./fixtures";
import { QuizCalibracion } from "./QuizCalibracion";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const PASSWORD_MIN_LARGO = 8;

// Sesión persistida para que F5 no deslogueé. Guardamos slug + token (el token
// JWT vence a las 12h del lado del server igual; si está vencido, el GET
// /config inicial devuelve 401 y limpiamos la sesión guardada).
const STORAGE_KEY = "cotizador_sesion";

function leerSesion(): { slug: string; token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slug?: unknown; token?: unknown };
    if (typeof parsed.slug === "string" && typeof parsed.token === "string") {
      return { slug: parsed.slug, token: parsed.token };
    }
  } catch {
    /* localStorage no disponible o JSON corrupto: tratamos como sin sesión */
  }
  return null;
}

function guardarSesion(slug: string, token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, token }));
  } catch {
    /* sin localStorage: la sesión simplemente no sobrevive al reload */
  }
}

function borrarSesion() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

const CONFIG_VACIA: TenantPricingConfig = {
  nombre: "",
  moneda: "ARS",
  tarifaHoraria: 0,
  minimoEstudio: 0,
  fijoPreparacion: 0,
  cmPorHora: 1,
  dificultadPorZona: [{ zona: "", multiplicador: 1 }],
  tecnicas: [{ nombre: "", multiplicadorHoras: 1 }],
};

/** Monedas soportadas por ahora. */
const MONEDAS = ["ARS", "USD"] as const;

function actualizarEnLista<T>(lista: T[], index: number, cambios: Partial<T>): T[] {
  return lista.map((item, i) => (i === index ? { ...item, ...cambios } : item));
}

type Modo = "elegir_slug" | "registro" | "login" | "olvido" | "editar";
type Seccion = "estudio" | "estilos" | "cuenta";

/** Íconos SVG inline (sin emoji) — stroke en currentColor para heredar el color del contexto. */
function Icono({ nombre }: { nombre: Seccion }) {
  const comun = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (nombre === "estudio") {
    return (
      <svg {...comun} aria-hidden="true">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
        <path d="M3 9h18" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }
  if (nombre === "estilos") {
    return (
      <svg {...comun} aria-hidden="true">
        <path d="M12 3l1.9 4.6L18.5 9l-3.5 3 1 5-4-2.6L8 17l1-5-3.5-3 4.6-1.4L12 3z" />
      </svg>
    );
  }
  return (
    <svg {...comun} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "estudio", label: "Mi estudio" },
  { id: "estilos", label: "Estilos & tiempos" },
  { id: "cuenta", label: "Cuenta" },
];

export function TenantConfigForm() {
  const [slug, setSlug] = useState("demo");
  const [modo, setModo] = useState<Modo>("elegir_slug");
  const [seccion, setSeccion] = useState<Seccion>("estudio");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<TenantPricingConfig | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [emailCuenta, setEmailCuenta] = useState("");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordNuevaConfirmar, setPasswordNuevaConfirmar] = useState("");
  const [mensajeCuenta, setMensajeCuenta] = useState<string | null>(null);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(false);

  // Si hay una sesión guardada, arrancamos "restaurando" para no mostrar el
  // formulario de login un instante antes de recuperar la sesión real.
  const [restaurando, setRestaurando] = useState<boolean>(() => leerSesion() !== null);

  // Al montar: si hay sesión guardada, intentamos recuperar la config con ese
  // token. Si anda, entramos directo a "editar"; si el token venció (401) o
  // falla, limpiamos la sesión guardada y mostramos el login normal.
  useEffect(() => {
    const sesion = leerSesion();
    if (!sesion) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tenants/${sesion.slug}/config`, {
          headers: { Authorization: `Bearer ${sesion.token}` },
        });
        if (!res.ok) throw new Error("sesión inválida o vencida");
        const dataConfig = (await res.json()) as TenantPricingConfig;
        if (!vivo) return;
        setSlug(sesion.slug);
        setToken(sesion.token);
        setConfig(dataConfig);
        setModo("editar");
      } catch {
        borrarSesion();
      } finally {
        if (vivo) setRestaurando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

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
      setSeccion("estudio");
      guardarSesion(slug, nuevoToken);
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
      setSeccion("estudio");
      guardarSesion(slug, nuevoToken);
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
    borrarSesion();
    setToken(null);
    setConfig(null);
    setModo("elegir_slug");
    setSeccion("estudio");
    setPassword("");
    setMensaje(null);
    setError(null);
    setEmailCuenta("");
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordNuevaConfirmar("");
    setMensajeCuenta(null);
    setErrorCuenta(null);
  }

  async function pedirRecuperacion() {
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/forgot-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo pedir la recuperación.");
      setMensaje(data.mensaje as string);
    } catch {
      setError("No se pudo conectar con el servidor. ¿Está corriendo en " + API_URL + "?");
    } finally {
      setCargando(false);
    }
  }

  async function guardarEmail(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErrorCuenta(null);
    setMensajeCuenta(null);
    setCargandoCuenta(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailCuenta }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No se pudo guardar el email.");
      }
      setMensajeCuenta("Email guardado. Ahí llega el link si algún día usás 'olvidé mi contraseña'.");
    } catch (err) {
      setErrorCuenta((err as Error).message);
    } finally {
      setCargandoCuenta(false);
    }
  }

  async function cambiarPassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErrorCuenta(null);
    setMensajeCuenta(null);

    if (passwordNueva !== passwordNuevaConfirmar) {
      setErrorCuenta("Las dos contraseñas nuevas no coinciden.");
      return;
    }

    setCargandoCuenta(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordActual, newPassword: passwordNueva }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cambiar la contraseña.");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordNuevaConfirmar("");
      setMensajeCuenta("Contraseña actualizada.");
    } catch (err) {
      setErrorCuenta((err as Error).message);
    } finally {
      setCargandoCuenta(false);
    }
  }

  const esAuth = modo !== "editar";

  if (restaurando) {
    return (
      <div className="tenant-config">
        <p className="disclaimer">Restaurando sesión…</p>
      </div>
    );
  }

  return (
    <div className="tenant-config">
      <header className="config-header">
        <p className="hero__eyebrow">
          <span className="dot" />
          Panel privado
        </p>
        <h1>Configurá tu estudio</h1>
        <p className="config-header__sub">
          Definí tu tarifa y calibrá tus estilos. Lo que guardes acá alimenta el
          cotizador en tiempo real.
        </p>
      </header>

      {esAuth && (
        <div className="auth-card">
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
              <div className="auth-card__links">
                <button type="button" onClick={() => setModo("elegir_slug")}>
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMensaje(null);
                    setModo("olvido");
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          )}

          {modo === "olvido" && (
            <div>
              <p className="disclaimer">
                Si "{slug}" tiene un email cargado en su cuenta, le mandamos un link para elegir una
                contraseña nueva (vence en 1 hora).
              </p>
              <button type="button" onClick={pedirRecuperacion} disabled={cargando}>
                {cargando ? "Enviando..." : "Enviar link de recuperación"}
              </button>
              <div className="auth-card__links">
                <button type="button" onClick={() => setModo("login")}>
                  Volver
                </button>
              </div>
            </div>
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
              <div className="auth-card__links">
                <button type="button" onClick={() => setModo("elegir_slug")}>
                  Volver
                </button>
              </div>
            </form>
          )}

          {error && <p className="error">{error}</p>}
          {mensaje && <p className="mensaje">{mensaje}</p>}
        </div>
      )}

      {modo === "editar" && config && (
        <div className="panel">
          <div className="editor-bar">
            <span className="editor-bar__slug">
              <span className="dot" />
              Editando <strong>{slug}</strong>
            </span>
            <button type="button" className="btn-secundario" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>

          <nav className="panel-nav" role="tablist" aria-label="Secciones del panel">
            {SECCIONES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={seccion === s.id}
                className={seccion === s.id ? "activo" : ""}
                onClick={() => setSeccion(s.id)}
              >
                <Icono nombre={s.id} />
                {s.label}
              </button>
            ))}
          </nav>

          {!esAuth && error && <p className="error">{error}</p>}
          {!esAuth && mensaje && <p className="mensaje">{mensaje}</p>}

          {/* ---------- MI ESTUDIO ---------- */}
          {seccion === "estudio" && (
            <form className="config-editor" onSubmit={guardar}>
              <section className="card">
                <h2 className="card__title">Identidad</h2>
                <div className="field-grid">
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
                    <select
                      value={config.moneda}
                      onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                    >
                      {MONEDAS.map((m) => (
                        <option key={m} value={m}>
                          {m === "ARS" ? "ARS (pesos)" : "USD (dólares)"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="card">
                <h2 className="card__title">Tarifa</h2>
                <p className="card__hint">
                  El precio se calcula por <strong>horas × tarifa horaria</strong>, no por tamaño.
                  El fijo de preparación (limpieza + stencil) se suma aparte a cualquier tatuaje.
                </p>
                <div className="field-grid">
                  <label>
                    Tarifa horaria ({config.moneda}/hora)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={config.tarifaHoraria}
                      onChange={(e) =>
                        setConfig({ ...config, tarifaHoraria: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Mínimo de estudio (piso)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={config.minimoEstudio}
                      onChange={(e) =>
                        setConfig({ ...config, minimoEstudio: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Fijo de preparación (prep + stencil)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={config.fijoPreparacion}
                      onChange={(e) =>
                        setConfig({ ...config, fijoPreparacion: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              </section>

              <details className="avanzado">
                <summary>
                  Avanzado — multiplicadores por zona y técnica
                  <span className="avanzado__nota">
                    Opcional. El quiz de estilos los va a reemplazar; por ahora alimentan el motor viejo.
                  </span>
                </summary>

                <div className="avanzado__body">
                  <p className="disclaimer">
                    ¿Recién empezás? Cargá un punto de partida con 28 zonas, técnicas y niveles ya
                    con valores de referencia — después ajustá a tu realidad.
                  </p>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() =>
                      setConfig({
                        ...PLANTILLA_ESTANDAR,
                        nombre: config.nombre,
                        moneda: config.moneda,
                      })
                    }
                  >
                    Cargar plantilla estándar
                  </button>

                  <label className="campo-suelto">
                    Cm por hora (velocidad base)
                    <input
                      type="number"
                      min={0.1}
                      step="any"
                      value={config.cmPorHora}
                      onChange={(e) => setConfig({ ...config, cmPorHora: Number(e.target.value) })}
                    />
                  </label>

                  <fieldset>
                    <legend>Dificultad por zona del cuerpo</legend>
                    {config.dificultadPorZona.map((z, i) => (
                      <div className="fila-lista" key={i}>
                        <input
                          placeholder="zona (ej. brazo)"
                          value={z.zona}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dificultadPorZona: actualizarEnLista(config.dificultadPorZona, i, {
                                zona: e.target.value,
                              }),
                            })
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="multiplicador (ej. 1.0)"
                          value={z.multiplicador}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dificultadPorZona: actualizarEnLista(config.dificultadPorZona, i, {
                                multiplicador: Number(e.target.value),
                              }),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="btn-quitar"
                          onClick={() =>
                            setConfig({
                              ...config,
                              dificultadPorZona: config.dificultadPorZona.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secundario"
                      onClick={() =>
                        setConfig({
                          ...config,
                          dificultadPorZona: [
                            ...config.dificultadPorZona,
                            { zona: "", multiplicador: 1 },
                          ],
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
                              tecnicas: actualizarEnLista(config.tecnicas, i, {
                                nombre: e.target.value,
                              }),
                            })
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="multiplicador de horas (ej. 1.0)"
                          value={t.multiplicadorHoras}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              tecnicas: actualizarEnLista(config.tecnicas, i, {
                                multiplicadorHoras: Number(e.target.value),
                              }),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="btn-quitar"
                          onClick={() =>
                            setConfig({
                              ...config,
                              tecnicas: config.tecnicas.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secundario"
                      onClick={() =>
                        setConfig({
                          ...config,
                          tecnicas: [...config.tecnicas, { nombre: "", multiplicadorHoras: 1 }],
                        })
                      }
                    >
                      + Agregar técnica
                    </button>
                  </fieldset>

                </div>
              </details>

              <div className="panel-guardar">
                <button type="submit" disabled={cargando}>
                  {cargando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}

          {/* ---------- ESTILOS & TIEMPOS (quiz) ----------
              Se mantiene montado (oculto con CSS) para no perder el quiz en
              curso al cambiar de pestaña ni re-fetchear cada vez. */}
          {token && (
            <div style={{ display: seccion === "estilos" ? "block" : "none" }}>
              <QuizCalibracion slug={slug} token={token} />
            </div>
          )}

          {/* ---------- CUENTA ---------- */}
          {seccion === "cuenta" && (
            <div className="cuenta-seccion">
              <form className="card" onSubmit={guardarEmail}>
                <h2 className="card__title">Email de recuperación</h2>
                <p className="card__hint">
                  Cargá un email para poder usar "¿Olvidaste tu contraseña?". Sin email, ese link no
                  tiene a dónde mandarse.
                </p>
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={emailCuenta}
                    onChange={(e) => setEmailCuenta(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" disabled={cargandoCuenta}>
                  {cargandoCuenta ? "Guardando..." : "Guardar email"}
                </button>
              </form>

              <form className="card" onSubmit={cambiarPassword}>
                <h2 className="card__title">Cambiar contraseña</h2>
                <label>
                  Contraseña actual
                  <input
                    type="password"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Contraseña nueva (mínimo {PASSWORD_MIN_LARGO} caracteres)
                  <input
                    type="password"
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    minLength={PASSWORD_MIN_LARGO}
                    required
                  />
                </label>
                <label>
                  Confirmar contraseña nueva
                  <input
                    type="password"
                    value={passwordNuevaConfirmar}
                    onChange={(e) => setPasswordNuevaConfirmar(e.target.value)}
                    minLength={PASSWORD_MIN_LARGO}
                    required
                  />
                </label>
                <button type="submit" disabled={cargandoCuenta}>
                  {cargandoCuenta ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>

              {errorCuenta && <p className="error">{errorCuenta}</p>}
              {mensajeCuenta && <p className="mensaje">{mensajeCuenta}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
