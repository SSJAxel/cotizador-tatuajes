import { ETIQUETAS } from "./fixtures";

/**
 * Datos del quiz de calibración por estilo (lado del tatuador).
 *
 * El tatuador elige qué estilos hace y su nivel con cada uno, y para cada
 * estilo responde cuánto tiempo le lleva un diseño de referencia en distintas
 * zonas del cuerpo — tiempo de tatuaje PURO, sin contar preparación del
 * estudio ni colocación del stencil (eso es el "fijo de preparación" aparte).
 */

/** Tamaño del diseño de referencia que el tatuador imagina al responder. */
export const REFERENCIA_CM = 10;

/**
 * ESTILOS = el look o género que el cliente quiere y reconoce. Cada estilo se
 * ejecuta combinando una o más TÉCNICAS (ver abajo). Lista grounded en la real
 * de LusiTattoo (2026-10-07). El color NO es un estilo — es una dimensión
 * aparte (cantidad de colores, pregunta al cliente).
 */
export const ESTILOS = [
  "lettering",
  "neotribal",
  "cybersigilism",
  "tradicional",
  "neotradicional",
  "blackwork",
  "new_school",
  "chicano",
  "blackout",
  "bodysuit",
  "trash_polka",
  "maori",
  "geometrico",
  "ornamental",
  "realismo",
  "microrealismo",
  "dotwork",
] as const;

/**
 * TÉCNICAS = el *método de ejecución*, donde vive el TIEMPO real del trabajo.
 * Un estilo combina varias (ej. lettering = línea fina + puntillismo de
 * arrastre). Lista + agujas reales de LusiTattoo (2026-10-07). El color es su
 * propia técnica (no se mezcla "X a color" en las otras). Handpoke es tatuar a
 * mano (LusiTattoo solo lo usa para pecas).
 */
export interface Tecnica {
  slug: string;
  label: string;
  agujas: string;
}

export const TECNICAS: Tecnica[] = [
  { slug: "linea_hiperfina", label: "Línea hiperfina", agujas: "1201RL / 1203RL" },
  { slug: "linea_fina", label: "Línea fina", agujas: "1205RL / 1207RL" },
  { slug: "linea_gruesa", label: "Línea gruesa", agujas: "1209RL–1213RL / 1205RS–1214RS" },
  { slug: "relleno_chico", label: "Relleno chico", agujas: "1205RS–1214RS / 1207MG" },
  { slug: "relleno_mediano", label: "Relleno mediano", agujas: "1207MG–1215MG" },
  { slug: "relleno_grande", label: "Relleno grande", agujas: "1215MG–1221MG" },
  { slug: "sombra_chica", label: "Sombra chica", agujas: "1205RL / 1205RS" },
  { slug: "sombra_mediana", label: "Sombra mediana", agujas: "1209RS / 1215RM" },
  { slug: "sombra_grande", label: "Sombra grande", agujas: "1215RM–1221RM" },
  { slug: "puntillismo_arrastre", label: "Puntillismo de arrastre", agujas: "1203RL / 1205RL" },
  { slug: "color", label: "Color", agujas: "según línea / relleno / sombra" },
  { slug: "handpoke", label: "Handpoke (a mano)", agujas: "1205RL (pecas)" },
];

export type NivelEstilo = "sabe" | "practicando" | "se_anima";

export const NIVELES: { value: NivelEstilo; label: string; desc: string }[] = [
  { value: "sabe", label: "Lo sé hacer", desc: "Lo dominás, es parte de tu repertorio." },
  { value: "practicando", label: "Lo estoy practicando", desc: "Todavía te cuesta, estás mejorando." },
  { value: "se_anima", label: "Me animo a hacerlo", desc: "Lo intentás, sin dominarlo todavía." },
];

/**
 * Nivel de dolor por zona (1 = casi nada, 10 = extremo). Promedio de dos pain
 * charts de la industria (tattooing101 + hyperinkers, 2026). Se usa para
 * ordenar el quiz y, a futuro, para interpolar las zonas no preguntadas y
 * avisarle al cliente cuando una zona es muy dolorosa.
 */
export const DOLOR_POR_ZONA: Record<string, number> = {
  espalda_alta: 3,
  espalda_media: 3,
  antebrazo: 3,
  brazo: 3,
  triceps: 3,
  hombro: 3,
  muslo: 4,
  zona_lumbar: 4,
  pantorrilla: 5,
  abdomen: 6,
  muneca: 6,
  gluteo: 7,
  cuello: 7,
  nuca: 7,
  cadera: 7,
  columna: 7,
  clavicula: 7,
  mano: 7,
  pie: 7,
  pecho: 8,
  esternon: 8,
  muslo_interno: 8,
  espinilla: 8,
  tobillo: 8,
  codo: 8,
  rodilla: 8,
  costillas: 9,
  axila: 10,
};

/**
 * Las 10 zonas que se preguntan en el quiz, elegidas para cubrir todo el
 * espectro de dolor (3 → 9) sin fatigar con las 28. El resto de las zonas se
 * interpola después por nivel de dolor respecto a estas anclas.
 */
export const QUIZ_ZONAS = [
  "antebrazo",
  "espalda_media",
  "muslo",
  "pantorrilla",
  "abdomen",
  "mano",
  "cuello",
  "pecho",
  "codo",
  "costillas",
] as const;

export function etiqueta(slug: string): string {
  return ETIQUETAS[slug] ?? slug;
}

/**
 * Ruta de la foto de referencia de un estilo. Son assets estáticos nuestros
 * (librería curada, iguales para todos los tenants), servidos desde
 * client/public/estilos/<slug>.jpg. Si el archivo no existe todavía, el quiz
 * cae a un placeholder (ver FotoReferencia en QuizCalibracion).
 */
export function fotoEstilo(slug: string): string {
  return `/estilos/${slug}.jpg`;
}

export interface TiempoZona {
  zona: string;
  minutos: number;
}

export interface CalibracionEstilo {
  estilo: string;
  nivel: NivelEstilo;
  /** Técnicas (método de ejecución) que combina este estilo. */
  tecnicas: string[];
  tiempos: TiempoZona[];
}
