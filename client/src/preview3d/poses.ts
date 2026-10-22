/**
 * Catálogo de modelos 3D: un único GLB por género (en vez de un OBJ distinto
 * por pose). El GLB trae morph targets (shape keys) exportados desde
 * MakeHuman vía Blender/MPFB2 — tanto para FORMA (peso, busto, glúteos,
 * hombro) como para POSE (cada pose se hornea como shape key de cuerpo
 * completo, sin exportar huesos). Así forma y pose usan el mismo mecanismo
 * en el código (`morphTargetInfluences`), y el tatuaje (decal) se recoloca
 * después de fijar ambas — nunca sigue a un esqueleto en runtime.
 *
 * Para agregar un atributo de forma nuevo: exportar el shape key con ese
 * nombre (snake_case) en el GLB y agregar la entrada en SLIDERS. Para
 * agregar una pose nueva: exportar `pose_<id>` como shape key de cuerpo
 * completo y agregarla con grupo:"pose" — "Relajada" es el estado con todos
 * los morphs de pose en 0, no necesita shape key propio.
 *
 * Los morphs de forma son combinables entre sí (deltas localizados). Las
 * poses son mutuamente excluyentes (blendear dos poses de cuerpo completo
 * tiene alto riesgo de auto-intersección en una malla sin rig) — el código
 * en Preview3D.tsx fuerza esto con un selector, no con sliders libres.
 */

export type Genero = "masculino" | "femenino";

export const GENEROS: { id: Genero; label: string; disponible: boolean }[] = [
  { id: "masculino", label: "Masculino", disponible: true },
  { id: "femenino", label: "Femenino", disponible: true },
];

/** Único archivo GLB por género (ya no uno por pose). */
export function rutaModeloGLB(genero: Genero): string {
  return `/models/${genero}/cuerpo.glb`;
}

export type GrupoSlider = "forma" | "pose";

/**
 * Un slider de la UI. Unidireccional: controla un solo morph (`nombre`),
 * rango 0..100 → influencia 0..1. Bidireccional: controla un PAR de morphs
 * (`nombrePositivo`/`nombreNegativo`), rango -100..100 — evita depender de
 * que MakeHuman/Blender soporten bien una influencia "negativa" de un único
 * shape key.
 */
export type SliderMorph =
  | { tipo: "unico"; nombre: string; label: string; grupo: GrupoSlider }
  | { tipo: "par"; nombrePositivo: string; nombreNegativo: string; label: string; grupo: GrupoSlider };

// Alcance v1 (2026-10-14, recortado otra vez): Altura, Glúteos y Pecho se
// sacaron del masculino — la combinación de varios sliders seguía
// deformando demasiado la figura. Masculino: Hombros + Panza (cintura, no
// el peso de todo el cuerpo). Femenino: Busto + Glúteos + Hombros.
export const SLIDERS: Record<Genero, SliderMorph[]> = {
  masculino: [
    { tipo: "par", nombrePositivo: "hombro_musculo", nombreNegativo: "hombro_caido", label: "Hombros", grupo: "forma" },
    { tipo: "unico", nombre: "panza", label: "Panza", grupo: "forma" },
    // Sin poses exportadas todavía — "Relajada" (todos los morphs de pose en
    // 0) es el único estado disponible hasta que se agregue pose_<id> acá.
  ],
  femenino: [
    { tipo: "unico", nombre: "busto_tamano", label: "Busto", grupo: "forma" },
    { tipo: "unico", nombre: "gluteo_volumen", label: "Glúteos", grupo: "forma" },
    { tipo: "par", nombrePositivo: "hombro_musculo", nombreNegativo: "hombro_caido", label: "Hombros", grupo: "forma" },
  ],
};
