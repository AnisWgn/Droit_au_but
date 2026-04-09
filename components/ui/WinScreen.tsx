'use client';

import { motion } from 'framer-motion';
import { PlayerInfo } from '@/types/game';

interface WinScreenProps {
  winner?: PlayerInfo;
  onRestart: () => void;
  isHost: boolean;
}

export default function WinScreen({ winner, onRestart, isHost }: WinScreenProps) {
  if (!winner) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto z-30"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 0.1 }}
        className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center"
      >
        {/* Icône victoire */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white text-2xl font-bold mb-4"
        >
          Victoire
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-3 mb-2"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: winner.color }}
          >
            {winner.name[0]?.toUpperCase()}
          </div>
          <p className="text-white text-lg font-semibold">{winner.name}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/30 text-sm mb-8"
        >
          a atteint la case 100
        </motion.p>

        {isHost ? (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRestart}
            className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Rejouer
          </motion.button>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/25 text-xs font-medium"
          >
            En attente de l&apos;hôte pour rejouer…
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
