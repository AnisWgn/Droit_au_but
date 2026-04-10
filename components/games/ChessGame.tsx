'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Chess, type Square } from 'chess.js';

import QuestionModal from '@/components/ui/QuestionModal';
import WinScreen from '@/components/ui/WinScreen';
import { PlayerInfo, Question } from '@/types/game';

const ChessScene = dynamic(() => import('@/components/three/chess/ChessScene'), { ssr: false });

interface ChessRoomState {
  code: string;
  phase: 'lobby' | 'playing' | 'finished';
  hostId: string;
  winnerId: string | null;
  currentPlayerIndex: number;
  activeQuestion: Question | null;
  players: PlayerInfo[];
  chessFen?: string;
  chessPending?: { from: string; to: string; promotion: string | null } | null;
}

interface ChessGameProps {
  room: ChessRoomState;
  myId: string;
  amHost: boolean;
  emit: (ev: string, data?: Record<string, unknown>) => void;
  onQuit: () => void;
}

export default function ChessGame({ room, myId, amHost, emit, onQuit }: ChessGameProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const fen = room.chessFen ?? new Chess().fen();

  useEffect(() => {
    setSelected(null);
  }, [fen]);

  const myIndex = useMemo(() => room.players.findIndex((p) => p.id === myId), [room.players, myId]);
  const myColor: 'w' | 'b' = myIndex === 0 ? 'w' : 'b';

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const turn = chess.turn();
  const isMyTurn =
    room.phase === 'playing' &&
    !room.winnerId &&
    !room.activeQuestion &&
    ((turn === 'w' && myIndex === 0) || (turn === 'b' && myIndex === 1));

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    try {
      const c = new Chess(fen);
      return c.moves({ square: selected as Square, verbose: true }).map((m) => m.to);
    } catch {
      return [];
    }
  }, [selected, fen]);

  const onSquareClick = useCallback(
    (sq: string) => {
      if (!isMyTurn || room.activeQuestion) return;
      try {
        const c = new Chess(fen);
        if (!selected) {
          const piece = c.get(sq as Square);
          if (piece && piece.color === turn && piece.color === myColor) {
            setSelected(sq);
          }
          return;
        }
        if (sq === selected) {
          setSelected(null);
          return;
        }
        const moves = c.moves({ square: selected as Square, verbose: true });
        const m = moves.find((x) => x.to === sq);
        if (!m) {
          const piece = c.get(sq as Square);
          if (piece && piece.color === turn && piece.color === myColor) {
            setSelected(sq);
          } else {
            setSelected(null);
          }
          return;
        }
        emit('chessAttemptMove', {
          from: m.from,
          to: m.to,
          promotion: m.promotion ?? undefined,
        });
        setSelected(null);
      } catch {
        setSelected(null);
      }
    },
    [isMyTurn, room.activeQuestion, fen, selected, turn, myColor, emit]
  );

  const pWhite = room.players[0];
  const pBlack = room.players[1];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#121620]">
      <div className="absolute inset-0 z-0">
        <ChessScene
          fen={fen}
          selected={selected}
          legalSquares={legalTargets}
          onSquareClick={onSquareClick}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="pointer-events-auto absolute left-4 top-4 z-20 max-w-[220px] rounded-2xl border border-white/[0.08] bg-black/40 p-4 backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Partie</p>
          <p className="mt-1 font-mono text-sm text-white">Salon {room.code}</p>
          <div className="mt-3 space-y-2 text-xs">
            {pWhite && (
              <div className="flex items-center justify-between gap-2 text-white/80">
                <span className="truncate">♔ {pWhite.name}</span>
                <span className="shrink-0 text-[10px] text-white/35">{turn === 'w' ? '→ tour' : ''}</span>
              </div>
            )}
            {pBlack && (
              <div className="flex items-center justify-between gap-2 text-white/80">
                <span className="truncate">♚ {pBlack.name}</span>
                <span className="shrink-0 text-[10px] text-white/35">{turn === 'b' ? '→ tour' : ''}</span>
              </div>
            )}
          </div>
          {isMyTurn && (
            <p className="mt-3 text-[11px] font-medium text-emerald-300/80">À toi de jouer — choisis une pièce puis une case.</p>
          )}
          {!isMyTurn && room.phase === 'playing' && !room.winnerId && !room.activeQuestion && (
            <p className="mt-3 text-[11px] text-white/40">Tour de l&apos;adversaire.</p>
          )}
          {room.chessPending && room.activeQuestion && (
            <p className="mt-3 text-[11px] text-amber-200/80">Réponds au quiz pour valider le coup.</p>
          )}
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={() => setShowQuitConfirm(true)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/50 hover:border-red-400/40 hover:text-red-400"
          >
            Quitter
          </button>
        </div>
      </div>

      <AnimatePresence>
        {room.activeQuestion && room.activeQuestion.forPlayerId === myId && (
          <QuestionModal
            question={room.activeQuestion}
            onAnswer={(ci) => emit('submitAnswer', { questionId: room.activeQuestion!.id, choiceIndex: ci })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div className="glass-strong max-w-sm rounded-2xl p-7 text-center">
              <h2 className="text-lg font-semibold text-white">Quitter la partie ?</h2>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm text-white/80"
                  onClick={() => setShowQuitConfirm(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white"
                  onClick={() => {
                    setShowQuitConfirm(false);
                    onQuit();
                  }}
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {room.phase === 'finished' && (
          <WinScreen
            isDraw={!room.winnerId}
            winner={room.winnerId ? room.players.find((p) => p.id === room.winnerId) : undefined}
            isHost={amHost}
            onRestart={() => emit('startGame')}
            variant="chess"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
