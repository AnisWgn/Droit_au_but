'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Chess } from 'chess.js';
import * as THREE from 'three';

const TILE = 1;
const GAP = 0.02;
const BOARD_Y = 0;
const PIECE_Y = BOARD_Y + 0.04;
/** Échelle de base ; multipliée par le type pour respecter la hiérarchie (pion < … < roi/reine). */
const PIECE_SCALE_BASE = 0.8;
/** Relatif au roi/reine (= 1). Les pions restent les plus petits. */
const PIECE_SCALE_BY_TYPE: Record<string, number> = {
  p: 0.68,
  n: 0.82,
  b: 0.84,
  r: 0.88,
  q: 1,
  k: 1.02,
};

const GLB: Record<string, string> = {
  p: '/glb/chess/piece/low_poly_chess_-_pawn.glb',
  r: '/glb/chess/piece/low_poly_chess_-_rook.glb',
  n: '/glb/chess/piece/low_poly_chess_-_knight.glb',
  b: '/glb/chess/piece/low_poly_chess_-_bishop.glb',
  q: '/glb/chess/piece/low_poly_chess_-_queen.glb',
  k: '/glb/chess/piece/low_poly_chess_-_king.glb',
};

Object.values(GLB).forEach((path) => useGLTF.preload(path));

export function sqToXZ(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  const x = (file - 3.5) * (TILE + GAP);
  const z = (3.5 - rank) * (TILE + GAP);
  return [x, z];
}

const LIGHT_COLOR = new THREE.Color('#d4a574');
const DARK_COLOR = new THREE.Color('#6b3e26');
const SEL_COLOR = new THREE.Color('#3d5a99');
const LEGAL_LIGHT = new THREE.Color('#4ade80');
const LEGAL_DARK = new THREE.Color('#1f7a42');
const BORDER_COLOR = new THREE.Color('#3d2b1f');
const WHITE_PIECE_COLOR = new THREE.Color('#f0e6d3');
const BLACK_PIECE_COLOR = new THREE.Color('#2a2a2a');

function BoardFrame() {
  const size = 8 * (TILE + GAP) + 0.6;
  return (
    <mesh position={[0, BOARD_Y - 0.12, 0]} receiveShadow>
      <boxGeometry args={[size, 0.22, size]} />
      <meshStandardMaterial color={BORDER_COLOR} roughness={0.5} metalness={0.15} />
    </mesh>
  );
}

interface TilesProps {
  selected: string | null;
  legalSquares: string[];
  onSquareClick: (sq: string) => void;
}

function Tiles({ selected, legalSquares, onSquareClick }: TilesProps) {
  const meshes = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let rank = 1; rank <= 8; rank++) {
      for (let f = 0; f < 8; f++) {
        const file = String.fromCharCode('a'.charCodeAt(0) + f);
        const sq = `${file}${rank}`;
        const [x, z] = sqToXZ(sq);
        const isDark = (f + rank) % 2 === 0;
        const isSel = selected === sq;
        const isLeg = legalSquares.includes(sq);

        let color: THREE.Color;
        if (isSel) color = SEL_COLOR;
        else if (isLeg) color = isDark ? LEGAL_DARK : LEGAL_LIGHT;
        else color = isDark ? DARK_COLOR : LIGHT_COLOR;

        out.push(
          <mesh
            key={sq}
            position={[x, BOARD_Y, z]}
            receiveShadow
            onPointerDown={(e) => {
              e.stopPropagation();
              onSquareClick(sq);
            }}
          >
            <boxGeometry args={[TILE, 0.08, TILE]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.08} />
          </mesh>,
        );
      }
    }
    return out;
  }, [selected, legalSquares, onSquareClick]);

  return <group>{meshes}</group>;
}

interface PieceModelProps {
  type: string;
  color: 'w' | 'b';
  sq: string;
}

function PieceModel({ type, color, sq }: PieceModelProps) {
  const glbPath = GLB[type];
  const { scene } = useGLTF(glbPath);

  const clone = useMemo(() => {
    const c = scene.clone(true);
    const tint = color === 'w' ? WHITE_PIECE_COLOR : BLACK_PIECE_COLOR;
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => {
          const cl = m.clone();
          if ('color' in cl) (cl as THREE.MeshStandardMaterial).color.copy(tint);
          if ('roughness' in cl) (cl as THREE.MeshStandardMaterial).roughness = color === 'w' ? 0.35 : 0.45;
          if ('metalness' in cl) (cl as THREE.MeshStandardMaterial).metalness = 0.1;
          return cl;
        });
      } else {
        mesh.material = mesh.material.clone();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if ('color' in mat) mat.color.copy(tint);
        if ('roughness' in mat) mat.roughness = color === 'w' ? 0.35 : 0.45;
        if ('metalness' in mat) mat.metalness = 0.1;
      }
    });
    return c;
  }, [scene, color]);

  const [x, z] = sqToXZ(sq);
  /** Cavaliers : +180° par rapport à l’orientation par défaut (blancs face au camp noir, etc.). */
  const rotY =
    type === 'n' ? (color === 'w' ? Math.PI : 0) : 0;
  const scale = PIECE_SCALE_BASE * (PIECE_SCALE_BY_TYPE[type] ?? 1);

  return (
    <group position={[x, PIECE_Y, z]} scale={scale} rotation={[0, rotY, 0]}>
      <primitive object={clone} />
    </group>
  );
}

function Pieces({ fen }: { fen: string }) {
  const items = useMemo(() => {
    let board: ReturnType<Chess['board']>;
    try {
      board = new Chess(fen).board();
    } catch {
      board = new Chess().board();
    }

    const result: { key: string; type: string; color: 'w' | 'b'; sq: string }[] = [];
    board.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (!cell) return;
        const file = String.fromCharCode('a'.charCodeAt(0) + ci);
        const rank = 8 - ri;
        const sq = `${file}${rank}`;
        result.push({ key: `${sq}-${cell.type}-${cell.color}`, type: cell.type, color: cell.color, sq });
      });
    });
    return result;
  }, [fen]);

  return (
    <>
      {items.map(({ key, type, color, sq }) => (
        <PieceModel key={key} type={type} color={color} sq={sq} />
      ))}
    </>
  );
}

export interface ChessSceneProps {
  fen: string;
  selected: string | null;
  legalSquares: string[];
  onSquareClick: (sq: string) => void;
}

export default function ChessScene({ fen, selected, legalSquares, onSquareClick }: ChessSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 12, 10], fov: 45 }}
      className="h-full w-full touch-none"
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
      }}
    >
      <color attach="background" args={['#121620']} />
      <fog attach="fog" args={['#121620', 30, 70]} />

      <ambientLight intensity={0.45} color="#e8e0d5" />
      <directionalLight
        position={[10, 18, 10]}
        intensity={1}
        color="#fff8ee"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <Suspense fallback={null}>
        <BoardFrame />
        <Tiles selected={selected} legalSquares={legalSquares} onSquareClick={onSquareClick} />
        <Pieces fen={fen} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={8}
        maxDistance={28}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
