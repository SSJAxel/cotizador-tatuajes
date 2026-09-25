import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Decal, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { HumanoidBody } from "./HumanoidBody";
import { NOMBRE_ZONA, ZONA_POR_PARTE } from "./types";
import type { BodyPartName } from "./types";
import "./preview3d.css";

function useTexturaSubida(url: string | null) {
  const [textura, setTextura] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTextura(null);
      return;
    }
    let cancelado = false;
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      if (cancelado) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTextura(tex);
    });
    return () => {
      cancelado = true;
    };
  }, [url]);

  return textura;
}

type ScenaProps = {
  activePart: BodyPartName | null;
  onPlace: (part: BodyPartName, localPos: THREE.Vector3) => void;
  decalPos: [number, number, number];
  decalRoll: number;
  decalScale: number;
  textura: THREE.Texture | null;
};

function Scena({
  activePart,
  onPlace,
  decalPos,
  decalRoll,
  decalScale,
  textura,
}: ScenaProps) {
  const { gl, camera, raycaster } = useThree();
  const meshMapRef = useRef<Partial<Record<BodyPartName, THREE.Mesh>>>({});
  const arrastrandoRef = useRef(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const getMeshRef = useCallback(
    (part: BodyPartName) => (mesh: THREE.Mesh | null) => {
      if (mesh) meshMapRef.current[part] = mesh;
    },
    [],
  );

  const raycastarEn = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const meshes = Object.values(meshMapRef.current).filter(
        (m): m is THREE.Mesh => Boolean(m),
      );
      const hits = raycaster.intersectObjects(meshes, false);
      return hits[0] ?? null;
    },
    [camera, gl, raycaster],
  );

  const handlePointerDown = useCallback(
    (part: BodyPartName) => (event: ThreeEvent<PointerEvent>) => {
      if (!textura) return;
      event.stopPropagation();
      arrastrandoRef.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
      const mesh = meshMapRef.current[part];
      if (!mesh) return;
      const local = mesh.worldToLocal(event.point.clone());
      onPlace(part, local);
    },
    [onPlace, textura],
  );

  useEffect(() => {
    function alMover(event: PointerEvent) {
      if (!arrastrandoRef.current) return;
      const hit = raycastarEn(event.clientX, event.clientY);
      if (!hit) return;
      const entrada = (
        Object.entries(meshMapRef.current) as [BodyPartName, THREE.Mesh][]
      ).find(([, mesh]) => mesh === hit.object);
      if (!entrada) return;
      const [part] = entrada;
      const local = hit.object.worldToLocal(hit.point.clone());
      onPlace(part, local);
    }
    function alSoltar() {
      arrastrandoRef.current = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
    }
    const canvas = gl.domElement;
    canvas.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    return () => {
      canvas.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
    };
  }, [gl, onPlace, raycastarEn]);

  const renderDecal = (part: BodyPartName) => {
    if (part !== activePart || !textura) return null;
    return (
      <Decal
        position={decalPos}
        rotation={decalRoll}
        scale={decalScale}
        map={textura}
      />
    );
  };

  return (
    <>
      <HumanoidBody
        getMeshRef={getMeshRef}
        onPartPointerDown={handlePointerDown}
        renderDecal={renderDecal}
      />
      <OrbitControls
        ref={controlsRef}
        target={[0, 1.1, 0]}
        minDistance={1.3}
        maxDistance={4}
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  );
}

export function Preview3D() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activePart, setActivePart] = useState<BodyPartName | null>(null);
  const [decalPos, setDecalPos] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [decalRollDeg, setDecalRollDeg] = useState(0);
  const [decalScale, setDecalScale] = useState(0.35);

  const textura = useTexturaSubida(imageUrl);

  const handlePlace = useCallback(
    (part: BodyPartName, localPos: THREE.Vector3) => {
      setActivePart(part);
      setDecalPos([localPos.x, localPos.y, localPos.z]);
    },
    [],
  );

  function handleArchivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return url;
    });
  }

  return (
    <div className="preview3d">
      <aside className="preview3d__panel">
        <h2>Vista 3D (mock)</h2>
        <p className="preview3d__ayuda">
          Cuerpo fijo, sin ajuste de peso/altura todavía — es la validación
          barata antes de invertir en esa capa. Subí un diseño y arrastralo
          sobre el torso, un brazo o una pierna.
        </p>

        <label className="preview3d__campo">
          Diseño
          <input type="file" accept="image/*" onChange={handleArchivo} />
        </label>

        {!textura && (
          <p className="preview3d__aviso">Subí una imagen para poder ubicarla.</p>
        )}

        {activePart && textura && (
          <p className="preview3d__zona">
            Zona actual: <strong>{NOMBRE_ZONA[ZONA_POR_PARTE[activePart]]}</strong>
          </p>
        )}

        <label className="preview3d__campo">
          Rotación
          <input
            type="range"
            min={0}
            max={360}
            value={decalRollDeg}
            disabled={!textura || !activePart}
            onChange={(e) => setDecalRollDeg(Number(e.target.value))}
          />
        </label>

        <label className="preview3d__campo">
          Tamaño
          <input
            type="range"
            min={10}
            max={60}
            value={decalScale * 100}
            disabled={!textura || !activePart}
            onChange={(e) => setDecalScale(Number(e.target.value) / 100)}
          />
        </label>
      </aside>

      <div className="preview3d__canvas">
        <Canvas shadows camera={{ position: [0, 1.2, 2.6], fov: 40 }}>
          <color attach="background" args={["#0f172a"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow />
          <Scena
            activePart={activePart}
            onPlace={handlePlace}
            decalPos={decalPos}
            decalRoll={(decalRollDeg * Math.PI) / 180}
            decalScale={decalScale}
            textura={textura}
          />
        </Canvas>
      </div>
    </div>
  );
}
