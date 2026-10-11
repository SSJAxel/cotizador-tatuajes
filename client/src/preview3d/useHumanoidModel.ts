import { useEffect, useState } from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { LoopSubdivision } from "three-subdivide";

const ALTURA_DESEADA = 1.75;

export type HumanoidModel = {
  skinMesh: THREE.Mesh;
  eyeMesh: THREE.Mesh | null;
  bbox: THREE.Box3;
  escala: number;
  offset: [number, number, number];
};

function esMeshConMaterial(child: THREE.Object3D): child is THREE.Mesh {
  return (
    child instanceof THREE.Mesh &&
    child.material instanceof THREE.Material
  );
}

export function useHumanoidModel() {
  const [modelo, setModelo] = useState<HumanoidModel | null>(null);

  useEffect(() => {
    let cancelado = false;

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath("/models/");
    mtlLoader.load("human-body.mtl", (materiales) => {
      if (cancelado) return;
      materiales.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materiales);
      objLoader.setPath("/models/");
      objLoader.load("human-body.obj", (grupo) => {
        if (cancelado) return;

        const mallas = grupo.children.filter(esMeshConMaterial);
        const skinMesh = mallas.find(
          (mesh) => (mesh.material as THREE.Material).name === "DefaultSkin",
        );
        if (!skinMesh) return;
        const eyeMesh =
          mallas.find(
            (mesh) => (mesh.material as THREE.Material).name !== "DefaultSkin",
          ) ?? null;

        const bbox = new THREE.Box3().setFromObject(skinMesh);
        const altura = bbox.max.y - bbox.min.y;
        const escala = altura > 0 ? ALTURA_DESEADA / altura : 1;
        const centroX = (bbox.min.x + bbox.max.x) / 2;
        const centroZ = (bbox.min.z + bbox.max.z) / 2;

        skinMesh.castShadow = true;
        skinMesh.receiveShadow = true;
        // Subdivisión de Loop: cuadruplica los triángulos y suaviza la silueta
        // low-poly del base mesh de MakeHuman — bastante menos facetado. Se
        // preservan las UVs (uvSmooth:false) para que el decal no se distorsione.
        const geomSuave = LoopSubdivision.modify(skinMesh.geometry, 1, {
          uvSmooth: false,
          preserveEdges: false,
          flatOnly: false,
        });
        skinMesh.geometry.dispose();
        skinMesh.geometry = geomSuave;
        skinMesh.geometry.computeVertexNormals();

        // Material "maniquí de yeso": mate, cálido-neutro, escultural. Reemplaza
        // el DefaultSkin plano del MTL — calza con la estética clara editorial y
        // hace que el tatuaje (decal) resalte sobre una superficie limpia.
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

        setModelo({
          skinMesh,
          eyeMesh,
          bbox,
          escala,
          offset: [-centroX * escala, -bbox.min.y * escala, -centroZ * escala],
        });
      });
    });

    return () => {
      cancelado = true;
    };
  }, []);

  return modelo;
}
