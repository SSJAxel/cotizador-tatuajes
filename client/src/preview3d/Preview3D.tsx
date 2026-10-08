import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Decal, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useHumanoidModel } from "./useHumanoidModel";
import type { HumanoidModel } from "./useHumanoidModel";
import { NOMBRE_ZONA, clasificarZona } from "./types";
import type { ZonaCuerpo } from "./types";
import {
  borrarDiseno,
  cargarDiseno,
  comprimirImagenADataUrl,
  guardarDiseno,
} from "./persistencia";
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

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.4}
        scale={4.5}
        blur={2.6}
        far={2.2}
        resolution={1024}
        color="#2e2a1f"
      />

      <OrbitControls
        ref={controlsRef}
        target={[0, 1.0, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={1.3}
        maxDistance={4}
        maxPolarAngle={Math.PI * 0.9}
      />
    </>
  );
}

type Preview3DProps = {
  tenantSlug?: string;
};

export function Preview3D({ tenantSlug = "default" }: Preview3DProps) {
  const modelo = useHumanoidModel();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activaZona, setActivaZona] = useState<ZonaCuerpo | null>(null);
  const [decalPos, setDecalPos] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [decalRollDeg, setDecalRollDeg] = useState(0);
  const [decalScale, setDecalScale] = useState(0.35);
  const [cargadoDeGuardado, setCargadoDeGuardado] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  const textura = useTexturaSubida(imageUrl);

  // Restaurar diseño guardado en este navegador, una sola vez al montar.
  useEffect(() => {
    const guardado = cargarDiseno(tenantSlug);
    if (guardado) {
      setImageUrl(guardado.imagenDataUrl);
      setActivaZona(guardado.zona);
      setDecalPos(guardado.localPos);
      setDecalRollDeg(guardado.rotacionDeg);
      setDecalScale(guardado.escala);
    }
    setCargadoDeGuardado(true);
  }, [tenantSlug]);

  // Guardar cambios posteriores (no en la primera carga, para no
  // reescribir con los mismos datos que acabamos de leer).
  useEffect(() => {
    if (!cargadoDeGuardado) return;
    if (!imageUrl || !activaZona) return;
    guardarDiseno(tenantSlug, {
      imagenDataUrl: imageUrl,
      zona: activaZona,
      localPos: decalPos,
      rotacionDeg: decalRollDeg,
      escala: decalScale,
    });
  }, [
    cargadoDeGuardado,
    tenantSlug,
    imageUrl,
    activaZona,
    decalPos,
    decalRollDeg,
    decalScale,
  ]);

  const handlePlace = useCallback(
    (zona: ZonaCuerpo, localPos: THREE.Vector3) => {
      setActivaZona(zona);
      setDecalPos([localPos.x, localPos.y, localPos.z]);
    },
    [],
  );

  async function handleArchivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await comprimirImagenADataUrl(file);
    setImageUrl(dataUrl);
  }

  function handleQuitarDiseno(inputArchivo: HTMLInputElement | null) {
    setImageUrl(null);
    setActivaZona(null);
    borrarDiseno(tenantSlug);
    if (inputArchivo) inputArchivo.value = "";
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
          <input
            ref={inputArchivoRef}
            type="file"
            accept="image/*"
            onChange={handleArchivo}
          />
        </label>

        {!modelo && <p className="preview3d__aviso">Cargando modelo 3D…</p>}
        {modelo && !textura && (
          <p className="preview3d__aviso">Subí una imagen para poder ubicarla.</p>
        )}
        {textura && (
          <div className="preview3d__diseno-guardado">
            <p className="preview3d__aviso">Guardado en este navegador.</p>
            <button
              type="button"
              className="preview3d__quitar"
              onClick={() => handleQuitarDiseno(inputArchivoRef.current)}
            >
              Quitar diseño
            </button>
          </div>
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
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          camera={{ position: [0, 1.15, 2.8], fov: 38 }}
        >
          <color attach="background" args={["#eeeae0"]} />
          {/* Luz de relleno ambiental cielo/suelo — da el tono cálido del maniquí */}
          <hemisphereLight args={["#fffaf0", "#d6cfbe", 0.75]} />
          {/* Key: luz principal con sombra */}
          <directionalLight
            position={[3.5, 5, 4]}
            intensity={2.4}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
          />
          {/* Fill: suaviza las sombras del lado opuesto */}
          <directionalLight position={[-4, 2.5, 2]} intensity={0.45} />
          {/* Rim: recorta la silueta del cuerpo contra el fondo */}
          <directionalLight position={[0, 3, -4.5]} intensity={0.9} />
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
