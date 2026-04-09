'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Cylinder, Sky } from '@react-three/drei';
import * as THREE from 'three';
import Board, { getPawnWorldPosition } from './Board';
import Moon from './Moon';
import Pawn from './Pawn';
import { PlayerInfo } from '@/types/game';

interface SceneProps {
  players: PlayerInfo[];
  currentPlayerIndex: number;
  /** Vue fixe : caméra verrouillée sur le pion du joueur dont c’est le tour. */
  cameraFixed?: boolean;
}

/** Décalage caméra → pion (même rapport que la vue par défaut [0,16,18] vers ~[0,0.5,0]). */
const FOLLOW_OFFSET = new THREE.Vector3(0, 15.5, 17.5);

function CameraFollowActivePawn({
  enabled,
  players,
  currentPlayerIndex,
}: {
  enabled: boolean;
  players: PlayerInfo[];
  currentPlayerIndex: number;
}) {
  const { camera } = useThree();
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const snapNext = useRef(true);

  useFrame((_, delta) => {
    if (!enabled) {
      snapNext.current = true;
      return;
    }

    const p = players[currentPlayerIndex];
    if (!p) return;

    const [lx, ly, lz] = getPawnWorldPosition(currentPlayerIndex, p.position);
    look.set(lx, ly + 0.12, lz);
    desiredPos.copy(look).add(FOLLOW_OFFSET);

    if (snapNext.current) {
      camera.position.copy(desiredPos);
      camera.lookAt(look);
      snapNext.current = false;
      return;
    }

    const t = 1 - Math.exp(-5 * delta);
    camera.position.lerp(desiredPos, t);
    camera.lookAt(look);
  });

  return null;
}

// ─── Ciel (shader atmosphérique drei / three-stdlib) ─────────────────────────

function EveningSky() {
  return (
    <Sky
      distance={450000}
      mieCoefficient={0.004}
      mieDirectionalG={0.76}
      rayleigh={2.2}
      turbidity={5.5}
      inclination={0.52}
      azimuth={0.32}
    />
  );
}

// ─── Sol : marbre foncé ──────────────────────────────────────────────────────

function MarbleFloor() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Reflet subtil */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#252545" roughness={0.15} metalness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Colonne corinthienne (simplifiée) ───────────────────────────────────────

function Column({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base carrée */}
      <mesh castShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[0.5, 0.24, 0.5]} />
        <meshStandardMaterial color="#d4cfc4" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Fût */}
      <Cylinder args={[0.15, 0.18, 3.5, 12]} position={[0, 2, 0]} castShadow>
        <meshStandardMaterial color="#e8e2d6" roughness={0.4} metalness={0.08} />
      </Cylinder>
      {/* Cannelures (anneaux décoratifs) */}
      <Cylinder args={[0.19, 0.19, 0.06, 12]} position={[0, 0.28, 0]}>
        <meshStandardMaterial color="#d4cfc4" roughness={0.4} metalness={0.1} />
      </Cylinder>
      <Cylinder args={[0.17, 0.17, 0.06, 12]} position={[0, 3.7, 0]}>
        <meshStandardMaterial color="#d4cfc4" roughness={0.4} metalness={0.1} />
      </Cylinder>
      {/* Chapiteau */}
      <mesh castShadow position={[0, 3.85, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#d4cfc4" roughness={0.45} metalness={0.12} />
      </mesh>
    </group>
  );
}

// ─── Lampadaire / torche murale ──────────────────────────────────────────────

function WallLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Support */}
      <Cylinder args={[0.03, 0.04, 1.5, 8]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#8b7355" roughness={0.4} metalness={0.5} />
      </Cylinder>
      {/* Vasque */}
      <Cylinder args={[0.12, 0.06, 0.15, 8]} position={[0, 1.55, 0]}>
        <meshStandardMaterial color="#8b7355" roughness={0.3} metalness={0.6} />
      </Cylinder>
      {/* Flamme / lumière */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2}
          roughness={0.1}
        />
      </mesh>
      <pointLight position={[0, 1.7, 0]} intensity={0.8} color="#fde68a" distance={8} />
    </group>
  );
}

