import { useEffect, useState } from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

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
