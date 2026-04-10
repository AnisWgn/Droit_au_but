'use client';

import React, { Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, useGLTF } from '@react-three/drei';
import { Chess } from 'chess.js';
import * as THREE from 'three';

const TILE = 1;
const GAP = 0.02;
/** Hauteur locale des cases / pièces dans le groupe posé sur la table */
const BOARD_Y = 0;
const PIECE_Y = BOARD_Y + 0.04;

/** Table 3D */
const TABLE_GLB = '/glb/chess/map/stylized_low-poly_wood_table.glb';
const TABLE_SCALE = 0.06;
/** Teinte bois : marron clair (matériaux clonés pour ne pas modifier le GLB partagé). */
const TABLE_WOOD_TINT = new THREE.Color('#966222');
const TABLE_STRIP_COLOR_MAPS = true;

/** Chaises joueurs (côté blancs z+, côté noirs z−) */
const CHAIR_GLB = '/glb/chess/map/chair.glb';
const CHAIR_SCALE = 1.9;
const CHAIR_Z_OFFSET = 6;
const CHAIR_X_OFFSET = 180; 

/** Sol en bois */
const STONE_GLB = '/glb/chess/map/wooden_planks_texture_flat_low_poly_style.glb';
const STONE_GRID_RADIUS = 2;
const STONE_BLOCK_SCALE = 0.03;
/** Décalage vertical du sol (négatif = descendre). Indépendant de l’échelle. */
const STONE_FLOOR_OFFSET_Y = -1.22;

/** Échelle de base*/
const PIECE_SCALE_BASE = 0.8;
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
useGLTF.preload(TABLE_GLB);
useGLTF.preload(STONE_GLB);
useGLTF.preload(CHAIR_GLB);

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

/** Fond / clear */
const SKY_COLOR = '#00fdff63';

/** Bloc sous le damier (comme avant l’ajout du GLB table). */
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

function StoneFloor() {
  const { scene } = useGLTF(STONE_GLB);

  const grid = useMemo(() => {
    const sample = scene.clone(true);
    const holder = new THREE.Group();
    holder.scale.setScalar(STONE_BLOCK_SCALE);
    holder.add(sample);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = new THREE.Vector3();
    box.getSize(size);
    const step = Math.max(size.x, size.z, 0.01);
    const baseY = -box.min.y + STONE_FLOOR_OFFSET_Y;

    const items: { id: string; x: number; z: number; obj: THREE.Object3D }[] = [];
    for (let ix = -STONE_GRID_RADIUS; ix <= STONE_GRID_RADIUS; ix++) {
      for (let iz = -STONE_GRID_RADIUS; iz <= STONE_GRID_RADIUS; iz++) {
        const obj = scene.clone(true);
        obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        items.push({ id: `${ix},${iz}`, x: ix * step, z: iz * step, obj });
      }
    }
    return { items, baseY };
  }, [scene, STONE_BLOCK_SCALE, STONE_FLOOR_OFFSET_Y]);

  return (
    <group>
      {grid.items.map(({ id, x, z, obj }) => (
        <group key={id} position={[x, grid.baseY, z]} scale={STONE_BLOCK_SCALE}>
          <primitive object={obj} />
        </group>
      ))}
    </group>
  );
}

function ChessChairs() {
  const { scene } = useGLTF(CHAIR_GLB);

  const { chairWhite, chairBlack, baseY } = useMemo(() => {
    const make = () => {
      const c = scene.clone(true);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      return c;
    };

    const sample = make();
    const holder = new THREE.Group();
    holder.scale.setScalar(CHAIR_SCALE);
    holder.add(sample);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const y = -box.min.y;

    return { chairWhite: make(), chairBlack: make(), baseY: y };
  }, [scene]);

  return (
    <>
      {/* Camp blanc (rangée 1, côté z+) : chaise face au plateau */}
      <group position={[0, baseY, CHAIR_Z_OFFSET]} rotation={[0, Math.PI, 0]} scale={CHAIR_SCALE}>
        <primitive object={chairWhite} />
      </group>
      {/* Camp noir (rangée 8, côté z−) */}
      <group position={[0, baseY, -CHAIR_Z_OFFSET]} rotation={[0, 0, 0]} scale={CHAIR_SCALE}>
        <primitive object={chairBlack} />
      </group>
    </>
  );
}

interface ChessPlayfieldProps {
  fen: string;
  selected: string | null;
  legalSquares: string[];
  onSquareClick: (sq: string) => void;
  /** Hauteur du centre du plateau (cases) pour cibler la caméra / orbite. */
  onBoardSurfaceY: (worldY: number) => void;
}

