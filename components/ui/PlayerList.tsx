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
    <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
      <AnimatePresence>
        {players.map((player, index) => {
          const isActive = index === currentPlayerIndex;
          const isMe = player.id === myPlayerId;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'glass-strong border-blue-500/20 shadow-lg shadow-blue-500/5'
                  : 'glass'
              }`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs font-medium leading-none truncate max-w-[100px]">
                    {player.name}
                  </p>
                  {isMe && (
                    <span className="text-white/25 text-[10px] font-medium">toi</span>
                  )}
                  {player.panne && (
                    <span className="text-amber-400 text-[10px] font-semibold">panne</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 bg-white/[0.06] rounded-full w-16 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: player.color }}
                      animate={{ width: `${player.position}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-white/30 text-[10px] font-mono tabular-nums">
                    {player.position}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
