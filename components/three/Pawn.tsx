'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { getPawnOffset, getTilePosition } from './Board';
import { PlayerInfo } from '@/types/game';

interface PawnProps {
  player: PlayerInfo;
  playerIndex: number;
  isActive: boolean;
}

export default function Pawn({ player, playerIndex, isActive }: PawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const prevPos = useRef<number>(-1);
  const bobbingTween = useRef<gsap.core.Tween | null>(null);

  const [dx, dz] = getPawnOffset(playerIndex);
  const playerColor = new THREE.Color(player.color);

  useEffect(() => {
    if (!groupRef.current) return;

    const [tx, ty, tz] = getTilePosition(player.position);
    const targetX = tx + dx;
    const targetY = ty + 0.32;
    const targetZ = tz + dz;

    if (prevPos.current === -1) {
      groupRef.current.position.set(targetX, targetY, targetZ);
      prevPos.current = player.position;
    } else if (prevPos.current !== player.position) {
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
    }
  }, [player.position, dx, dz]);

  useEffect(() => {
    if (!groupRef.current) return;
    bobbingTween.current?.kill();

    if (isActive) {
      const ty = getTilePosition(player.position)[1];
      const baseY = ty + 0.32;
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
  }, [isActive, player.position]);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 3) * 0.15 + 0.5;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isActive ? pulse : 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Socle (base en bois poli) */}
      <Cylinder args={[0.14, 0.17, 0.05, 16]} position={[0, -0.1, 0]} castShadow>
        <meshStandardMaterial color="#3d2b1f" roughness={0.4} metalness={0.15} />
      </Cylinder>

      {/* Corps (toge / robe d'avocat) */}
      <Cylinder args={[0.1, 0.14, 0.24, 16]} position={[0, 0.02, 0]} castShadow>
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={isActive ? 0.2 : 0.04}
          roughness={0.55}
          metalness={0.05}
        />
      </Cylinder>

      {/* Col (rabat blanc d'avocat) */}
      <Cylinder args={[0.105, 0.1, 0.03, 16]} position={[0, 0.145, 0]}>
        <meshStandardMaterial color="#f0ebe0" roughness={0.7} metalness={0} />
      </Cylinder>

      {/* Tête */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#e8d5b7" roughness={0.6} metalness={0} />
      </mesh>

      {/* Anneau actif au sol */}
      <mesh ref={glowRef} position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.25, 32]} />
        <meshBasicMaterial color={playerColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Ombre portée */}
      <mesh position={[0, -0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 16]} />
        <meshBasicMaterial color="#0a0a0a" transparent opacity={0.25} />
      </mesh>

      {/* Indicateur panne (petit parchemin roulé rouge) */}
      {player.panne && (
        <group position={[0.14, 0.25, 0]} rotation={[0, 0, 0.3]}>
          <Cylinder args={[0.025, 0.025, 0.1, 8]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
              color="#dc2626"
              emissive="#b91c1c"
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </Cylinder>
        </group>
      )}
    </group>
  );
}
