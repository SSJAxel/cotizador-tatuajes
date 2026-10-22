import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { rutaModeloGLB, type Genero } from "./poses";

const ALTURA_DESEADA = 1.75;

export type HumanoidModel = {
  skinMesh: THREE.Mesh;
  eyeMesh: THREE.Mesh | null;
  bbox: THREE.Box3;
  escala: number;
  offset: [number, number, number];
  /** Nombres de morph target disponibles en el GLB (forma + pose). */
  morphNames: string[];
  /** Influencia actual (0..1) de cada morph, por nombre. */
  influencias: Record<string, number>;
  setMorph: (nombre: string, valor: number) => void;
  /** Se incrementa en cada rebake de geometría (carga + cada setMorph). */
  geometriaVersion: number;
};

type EstadoModelo = {
  skinMesh: THREE.Mesh;
  eyeMesh: THREE.Mesh | null;
  bbox: THREE.Box3;
  escala: number;
  offset: [number, number, number];
  morphNames: string[];
  influencias: Record<string, number>;
  geometriaVersion: number;
};

/** Todo lo que se necesita para recombinar geometría sin volver a tocar la red. */
type DatosBase = {
  skinMesh: THREE.Mesh;
  posicionBase: Float32Array;
  uvBase: Float32Array | null;
  /** Índice original del glTF (vértices compartidos entre triángulos). Sin
   *  esto, armar la geometría solo con `position` la trata como no-indexada
   *  (ternas consecutivas = triángulos), lo que arma triángulos al azar. */
  indexBase: Uint16Array | Uint32Array | null;
  deltasPorMorph: Record<string, Float32Array>;
  escala: number;
};

function recolectarMallas(raiz: THREE.Object3D): THREE.Mesh[] {
  const mallas: THREE.Mesh[] = [];
  raiz.traverse((hijo) => {
    if (hijo instanceof THREE.Mesh) mallas.push(hijo);
  });
  return mallas;
}

/**
 * Los nodos de un GLB pueden traer transform propio (herencia de la jerarquía
 * de Blender) — a diferencia del OBJ plano de antes, no podemos asumir que la
 * malla ya está en su "espacio local" final. Se hornea el transform del nodo
 * en la geometría y se resetea el Object3D a identidad, para que el resto del
 * cálculo (flatten de morphs, bbox, offset) trabaje en el mismo espacio de
 * siempre.
 */
function bakearTransformEnGeometria(mesh: THREE.Mesh) {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.applyMatrix4(mesh.matrixWorld);
  mesh.matrix.identity();
  mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
}

function aplicarMaterialManiqui(skinMesh: THREE.Mesh, eyeMesh: THREE.Mesh | null) {
  skinMesh.castShadow = true;
  skinMesh.receiveShadow = true;
  // Material "maniquí de yeso": mate, cálido-neutro, escultural. Reemplaza el
  // material del GLB — calza con la estética clara editorial y hace que el
  // tatuaje (decal) resalte sobre una superficie limpia.
  skinMesh.material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ece5d8"),
    roughness: 0.92,
    metalness: 0,
  });
  if (eyeMesh) {
    eyeMesh.castShadow = true;
    eyeMesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#cdc5b4"),
      roughness: 0.9,
      metalness: 0,
    });
  }
}

/**
 * Combina la posición base con los morphs activos ("flatten"). Importa el
 * orden: el raycaster de three.js y el <Decal> de drei leen
 * `geometry.attributes.position` en CPU, no `morphTargetInfluences` (que
 * solo vive en GPU/shader) — si no se aplanara antes de raycastear, el
 * tatuaje se ubicaría sobre la silueta SIN los morphs puestos.
 *
 * La suavidad de la malla (antes: subdivisión de Loop acá mismo, en cada
 * llamada) ahora viene HORNEADA en el GLB de build (ver build_masculino.py):
 * subdividir en vivo en cada movimiento de slider costaba ~13s de página
 * congelada en un arrastre — correr `LoopSubdivision.modify()` en cada frame
 * es inherentemente caro sin importar en qué nivel de detalle empiece la
 * malla base. Subdividir una sola vez en Blender (con los shape keys ya
 * horneados, así Blender interpola el delta de cada morph en los vértices
 * nuevos) da la misma suavidad sin ese costo recurrente.
 */
function recomputarGeometria(
  datos: DatosBase,
  influencias: Record<string, number>,
): { bbox: THREE.Box3; offset: [number, number, number] } {
  const posicion = datos.posicionBase.slice();
  for (const nombre in influencias) {
    const valor = influencias[nombre];
    if (!valor) continue;
    const delta = datos.deltasPorMorph[nombre];
    if (!delta) continue;
    for (let i = 0; i < posicion.length; i++) {
      posicion[i] += delta[i] * valor;
    }
  }

  const geometriaPlana = new THREE.BufferGeometry();
  geometriaPlana.setAttribute("position", new THREE.BufferAttribute(posicion, 3));
  if (datos.uvBase) {
    geometriaPlana.setAttribute("uv", new THREE.BufferAttribute(datos.uvBase, 2));
  }
  if (datos.indexBase) {
    geometriaPlana.setIndex(new THREE.BufferAttribute(datos.indexBase, 1));
  }
  geometriaPlana.computeVertexNormals();

  datos.skinMesh.geometry.dispose();
  datos.skinMesh.geometry = geometriaPlana;

  // bbox en espacio LOCAL de la geometría (computeBoundingBox), no
  // setFromObject(): ese lee matrixWorld, que incluye la rotación del grupo
  // que gira el modelo (grupoRef en Scena). Con el modelo rotado, ese bbox
  // mundial queda distorsionado y cambia con cada frame de giro — no solo
  // con el morph — lo que volvía el offset inestable (el modelo "volaba"/
  // se achicaba de golpe al mover un slider mientras el modelo no estaba
  // mirando de frente).
  geometriaPlana.computeBoundingBox();
  const bbox = geometriaPlana.boundingBox!;
  const centroX = (bbox.min.x + bbox.max.x) / 2;
  const centroZ = (bbox.min.z + bbox.max.z) / 2;
  const offset: [number, number, number] = [
    -centroX * datos.escala,
    -bbox.min.y * datos.escala,
    -centroZ * datos.escala,
  ];
  return { bbox, offset };
}

