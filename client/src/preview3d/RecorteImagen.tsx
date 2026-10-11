import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";

interface Props {
  src: string;
  onAplicar: (dataUrl: string) => void;
  onCerrar: () => void;
}

interface Punto {
  x: number; // normalizado 0..1
  y: number;
}

const MAX_LADO = 440;

/**
 * Recorte a forma libre: el usuario dibuja un contorno (lazo) sobre la imagen
 * y todo lo de afuera queda transparente. Devuelve un PNG recortado al bounding
 * box de la forma (para que el decal lo mapee ajustado), con el resto en alfa 0.
 */
export function RecorteImagen({ src, onAplicar, onCerrar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const puntosRef = useRef<Punto[]>([]);
  const dibujandoRef = useRef(false);
  const [tienePath, setTienePath] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      redibujar();
    };
    img.onerror = () => setError("No se pudo cargar la imagen.");
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function redibujar() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const pts = puntosRef.current;
    if (pts.length > 1) {
      // Oscurecer lo de AFUERA del contorno (agujero con regla evenodd).
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      pts.forEach((p, i) => {
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(20, 18, 12, 0.5)";
      ctx.fill("evenodd");
      ctx.restore();

      // Contorno
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (!dibujandoRef.current) ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#2e2bff";
      ctx.stroke();
    }
  }

  function posNorm(e: RPointerEvent<HTMLCanvasElement>): Punto {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onDown(e: RPointerEvent<HTMLCanvasElement>) {
    dibujandoRef.current = true;
    puntosRef.current = [posNorm(e)];
    setTienePath(false);
    redibujar();
  }

  function onMove(e: RPointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return;
    puntosRef.current.push(posNorm(e));
    redibujar();
  }

  function onUp() {
    if (!dibujandoRef.current) return;
    dibujandoRef.current = false;
    setTienePath(puntosRef.current.length > 2);
    redibujar();
  }

  function reiniciar() {
    puntosRef.current = [];
    setTienePath(false);
    redibujar();
  }

  function aplicar() {
    const img = imgRef.current;
    const pts = puntosRef.current;
    if (!img || pts.length < 3) return;

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const nx = img.width;
    const ny = img.height;
    const bx = minX * nx;
    const by = minY * ny;
    const bw = Math.max(1, Math.round((maxX - minX) * nx));
    const bh = Math.max(1, Math.round((maxY - minY) * ny));

    const out = document.createElement("canvas");
    out.width = bw;
    out.height = bh;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x * nx - bx;
      const y = p.y * ny - by;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, -bx, -by, nx, ny);

    onAplicar(out.toDataURL("image/png"));
  }

  return (
    <div className="recorte-overlay" role="dialog" aria-modal="true">
      <div className="recorte-modal">
        <h3>Recortar a forma libre</h3>
        <p className="preview3d__ayuda">
          Dibujá con el dedo o el mouse el contorno que querés conservar. Lo de
          afuera queda transparente.
        </p>
        {error && <p className="error">{error}</p>}
        <canvas
          ref={canvasRef}
          className="recorte-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        <div className="recorte-acciones">
          <button type="button" className="btn-secundario" onClick={reiniciar}>
            Reiniciar
          </button>
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" disabled={!tienePath} onClick={aplicar}>
            Aplicar recorte
          </button>
        </div>
      </div>
    </div>
  );
}
