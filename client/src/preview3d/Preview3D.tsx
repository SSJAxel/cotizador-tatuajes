import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Decal } from "@react-three/drei";
import * as THREE from "three";
import { useHumanoidModel } from "./useHumanoidModel";
import type { HumanoidModel } from "./useHumanoidModel";
import {
  NOMBRE_ZONA,
  POSICION_ZONA,
  clasificarZona,
  esBilateral,
  focoDeZona,
} from "./types";
import type { Foco, ZonaCuerpo } from "./types";
import { RecorteImagen } from "./RecorteImagen";
import { ETIQUETAS } from "../pricing/fixtures";
import {
  aplicarContraste,
  borrarDiseno,
  cargarDiseno,
  comprimirImagenADataUrl,
  guardarDiseno,
} from "./persistencia";
import "./preview3d.css";

// Partes navegables ordenadas de la cabeza a los pies para el selector.
const PARTES_ORDENADAS = Object.keys(POSICION_ZONA).sort(
  (a, b) => POSICION_ZONA[b][1] - POSICION_ZONA[a][1],
);

/** Qué hace el arrastre: girar el modelo, mover la cámara o ubicar el diseño. */
type Modo3D = "girar" | "camara" | "ubicar";

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
      // Nitidez: anisotropía alta (se ve bien en ángulos rasantes) + mipmaps.
      // Clave para que un tatuaje chico no se vea borroso al zoomear.
      tex.anisotropy = 16;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
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
  foco: Foco | null;
  autoGirar: boolean;
  modo: Modo3D;
};

/**
 * Control tipo PLATO GIRATORIO: la cámara se queda recta de frente (sobre +z,
 * a la altura que se mira) y es el MODELO el que gira sobre su eje vertical.
 * Arrastrar sobre el fondo gira el modelo; arrastrar sobre el cuerpo (con un
 * diseño cargado) ubica el tatuaje; la rueda hace zoom. Así la cámara nunca
 * "curvea por los lados" — siempre ves la parte de frente.
 */
