import { useEffect, useState } from "react";
import {
  DOLOR_POR_ZONA,
  ESTILOS,
  NIVELES,
  QUIZ_ZONAS,
  REFERENCIA_CM,
  TECNICAS,
  etiqueta,
  fotoEstilo,
  type CalibracionEstilo,
  type NivelEstilo,
} from "./quizData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface Props {
  slug: string;
  token: string;
}

/** Edición en curso de un estilo: nivel + minutos por zona (como texto mientras se tipea). */
interface Edicion {
  estilo: string;
  nivel: NivelEstilo;
  tecnicas: string[];
  minutos: Record<string, string>;
}

/** Foto de referencia del estilo, con fallback a un placeholder si todavía no hay archivo. */
function FotoReferencia({ estilo }: { estilo: string }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [estilo]);

  if (fallo) {
    return (
      <div className="quiz-ref__img quiz-ref__img--placeholder">
        <span aria-hidden="true">{etiqueta(estilo)}</span>
        <small>Sin foto de referencia todavía</small>
      </div>
    );
  }
  return (
    <img
      className="quiz-ref__img"
      src={fotoEstilo(estilo)}
      alt={`Ejemplo de ${etiqueta(estilo)}`}
      onError={() => setFallo(true)}
    />
  );
}

function claseDolor(dolor: number): string {
  if (dolor >= 8) return "dolor--alto";
  if (dolor >= 6) return "dolor--medio";
  return "dolor--bajo";
}

