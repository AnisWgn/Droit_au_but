'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Board from './Board';
import Pawn from './Pawn';
import { PlayerInfo } from '@/types/game';

interface SceneProps {
  players: PlayerInfo[];
  currentPlayerIndex: number;
}

function FloatingLights() {
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(t * 0.3) * 8;
      light1Ref.current.position.z = Math.cos(t * 0.3) * 8;
    }
    if (light2Ref.current) {
      light2Ref.current.position.x = Math.sin(t * 0.3 + Math.PI) * 8;
      light2Ref.current.position.z = Math.cos(t * 0.3 + Math.PI) * 8;
    }
  });

  return (
    <>
      <pointLight ref={light1Ref} position={[8, 6, 0]} intensity={0.8} color="#7c3aed" distance={25} />
      <pointLight ref={light2Ref} position={[-8, 6, 0]} intensity={0.8} color="#2563eb" distance={25} />
    </>
  );
}

export default function Scene({ players, currentPlayerIndex }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 12, 16], fov: 50 }}
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#070714']} />

      {/* Éclairage principal — fort pour tout bien voir */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-6, 8, -6]} intensity={0.6} color="#a5b4fc" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#e0e7ff" distance={30} />
      <FloatingLights />

      <Stars radius={100} depth={60} count={4000} factor={4} saturation={0} fade speed={0.6} />

      {/* Caméra orbitale — angle bas pour bien voir les côtés des cases */}
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={10}
        maxDistance={30}
        target={[0, 0, 0]}
      />

      <Suspense fallback={null}>
        {/* Sol loin en dessous */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#050510" />
        </mesh>

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
    </Canvas>
  );
}
