import type { ZonaCuerpo } from "./types";

const DIMENSION_MAXIMA = 900;

export type DisenioGuardado = {
  imagenDataUrl: string;
  zona: ZonaCuerpo;
  localPos: [number, number, number];
  rotacionDeg: number;
  escala: number;
};

/** Downscale a un lado máximo de 900px y lo devuelve como data URL PNG (preserva transparencia). */
export function comprimirImagenADataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
      img.onload = () => {
        const escala = Math.min(1, DIMENSION_MAXIMA / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  });
}

function clave(tenantSlug: string) {
  return `cotizador3d:${tenantSlug}`;
}

export function guardarDiseno(tenantSlug: string, datos: DisenioGuardado) {
  try {
    localStorage.setItem(clave(tenantSlug), JSON.stringify(datos));
  } catch (err) {
    console.warn("No se pudo guardar el diseño en el navegador:", err);
  }
}

export function cargarDiseno(tenantSlug: string): DisenioGuardado | null {
  try {
    const crudo = localStorage.getItem(clave(tenantSlug));
    if (!crudo) return null;
    return JSON.parse(crudo) as DisenioGuardado;
  } catch (err) {
    console.warn("No se pudo leer el diseño guardado:", err);
    return null;
  }
}

export function borrarDiseno(tenantSlug: string) {
  try {
    localStorage.removeItem(clave(tenantSlug));
  } catch (err) {
    console.warn("No se pudo borrar el diseño guardado:", err);
  }
}
