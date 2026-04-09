'use client';

import { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/glb/Moon.glb');

/** Retire l'effet « lampe » des GLB : emissive, maps emissive, BasicMaterial trop plat. */
function tameMoonMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;

      const m = mat as THREE.Material & { fog?: boolean };
      m.fog = false;

      // MeshBasic = pas d'éclairage → souvent tout blanc / néon
      if (mat instanceof THREE.MeshBasicMaterial) {
        mat.toneMapped = true;
        mat.color.multiplyScalar(0.45);
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        continue;
      }

      // PBR / classiques : couper l'auto-éclairage du fichier GLB
      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhysicalMaterial ||
        mat instanceof THREE.MeshLambertMaterial ||
        mat instanceof THREE.MeshPhongMaterial
      ) {
        mat.emissive.set(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.emissiveMap = null;
      }
    }
  });
}

/**
 * Toile de fond : loin **devant** la caméra (grand Z négatif), hauteur basse type horizon —
 * pas au-dessus du plateau. La caméra est côté +Z : +Z = derrière la tête (invisible), −Z = fond de scène.
 */
export default function Moon() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/glb/Moon.glb');

  useLayoutEffect(() => {
    tameMoonMaterials(scene);
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, 4.8, -44]}
      rotation={[0, 0, 0]}
      scale={0.1}
    >
      <primitive object={scene} />
    </group>
  );
}
