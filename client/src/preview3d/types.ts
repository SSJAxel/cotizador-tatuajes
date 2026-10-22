import * as THREE from "three";

export type ZonaCuerpo = "torso" | "brazo" | "pierna";

export const NOMBRE_ZONA: Record<ZonaCuerpo, string> = {
  torso: "Torso",
  brazo: "Brazo",
  pierna: "Pierna",
};

/**
 * Posición aproximada de cada una de las 28 zonas del cotizador sobre el
 * cuerpo, en coordenadas NORMALIZADAS del cuerpo:
 *   x: -1 (un lado) → +1 (el otro); los miembros van en +x
 *   y:  0 (pies) → 1 (cabeza)
 *   z: -1 (espalda) → +1 (frente)
 * Se usa para que el selector de partes vuele la cámara y encuadre esa zona.
 * Son valores aproximados pensados para encuadrar, no para precisión médica.
 */
export const POSICION_ZONA: Record<string, [number, number, number]> = {
  cuello: [0, 0.88, 0.45],
  nuca: [0, 0.88, -0.45],
  clavicula: [0.16, 0.82, 0.42],
  hombro: [0.42, 0.8, 0.12],
  pecho: [0.18, 0.74, 0.5],
  esternon: [0, 0.73, 0.5],
  axila: [0.34, 0.74, 0.12],
  espalda_alta: [0, 0.76, -0.5],
  espalda_media: [0, 0.66, -0.5],
  columna: [0, 0.62, -0.52],
  brazo: [0.48, 0.66, 0.14],
  triceps: [0.48, 0.66, -0.16],
  costillas: [0.32, 0.64, 0.35],
  abdomen: [0.12, 0.6, 0.5],
  zona_lumbar: [0, 0.56, -0.5],
  codo: [0.58, 0.55, 0.06],
  antebrazo: [0.66, 0.49, 0.1],
  muneca: [0.74, 0.43, 0.1],
  mano: [0.8, 0.4, 0.12],
  cadera: [0.3, 0.52, 0.25],
  gluteo: [0.2, 0.5, -0.5],
  muslo: [0.2, 0.38, 0.4],
  muslo_interno: [0.08, 0.36, 0.35],
  rodilla: [0.2, 0.26, 0.45],
  pantorrilla: [0.2, 0.18, -0.4],
  espinilla: [0.2, 0.17, 0.45],
  tobillo: [0.18, 0.06, 0.35],
  pie: [0.18, 0.02, 0.55],
};

/**
 * Enfoque tipo "plato giratorio": la cámara se queda recta de frente y es el
 * MODELO el que gira. Por eso el foco de una zona se expresa como:
 *   rotY   = cuánto girar el modelo para que esa zona quede de frente (+z)
 *   altura = a qué altura (y) mirar
 *   radio  = qué tan afuera del eje vertical está la zona (para encuadrarla)
 */
/** Zonas que existen de los dos lados → el usuario elige izquierda/derecha. */
export const ZONAS_BILATERALES = new Set([
  "hombro",
  "brazo",
  "triceps",
  "codo",
  "antebrazo",
  "muneca",
  "mano",
  "axila",
  "clavicula",
  "costillas",
  "cadera",
  "gluteo",
  "muslo",
  "muslo_interno",
  "rodilla",
  "pantorrilla",
  "espinilla",
  "tobillo",
  "pie",
]);

export function esBilateral(zona: string): boolean {
  return ZONAS_BILATERALES.has(zona);
}

export interface Foco {
  rotY: number;
  altura: number;
  radio: number;
}

export function focoDeZona(
  zona: string,
  bbox: THREE.Box3,
  escala: number,
  lado: 1 | -1 = 1,
): Foco | null {
  const norm = POSICION_ZONA[zona];
  if (!norm) return null;
  const [nx, ny, nz] = norm;
  const anchoW = (bbox.max.x - bbox.min.x) * escala;
  const altoW = (bbox.max.y - bbox.min.y) * escala;
  const profW = (bbox.max.z - bbox.min.z) * escala;

  const px = nx * lado * (anchoW / 2);
  const pz = nz * (profW / 2);

  return {
    rotY: -Math.atan2(px, pz),
    altura: ny * altoW,
    radio: Math.hypot(px, pz),
  };
}

/**
 * Heurística de zona a partir del punto de click en espacio local del cuerpo
 * (mismo sistema de coordenadas que la malla ya aplanada con sus morphs,
 * antes de escalar — ver useHumanoidModel.ts). Asume que la pose activa
 * mantiene los brazos razonablemente separados del torso en X (como la pose
 * "Relajada" de hoy, heredera del T-pose de MakeHuman) — sirve como corte
 * simple sin necesitar huesos. Sliders de forma muy extremos (ej. hombro muy
 * desarrollado) o futuras poses con los brazos pegados al cuerpo pueden
 * degradar este corte torso/brazo/pierna; aceptable porque las zonas ya son
 * gruesas por decisión previa, pero queda anotado para quien lo retome.
 */
export function clasificarZona(
  local: THREE.Vector3,
  bbox: THREE.Box3,
): ZonaCuerpo {
  const alturaTotal = bbox.max.y - bbox.min.y;
  const anchoMedio =
    Math.max(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z) / 2;
  const yNorm = alturaTotal > 0 ? (local.y - bbox.min.y) / alturaTotal : 0;
  const xNorm = anchoMedio > 0 ? Math.abs(local.x) / anchoMedio : 0;

  if (yNorm < 0.48) return "pierna";
  if (xNorm > 0.22) return "brazo";
  return "torso";
}
