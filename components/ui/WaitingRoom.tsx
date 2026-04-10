'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerInfo } from '@/types/game';
import type { GameId } from '@/lib/games';
import GamePicker from './GamePicker';

interface WaitingRoomProps {
  roomCode: string;
  hostId: string;
  gameId: GameId;
  players: PlayerInfo[];
  myId: string;
  amHost: boolean;
  onSetGame: (id: GameId) => void;
  onStart: () => void;
  onQuit: () => void;
  /** Erreur renvoyée par le serveur (ex. échecs sans 2 joueurs). */
  lobbyError?: string | null;
  onDismissLobbyError?: () => void;
}

export default function WaitingRoom({
  roomCode,
  hostId,
  gameId,
  players,
  myId,
  amHost,
  onSetGame,
  onStart,
  onQuit,
  lobbyError,
  onDismissLobbyError,
}: WaitingRoomProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyRoomCode = useCallback(async () => {
    const ok = await (async () => {
      try {
        await navigator.clipboard.writeText(roomCode);
        return true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = roomCode;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          const success = document.execCommand('copy');
          document.body.removeChild(ta);
          return success;
        } catch {
          return false;
        }
      }
    })();
    if (!ok) return;
    setCodeCopied(true);
    if (copyCodeTimerRef.current) clearTimeout(copyCodeTimerRef.current);
    copyCodeTimerRef.current = setTimeout(() => setCodeCopied(false), 2000);
  }, [roomCode]);

  useEffect(() => {
    return () => {
      if (copyCodeTimerRef.current) clearTimeout(copyCodeTimerRef.current);
    };
  }, []);

  const roster = [...players].sort((a, b) => {
    if (a.id === hostId && b.id !== hostId) return -1;
    if (b.id === hostId && a.id !== hostId) return 1;
    return a.name.localeCompare(b.name, 'fr');
  });

  return (
    <div className="relative min-h-screen w-full overflow-auto bg-[#1e2638] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-90" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/18 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[480px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-600/12 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">Salle d&apos;attente</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Salon multijoueur</h1>
            <p className="mt-2 text-sm text-white/45 max-w-md">
              Tous les joueurs sont listés ici. Le jeu (plateau 3D ou autre mode) ne s&apos;affiche qu&apos;après le lancement par l&apos;hôte.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyRoomCode}
              title="Copier le code"
              className="glass-strong flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Code</span>
              <span className="font-mono text-lg font-bold tracking-[0.2em]">{roomCode}</span>
              {codeCopied ? (
                <span className="text-emerald-400 text-xs font-semibold">Copié</span>
              ) : (
                <svg className="h-4 w-4 shrink-0 text-white/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowQuitConfirm(true)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              Quitter le salon
            </button>
          </div>
        </header>

        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Joueurs dans le salon ({players.length})
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {roster.map((player, index) => {
                const isMe = player.id === myId;
                const isPlayerHost = player.id === hostId;
                return (
                  <motion.li
                    key={player.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: index * 0.04 }}
                    className="glass-strong flex items-center gap-3 rounded-2xl border border-white/[0.07] px-4 py-3"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-white">{player.name}</span>
                        {isPlayerHost && (
                          <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            Hôte
                          </span>
                        )}
                        {isMe && (
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">Toi</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35">En attente du lancement</p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <div className="glass-strong space-y-6 rounded-[28px] border border-white/[0.09] p-6 sm:p-8">
          {lobbyError && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-red-100/95">{lobbyError}</p>
              {onDismissLobbyError && (
                <button
                  type="button"
                  onClick={onDismissLobbyError}
                  className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/15"
                >
                  Fermer
                </button>
              )}
            </div>
          )}
          {amHost ? (
            <GamePicker value={gameId} onChange={onSetGame} playerCount={players.length} />
          ) : (
            <GamePicker value={gameId} readOnly playerCount={players.length} />
          )}

          <div className="border-t border-white/[0.06] pt-6">
            {amHost ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onStart}
                className="w-full rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors hover:bg-blue-400"
              >
                Lancer la partie
              </motion.button>
            ) : (
              <p className="text-center text-sm text-white/40">
                En attente que l&apos;hôte lance la partie…
              </p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="glass-strong w-full max-w-sm rounded-2xl border border-white/[0.08] p-7 text-center"
            >
              <h2 className="text-lg font-semibold text-white">Quitter le salon ?</h2>
              <p className="mt-2 text-sm text-white/45">
                Tu retourneras à l&apos;écran pour créer ou rejoindre une salle.
              </p>
              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuitConfirm(false);
                    onQuit();
                  }}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400"
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
