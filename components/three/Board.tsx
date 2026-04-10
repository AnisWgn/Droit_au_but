'use client';

import { useMemo } from 'react';
import { RoundedBox, Text, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

export const TILE_SPACING = 1.2;
const TILE_SIZE = 0.9;
const TILE_HEIGHT = 0.18;
const COLS = 10;

const X_OFFSET = -((COLS - 1) * TILE_SPACING) / 2;
const Z_OFFSET = -(10 * TILE_SPACING) / 2;

const HEIGHT_PER_ROW = 0.06;

/** Hauteur du pion au-dessus de la case (socle + léger décollage). */
export const OIE_PAWN_Y_OFFSET = 0.39;

export function getTilePosition(index: number): [number, number, number] {
  if (index === 100) {
    const row = 10;
    const baseY = TILE_HEIGHT / 2 + row * HEIGHT_PER_ROW;
    return [X_OFFSET + 4.5 * TILE_SPACING, baseY + 0.15, Z_OFFSET + row * TILE_SPACING];
  }
  const row = Math.floor(index / 10);
  const col = index % 10;
  const x = row % 2 === 0 ? col : 9 - col;
  const baseY = TILE_HEIGHT / 2 + row * HEIGHT_PER_ROW;
  return [X_OFFSET + x * TILE_SPACING, baseY, Z_OFFSET + row * TILE_SPACING];
}

const PAWN_OFFSETS: [number, number][] = [
  [0, 0],
  [0.26, 0],
  [-0.26, 0],
  [0, 0.26],
  [0.26, 0.26],
  [-0.26, 0.26],
];

export function getPawnOffset(playerIndex: number): [number, number] {
  return PAWN_OFFSETS[playerIndex % PAWN_OFFSETS.length];
}

/** Même logique que le groupe `Pawn` (case + décalage multi-joueurs). */
export function getPawnWorldPosition(playerIndex: number, boardPosition: number): [number, number, number] {
  const [dx, dz] = getPawnOffset(playerIndex);
  const [tx, ty, tz] = getTilePosition(boardPosition);
  return [tx + dx, ty + OIE_PAWN_Y_OFFSET, tz + dz];
}

// ─── Palette "palais de justice" ─────────────────────────────────────────────

function getTileColor(index: number): string {
  if (index === 0) return '#2c3e50';
  if (index === 100) return '#6b4c1e';
  if (index % 10 === 0) return '#5c3d1e';
  return index % 2 === 0 ? '#1e2a3a' : '#243447';
}

function getTileEmissive(index: number): { color: string; intensity: number } {
  if (index === 100) return { color: '#d4a04a', intensity: 0.3 };
  if (index === 0) return { color: '#3b82f6', intensity: 0.1 };
  if (index % 10 === 0) return { color: '#d4a04a', intensity: 0.15 };
  return { color: '#34495e', intensity: 0.02 };
}

// ─── Connecteur doré entre cases ─────────────────────────────────────────────

function PathConnector({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const midX = (from[0] + to[0]) / 2;
  const midY = Math.max(from[1], to[1]) + 0.005;
  const midZ = (from[2] + to[2]) / 2;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[midX, midY, midZ]} rotation={[-Math.PI / 2, 0, -angle]}>
      <planeGeometry args={[0.04, length * 0.45]} />
      <meshBasicMaterial color="#d4a04a" transparent opacity={0.08} />
    </mesh>
  );
}

// ─── Case arrivée : maillet de juge sur socle ────────────────────────────────

