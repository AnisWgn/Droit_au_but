export interface Question {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  difficulty: 'simple' | 'moyen' | 'compliqué';
  kind: 'normal' | 'radar' | 'chess';
  forPlayerId: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  position: number;
  panne: boolean;
  color: string;
}

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface AnswerFeedback {
  correct: boolean;
  timestamp: number;
}
