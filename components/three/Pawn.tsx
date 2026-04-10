'use client';

import { useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { getPawnOffset, getTilePosition, OIE_PAWN_Y_OFFSET } from './Board';
import { PlayerInfo } from '@/types/game';

useGLTF.preload('/glb/oie/Pawn.glb');

/** Hauteur cible du modèle GLB (pions plus grands sur le plateau). */
const TARGET_HEIGHT = 0.52;

interface PawnProps {
  player: PlayerInfo;
  playerIndex: number;
  isActive: boolean;
}

/** Clone récursif avec matériaux dupliqués (sinon tous les pions partagent les mêmes couleurs). */
function cloneSceneWithOwnMaterials(source: THREE.Object3D): THREE.Group {
  const root = source.clone(true) as THREE.Group;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => (m ? m.clone() : m));
    } else {
      mesh.material = mesh.material.clone();
    }
  });
  return root;
}

function normalizeModelScaleAndGround(root: THREE.Group) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const s = TARGET_HEIGHT / maxDim;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.position.y -= box2.min.y;
}

function applyPlayerTint(root: THREE.Object3D, color: THREE.Color, active: boolean) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhysicalMaterial
      ) {
        mat.color.copy(color);
        mat.emissive.copy(color);
        mat.emissiveIntensity = active ? 0.22 : 0.06;
        mat.needsUpdate = true;
      } else if (
        mat instanceof THREE.MeshLambertMaterial ||
        mat instanceof THREE.MeshPhongMaterial
      ) {
        mat.color.copy(color);
        if ('emissive' in mat && mat.emissive) {
          mat.emissive.copy(color);
          mat.emissiveIntensity = active ? 0.15 : 0.04;
        }
        mat.needsUpdate = true;
      } else if (mat instanceof THREE.MeshBasicMaterial) {
        mat.color.copy(color);
        mat.needsUpdate = true;
      } else if (mat instanceof THREE.MeshToonMaterial) {
        mat.color.copy(color);
        mat.needsUpdate = true;
      } else if ('color' in mat && mat.color instanceof THREE.Color) {
        mat.color.copy(color);
        mat.needsUpdate = true;
      }
    }
  });
}

export default function Pawn({ player, playerIndex, isActive }: PawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevPos = useRef<number>(-1);
  const bobbingTween = useRef<gsap.core.Tween | null>(null);

  const { scene } = useGLTF('/glb/oie/Pawn.glb');
  const pawnRoot = useMemo(() => {
    const root = cloneSceneWithOwnMaterials(scene);
    normalizeModelScaleAndGround(root);
    return root;
  }, [scene]);

  const playerColor = useMemo(() => new THREE.Color(player.color), [player.color]);

  useLayoutEffect(() => {
    applyPlayerTint(pawnRoot, playerColor, isActive);
  }, [pawnRoot, playerColor, isActive]);

  const [dx, dz] = getPawnOffset(playerIndex);

  useEffect(() => {
    if (!groupRef.current) return;

    const [tx, ty, tz] = getTilePosition(player.position);
    const targetX = tx + dx;
    const targetY = ty + OIE_PAWN_Y_OFFSET;
    const targetZ = tz + dz;

    if (prevPos.current === -1) {
      groupRef.current.position.set(targetX, targetY, targetZ);
      prevPos.current = player.position;
      return;
    }

    if (prevPos.current !== player.position) {
      prevPos.current = player.position;

      const tl = gsap.timeline();
      tl.to(groupRef.current.position, {
        y: targetY + 1.0,
        duration: 0.45,
        ease: 'power2.out',
      });
      tl.to(
        groupRef.current.position,
        {
          x: targetX,
          z: targetZ,
          duration: 0.55,
          ease: 'power2.inOut',
        },
        '<0.1'
      );
      tl.to(groupRef.current.position, {
        y: targetY,
        duration: 0.45,
        ease: 'bounce.out',
      });
      return;
    }

    /* Même case : mise à jour si OIE_PAWN_Y_OFFSET (ou décalage) change — sinon la caméra bouge seule. */
    groupRef.current.position.set(targetX, targetY, targetZ);
  }, [player.position, dx, dz, OIE_PAWN_Y_OFFSET]);

  useEffect(() => {
    if (!groupRef.current) return;
    bobbingTween.current?.kill();

    if (isActive) {
      const ty = getTilePosition(player.position)[1];
      const baseY = ty + OIE_PAWN_Y_OFFSET;
      bobbingTween.current = gsap.to(groupRef.current.position, {
        y: baseY + 0.14,
        duration: 0.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    return () => {
      bobbingTween.current?.kill();
    };
  }, [isActive, player.position, OIE_PAWN_Y_OFFSET]);

  return (
    <group ref={groupRef}>
      <primitive object={pawnRoot} />

      {player.panne && (
        <group position={[0.22, 0.52, 0]} rotation={[0, 0, 0.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
            <meshStandardMaterial
              color="#dc2626"
              emissive="#b91c1c"
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
