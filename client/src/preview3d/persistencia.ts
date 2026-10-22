import type { Genero } from "./poses";
import type { ZonaCuerpo } from "./types";

// Lado máximo de la imagen base. Subido a 1600 para que un diseño chico y
// simple se siga viendo nítido al acercar el zoom (antes 900 lo dejaba blando).
const DIMENSION_MAXIMA = 1600;

/**
 * Se incrementa cada vez que cambia la forma de `DisenioGuardado` de un modo
 * incompatible con versiones viejas. Hoy existe porque `localPos`/`morphs`
 * están atados a la malla GLB actual — un diseño guardado con otra versión
 * se descarta entero (ver cargarDiseno), igual que ya se invalida el decal
 * al cambiar de género/pose.
 */
export const ESQUEMA_VERSION = 2;

export type DisenioGuardado = {
  version: number;
  genero: Genero;
  imagenDataUrl: string;
  zona: ZonaCuerpo;
  localPos: [number, number, number];
  rotacionDeg: number;
  escala: number;
  /** 1 = sin cambios; <1 menos contraste, >1 más. Lo define la persona. */
  contraste: number;
  /** Influencia (0..1) de cada morph target activo al momento de guardar. */
  morphs: Record<string, number>;
};

/**
 * Aplica contraste a una imagen (data URL) preservando la transparencia
 * (el filtro de contraste toca RGB, no el alfa). Devuelve un nuevo data URL.
 */
export function aplicarContraste(dataUrl: string, contraste: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (contraste === 1) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onerror = () => reject(new Error("No se pudo procesar el contraste."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar el contraste."));
        return;
      }
      ctx.filter = `contrast(${Math.round(contraste * 100)}%)`;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

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
    const datos = JSON.parse(crudo) as Partial<DisenioGuardado>;
    if (datos.version !== ESQUEMA_VERSION) {
      // Esquema viejo (incluye todo lo guardado antes de agregar `version`,
      // que da `undefined` acá) o corrupto: localPos/morphs quedaron atados
      // a una malla que ya no existe. Sin migración campo-por-campo posible
      // — se descarta entero, mismo criterio que ya usamos para invalidar el
      // decal al cambiar de género/pose.
      localStorage.removeItem(clave(tenantSlug));
      return null;
    }
    return datos as DisenioGuardado;
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
