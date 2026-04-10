'use client';

import { Suspense, useMemo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import { Chess } from 'chess.js';
import * as THREE from 'three';

const GLB_PATH = encodeURI('/glb/Chess Set.glb');

useGLTF.preload(GLB_PATH);

const PIECE_SYM: Record<string, { w: string; b: string }> = {
  p: { w: '♙', b: '♟' },
  r: { w: '♖', b: '♜' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  q: { w: '♕', b: '♛' },
  k: { w: '♔', b: '♚' },
};

export function sqToXZ(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  const x = -3.5 + file;
  const z = 3.5 - rank;
  return [x, z];
}

function ChessSetDecor() {
  const { scene } = useGLTF(GLB_PATH);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[0, -1.35, 0]} scale={0.82}>
      <primitive object={clone} />
    </group>
  );
}

function FenPieces({ fen }: { fen: string }) {
  const rows = useMemo(() => {
    try {
      return new Chess(fen).board();
    } catch {
      return new Chess().board();
    }
  }, [fen]);

  const items: ReactNode[] = [];
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (!cell) return;
      const file = String.fromCharCode('a'.charCodeAt(0) + ci);
      const rank = 8 - ri;
      const sq = `${file}${rank}`;
      const [x, z] = sqToXZ(sq);
      const sym = PIECE_SYM[cell.type]?.[cell.color] ?? '?';
      const col = cell.color === 'w' ? '#f8f3ea' : '#0f0f12';
      items.push(
        <Text
          key={sq}
          position={[x, 0.32, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.58}
          color={col}
          outlineWidth={0.02}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {sym}
        </Text>
      );
    });
  });
  return <>{items}</>;
}

interface BoardLayerProps {
  selected: string | null;
  legalSquares: string[];
  onSquareClick: (sq: string) => void;
}

function BoardLayer({ selected, legalSquares, onSquareClick }: BoardLayerProps) {
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
        const base = isDark ? '#5c3d2e' : '#c4a574';
        let color = base;
        if (isSel) color = '#3d5a99';
        else if (isLeg) color = isDark ? '#1f5c38' : '#4ade80';
        out.push(
          <mesh
            key={sq}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.02, z]}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSquareClick(sq);
            }}
          >
            <planeGeometry args={[0.92, 0.92]} />
            <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
          </mesh>
        );
      }
    }
    return out;
  }, [selected, legalSquares, onSquareClick]);

  return <group>{meshes}</group>;
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
      camera={{ position: [0, 15.5, 11], fov: 42 }}
      className="h-full w-full touch-none"
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#121620']} />
      <fog attach="fog" args={['#121620', 28, 65]} />
      <ambientLight intensity={0.5} color="#e8e0d5" />
      <directionalLight
        position={[12, 22, 14]}
        intensity={1.05}
        color="#fff8ee"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      <Suspense fallback={null}>
        <ChessSetDecor />
      </Suspense>

      <BoardLayer selected={selected} legalSquares={legalSquares} onSquareClick={onSquareClick} />
      <FenPieces fen={fen} />

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={9}
        maxDistance={30}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
