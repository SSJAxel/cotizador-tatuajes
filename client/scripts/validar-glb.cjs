#!/usr/bin/env node
/**
 * Valida que un GLB exportado desde Blender/MPFB2 cumpla el contrato que
 * espera client/src/preview3d/useHumanoidModel.ts, SIN levantar three.js ni
 * un navegador — parsea el contenedor binario GLB a mano (header de 12 bytes
 * + chunks JSON/BIN, formato documentado de la spec de glTF 2.0).
 *
 * Uso:
 *   node scripts/validar-glb.cjs ruta/al/cuerpo.glb [nombre_morph_esperado ...]
 *
 * Sin nombres esperados, solo valida material/skin/presencia de targets.
 * Con nombres (ej. peso gluteo_volumen hombro_musculo hombro_caido),
 * además avisa cuáles de esos faltan en el archivo.
 */
const fs = require("fs");

const [, , rutaArchivo, ...nombresEsperados] = process.argv;

if (!rutaArchivo) {
  console.error("Uso: node scripts/validar-glb.cjs ruta/al/cuerpo.glb [nombre_morph ...]");
  process.exit(1);
}

const buf = fs.readFileSync(rutaArchivo);

const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) {
  console.error("✗ No es un GLB válido (falta la firma 'glTF' en el header).");
  process.exit(1);
}
const version = buf.readUInt32LE(4);
const longitudTotal = buf.readUInt32LE(8);
if (longitudTotal !== buf.length) {
  console.warn(`! Longitud declarada (${longitudTotal}) no coincide con el tamaño real del archivo (${buf.length}) — puede estar truncado.`);
}

let offset = 12;
let json = null;
while (offset < buf.length) {
  const chunkLength = buf.readUInt32LE(offset);
  const chunkType = buf.readUInt32LE(offset + 4);
  const chunkData = buf.subarray(offset + 8, offset + 8 + chunkLength);
  if (chunkType === 0x4e4f534a) {
    // "JSON"
    json = JSON.parse(chunkData.toString("utf8"));
  }
  offset += 8 + chunkLength;
}

if (!json) {
  console.error("✗ No se encontró el chunk JSON dentro del GLB.");
  process.exit(1);
}

console.log(`GLB versión glTF: ${version}, ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
console.log("");

let huboError = false;
function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.log(`✗ ${msg}`);
  huboError = true;
}
function warn(msg) {
  console.log(`! ${msg}`);
}

// 1. Sin skin/armature.
if (!json.skins || json.skins.length === 0) {
  ok("Sin skins/armature en el archivo (correcto — este pipeline no usa esqueleto).");
} else {
  fail(`Hay ${json.skins.length} skin(s) exportado(s) — se esperaba que la pose quedara horneada como shape key, sin armature. Revisar que el modifier de Armature esté aplicado antes de exportar.`);
}

// 2. Material DefaultSkin.
const materiales = json.materials ?? [];
const tieneDefaultSkin = materiales.some((m) => m.name === "DefaultSkin");
if (tieneDefaultSkin) {
  ok('Existe un material llamado "DefaultSkin".');
} else {
  fail(`No se encontró un material "DefaultSkin". Materiales presentes: ${materiales.map((m) => m.name).join(", ") || "(ninguno)"}.`);
}

// 3. Morph targets presentes + nombres.
const mallas = json.meshes ?? [];
let totalTargets = 0;
let nombresEncontrados = new Set();
for (const malla of mallas) {
  for (const primitiva of malla.primitives ?? []) {
    if (primitiva.targets && primitiva.targets.length > 0) {
      totalTargets += primitiva.targets.length;
    }
  }
  const targetNames = malla.extras?.targetNames;
  if (Array.isArray(targetNames)) {
    for (const n of targetNames) nombresEncontrados.add(n);
  }
}

if (totalTargets === 0) {
  fail("No se encontraron morph targets (primitives[].targets) en ninguna malla.");
} else {
  ok(`Se encontraron ${totalTargets} morph target(s) en total.`);
}

if (nombresEncontrados.size === 0) {
  fail('Ninguna malla trae "extras.targetNames" — el diccionario nombre→índice vendría vacío en three.js (GLTFLoader no podría mapear nombres a morphs). Revisar que el exportador de Blender tenga tildado "Shape Keys" en Data > Mesh, y confirmar la versión del exportador.');
} else {
  ok(`Nombres de morph encontrados (${nombresEncontrados.size}): ${[...nombresEncontrados].join(", ")}`);
}

// 4. Comparar contra la convención del proyecto, si se pasaron nombres.
if (nombresEsperados.length > 0) {
  const faltantes = nombresEsperados.filter((n) => !nombresEncontrados.has(n));
  if (faltantes.length === 0) {
    ok("Todos los morphs esperados están presentes.");
  } else {
    warn(`Faltan estos morphs esperados: ${faltantes.join(", ")}`);
  }
}

console.log("");
console.log(huboError ? "Resultado: HAY PROBLEMAS A RESOLVER ANTES DE USAR ESTE GLB." : "Resultado: el archivo cumple el contrato básico.");
process.exit(huboError ? 1 : 0);
