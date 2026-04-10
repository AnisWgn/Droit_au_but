'use client';

import { motion } from 'framer-motion';
import PlayerList from '@/components/ui/PlayerList';
import { PlayerInfo } from '@/types/game';
import { GAME_REGISTRY, normalizeGameId } from '@/lib/games';

interface ComingSoonGameProps {
  gameId: string;
  roomCode: string;
  players: PlayerInfo[];
  currentPlayerIndex: number;
  myId: string;
  onQuit: () => void;
}

export default function ComingSoonGame({
  gameId,
  roomCode,
  players,
  currentPlayerIndex,
  myId,
  onQuit,
}: ComingSoonGameProps) {
  const id = normalizeGameId(gameId);
  const meta = GAME_REGISTRY[id];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#141824]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 h-[50vh] w-[90vw] max-w-3xl -translate-x-1/2 rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[60vw] translate-x-1/4 rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Salon {roomCode}</p>
          <h1 className="mt-3 text-2xl font-bold text-white">{meta.name}</h1>
          <p className="mt-3 text-white/50 text-sm leading-relaxed">
            Ce mode est sélectionné par l&apos;hôte. La partie multijoueur dédiée sera branchée ici (même salon Socket.IO).
          </p>
          <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-amber-200/90">
            Contenu de jeu à venir — revenez sur <span className="mx-1 font-semibold text-white">Droit au But</span> pour jouer tout de suite.
          </p>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <PlayerList players={players} currentPlayerIndex={currentPlayerIndex} myPlayerId={myId} />
      </div>

      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <div className="glass rounded-lg px-3 py-1.5 text-white/40 text-xs font-medium uppercase tracking-wider">
          Salon <span className="font-mono text-white/80">{roomCode}</span>
        </div>
        <button
          type="button"
          onClick={onQuit}
          className="glass rounded-lg px-3 py-1.5 text-white/40 hover:text-red-400 text-xs font-medium transition-colors pointer-events-auto"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
