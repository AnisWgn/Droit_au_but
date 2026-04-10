'use client';

import { GAME_IDS, GAME_REGISTRY, type GameId } from '@/lib/games';

interface GamePickerProps {
  value: GameId;
  /** Hôte : change le jeu du salon (émet côté parent). */
  onChange?: (id: GameId) => void;
  disabled?: boolean;
  /** Invités : affichage seul, sans clic. */
  readOnly?: boolean;
  /**
   * Nombre de joueurs dans le salon. Au-delà de 2, le mode échecs est désactivé
   * (même règle que le serveur : `setRoomGame` / lancement).
   */
  playerCount?: number;
}

export default function GamePicker({ value, onChange, disabled, readOnly, playerCount }: GamePickerProps) {
  if (readOnly) {
    const g = GAME_REGISTRY[value];
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Mode de jeu</p>
        <p className="text-white font-semibold text-sm mt-0.5">{g.name}</p>
        <p className="text-white/45 text-xs mt-1 leading-snug">{g.description}</p>
        <p className="text-white/30 text-[11px] mt-2">L&apos;hôte choisit le jeu avant le lancement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 text-left">Choisir le jeu</p>
      <div className="grid gap-2">
        {GAME_IDS.map((id) => {
          const g = GAME_REGISTRY[id];
          const selected = value === id;
          const chessLocked = id === 'echecs' && playerCount != null && playerCount > 2;
          const isDisabled = !!disabled || chessLocked;
          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange?.(id)}
              title={chessLocked ? 'Les échecs sont limités à 2 joueurs dans ce salon.' : undefined}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors active:scale-[0.99] disabled:opacity-50 ${
                selected
                  ? 'border-blue-500/50 bg-blue-500/15 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
                  : chessLocked
                    ? 'border-amber-500/25 bg-white/[0.02] cursor-not-allowed'
                    : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
              }`}
            >
              <p className={`text-sm font-semibold ${selected ? 'text-white' : chessLocked ? 'text-white/50' : 'text-white/85'}`}>{g.name}</p>
              <p className="text-white/45 text-xs mt-1 leading-relaxed">{g.description}</p>
              {chessLocked && (
                <p className="mt-2 text-left text-[11px] font-medium leading-snug text-amber-200/85">
                  Disponible seulement avec 2 joueurs (salon actuel : {playerCount}).
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
