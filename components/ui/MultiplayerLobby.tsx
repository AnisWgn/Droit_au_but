'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';

const SOCKET_HINT = process.env.NEXT_PUBLIC_SOCKET_URL
  ? `Serveur : ${process.env.NEXT_PUBLIC_SOCKET_URL}`
  : 'Serveur local · port 3333';

export interface MultiplayerLobbyProps {
  name: string;
  onNameChange: (value: string) => void;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  connecting: boolean;
  error: string | null;
  onCreate: () => void;
  onJoin: () => void;
}

export default function MultiplayerLobby({
  name,
  onNameChange,
  joinCode,
  onJoinCodeChange,
  connecting,
  error,
  onCreate,
  onJoin,
}: MultiplayerLobbyProps) {
  const nameId = useId();
  const codeId = useId();
  const canJoin = joinCode.trim().length === 6;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1e2638] flex items-center justify-center p-5 sm:p-8">
      {/* Fond : halos doux */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[480px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-600/15 blur-[90px]" />
        <div className="absolute top-1/2 left-0 h-[240px] w-[320px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="glass-strong rounded-[28px] border border-white/[0.09] p-7 sm:p-9 shadow-2xl shadow-black/35">
          <header className="mb-8 text-center">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-white sm:text-3xl">
              Droit au But
            </h1>
          </header>

          <div className="space-y-6">
            <div>
              <label
                htmlFor={nameId}
                className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50"
              >
                Pseudo
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                  aria-hidden
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !connecting) onCreate();
                  }}
                  placeholder="Ex. Marco, Luna…"
                  maxLength={24}
                  autoComplete="nickname"
                  disabled={connecting}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.06] py-3.5 pl-11 pr-4 text-[15px] text-white placeholder:text-white/25 outline-none transition-colors hover:border-sky-400/35 hover:bg-white/[0.08] focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                />
              </div>
              <p className="mt-1.5 text-right text-[10px] text-white/30 tabular-nums">
                {name.length}/24
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Créer une partie
              </h2>
              <p className="mb-4 text-xs leading-relaxed text-white/40">
                Tu seras l&apos;hôte : partage le code affiché ensuite pour que les autres te rejoignent.
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreate}
                disabled={connecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-sky-500 hover:shadow-sky-500/35 disabled:pointer-events-none disabled:opacity-45"
              >
                <svg className="h-4 w-4 opacity-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nouveau salon
              </motion.button>
            </div>

            <div className="relative flex items-center gap-4 py-0.5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-widest text-white/35">
                ou rejoindre
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </span>
                Rejoindre un salon
              </h2>
              <label htmlFor={codeId} className="sr-only">
                Code du salon (6 caractères)
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  id={codeId}
                  value={joinCode}
                  onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canJoin && !connecting) onJoin();
                  }}
                  placeholder="ABCDEF"
                  maxLength={6}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={connecting}
                  className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/[0.06] py-3.5 text-center font-mono text-lg font-semibold tracking-[0.35em] text-white placeholder:text-white/20 placeholder:tracking-[0.2em] outline-none transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50 sm:tracking-[0.45em]"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onJoin}
                  disabled={connecting || !canJoin}
                  className="shrink-0 rounded-xl border border-white/12 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/25 disabled:pointer-events-none disabled:opacity-40 sm:min-w-[132px]"
                >
                  Entrer
                </motion.button>
              </div>
              <p className="mt-3 text-[11px] text-white/35">
                Code à 6 caractères (lettres et chiffres), communiqué par l&apos;hôte.
              </p>
            </div>
          </div>

          {connecting && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/45">
              <span className="h-4 w-4 shrink-0 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              Connexion au serveur…
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-300"
            >
              {error}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
