import * as THREE from "three";

export type ZonaCuerpo = "torso" | "brazo" | "pierna";

export const NOMBRE_ZONA: Record<ZonaCuerpo, string> = {
  torso: "Torso",
  brazo: "Brazo",
  pierna: "Pierna",
};

/**
 * Heurística de zona a partir del punto de click en espacio local del cuerpo
 * (mismo sistema de coordenadas que el OBJ exportado, antes de escalar).
 * El export de MakeHuman viene en T-pose, así que los brazos quedan bien
 * separados del torso en X — sirve como corte simple sin necesitar huesos.
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
