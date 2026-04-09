'use client';

import { useMemo } from 'react';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

export const TILE_SPACING = 1.15;
const TILE_SIZE = 0.92;
const TILE_HEIGHT = 0.35;
const COLS = 10;

const X_OFFSET = -((COLS - 1) * TILE_SPACING) / 2;
const Z_OFFSET = -(10 * TILE_SPACING) / 2;

// Hauteur Y des cases : la base du tile est exactement à Y=0
// Le centre du tile est à Y = TILE_HEIGHT/2 = 0.175
// Rien d'autre ne dépasse Y=0
const TILE_CENTER_Y = TILE_HEIGHT / 2;

export function getTilePosition(index: number): [number, number, number] {
  if (index === 100) {
    return [X_OFFSET, TILE_CENTER_Y + 0.25, Z_OFFSET + 10 * TILE_SPACING];
  }
  const row = Math.floor(index / 10);
  const col = index % 10;
  const x = row % 2 === 0 ? col : 9 - col;
  return [X_OFFSET + x * TILE_SPACING, TILE_CENTER_Y, Z_OFFSET + row * TILE_SPACING];
}

function getTileColor(index: number): string {
  if (index === 0) return '#22c55e';
  if (index === 100) return '#eab308';
  if (index % 10 === 0) return '#f59e0b';
  return index % 2 === 0 ? '#3b82f6' : '#8b5cf6';
}

function getEmissive(index: number): { color: string; intensity: number } {
  if (index === 100) return { color: '#eab308', intensity: 0.7 };
  if (index === 0) return { color: '#22c55e', intensity: 0.4 };
  if (index % 10 === 0 && index > 0) return { color: '#f59e0b', intensity: 0.5 };
  return index % 2 === 0
    ? { color: '#3b82f6', intensity: 0.15 }
    : { color: '#8b5cf6', intensity: 0.15 };
}

function RadarGem({ y }: { y: number }) {
  return (
    <mesh position={[0, y + 0.18, 0]}>
      <octahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={1}
        roughness={0.05}
        metalness={0.9}
      />
    </mesh>
  );
}

function FinishFlag({ y }: { y: number }) {
  return (
    <group>
      <mesh position={[0.3, y + 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.44, y + 0.72, 0]}>
        <boxGeometry args={[0.28, 0.16, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export default function Board() {
  const tiles = useMemo(() => Array.from({ length: 101 }, (_, i) => i), []);
  return (
    <group>
      {tiles.map((i) => {
        const [x, y, z] = getTilePosition(i);
        const color = getTileColor(i);
        const { color: emColor, intensity: emInt } = getEmissive(i);
        const isRadar = i > 0 && i < 100 && i % 10 === 0;
        const isEnd = i === 100;
        const tileH = isEnd ? TILE_HEIGHT * 1.8 : TILE_HEIGHT;

        return (
          <group key={i} position={[x, y, z]}>
            <RoundedBox
              args={[TILE_SIZE, tileH, TILE_SIZE]}
              radius={0.07}
              smoothness={4}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={color}
                emissive={new THREE.Color(emColor)}
                emissiveIntensity={emInt}
                roughness={isEnd ? 0.15 : 0.35}
                metalness={isEnd ? 0.6 : 0.1}
              />
            </RoundedBox>

            {(i % 5 === 0 || i === 1) && (
              <Text
                position={[0, tileH / 2 + 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.18}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {String(i)}
              </Text>
            )}

            {isRadar && <RadarGem y={tileH / 2} />}
            {isEnd && <FinishFlag y={tileH / 2} />}
          </group>
        );
      })}
    </group>
  );
}
