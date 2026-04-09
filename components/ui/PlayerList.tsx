'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PlayerInfo } from '@/types/game';

interface PlayerListProps {
  players: PlayerInfo[];
  currentPlayerIndex: number;
  myPlayerId: string;
}

export default function PlayerList({ players, currentPlayerIndex, myPlayerId }: PlayerListProps) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
      <AnimatePresence>
        {players.map((player, index) => {
          const isActive = index === currentPlayerIndex;
          const isMe = player.id === myPlayerId;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: isActive ? 1.04 : 1,
              }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className={`flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl backdrop-blur-sm transition-all ${
                isActive
                  ? 'bg-white/20 border-2 border-white/40 shadow-lg'
                  : 'bg-black/40 border border-white/8'
              }`}
            >
              {/* Avatar coloré */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 shadow-md"
                style={{ backgroundColor: player.color }}
              >
                {player.name[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Nom + barre de progression */}
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold leading-none truncate max-w-[120px]">
                  {player.name}
                  {isMe && <span className="text-white/50 font-normal"> (moi)</span>}
                  {player.panne && <span className="ml-1 text-yellow-400">🔧</span>}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 bg-white/15 rounded-full w-20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: player.color }}
                      animate={{ width: `${player.position}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-white/60 text-xs font-mono tabular-nums">
                    {player.position}/100
                  </span>
                </div>
              </div>

              {/* Indicateur de tour */}
              {isActive && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="ml-auto text-yellow-400 text-base"
                >
                  ▶
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
