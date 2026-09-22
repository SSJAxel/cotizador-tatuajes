import { useEffect, useState, type FormEvent } from "react";
import { ETIQUETAS } from "./fixtures";
import type { QuoteInput, QuoteResult, TenantPublicOptions } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
// Único tenant hoy — cuando exista selección/auth de tenant real, esto deja
// de estar hardcodeado.
const TENANT_SLUG = "demo";

export function QuoteForm() {
  const [config, setConfig] = useState<TenantPublicOptions | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [input, setInput] = useState<QuoteInput | null>(null);
  const [resultado, setResultado] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/tenants/${TENANT_SLUG}/options`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la configuración.");
        return data as TenantPublicOptions;
      })
      .then((cfg) => {
        setConfig(cfg);
        setInput({
          tamanoCm: 10,
          zona: cfg.zonas[0],
          tecnica: cfg.tecnicas[0],
          especializacion: cfg.especializacion[0],
          cantidadAgujas: cfg.agujasIncluidas,
          calidadProducto: cfg.calidadProducto[0],
          horario: cfg.horarios[0],
        });
      })
      .catch((err) => setConfigError((err as Error).message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input) return;
    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await fetch(`${API_URL}/tenants/${TENANT_SLUG}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error desconocido calculando la cotización.");
        return;
      }

      setResultado(data as QuoteResult);
    } catch {
      setError("No se pudo conectar con el servidor. ¿Está corriendo en " + API_URL + "?");
    } finally {
      setCargando(false);
    }
  }

  function actualizar<K extends keyof QuoteInput>(campo: K, valor: QuoteInput[K]) {
    setInput((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  if (configError) {
    return (
      <div className="quote-page">
        <header className="quote-header">
          <h1>Cotizador de tatuajes</h1>
        </header>
        <p className="error">
          No se pudo cargar la configuración: {configError}. ¿Está el servidor corriendo en{" "}
          {API_URL}?
        </p>
      </div>
    );
  }

  if (!config || !input) {
    return (
      <div className="quote-page">
        <header className="quote-header">
          <h1>Cotizador de tatuajes</h1>
          <p className="disclaimer">Cargando...</p>
        </header>
      </div>
    );
  }

  return (
    <div className="quote-page">
      <header className="quote-header">
        <span className="eyebrow">{config.nombre}</span>
        <h1>¿Cuánto cuesta tu próximo tatuaje?</h1>
        <p className="disclaimer">Precio aproximado — puede variar según lo evalúe el tatuador.</p>
      </header>

      <div className="quote-grid">
        <section className="quote-panel">
          <form className="quote-form-fields" onSubmit={onSubmit}>
            <label>
              Tamaño (cm)
              <input
                type="number"
                min={1}
                value={input.tamanoCm}
                onChange={(e) => actualizar("tamanoCm", Number(e.target.value))}
                required
              />
            </label>

            <label>
              Zona del cuerpo
              <select value={input.zona} onChange={(e) => actualizar("zona", e.target.value)}>
                {config.zonas.map((zona) => (
                  <option key={zona} value={zona}>
                    {ETIQUETAS[zona] ?? zona}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Técnica
              <select value={input.tecnica} onChange={(e) => actualizar("tecnica", e.target.value)}>
                {config.tecnicas.map((tecnica) => (
                  <option key={tecnica} value={tecnica}>
                    {ETIQUETAS[tecnica] ?? tecnica}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nivel de especialización requerido
              <select
                value={input.especializacion}
                onChange={(e) => actualizar("especializacion", e.target.value)}
              >
                {config.especializacion.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {ETIQUETAS[nivel] ?? nivel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cantidad de agujas
              <input
                type="number"
                min={0}
                value={input.cantidadAgujas}
                onChange={(e) => actualizar("cantidadAgujas", Number(e.target.value))}
                required
              />
            </label>

            <label>
              Calidad de producto
              <select
                value={input.calidadProducto}
                onChange={(e) => actualizar("calidadProducto", e.target.value)}
              >
                {config.calidadProducto.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {ETIQUETAS[nivel] ?? nivel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Horario del turno
              <select value={input.horario} onChange={(e) => actualizar("horario", e.target.value)}>
                {config.horarios.map((franja) => (
                  <option key={franja} value={franja}>
                    {ETIQUETAS[franja] ?? franja}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary" disabled={cargando}>
              {cargando ? "Calculando..." : "Calcular precio"}
            </button>
          </form>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>

        <aside className="quote-summary">
          {resultado ? (
            <>
              <span className="quote-summary-label">Precio estimado</span>
              <p className="quote-summary-price">
                {config.moneda} {resultado.precioEstimado.toLocaleString("es-AR")}
              </p>
              <details className="quote-breakdown">
                <summary>Ver desglose</summary>
                <ul>
                  <li>
                    <span>Base (tamaño × zona)</span>
                    <span>{resultado.desglose.base}</span>
                  </li>
                  <li>
                    <span>Multiplicador técnica</span>
                    <span>×{resultado.desglose.multTecnica}</span>
                  </li>
                  <li>
                    <span>Multiplicador especialización</span>
                    <span>×{resultado.desglose.multEspecializacion}</span>
                  </li>
                  <li>
                    <span>Subtotal</span>
                    <span>{resultado.desglose.subtotal}</span>
                  </li>
                  <li>
                    <span>Insumo de tintas (según técnica)</span>
                    <span>{resultado.desglose.costoInsumoTintas}</span>
                  </li>
                  <li>
                    <span>Extra agujas</span>
                    <span>{resultado.desglose.extraAgujas}</span>
                  </li>
                  <li>
                    <span>Calidad de producto</span>
                    <span>{resultado.desglose.costoCalidadProducto}</span>
                  </li>
                  <li>
                    <span>Recargo horario</span>
                    <span>{resultado.desglose.recargoPorcentual}%</span>
                  </li>
                </ul>
              </details>
            </>
          ) : (
            <div className="quote-summary-empty">
              <span className="quote-summary-label">Presupuesto estimado</span>
              <p>Completá el formulario y calculá tu precio para ver el detalle acá.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
