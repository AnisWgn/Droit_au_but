export const DIFFICULTY_CONFIG = {
  simple: { advance: 2, back: 1 },
  moyen: { advance: 5, back: 2 },
  compliqué: { advance: 10, back: 5 },
} as const;

export function isRadarCell(position: number): boolean {
  return position > 0 && position < 100 && position % 10 === 0;
}

export function advanceTurn(current: number, total: number): number {
  if (total === 0) return 0;
  return (current + 1) % total;
}

export const PLAYER_COLORS = [
  '#e63946',
  '#457b9d',
  '#2a9d8f',
  '#f4a261',
  '#9b5de5',
  '#00bbf9',
];
