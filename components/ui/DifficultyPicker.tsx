'use client';

import { motion } from 'framer-motion';

interface DifficultyPickerProps {
  panne: boolean;
  onPick: (difficulty: string) => void;
}

const DIFFICULTIES = [
  {
    key: 'simple',
    label: 'Facile',
    gains: '+2',
    loss: '-1',
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500 hover:bg-emerald-400',
    indicator: 'bg-emerald-400',
  },
  {
    key: 'moyen',
    label: 'Moyen',
    gains: '+5',
    loss: '-2',
    color: 'text-amber-400',
    activeBg: 'bg-amber-500 hover:bg-amber-400',
    indicator: 'bg-amber-400',
  },
  {
    key: 'compliqué',
    label: 'Difficile',
    gains: '+10',
    loss: '-5',
    color: 'text-red-400',
    activeBg: 'bg-red-500 hover:bg-red-400',
    indicator: 'bg-red-400',
  },
];

export default function DifficultyPicker({ panne, onPick }: DifficultyPickerProps) {
  return (
    /* Conteneur flex : le transform Framer sur l’enfant cassait left-1/2 -translate-x-1/2 */
    <div className="pointer-events-none absolute bottom-8 inset-x-0 z-10 flex justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="pointer-events-auto w-full max-w-md"
      >
      <div className="glass-strong rounded-2xl p-5 min-w-0 sm:min-w-[340px]">
        <div className="text-center mb-4">
          <p className="text-white font-semibold text-sm">
            C&apos;est votre tour
          </p>
          {panne && (
            <p className="text-amber-400/80 text-xs font-medium mt-1">
              En panne — choisissez Facile pour repartir
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {DIFFICULTIES.map((d, i) => {
            const disabled = panne && d.key !== 'simple';
            return (
              <motion.button
                key={d.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: disabled ? 0.3 : 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                whileHover={!disabled ? { y: -2 } : {}}
                whileTap={!disabled ? { scale: 0.96 } : {}}
                onClick={() => !disabled && onPick(d.key)}
                disabled={disabled}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                  disabled
                    ? 'bg-white/[0.03] cursor-not-allowed'
                    : `${d.activeBg} cursor-pointer`
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-white/20' : d.indicator}`} />
                <span className="text-white text-sm font-semibold leading-none">{d.label}</span>
                <div className="flex gap-1.5 text-[10px] font-medium text-white/60">
                  <span>{d.gains}</span>
                  <span className="text-white/20">/</span>
                  <span>{d.loss}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      </motion.div>
    </div>
  );
}
