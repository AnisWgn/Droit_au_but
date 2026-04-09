'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Question } from '@/types/game';

interface QuestionModalProps {
  question: Question;
  onAnswer: (choiceIndex: number) => void;
}

const LABELS = ['A', 'B', 'C', 'D'];

const FEEDBACK_BEFORE_SUBMIT_MS = 2400;

const DIFFICULTY_TAG: Record<string, { label: string; color: string; bg: string }> = {
  simple: { label: 'Facile', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  moyen: { label: 'Moyen', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  compliqué: { label: 'Difficile', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function QuestionModal({ question, onAnswer }: QuestionModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSelect(index: number) {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    setTimeout(() => onAnswer(index), FEEDBACK_BEFORE_SUBMIT_MS);
  }

  const wasCorrect = selected !== null && selected === question.correctIndex;
  const isRadar = question.kind === 'radar';
  const tag = DIFFICULTY_TAG[question.difficulty] ?? DIFFICULTY_TAG.simple;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4 z-20"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="relative glass-strong rounded-2xl p-6 max-w-lg w-full shadow-2xl"
      >
        {/* Tag difficulté */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${
            isRadar
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : `${tag.bg} ${tag.color}`
          }`}>
            {isRadar ? 'Radar' : tag.label}
          </span>
          {isRadar && (
            <span className="text-white/30 text-xs font-medium">Case spéciale</span>
          )}
        </div>

        {/* Question */}
        <p className="text-white text-base font-medium leading-relaxed mb-6">
          {question.question}
        </p>

        {/* Choix */}
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, index) => {
            const isCorrectChoice = index === question.correctIndex;
            const isWrongPick = answered && selected === index && !isCorrectChoice;

            let rowStyle = 'bg-white/[0.03] border-white/[0.06] text-white/80 hover:bg-white/[0.06] hover:border-white/[0.12]';
            let labelStyle = 'bg-white/[0.08] text-white/60';

            if (answered) {
              if (isCorrectChoice) {
                rowStyle = 'bg-emerald-500/10 border-emerald-500/25 text-white';
                labelStyle = 'bg-emerald-500 text-white';
              } else if (isWrongPick) {
                rowStyle = 'bg-red-500/10 border-red-500/25 text-white';
                labelStyle = 'bg-red-500 text-white';
              } else {
                rowStyle = 'bg-white/[0.01] border-white/[0.04] text-white/25';
                labelStyle = 'bg-white/[0.04] text-white/20';
              }
            } else if (selected === index) {
              rowStyle = 'bg-blue-500/15 border-blue-500/30 text-white';
              labelStyle = 'bg-blue-500 text-white';
            }

            return (
              <motion.button
                key={index}
                whileHover={!answered ? { x: 3 } : {}}
                whileTap={!answered ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(index)}
                disabled={answered}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 border ${rowStyle}`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200 ${labelStyle}`}>
                  {LABELS[index]}
                </span>
                <span className="text-sm leading-snug">{choice}</span>

                {answered && isCorrectChoice && (
                  <svg className="w-4 h-4 ml-auto text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isWrongPick && (
                  <svg className="w-4 h-4 ml-auto text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        {answered && selected !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 pt-4 border-t border-white/[0.06] text-center"
          >
            <p className={`text-sm font-semibold ${wasCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {wasCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