function ChessPlayfield({
  fen,
  selected,
  legalSquares,
  onSquareClick,
  onBoardSurfaceY,
}: ChessPlayfieldProps) {
  const { scene } = useGLTF(TABLE_GLB);
  const tableWrapRef = useRef<THREE.Group>(null);
  const [boardLiftY, setBoardLiftY] = useState(1);

  const tableClone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const tintMat = (mat: THREE.Material | null): THREE.Material | null => {
        if (!mat) return mat;
        const cl = mat.clone();
        const m = cl as THREE.MeshStandardMaterial & {
          map?: THREE.Texture | null;
          emissiveMap?: THREE.Texture | null;
        };

        if (TABLE_STRIP_COLOR_MAPS) {
          if (m.map) {
            m.map = null;
          }
          if ('emissiveMap' in m && m.emissiveMap) {
            m.emissiveMap = null;
          }
        }

        if ('color' in m && m.color) {
          m.color.copy(TABLE_WOOD_TINT);
          if (!TABLE_STRIP_COLOR_MAPS && m.map) {
            m.color.multiplyScalar(1.12);
          }
        }
        if ('emissive' in m && m.emissive) {
          m.emissive.copy(TABLE_WOOD_TINT).multiplyScalar(0.04);
        }
        if ('roughness' in m) {
          m.roughness = Math.min(0.92, (m.roughness ?? 0.55) * 0.9);
        }
        if ('metalness' in m) {
          m.metalness = Math.min(m.metalness ?? 0, 0.12);
        }
        m.needsUpdate = true;
        return cl;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => tintMat(mat) ?? mat) as THREE.Material[];
      } else if (mesh.material) {
        mesh.material = tintMat(mesh.material) ?? mesh.material;
      }
    });
    return c;
  }, [scene]);

  useLayoutEffect(() => {
    if (!tableWrapRef.current) return;
    const box = new THREE.Box3().setFromObject(tableWrapRef.current);
    const top = box.max.y;
    const lift = top + 0.04;
    setBoardLiftY(lift);
    onBoardSurfaceY(lift);
  }, [tableClone, onBoardSurfaceY]);

  return (
    <>
      <StoneFloor />
      <ChessChairs />
      <group ref={tableWrapRef} scale={TABLE_SCALE}>
        <primitive object={tableClone} />
      </group>
      <group position={[0, boardLiftY, 0]}>
        <BoardFrame />
        <Tiles selected={selected} legalSquares={legalSquares} onSquareClick={onSquareClick} />
        <Pieces fen={fen} />
      </group>
    </>
  );
}

export interface ChessSceneProps {
  fen: string;
  selected: string | null;
  legalSquares: string[];
  onSquareClick: (sq: string) => void;
  /** Vue depuis le camp des blancs (rangée 1, z+) ou des noirs (rangée 8, z−). */
  playerColor?: 'w' | 'b';
}

export default function ChessScene({
  fen,
  selected,
  legalSquares,
  onSquareClick,
  playerColor = 'w',
}: ChessSceneProps) {
  const [orbitTargetY, setOrbitTargetY] = useState(1);
  const onBoardSurfaceY = useCallback((y: number) => setOrbitTargetY(y), []);

  /** Plus haut + léger recul pour une vue plus plongeante (blancs z+, noirs z−). */
  const camPos = useMemo<[number, number, number]>(
    () => (playerColor === 'b' ? [0, 18.5, -11.2] : [0, 18.5, 11.2]),
    [playerColor],
  );
  const sunPos = useMemo<[number, number, number]>(
    () => (playerColor === 'b' ? [-10, 18, -10] : [10, 18, 10]),
    [playerColor],
  );

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: camPos, fov: 45 }}
      className="h-full w-full touch-none"
      style={{ background: SKY_COLOR }}
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl, scene }) => {
        const sky = new THREE.Color(SKY_COLOR);
        scene.background = sky;
        gl.setClearColor(SKY_COLOR, 1);
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
      }}
    >
      <color attach="background" args={[SKY_COLOR]} />
      {/* Ciel bleu type jour clair (dôme + diffusion atmosphérique) */}
      <Sky
        distance={450000}
        sunPosition={[120, 85, 140]}
        mieCoefficient={0.004}
        mieDirectionalG={0.75}
        rayleigh={1.35}
        turbidity={4}
      />

      <ambientLight intensity={0.62} color="#e8f2ff" />
      <directionalLight
        position={sunPos}
        intensity={1}
        color="#fff8ee"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={55}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      <Suspense fallback={null}>
        <ChessPlayfield
          fen={fen}
          selected={selected}
          legalSquares={legalSquares}
          onSquareClick={onSquareClick}
          onBoardSurfaceY={onBoardSurfaceY}
        />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.32}
        maxPolarAngle={Math.PI / 2.25}
        minDistance={9.5}
        maxDistance={32}
        target={[0, orbitTargetY, 0]}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