function Scena({
  modelo,
  onPlace,
  decalPos,
  decalRoll,
  decalScale,
  textura,
  hayDecal,
  foco,
  autoGirar,
  modo,
}: ScenaProps) {
  const { gl, camera, raycaster } = useThree();
  const grupoRef = useRef<THREE.Group>(null);

  const arrastrandoDecalRef = useRef(false);
  const arrastrandoMoverRef = useRef(false);
  const ultimoX = useRef(0);
  const ultimoY = useRef(0);

  const alturaMedia = ((modelo.bbox.max.y - modelo.bbox.min.y) * modelo.escala) * 0.5;

  // Objetivo vs. valor actual (se interpolan suave cada frame).
  const rotObj = useRef(0);
  const rotAct = useRef(0);
  const altObj = useRef(alturaMedia);
  const altAct = useRef(alturaMedia);
  const radObj = useRef(0);
  const radAct = useRef(0);
  const distObj = useRef(2.4);
  const distAct = useRef(2.4);
  const panXObj = useRef(0);
  const panXAct = useRef(0);

  useEffect(() => {
    panXObj.current = 0; // al enfocar/cambiar vista, recentramos el paneo lateral
    if (foco) {
      rotObj.current = foco.rotY;
      altObj.current = foco.altura;
      radObj.current = foco.radio;
      distObj.current = 0.8;
    } else {
      altObj.current = alturaMedia;
      radObj.current = 0;
      distObj.current = 2.4;
      // rotObj se mantiene (no forzamos la orientación en "vista general").
    }
  }, [foco, alturaMedia]);

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

  useEffect(() => {
    const canvas = gl.domElement;

    function down(e: PointerEvent) {
      if (modo === "ubicar") {
        if (!textura) return;
        const hit = raycastarEn(e.clientX, e.clientY);
        if (hit) {
          arrastrandoDecalRef.current = true;
          colocarDesdeHit(hit.point);
        }
        return;
      }
      // "girar" o "camara": arrastrar mueve modelo o cámara.
      arrastrandoMoverRef.current = true;
      ultimoX.current = e.clientX;
      ultimoY.current = e.clientY;
    }

    function move(e: PointerEvent) {
      if (arrastrandoDecalRef.current) {
        const hit = raycastarEn(e.clientX, e.clientY);
        if (hit) colocarDesdeHit(hit.point);
        return;
      }
      if (!arrastrandoMoverRef.current) return;
      const dx = e.clientX - ultimoX.current;
      const dy = e.clientY - ultimoY.current;
      ultimoX.current = e.clientX;
      ultimoY.current = e.clientY;
      if (modo === "girar") {
        rotObj.current += dx * 0.01; // girar el modelo (plato giratorio)
      } else if (modo === "camara") {
        panXObj.current += dx * 0.004; // mover la cámara al costado (recta)
        altObj.current -= dy * 0.004; // arrastrar arriba → mira más arriba
      }
    }

    function up() {
      arrastrandoDecalRef.current = false;
      arrastrandoMoverRef.current = false;
    }

    function wheel(e: WheelEvent) {
      e.preventDefault();
      distObj.current = THREE.MathUtils.clamp(
        distObj.current + e.deltaY * 0.0015,
        0.35,
        3.5,
      );
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [gl, raycastarEn, colocarDesdeHit, textura, modo]);

  useFrame((_, dt) => {
    if (autoGirar && !arrastrandoModeloRef.current) {
      rotObj.current += dt * 0.6;
    }
    const k = 1 - Math.pow(0.0015, Math.min(dt, 0.05));
    rotAct.current += (rotObj.current - rotAct.current) * k;
    altAct.current += (altObj.current - altAct.current) * k;
    radAct.current += (radObj.current - radAct.current) * k;
    distAct.current += (distObj.current - distAct.current) * k;
    panXAct.current += (panXObj.current - panXAct.current) * k;

    if (grupoRef.current) grupoRef.current.rotation.y = rotAct.current;

    // Cámara siempre recta: sobre +z, a la altura/costado que se mira.
    camera.position.set(
      panXAct.current,
      altAct.current,
      radAct.current + distAct.current,
    );
    camera.lookAt(panXAct.current, altAct.current, radAct.current);
  });

  return (
    <>
      <group ref={grupoRef}>
        <group scale={modelo.escala} position={modelo.offset}>
          <primitive object={modelo.skinMesh}>
            {hayDecal && textura && (
              <Decal
                position={decalPos}
                rotation={decalRoll}
                scale={decalScale / modelo.escala}
              >
                {/* Material propio del decal: transparente para que el fondo del
                    PNG (stencil/línea) deje ver la piel. polygonOffset evita el
                    z-fighting con el cuerpo; alphaTest recorta lo casi-invisible
                    para que no quede un halo oscuro alrededor del diseño. */}
                <meshStandardMaterial
                  map={textura}
                  transparent
                  alphaTest={0.04}
                  polygonOffset
                  polygonOffsetFactor={-10}
                  roughness={0.65}
                  depthTest
                />
              </Decal>
            )}
          </primitive>
          {modelo.eyeMesh && <primitive object={modelo.eyeMesh} />}
        </group>
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
  const [decalPos, setDecalPos] = useState<[number, number, number]>([0, 0, 0]);
  const [decalRollDeg, setDecalRollDeg] = useState(0);
  const [decalScale, setDecalScale] = useState(0.1);
  const [contraste, setContraste] = useState(1);
  const [texturaUrl, setTexturaUrl] = useState<string | null>(null);
  const [parteEnfocada, setParteEnfocada] = useState<string | null>(null);
  const [lado, setLado] = useState<1 | -1>(1);
  const [modo, setModo] = useState<Modo3D>("girar");
  const [autoGirar, setAutoGirar] = useState(false);
  const [recortando, setRecortando] = useState(false);
  const [cargadoDeGuardado, setCargadoDeGuardado] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  const foco = useMemo(
    () =>
      modelo && parteEnfocada
        ? focoDeZona(
            parteEnfocada,
            modelo.bbox,
            modelo.escala,
            esBilateral(parteEnfocada) ? lado : 1,
          )
        : null,
    [modelo, parteEnfocada, lado],
  );

  // La textura que ve el 3D es la imagen original con el contraste aplicado.
  useEffect(() => {
    if (!imageUrl) {
      setTexturaUrl(null);
      return;
    }
    let vivo = true;
    aplicarContraste(imageUrl, contraste)
      .then((url) => vivo && setTexturaUrl(url))
      .catch(() => vivo && setTexturaUrl(imageUrl));
    return () => {
      vivo = false;
    };
  }, [imageUrl, contraste]);

  const textura = useTexturaSubida(texturaUrl);

  // Restaurar diseño guardado en este navegador, una sola vez al montar.
  useEffect(() => {
    const guardado = cargarDiseno(tenantSlug);
    if (guardado) {
      setImageUrl(guardado.imagenDataUrl);
      setActivaZona(guardado.zona);
      setDecalPos(guardado.localPos);
      setDecalRollDeg(guardado.rotacionDeg);
      setDecalScale(guardado.escala);
      setContraste(guardado.contraste ?? 1);
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
      contraste,
    });
  }, [
    cargadoDeGuardado,
    tenantSlug,
    imageUrl,
    activaZona,
    decalPos,
    decalRollDeg,
    decalScale,
    contraste,
  ]);

  const handlePlace = useCallback((zona: ZonaCuerpo, localPos: THREE.Vector3) => {
    setActivaZona(zona);
    setDecalPos([localPos.x, localPos.y, localPos.z]);
  }, []);

  async function handleArchivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await comprimirImagenADataUrl(file);
    setImageUrl(dataUrl);
    setModo("ubicar"); // al subir un diseño, pasamos directo a ubicarlo
  }

  function handleQuitarDiseno(inputArchivo: HTMLInputElement | null) {
    setImageUrl(null);
    setActivaZona(null);
    setContraste(1);
    borrarDiseno(tenantSlug);
    if (inputArchivo) inputArchivo.value = "";
  }

  return (
    <div className="preview3d">
      <aside className="preview3d__panel">
        <h2>Vista previa en 3D</h2>
        <p className="preview3d__ayuda">
          Elegí qué hace el arrastre, y usá la rueda para acercar. Es una vista
          aproximada — el resultado final depende del tatuador.
        </p>

        <div className="preview3d__modos" role="group" aria-label="Modo de interacción">
          <button
            type="button"
            className={modo === "girar" ? "activo" : ""}
            onClick={() => setModo("girar")}
          >
            Girar modelo
          </button>
          <button
            type="button"
            className={modo === "camara" ? "activo" : ""}
            onClick={() => setModo("camara")}
          >
            Mover cámara
          </button>
          <button
            type="button"
            className={modo === "ubicar" ? "activo" : ""}
            onClick={() => setModo("ubicar")}
            disabled={!textura}
          >
            Ubicar diseño
          </button>
        </div>

        <label className="preview3d__campo">
          Ir a una parte del cuerpo
          <select
            value={parteEnfocada ?? ""}
            onChange={(e) => setParteEnfocada(e.target.value || null)}
          >
            <option value="">Vista general</option>
            {PARTES_ORDENADAS.map((z) => (
              <option key={z} value={z}>
                {ETIQUETAS[z] ?? z}
              </option>
            ))}
          </select>
        </label>

        {parteEnfocada && esBilateral(parteEnfocada) && (
          <div className="preview3d__lado">
            <button
              type="button"
              className={lado === -1 ? "activo" : ""}
              onClick={() => setLado(-1)}
            >
              Izquierda
            </button>
            <button
              type="button"
              className={lado === 1 ? "activo" : ""}
              onClick={() => setLado(1)}
            >
              Derecha
            </button>
          </div>
        )}

        <button
          type="button"
          className={`preview3d__toggle ${autoGirar ? "activo" : ""}`}
          onClick={() => setAutoGirar((v) => !v)}
        >
          {autoGirar ? "Detener giro" : "Girar solo"}
        </button>

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

        {imageUrl && (
          <button
            type="button"
            className="preview3d__toggle"
            onClick={() => setRecortando(true)}
          >
            Recortar a forma libre
          </button>
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
          Tamaño (~{Math.round(decalScale * 100)} cm)
          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={decalScale * 100}
            disabled={!textura || !activaZona}
            onChange={(e) => setDecalScale(Number(e.target.value) / 100)}
          />
        </label>

        <label className="preview3d__campo">
          Contraste
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={contraste * 100}
            disabled={!textura || !activaZona}
            onChange={(e) => setContraste(Number(e.target.value) / 100)}
          />
        </label>
      </aside>

      <div className="preview3d__canvas">
        {!modelo && (
          <div className="preview3d__spinner" aria-label="Cargando modelo 3D">
            <span />
          </div>
        )}
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          camera={{ position: [0, 0.9, 2.4], fov: 38 }}
        >
          {/* Fondo transparente: el backdrop de estudio lo pone el CSS del contenedor */}
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
              foco={foco}
              autoGirar={autoGirar}
              modo={modo}
            />
          )}
        </Canvas>
      </div>

      {recortando && imageUrl && (
        <RecorteImagen
          src={imageUrl}
          onAplicar={(url) => {
            setImageUrl(url);
            setRecortando(false);
          }}
          onCerrar={() => setRecortando(false)}
        />
      )}
    </div>
  );
}