/**
 * Carga el GLB de `genero` (ver poses.ts) y expone sliders de forma/pose vía
 * `setMorph`. A diferencia de antes, el modelo ya no se recarga por pose —
 * una sola carga de red por género, y los cambios de slider son puramente
 * locales (CPU, sin volver a pedir nada al servidor).
 */
export function useHumanoidModel(genero: Genero) {
  const datosRef = useRef<DatosBase | null>(null);
  const [estado, setEstado] = useState<EstadoModelo | null>(null);
  // Un <input type="range"> dispara "input" en cada pixel de arrastre — sin
  // esto, cada evento disparaba recomputarGeometria (flatten + Loop
  // subdivision) de forma sincrónica, y la cola de eventos se acumulaba más
  // rápido de lo que el navegador podía procesarla (medido: ~13s de página
  // congelada en un arrastre de medio segundo). Se agrupan los pedidos por
  // frame: el valor más reciente gana, y el recálculo pesado corre como
  // máximo una vez por frame en vez de una vez por evento.
  const influenciasPendientesRef = useRef<Record<string, number>>({});
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    datosRef.current = null;
    influenciasPendientesRef.current = {};
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setEstado(null);

    const loader = new GLTFLoader();
    loader.load(
      rutaModeloGLB(genero),
      (gltf) => {
        if (cancelado) return;

        const mallas = recolectarMallas(gltf.scene);
        const skinMesh = mallas.find(
          (m) => (m.material as THREE.Material).name === "DefaultSkin",
        );
        if (!skinMesh) return;
        const eyeMesh =
          mallas.find((m) => (m.material as THREE.Material).name !== "DefaultSkin") ??
          null;

        bakearTransformEnGeometria(skinMesh);
        if (eyeMesh) bakearTransformEnGeometria(eyeMesh);

        const geometriaOriginal = skinMesh.geometry;
        const posAttr = geometriaOriginal.attributes.position as THREE.BufferAttribute;
        const posicionBase = (posAttr.array as Float32Array).slice();
        const uvAttr = geometriaOriginal.attributes.uv as THREE.BufferAttribute | undefined;
        const uvBase = uvAttr ? (uvAttr.array as Float32Array).slice() : null;
        const indexAttr = geometriaOriginal.index;
        const indexBase = indexAttr
          ? (indexAttr.array.slice() as Uint16Array | Uint32Array)
          : null;

        // El diccionario nombre→índice lo pone GLTFLoader en el Mesh (desde
        // extras.targetNames del glTF), no en la BufferGeometry.
        const dict = skinMesh.morphTargetDictionary ?? {};
        const morphAttrs = geometriaOriginal.morphAttributes.position ?? [];
        const morphNames = Object.keys(dict);
        const deltasPorMorph: Record<string, Float32Array> = {};
        for (const nombre of morphNames) {
          const attr = morphAttrs[dict[nombre]] as THREE.BufferAttribute | undefined;
          if (attr) deltasPorMorph[nombre] = attr.array as Float32Array;
        }

        // Altura/escala de normalización: una sola vez, en el estado neutral
        // (todos los morphs en 0) — se congela y no se recalcula después, así
        // tocar un slider localizado no reescala el modelo entero.
        const bboxNeutral = new THREE.Box3().setFromBufferAttribute(posAttr);
        const alturaNeutral = bboxNeutral.max.y - bboxNeutral.min.y;
        const escala = alturaNeutral > 0 ? ALTURA_DESEADA / alturaNeutral : 1;

        aplicarMaterialManiqui(skinMesh, eyeMesh);

        const datos: DatosBase = { skinMesh, posicionBase, uvBase, indexBase, deltasPorMorph, escala };
        datosRef.current = datos;

        const { bbox, offset } = recomputarGeometria(datos, {});
        setEstado({
          skinMesh,
          eyeMesh,
          bbox,
          escala,
          offset,
          morphNames,
          influencias: {},
          geometriaVersion: 0,
        });
      },
      undefined,
      (err) => console.warn(`No se pudo cargar el modelo 3D de "${genero}":`, err),
    );

    return () => {
      cancelado = true;
    };
  }, [genero]);

  const setMorph = useCallback((nombre: string, valor: number) => {
    influenciasPendientesRef.current = { ...influenciasPendientesRef.current, [nombre]: valor };
    if (rafIdRef.current !== null) return; // ya hay un recálculo agendado para este frame
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const datos = datosRef.current;
      if (!datos) return;
      const influencias = influenciasPendientesRef.current;
      const { bbox, offset } = recomputarGeometria(datos, influencias);
      setEstado((prev) =>
        prev && { ...prev, bbox, offset, influencias, geometriaVersion: prev.geometriaVersion + 1 },
      );
    });
  }, []);

  return useMemo<HumanoidModel | null>(() => {
    if (!estado) return null;
    return { ...estado, setMorph };
  }, [estado, setMorph]);
}
