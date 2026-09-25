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
import { useHumanoidModel } from "./useHumanoidModel";
import type { HumanoidModel } from "./useHumanoidModel";
import { NOMBRE_ZONA, clasificarZona } from "./types";
import type { ZonaCuerpo } from "./types";
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
  modelo: HumanoidModel;
  onPlace: (zona: ZonaCuerpo, localPos: THREE.Vector3) => void;
  decalPos: [number, number, number];
  decalRoll: number;
  decalScale: number;
  textura: THREE.Texture | null;
  hayDecal: boolean;
};

function Scena({
  modelo,
  onPlace,
  decalPos,
  decalRoll,
  decalScale,
  textura,
  hayDecal,
}: ScenaProps) {
  const { gl, camera, raycaster } = useThree();
  const arrastrandoRef = useRef(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const raycastarEn = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(modelo.skinMesh, false);
      return hits[0] ?? null;
    },
    [camera, gl, raycaster, modelo],
  );

  const colocarDesdeHit = useCallback(
    (point: THREE.Vector3) => {
      const local = modelo.skinMesh.worldToLocal(point.clone());
      const zona = clasificarZona(local, modelo.bbox);
      onPlace(zona, local);
    },
    [modelo, onPlace],
  );

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!textura) return;
      event.stopPropagation();
      arrastrandoRef.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
      colocarDesdeHit(event.point);
    },
    [colocarDesdeHit, textura],
  );

  useEffect(() => {
    function alMover(event: PointerEvent) {
      if (!arrastrandoRef.current) return;
      const hit = raycastarEn(event.clientX, event.clientY);
      if (!hit) return;
      colocarDesdeHit(hit.point);
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
  }, [gl, raycastarEn, colocarDesdeHit]);

  return (
    <>
      <group scale={modelo.escala} position={modelo.offset}>
        <primitive object={modelo.skinMesh} onPointerDown={handlePointerDown}>
          {hayDecal && textura && (
            <Decal
              position={decalPos}
              rotation={decalRoll}
              scale={decalScale / modelo.escala}
              map={textura}
            />
          )}
        </primitive>
        {modelo.eyeMesh && <primitive object={modelo.eyeMesh} />}
      </group>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color="#171939" roughness={1} />
      </mesh>

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
  const modelo = useHumanoidModel();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activaZona, setActivaZona] = useState<ZonaCuerpo | null>(null);
  const [decalPos, setDecalPos] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [decalRollDeg, setDecalRollDeg] = useState(0);
  const [decalScale, setDecalScale] = useState(0.35);

  const textura = useTexturaSubida(imageUrl);

  const handlePlace = useCallback(
    (zona: ZonaCuerpo, localPos: THREE.Vector3) => {
      setActivaZona(zona);
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
        <h2>Vista previa en 3D</h2>
        <p className="preview3d__ayuda">
          Subí una foto o imagen de tu diseño y arrastralo sobre el torso, un
          brazo o una pierna para ver cómo quedaría. Es una vista aproximada
          — el resultado final depende del trabajo del tatuador.
        </p>

        <label className="preview3d__campo">
          Diseño
          <input type="file" accept="image/*" onChange={handleArchivo} />
        </label>

        {!modelo && <p className="preview3d__aviso">Cargando modelo 3D…</p>}
        {modelo && !textura && (
          <p className="preview3d__aviso">Subí una imagen para poder ubicarla.</p>
        )}

        {activaZona && textura && (
          <p className="preview3d__zona">
            Zona actual: <strong>{NOMBRE_ZONA[activaZona]}</strong>
          </p>
        )}

        <label className="preview3d__campo">
          Rotación
          <input
            type="range"
            min={0}
            max={360}
            value={decalRollDeg}
            disabled={!textura || !activaZona}
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
            disabled={!textura || !activaZona}
            onChange={(e) => setDecalScale(Number(e.target.value) / 100)}
          />
        </label>
      </aside>

      <div className="preview3d__canvas">
        <Canvas shadows camera={{ position: [0, 1.2, 2.6], fov: 40 }}>
          <color attach="background" args={["#0f172a"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow />
          {modelo && (
            <Scena
              modelo={modelo}
              onPlace={handlePlace}
              decalPos={decalPos}
              decalRoll={(decalRollDeg * Math.PI) / 180}
              decalScale={decalScale}
              textura={textura}
              hayDecal={activaZona !== null}
            />
          )}
        </Canvas>
      </div>
    </div>
  );
}