function JudgeGavel({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* Socle rond */}
      <Cylinder args={[0.18, 0.2, 0.06, 16]} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#3d2b1f" roughness={0.5} metalness={0.15} />
      </Cylinder>
      {/* Anneau doré du socle */}
      <Cylinder args={[0.2, 0.2, 0.02, 16]} position={[0, 0.065, 0]}>
        <meshStandardMaterial color="#d4a04a" roughness={0.2} metalness={0.7} />
      </Cylinder>
      {/* Manche du maillet */}
      <Cylinder args={[0.015, 0.015, 0.3, 8]} position={[0, 0.22, 0]} rotation={[0, 0, 0.4]}>
        <meshStandardMaterial color="#5c3d1e" roughness={0.5} metalness={0.1} />
      </Cylinder>
      {/* Tête du maillet */}
      <Cylinder args={[0.05, 0.05, 0.12, 12]} position={[0.1, 0.35, 0]} rotation={[0, 0, Math.PI / 2 + 0.4]}>
        <meshStandardMaterial color="#3d2b1f" roughness={0.4} metalness={0.2} />
      </Cylinder>
      {/* Bandes dorées du maillet */}
      <Cylinder args={[0.052, 0.052, 0.015, 12]} position={[0.065, 0.33, 0]} rotation={[0, 0, Math.PI / 2 + 0.4]}>
        <meshStandardMaterial color="#d4a04a" roughness={0.2} metalness={0.7} />
      </Cylinder>
      <Cylinder args={[0.052, 0.052, 0.015, 12]} position={[0.135, 0.37, 0]} rotation={[0, 0, Math.PI / 2 + 0.4]}>
        <meshStandardMaterial color="#d4a04a" roughness={0.2} metalness={0.7} />
      </Cylinder>
    </group>
  );
}

// ─── Pile de livres (déco disposée sur le plateau) ───────────────────────────

function BookStack({ position }: { position: [number, number, number] }) {
  const colors = ['#7f1d1d', '#1e3a5f', '#2d3a1e'];
  return (
    <group position={position}>
      {colors.map((c, i) => (
        <mesh key={i} position={[0, 0.03 + i * 0.055, 0]} rotation={[0, i * 0.3, 0]} castShadow>
          <boxGeometry args={[0.22, 0.05, 0.15]} />
          <meshStandardMaterial color={c} roughness={0.7} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function Board() {
  const tiles = useMemo(() => Array.from({ length: 101 }, (_, i) => i), []);

  const connectors = useMemo(() => {
    const list: { from: [number, number, number]; to: [number, number, number] }[] = [];
    for (let i = 0; i < 100; i++) {
      list.push({ from: getTilePosition(i), to: getTilePosition(i + 1) });
    }
    return list;
  }, []);

  return (
    <group>
      {/* Connecteurs dorés */}
      {connectors.map((c, i) => (
        <PathConnector key={`c${i}`} from={c.from} to={c.to} />
      ))}

      {/* Piles de livres décoratives autour du plateau */}
      <BookStack position={[-7, 0, -4]} />
      <BookStack position={[7, 0, -2]} />
      <BookStack position={[-6.5, 0, 5]} />
      <BookStack position={[6.8, 0, 3]} />
      <BookStack position={[-7.2, 0, 0]} />
      <BookStack position={[7.3, 0, -6]} />

      {/* Cases */}
      {tiles.map((i) => {
        const [x, y, z] = getTilePosition(i);
        const color = getTileColor(i);
        const { color: emColor, intensity: emInt } = getTileEmissive(i);
        const isRadar = i > 0 && i < 100 && i % 10 === 0;
        const isEnd = i === 100;
        const isStart = i === 0;
        const tileH = isEnd ? TILE_HEIGHT * 2.2 : TILE_HEIGHT;

        return (
          <group key={i} position={[x, y, z]}>
            <RoundedBox
              args={[TILE_SIZE, tileH, TILE_SIZE]}
              radius={0.04}
              smoothness={4}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={color}
                emissive={new THREE.Color(emColor)}
                emissiveIntensity={emInt}
                roughness={0.45}
                metalness={0.15}
              />
            </RoundedBox>

            {/* Filet doré sur le dessus */}
            <mesh position={[0, tileH / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[TILE_SIZE * 0.38, TILE_SIZE * 0.41, 32]} />
              <meshBasicMaterial color="#d4a04a" transparent opacity={isRadar || isEnd ? 0.2 : 0.05} side={THREE.DoubleSide} />
            </mesh>

            {/* Numéro sur chaque tuile — or + contour */}
            <Text
              position={[0, tileH / 2 + 0.012, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={i === 100 ? 0.11 : 0.125}
              color="#f0d060"
              fillOpacity={isStart || isEnd ? 1 : isRadar ? 0.85 : 0.68}
              outlineWidth={0.02}
              outlineColor="#4a3208"
              anchorX="center"
              anchorY="middle"
            >
              {String(i)}
            </Text>

            {isEnd && <JudgeGavel y={tileH / 2} />}
          </group>
        );
      })}
    </group>
  );
}
