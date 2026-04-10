export const GAME_REGISTRY = {
  'droit-au-but': {
    id: 'droit-au-but',
    name: 'Droit au But',
    description: 'Plateau 3D, quiz et progression jusqu’à la case 100.',
  },
  echecs: {
    id: 'echecs',
    name: 'Échecs quiz',
    description: 'Parties classiques : chaque coup doit être validé par une question (tous niveaux mélangés).',
  },
} as const;

export type GameId = keyof typeof GAME_REGISTRY;

export const GAME_IDS = Object.keys(GAME_REGISTRY) as GameId[];

export const DEFAULT_GAME_ID: GameId = 'droit-au-but';

export function isGameId(s: string): s is GameId {
  return s in GAME_REGISTRY;
}

export function normalizeGameId(s: string | undefined | null): GameId {
  const t = typeof s === 'string' ? s.trim() : '';
  if (t && isGameId(t)) return t;
  return DEFAULT_GAME_ID;
}

export function getGameLabel(id: GameId): string {
  return GAME_REGISTRY[id]?.name ?? id;
}
