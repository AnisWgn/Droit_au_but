'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Question } from '@/types/game';

interface QuestionModalProps {
  question: Question;
  onAnswer: (choiceIndex: number) => void;
}

const LABELS = ['A', 'B', 'C', 'D'];

const DIFFICULTY_STYLE: Record<string, string> = {
  simple: 'bg-green-500 text-white',
  moyen: 'bg-orange-500 text-white',
  compliqué: 'bg-red-500 text-white',
};

export default function QuestionModal({ question, onAnswer }: QuestionModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSelect(index: number) {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    setTimeout(() => onAnswer(index), 700);
  }

  const isRadar = question.kind === 'radar';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 24 }}
      transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4 z-20"
    >
      {/* Fond semi-transparent */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-[#1a1a3e]/95 backdrop-blur border border-white/10 rounded-3xl p-7 max-w-md w-full shadow-2xl">
        {/* Badge de difficulté */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isRadar ? 'bg-yellow-500 text-black' : DIFFICULTY_STYLE[question.difficulty]
            }`}
          >
            {isRadar ? 'Radar' : question.difficulty}
          </span>
          {isRadar && <span className="text-yellow-400 text-sm font-semibold">Case spéciale</span>}
        </div>

        {/* Question */}
        <p className="text-white text-lg font-semibold leading-relaxed mb-7">
          {question.question}
        </p>

        {/* Choix */}
        <div className="flex flex-col gap-3">
          {question.choices.map((choice, index) => (
            <motion.button
              key={index}
              whileHover={!answered ? { scale: 1.02, x: 4 } : {}}
              whileTap={!answered ? { scale: 0.97 } : {}}
              onClick={() => handleSelect(index)}
              disabled={answered}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all border-2 ${
                selected === index
                  ? 'bg-blue-500 border-blue-300 text-white'
                  : answered
                  ? 'bg-white/3 border-white/5 text-white/40'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  selected === index ? 'bg-white text-blue-600' : 'bg-white/15 text-white'
                }`}
              >
                {LABELS[index]}
              </span>
              <span className="text-sm leading-snug">{choice}</span>
            </motion.button>
          ))}
        </div>

        {answered && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white/50 text-sm mt-5"
          >
            Traitement de la réponse...
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
