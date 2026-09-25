import type { ReactNode } from "react";
import type { Mesh } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { BodyPartName } from "./types";

const COLOR_PIEL = "#d9ab8b";

type HumanoidBodyProps = {
  getMeshRef: (part: BodyPartName) => (mesh: Mesh | null) => void;
  onPartPointerDown: (
    part: BodyPartName,
  ) => (event: ThreeEvent<PointerEvent>) => void;
  renderDecal: (part: BodyPartName) => ReactNode;
};

export function HumanoidBody({
  getMeshRef,
  onPartPointerDown,
  renderDecal,
}: HumanoidBodyProps) {
  return (
    <group>
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
      </mesh>

      <mesh
        ref={getMeshRef("torso")}
        position={[0, 1.15, 0]}
        onPointerDown={onPartPointerDown("torso")}
        castShadow
      >
        <capsuleGeometry args={[0.27, 0.5, 6, 16]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
        {renderDecal("torso")}
      </mesh>

      <mesh
        ref={getMeshRef("brazoIzquierdo")}
        position={[-0.42, 1.12, 0]}
        rotation={[0, 0, 0.18]}
        onPointerDown={onPartPointerDown("brazoIzquierdo")}
        castShadow
      >
        <capsuleGeometry args={[0.09, 0.62, 6, 16]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
        {renderDecal("brazoIzquierdo")}
      </mesh>

      <mesh
        ref={getMeshRef("brazoDerecho")}
        position={[0.42, 1.12, 0]}
        rotation={[0, 0, -0.18]}
        onPointerDown={onPartPointerDown("brazoDerecho")}
        castShadow
      >
        <capsuleGeometry args={[0.09, 0.62, 6, 16]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
        {renderDecal("brazoDerecho")}
      </mesh>

      <mesh
        ref={getMeshRef("piernaIzquierda")}
        position={[-0.14, 0.4, 0]}
        onPointerDown={onPartPointerDown("piernaIzquierda")}
        castShadow
      >
        <capsuleGeometry args={[0.13, 0.72, 6, 16]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
        {renderDecal("piernaIzquierda")}
      </mesh>

      <mesh
        ref={getMeshRef("piernaDerecha")}
        position={[0.14, 0.4, 0]}
        onPointerDown={onPartPointerDown("piernaDerecha")}
        castShadow
      >
        <capsuleGeometry args={[0.13, 0.72, 6, 16]} />
        <meshStandardMaterial color={COLOR_PIEL} roughness={0.6} />
        {renderDecal("piernaDerecha")}
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color="#171939" roughness={1} />
      </mesh>
    </group>
  );
}
