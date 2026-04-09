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
      className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-auto z-30"
    >
      <motion.div
        initial={{ scale: 0.4, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 120 }}
        className="text-center px-8"
      >
        {/* Trophée animé */}
        <motion.div
          animate={{ rotate: [-6, 6, -6], y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-8xl mb-4 leading-none"
        >
          🏆
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-black text-white mb-4"
        >
          Victoire !
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          <div
            className="w-12 h-12 rounded-full shadow-lg"
            style={{ backgroundColor: winner.color }}
          />
          <p className="text-3xl font-bold text-white">{winner.name}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/50 text-lg mb-10"
        >
          a atteint la case 100 !
        </motion.p>

        {isHost ? (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xl rounded-2xl shadow-xl shadow-green-500/30"
          >
            🔄 Rejouer
          </motion.button>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ delay: 0.65, repeat: Infinity, duration: 2 }}
            className="text-white/40 text-base"
          >
            En attente de l&apos;hôte pour rejouer...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
