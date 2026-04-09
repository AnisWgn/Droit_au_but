'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getTilePosition } from './Board';
import { PlayerInfo } from '@/types/game';

interface PawnProps {
  player: PlayerInfo;
  playerIndex: number;
  isActive: boolean;
}

// Décalage pour éviter la superposition quand plusieurs joueurs sont sur la même case
function getPawnOffset(index: number): [number, number] {
  const offsets: [number, number][] = [
    [0, 0],
    [0.28, 0],
    [-0.28, 0],
    [0, 0.28],
    [0.28, 0.28],
    [-0.28, 0.28],
  ];
  return offsets[index % offsets.length];
}

export default function Pawn({ player, playerIndex, isActive }: PawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevPos = useRef<number>(-1);
  const bobbingTween = useRef<gsap.core.Tween | null>(null);

  const [dx, dz] = getPawnOffset(playerIndex);

  useEffect(() => {
    if (!groupRef.current) return;

    const [tx, ty, tz] = getTilePosition(player.position);
    const targetX = tx + dx;
    const targetY = ty + 0.42;
    const targetZ = tz + dz;

    if (prevPos.current === -1) {
      // Placement initial sans animation
      groupRef.current.position.set(targetX, targetY, targetZ);
      prevPos.current = player.position;
    } else if (prevPos.current !== player.position) {
      prevPos.current = player.position;

      // Animation de saut avec GSAP
      const tl = gsap.timeline();
      tl.to(groupRef.current.position, {
        y: targetY + 1.2,
        duration: 0.5,
        ease: 'power2.out',
      });
      tl.to(
        groupRef.current.position,
        {
          x: targetX,
          z: targetZ,
          duration: 0.65,
          ease: 'power2.inOut',
        },
        '<0.15'
      );
      tl.to(groupRef.current.position, {
        y: targetY,
        duration: 0.5,
        ease: 'bounce.out',
      });
    }
  }, [player.position, dx, dz]);

  // Rebond pour le joueur actif
  useEffect(() => {
    if (!groupRef.current) return;

    bobbingTween.current?.kill();

    if (isActive) {
      const ty = getTilePosition(player.position)[1];
      const baseY = ty + 0.42;
      bobbingTween.current = gsap.to(groupRef.current.position, {
        y: baseY + 0.18,
        duration: 0.7,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    return () => {
      bobbingTween.current?.kill();
    };
  }, [isActive, player.position]);

  const playerColor = new THREE.Color(player.color);

  return (
    <group ref={groupRef}>
      {/* Corps principal (sphère) */}
      <mesh castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={isActive ? 0.5 : 0.1}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>

      {/* Œil gauche */}
      <mesh position={[-0.08, 0.07, 0.17]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.08, 0.07, 0.2]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Œil droit */}
      <mesh position={[0.08, 0.07, 0.17]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 0.07, 0.2]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Ombre au sol */}
      <mesh position={[0, -0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.17, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.25} />
      </mesh>

      {/* Anneau actif */}
      {isActive && (
        <mesh position={[0, -0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.34, 32]} />
          <meshBasicMaterial color={playerColor} transparent opacity={0.85} />
        </mesh>
      )}

      {/* Indicateur panne */}
      {player.panne && (
        <mesh position={[0, 0.3, 0]}>
          <coneGeometry args={[0.08, 0.16, 3]} />
          <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}