export function QuizCalibracion({ slug, token }: Props) {
  const [calibraciones, setCalibraciones] = useState<CalibracionEstilo[]>([]);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    fetch(`${API_URL}/tenants/${slug}/calibracion`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la calibración.");
        if (vivo) setCalibraciones(data as CalibracionEstilo[]);
      })
      .catch((err) => vivo && setError((err as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [slug, token]);

  const estilosCalibrados = new Set(calibraciones.map((c) => c.estilo));
  const estilosDisponibles = ESTILOS.filter((e) => !estilosCalibrados.has(e));

  function empezarNuevo(estilo: string) {
    setError(null);
    setMensaje(null);
    setEdicion({
      estilo,
      nivel: "sabe",
      tecnicas: [],
      minutos: Object.fromEntries(QUIZ_ZONAS.map((z) => [z, ""])),
    });
  }

  function editarExistente(cal: CalibracionEstilo) {
    setError(null);
    setMensaje(null);
    const porZona = new Map(cal.tiempos.map((t) => [t.zona, t.minutos]));
    setEdicion({
      estilo: cal.estilo,
      nivel: cal.nivel,
      tecnicas: cal.tecnicas ?? [],
      minutos: Object.fromEntries(
        QUIZ_ZONAS.map((z) => [z, porZona.has(z) ? String(porZona.get(z)) : ""]),
      ),
    });
  }

  async function guardar() {
    if (!edicion) return;
    setError(null);
    setMensaje(null);

    const tiempos = QUIZ_ZONAS.map((z) => ({ zona: z, minutos: Number(edicion.minutos[z]) }))
      .filter((t) => Number.isInteger(t.minutos) && t.minutos > 0);

    if (tiempos.length === 0) {
      setError("Cargá al menos una zona con minutos (entero mayor a 0).");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/calibracion/${edicion.estilo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nivel: edicion.nivel, tecnicas: edicion.tecnicas, tiempos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");

      const guardado = data as CalibracionEstilo;
      setCalibraciones((prev) => {
        const resto = prev.filter((c) => c.estilo !== guardado.estilo);
        return [...resto, guardado].sort((a, b) => a.estilo.localeCompare(b.estilo));
      });
      setEdicion(null);
      setMensaje(`Calibración de "${etiqueta(guardado.estilo)}" guardada.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(estilo: string) {
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/tenants/${slug}/calibracion/${estilo}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo quitar el estilo.");
      }
      setCalibraciones((prev) => prev.filter((c) => c.estilo !== estilo));
      if (edicion?.estilo === estilo) setEdicion(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const completadas = edicion
    ? QUIZ_ZONAS.filter((z) => Number(edicion.minutos[z]) > 0).length
    : 0;

  return (
    <section className="quiz-calibracion">
      <header className="quiz-calibracion__head">
        <h2>Calibración por estilo</h2>
        <p className="disclaimer">
          Decinos qué estilos hacés y cuánto tiempo te lleva cada uno en distintas zonas.
          Así el cotizador usa <strong>tu</strong> realidad, no un promedio genérico — tu
          línea fina puede ser rapidísima y tu realismo lento, o al revés.
        </p>
      </header>

      {cargando && <p className="disclaimer">Cargando calibración…</p>}
      {error && <p className="error">{error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {/* Estilos ya calibrados, agrupados por nivel */}
      {calibraciones.length > 0 && (
        <div className="quiz-grupos">
          {NIVELES.map((nivel) => {
            const delNivel = calibraciones.filter((c) => c.nivel === nivel.value);
            if (delNivel.length === 0) return null;
            return (
              <div className="quiz-grupo" key={nivel.value}>
                <h3 className="quiz-grupo__titulo">
                  {nivel.label}
                  <span className="quiz-grupo__count">{delNivel.length}</span>
                </h3>
                <div className="quiz-cards">
                  {delNivel.map((cal) => {
                    const completo = cal.tiempos.length >= QUIZ_ZONAS.length;
                    return (
                      <div className="estilo-card" key={cal.estilo}>
                        <div className="estilo-card__top">
                          <strong>{etiqueta(cal.estilo)}</strong>
                          <span
                            className={`estilo-card__estado ${completo ? "ok" : "parcial"}`}
                          >
                            {cal.tiempos.length}/{QUIZ_ZONAS.length} zonas
                          </span>
                        </div>
                        <div className="estilo-card__barra" aria-hidden="true">
                          <span
                            style={{
                              width: `${(cal.tiempos.length / QUIZ_ZONAS.length) * 100}%`,
                            }}
                          />
                        </div>
                        {cal.tecnicas && cal.tecnicas.length > 0 && (
                          <div className="estilo-card__tecnicas">
                            {cal.tecnicas.map((t) => (
                              <span key={t} className="tec-tag">
                                {etiqueta(t)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="estilo-card__acciones">
                          <button type="button" onClick={() => editarExistente(cal)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-quitar"
                            onClick={() => quitar(cal.estilo)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agregar estilo nuevo */}
      {!edicion && estilosDisponibles.length > 0 && (
        <div className="quiz-agregar">
          <label>
            ¿Qué estilo querés calibrar?
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) empezarNuevo(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Elegí un estilo…
              </option>
              {estilosDisponibles.map((e) => (
                <option key={e} value={e}>
                  {etiqueta(e)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!edicion && estilosDisponibles.length === 0 && calibraciones.length > 0 && (
        <p className="disclaimer">Ya calibraste todos los estilos disponibles.</p>
      )}

      {/* Quiz del estilo en edición */}
      {edicion && (
        <div className="quiz-form">
          <div className="quiz-form__head">
            <h3>{etiqueta(edicion.estilo)}</h3>
            <span className="quiz-form__progreso">
              {completadas}/{QUIZ_ZONAS.length} zonas
            </span>
          </div>

          <div className="quiz-ref">
            <FotoReferencia estilo={edicion.estilo} />
            <p className="disclaimer">
              Imaginá un diseño típico de <strong>{etiqueta(edicion.estilo)}</strong> de
              ~{REFERENCIA_CM} cm.
            </p>
          </div>

          <label className="quiz-nivel">
            Tu nivel con este estilo
            <select
              value={edicion.nivel}
              onChange={(e) =>
                setEdicion({ ...edicion, nivel: e.target.value as NivelEstilo })
              }
            >
              {NIVELES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label} — {n.desc}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="quiz-tecnicas">
            <legend>¿Qué técnicas combina este estilo?</legend>
            <p className="disclaimer">
              El método de ejecución. Un estilo puede llevar varias (ej. lettering =
              línea fina + puntillismo de arrastre).
            </p>
            <div className="quiz-tecnicas__grid">
              {TECNICAS.map((tec) => {
                const marcada = edicion.tecnicas.includes(tec.slug);
                return (
                  <label
                    key={tec.slug}
                    className={`tecnica-chip ${marcada ? "activa" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() =>
                        setEdicion({
                          ...edicion,
                          tecnicas: marcada
                            ? edicion.tecnicas.filter((t) => t !== tec.slug)
                            : [...edicion.tecnicas, tec.slug],
                        })
                      }
                    />
                    <span className="tecnica-chip__label">{tec.label}</span>
                    <span className="tecnica-chip__agujas">{tec.agujas}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="disclaimer">
            Por cada zona: <strong>¿cuántos minutos</strong> te lleva tatuar ese diseño ahí,
            <strong> sin contar</strong> preparación del estudio ni colocación del stencil?
          </p>

          <div className="quiz-zonas">
            {QUIZ_ZONAS.map((zona) => {
              const dolor = DOLOR_POR_ZONA[zona] ?? 5;
              return (
                <div className="quiz-zona" key={zona}>
                  <div className="quiz-zona__label">
                    <span>{etiqueta(zona)}</span>
                    <span className={`dolor-badge ${claseDolor(dolor)}`} title="Nivel de dolor">
                      dolor {dolor}/10
                    </span>
                  </div>
                  <div className="quiz-zona__input">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      placeholder="min"
                      value={edicion.minutos[zona]}
                      onChange={(e) =>
                        setEdicion({
                          ...edicion,
                          minutos: { ...edicion.minutos, [zona]: e.target.value },
                        })
                      }
                    />
                    <span>min</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quiz-form__acciones">
            <button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar estilo"}
            </button>
            <button type="button" className="btn-secundario" onClick={() => setEdicion(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
