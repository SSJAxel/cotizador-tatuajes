export type BodyPartName =
  | "torso"
  | "brazoIzquierdo"
  | "brazoDerecho"
  | "piernaIzquierda"
  | "piernaDerecha";

export type ZonaCuerpo = "torso" | "brazo" | "pierna";

export const ZONA_POR_PARTE: Record<BodyPartName, ZonaCuerpo> = {
  torso: "torso",
  brazoIzquierdo: "brazo",
  brazoDerecho: "brazo",
  piernaIzquierda: "pierna",
  piernaDerecha: "pierna",
};

export const NOMBRE_ZONA: Record<ZonaCuerpo, string> = {
  torso: "Torso",
  brazo: "Brazo",
  pierna: "Pierna",
};