// ─── Estrade / podium sous le plateau ────────────────────────────────────────

function Podium() {
  return (
    <group>
      {/* Marche basse */}
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[14, 0.08, 15]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.35} metalness={0.12} />
      </mesh>
      {/* Liseré doré */}
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[14.05, 0.005, 15.05]} />
        <meshStandardMaterial color="#d4a04a" roughness={0.2} metalness={0.7} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ─── Barrière / balustrade (côtés) ───────────────────────────────────────────

function Railing({ position, length, rotation }: {
  position: [number, number, number];
  length: number;
  rotation: [number, number, number];
}) {
  const posts = Math.floor(length / 1.2);
  return (
    <group position={position} rotation={rotation}>
      {/* Barre horizontale */}
      <Cylinder args={[0.02, 0.02, length, 8]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#8b7355" roughness={0.35} metalness={0.5} />
      </Cylinder>
      {/* Barreaux verticaux */}
      {Array.from({ length: posts + 1 }).map((_, i) => (
        <Cylinder
          key={i}
          args={[0.015, 0.015, 0.6, 6]}
          position={[-length / 2 + i * (length / posts), 0.3, 0]}
        >
          <meshStandardMaterial color="#8b7355" roughness={0.35} metalness={0.5} />
        </Cylinder>
      ))}
    </group>
  );
}

// ─── Scène principale ────────────────────────────────────────────────────────

export default function Scene({ players, currentPlayerIndex, cameraFixed = false }: SceneProps) {
  const followCamera = cameraFixed && players.length > 0 && players[currentPlayerIndex] != null;

  return (
    <Canvas
      camera={{ position: [0, 16, 18], fov: 44 }}
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      {/* Fond proche du zénith du Sky (évite les bords si le dôme ne couvre pas tout) */}
      <color attach="background" args={['#8fa6c4']} />
      {/* Brouillard harmonisé avec l’horizon du Sky */}
      <fog attach="fog" args={['#9aaed0', 38, 85]} />

      <EveningSky />

      {/* Éclairage ambiant chaud (intérieur de palais) */}
      <ambientLight intensity={0.4} color="#fde8c8" />

      {/* Lumière principale */}
      <directionalLight
        position={[6, 18, 8]}
        intensity={0.9}
        color="#fef3c7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={45}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />
      {/* Contre-jour froid */}
      <directionalLight position={[-5, 10, -8]} intensity={0.2} color="#a5b4fc" />

      {/* Zénithale douce */}
      <pointLight position={[0, 14, 0]} intensity={0.6} color="#fde68a" distance={30} />

      {!followCamera && (
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 18}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minDistance={10}
          maxDistance={42}
          target={[0, 0.5, 0]}
          enableDamping
          dampingFactor={0.06}
        />
      )}

      <Suspense fallback={null}>
        <Moon />
        <MarbleFloor />
        <Podium />

        {/* 8 colonnes autour du plateau */}
        <Column position={[-8, 0, -8]} />
        <Column position={[8, 0, -8]} />
        <Column position={[-8, 0, 0]} />
        <Column position={[8, 0, 0]} />
        <Column position={[-8, 0, 8]} />
        <Column position={[8, 0, 8]} />
        <Column position={[-8, 0, -4]} />
        <Column position={[8, 0, -4]} />

        {/* Torches / lampadaires */}
        <WallLamp position={[-9, 0, -6]} />
        <WallLamp position={[9, 0, -6]} />
        <WallLamp position={[-9, 0, 4]} />
        <WallLamp position={[9, 0, 4]} />

        {/* Balustrades devant et derrière */}
        <Railing position={[0, 0, -9]} length={14} rotation={[0, 0, 0]} />
        <Railing position={[0, 0, 9]} length={14} rotation={[0, 0, 0]} />

        <Board />

        {players.map((player, index) => (
          <Pawn
            key={player.id}
            player={player}
            playerIndex={index}
            isActive={index === currentPlayerIndex}
          />
        ))}
      </Suspense>

      {followCamera && (
        <CameraFollowActivePawn
          enabled={followCamera}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
        />
      )}
    </Canvas>
  );
}
