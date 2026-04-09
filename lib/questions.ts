import { supabase } from './supabase';
import { Question } from '@/types/game';
import simpleQuestions from '@/Question/simple.json';
import moyenQuestions from '@/Question/moyen.json';
import difficileQuestions from '@/Question/difficile.json';

type Difficulty = 'simple' | 'moyen' | 'compliqué';

interface RawQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex?: number;
  correct_index?: number;
}

const LOCAL_QUESTIONS: Record<string, RawQuestion[]> = {
  simple: simpleQuestions as RawQuestion[],
  moyen: moyenQuestions as RawQuestion[],
  compliqué: difficileQuestions as RawQuestion[],
};

function shuffleQuestion(q: RawQuestion): Omit<Question, 'difficulty' | 'kind' | 'forPlayerId'> {
  const n = q.choices.length;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const correctIdx = q.correctIndex ?? q.correct_index ?? 0;
  return {
    id: q.id,
    question: q.question,
    choices: order.map((i) => q.choices[i]),
    correctIndex: order.indexOf(correctIdx),
  };
}

function pickRandom<T>(pool: T[], excludeIds: Set<string>, getId: (item: T) => string): T | null {
  const available = pool.filter((q) => !excludeIds.has(getId(q)));
  const source = available.length > 0 ? available : pool;
  if (source.length === 0) return null;
  return source[Math.floor(Math.random() * source.length)];
}

export async function getQuestion(
  difficulty: Difficulty,
  excludeIds: string[] = []
): Promise<Omit<Question, 'kind' | 'forPlayerId'> | null> {
  const dbDifficulty = difficulty === 'compliqué' ? 'difficile' : difficulty;
  const excludeSet = new Set(excludeIds);

  if (supabase) {
    try {
      const { data, error } = await supabase.from('questions').select('*').eq('difficulty', dbDifficulty);
      if (!error && data && data.length > 0) {
        const q = pickRandom(data, excludeSet, (item) => item.id);
        if (q) {
          const shuffled = shuffleQuestion({ ...q, correctIndex: q.correct_index });
          return { ...shuffled, difficulty };
        }
      }
    } catch {
      console.warn('Supabase indisponible, utilisation des questions locales');
    }
  }

  const pool = LOCAL_QUESTIONS[difficulty] ?? LOCAL_QUESTIONS.simple;
  const q = pickRandom(pool, excludeSet, (item) => item.id);
  if (!q) return null;
  return { ...shuffleQuestion(q), difficulty };
}
