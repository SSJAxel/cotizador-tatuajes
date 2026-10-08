import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { ETIQUETAS } from "./fixtures";
import type { QuoteInput, QuoteResult, TenantPublicOptions } from "./types";
import { Preview3D } from "../preview3d/Preview3D";

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
  const [mostrarVista3D, setMostrarVista3D] = useState(false);
  const [precioAnim, setPrecioAnim] = useState(0);

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
        });
      })
      .catch((err) => setConfigError((err as Error).message));
  }, []);

  // Reveal al entrar en viewport. Se re-corre cuando ya hay config (el
  // contenido real recién existe en el DOM en ese momento). Sin librerías.
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [config]);

  // Count-up del precio: el momento clave de la herramienta merece "aparecer".
  useEffect(() => {
    const destino = resultado?.precioEstimado;
    if (destino == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrecioAnim(destino);
      return;
    }
    const duracion = 650;
    const inicio = performance.now();
    let raf = 0;
    const tick = (ahora: number) => {
      const p = Math.min(1, (ahora - inicio) / duracion);
      const eased = 1 - Math.pow(1 - p, 3);
      setPrecioAnim(Math.round(destino * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resultado?.precioEstimado]);

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
        <section className="state-screen">
          <p className="hero__eyebrow">
            <span className="dot" />
            Sin conexión
          </p>
          <h1>No pudimos cargar el cotizador.</h1>
          <p className="state-screen__msg">{configError}</p>
          <p className="state-screen__hint">
            Verificá que el servidor esté corriendo en <code>{API_URL}</code>.
          </p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </section>
      </div>
    );
  }

  if (!config || !input) {
    return (
      <div className="quote-page">
        <header className="hero">
          <p className="hero__eyebrow">
            <span className="dot" />
            Cargando
          </p>
          <div className="skel skel--title" />
          <div className="skel skel--title skel--short" />
        </header>
        <div className="section">
          <div className="quote-grid">
            <div className="quote-panel">
              <div className="skel skel--field" />
              <div className="skel skel--field" />
              <div className="skel skel--field" />
              <div className="skel skel--field" />
              <div className="skel skel--button" />
            </div>
            <div className="quote-summary">
              <div className="skel skel--label" />
              <div className="skel skel--price" />
              <div className="skel skel--line" />
              <div className="skel skel--line" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-page">
      <header className="hero" id="top">
        <p className="hero__eyebrow" data-reveal>
          <span className="dot" />
          {config.nombre}
        </p>
        <h1 className="hero__title">
          <span className="line" data-reveal>
            ¿Cuánto cuesta
          </span>
          <span className="line line--accent" data-reveal style={{ "--reveal-delay": "90ms" } as CSSProperties}>
            tu próximo tatuaje?
          </span>
        </h1>
        <div className="hero__foot" data-reveal style={{ "--reveal-delay": "180ms" } as CSSProperties}>
          <p className="hero__sub">
            Un precio estimado en segundos. Después lo confirma el tatuador según
            tu diseño.
          </p>
          <a href="#cotiza" className="hero__link">
            Cotizar <i>↓</i>
          </a>
        </div>
      </header>

      <section className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {Array.from({ length: 2 }).flatMap((_, rep) =>
            ["Líneas finas", "Lettering", "Realismo", "Tradicional", "Blackwork", "Color"].map(
              (palabra) => (
                <span key={`${rep}-${palabra}`}>
                  {palabra}
                  <i className="marquee__sep">✦</i>
                </span>
              ),
            ),
          )}
        </div>
      </section>

      <section className="section" id="cotiza">
        <div className="section__head" data-reveal>
          <span className="section__index">(01) — Tu presupuesto</span>
          <h2 className="section__title">Armá tu cotización</h2>
        </div>

        <div className="quote-grid">
        <section className="quote-panel" data-reveal>
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

        <aside
          className="quote-summary"
          data-reveal
          style={{ "--reveal-delay": "120ms" } as CSSProperties}
        >
          {resultado ? (
            <div className="quote-summary-result" key={resultado.precioEstimado}>
              <span className="quote-summary-label">Precio estimado</span>
              <p className="quote-summary-price">
                {config.moneda} {precioAnim.toLocaleString("es-AR")}
              </p>
              <details className="quote-breakdown">
                <summary>Ver desglose</summary>
                <ul>
                  <li>
                    <span>Horas estimadas</span>
                    <span>{resultado.desglose.horasEstimadas} h</span>
                  </li>
                  <li>
                    <span>Tarifa horaria</span>
                    <span>
                      {config.moneda} {resultado.desglose.tarifaHoraria.toLocaleString("es-AR")}/h
                    </span>
                  </li>
                  <li>
                    <span>Tiempo (horas × tarifa)</span>
                    <span>
                      {config.moneda} {resultado.desglose.costoTiempo.toLocaleString("es-AR")}
                    </span>
                  </li>
                  <li>
                    <span>Fijo de preparación (prep + stencil)</span>
                    <span>
                      {config.moneda} {resultado.desglose.fijoPreparacion.toLocaleString("es-AR")}
                    </span>
                  </li>
                  {resultado.desglose.aplicoMinimo && (
                    <li>
                      <span>Mínimo de estudio aplicado</span>
                      <span>
                        {config.moneda}{" "}
                        {resultado.desglose.minimoEstudio.toLocaleString("es-AR")}
                      </span>
                    </li>
                  )}
                </ul>
              </details>
            </div>
          ) : (
            <div className="quote-summary-empty">
              <span className="quote-summary-label">Presupuesto estimado</span>
              <p>Completá el formulario y calculá tu precio para ver el detalle acá.</p>
            </div>
          )}
        </aside>
        </div>
      </section>

      <section className="section" id="preview">
        <div className="section__head" data-reveal>
          <span className="section__index">(02) — Previsualización</span>
          <h2 className="section__title">Mirá cómo quedaría</h2>
        </div>

        <div className="quote-3d-toggle" data-reveal>
          <div>
            <h3>Probalo sobre un cuerpo en 3D</h3>
            <p className="disclaimer">
              Subí tu diseño de referencia y probalo sobre un cuerpo en 3D antes
              de agendar. Es una vista aproximada, no afecta el precio.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMostrarVista3D((v) => !v)}
          >
            {mostrarVista3D ? "Ocultar vista previa 3D" : "Mostrar vista previa 3D"}
          </button>
        </div>

        {mostrarVista3D && <Preview3D tenantSlug={TENANT_SLUG} />}
      </section>
    </div>
  );
}
