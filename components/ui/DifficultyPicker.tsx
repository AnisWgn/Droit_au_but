'use client';

import { motion } from 'framer-motion';

interface DifficultyPickerProps {
  panne: boolean;
  onPick: (difficulty: string) => void;
}

const DIFFICULTIES = [
  {
    key: 'simple',
    label: 'Simple',
    icon: '🟢',
    gains: '+2',
    loss: '-1',
    gradient: 'from-green-500 to-emerald-600',
    shadow: 'shadow-green-500/40',
  },
  {
    key: 'moyen',
    label: 'Moyen',
    icon: '🟡',
    gains: '+5',
    loss: '-2',
    gradient: 'from-yellow-400 to-orange-500',
    shadow: 'shadow-orange-500/40',
  },
  {
    key: 'compliqué',
    label: 'Compliqué',
    icon: '🔴',
    gains: '+10',
    loss: '-5',
    gradient: 'from-red-500 to-rose-600',
    shadow: 'shadow-red-500/40',
  },
];

export default function DifficultyPicker({ panne, onPick }: DifficultyPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white font-black text-2xl drop-shadow-lg"
        >
          🎲 C&apos;est votre tour !
        </motion.p>
        {panne && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-yellow-400 text-sm font-semibold mt-1"
          >
            ⚠️ En panne — choisissez Simple pour repartir
          </motion.p>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        {DIFFICULTIES.map((d, i) => {
          const disabled = panne && d.key !== 'simple';
          return (
            <motion.button
              key={d.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: disabled ? 0.3 : 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={!disabled ? { scale: 1.08, y: -4 } : {}}
              whileTap={!disabled ? { scale: 0.94 } : {}}
              onClick={() => !disabled && onPick(d.key)}
              disabled={disabled}
              className={`flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl bg-gradient-to-b ${d.gradient} text-white font-bold shadow-xl ${d.shadow} transition-opacity ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <span className="text-2xl">{d.icon}</span>
              <span className="text-base leading-none">{d.label}</span>
              <div className="flex gap-2 text-xs font-normal opacity-90 mt-0.5">
                <span className="text-green-200">{d.gains}</span>
                <span className="opacity-50">/</span>
                <span className="text-red-200">{d.loss}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
