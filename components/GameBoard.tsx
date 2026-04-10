'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import QuestionModal from './ui/QuestionModal';
import DifficultyPicker from './ui/DifficultyPicker';
import PlayerList from './ui/PlayerList';
import WinScreen from './ui/WinScreen';
import MultiplayerLobby from './ui/MultiplayerLobby';
import WaitingRoom from './ui/WaitingRoom';
import ComingSoonGame from './games/ComingSoonGame';
import ChessGame from './games/ChessGame';

import { Question, PlayerInfo } from '@/types/game';
import { normalizeGameId } from '@/lib/games';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomState {
  
  code: string;
  gameId: string;
  phase: 'lobby' | 'playing' | 'finished';
  hostId: string;
  winnerId: string | null;
  currentPlayerIndex: number;
  activeQuestion: Question | null;
  players: PlayerInfo[];
  chessFen?: string;
  chessPending?: { from: string; to: string; promotion: string | null } | null;
}

// ─── Scene 3D (lazy) + Error Boundary ────────────────────────────────────────

const GameScene = dynamic(() => import('./three/Scene'), { ssr: false });

class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="flex items-center justify-center h-full bg-[#1e2638] text-white/50 text-xs p-4 text-center"><p>Erreur scène 3D : {this.state.error.message}</p></div>;
    }
    return this.props.children;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Multijoueur (Socket.IO) — seul mode disponible
// ═════════════════════════════════════════════════════════════════════════════

function MultiGame() {
  const [socketEpoch, setSocketEpoch] = useState(0);
  const [screen, setScreen] = useState<'connect' | 'game'>('connect');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dab_display_name');
      if (saved) setName(saved);
    } catch {
      /* noop */
    }
  }, []);

  const returnToConnect = useCallback(() => {
    disconnectSocket();
    setScreen('connect');
    setRoom(null);
    setMyId(null);
    setError(null);
    setConnecting(false);
    setSocketEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onJoined = ({ playerId }: { code: string; playerId: string }) => {
      setMyId(playerId);
      setScreen('game');
      setConnecting(false);
      setError(null);
    };

    const onRoomState = (state: RoomState) => {
      setError(null);
      setRoom(state);
    };

    const onGameError = ({ message }: { message: string }) => {
      setError(message);
      setConnecting(false);
    };

    const onConnectError = () => {
      setError('Impossible de se connecter au serveur. Lance `node server.js` (port 3333).');
      setConnecting(false);
    };

    s.on('joined', onJoined);
    s.on('roomState', onRoomState);
    s.on('gameError', onGameError);
    s.on('connect_error', onConnectError);

    if (!s.connected) {
      s.connect();
    }

    return () => {
      s.off('joined', onJoined);
      s.off('roomState', onRoomState);
      s.off('gameError', onGameError);
      s.off('connect_error', onConnectError);
    };
  }, [socketEpoch]);

  const emit = useCallback((ev: string, data?: Record<string, unknown>) => {
    const sock = socketRef.current;
    if (!sock?.connected) {
      setError('Connexion au serveur perdue. Rafraîchis la page ou vérifie que `node server.js` tourne (port 3333).');
      return;
    }
    sock.emit(ev, data);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) { setError('Entre un pseudo.'); return; }
    try {
      localStorage.setItem('dab_display_name', name.trim());
    } catch {
      /* noop */
    }
    setConnecting(true);
    setError(null);
    emit('createRoom', { name: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim()) { setError('Entre un pseudo.'); return; }
    if (!joinCode.trim()) { setError('Entre un code de salon.'); return; }
    try {
      localStorage.setItem('dab_display_name', name.trim());
    } catch {
      /* noop */
    }
    setConnecting(true);
    setError(null);
    emit('joinRoom', { code: joinCode.trim().toUpperCase(), name: name.trim() });
  };

  // Écran de connexion (lobby)
  if (screen === 'connect' || !room || !myId) {
    return (
      <MultiplayerLobby
        name={name}
        onNameChange={(v) => { setError(null); setName(v); }}
        joinCode={joinCode}
        onJoinCodeChange={(v) => { setError(null); setJoinCode(v); }}
        connecting={connecting}
        error={error}
        onCreate={handleCreate}
        onJoin={handleJoin}
      />
    );
  }

  // En jeu — état piloté par le serveur
  const me = room.players.find((p) => p.id === myId);
  const currentPlayer = room.players[room.currentPlayerIndex];
  const isMyTurn = !!me && !!currentPlayer && me.id === currentPlayer.id;
  const amHost = room.hostId === myId;
  const gameId = normalizeGameId(room.gameId);

  if (room.phase === 'lobby') {
    return (
      <WaitingRoom
        roomCode={room.code}
        hostId={room.hostId}
        gameId={gameId}
        players={room.players}
        myId={myId}
        amHost={amHost}
        onSetGame={(id) => emit('setRoomGame', { gameId: id })}
        onStart={() => emit('startGame')}
        onQuit={returnToConnect}
        lobbyError={error}
        onDismissLobbyError={() => setError(null)}
      />
    );
  }

  if (gameId === 'echecs') {
    return (
      <ChessGame
        room={{
          code: room.code,
          phase: room.phase,
          hostId: room.hostId,
          winnerId: room.winnerId,
          currentPlayerIndex: room.currentPlayerIndex,
          activeQuestion: room.activeQuestion,
          players: room.players,
          chessFen: room.chessFen,
          chessPending: room.chessPending,
        }}
        myId={myId}
        amHost={amHost}
        emit={emit}
        onQuit={returnToConnect}
      />
    );
  }

  if (gameId !== 'droit-au-but') {
    return (
      <ComingSoonGame
        gameId={gameId}
        roomCode={room.code}
        players={room.players}
        currentPlayerIndex={room.currentPlayerIndex}
        myId={myId}
        onQuit={returnToConnect}
      />
    );
  }

  return (
    <GameUI
      gamePlayers={room.players}
      currentPlayerIndex={room.currentPlayerIndex}
      gamePhase={room.phase}
      activeQuestion={room.activeQuestion}
      winnerId={room.winnerId}
      isMyTurn={isMyTurn}
      myId={myId}
      amHost={amHost}
      roomCode={room.code}
      panne={me?.panne ?? false}
      onPickDifficulty={(d) => emit('requestQuestion', { difficulty: d })}
      onAnswer={(ci) => room.activeQuestion && emit('submitAnswer', { questionId: room.activeQuestion.id, choiceIndex: ci })}
      onRestart={() => emit('startGame')}
      onQuit={returnToConnect}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// UI du jeu (multijoueur)
// ═════════════════════════════════════════════════════════════════════════════

interface GameUIProps {
  gamePlayers: PlayerInfo[];
  currentPlayerIndex: number;
  gamePhase: string;
  activeQuestion: Question | null;
  winnerId: string | null;
  isMyTurn: boolean;
  myId: string;
  amHost: boolean;
  roomCode: string | null;
  panne: boolean;
  onPickDifficulty: (d: string) => void;
  onAnswer: (choiceIndex: number) => void;
  onRestart: () => void;
  onQuit: () => void;
}

function GameUI({
  gamePlayers, currentPlayerIndex, gamePhase, activeQuestion, winnerId,
  isMyTurn, myId, amHost, roomCode, panne,
  onPickDifficulty, onAnswer, onRestart, onQuit,
}: GameUIProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyRoomCode = useCallback(async () => {
    if (!roomCode) return;
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

  return (
    <div className="relative w-full h-screen bg-[#1e2638] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <SceneErrorBoundary>
          <GameScene
            players={gamePlayers}
            currentPlayerIndex={currentPlayerIndex}
            cameraFixed={gamePhase === 'playing'}
          />
        </SceneErrorBoundary>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">

        <PlayerList players={gamePlayers} currentPlayerIndex={currentPlayerIndex} myPlayerId={myId} />

        {/* Barre du haut */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
          {roomCode && (
            <button
              type="button"
              onClick={copyRoomCode}
              title="Copier le code du salon"
              aria-label={`Code du salon ${roomCode}. Cliquer pour copier.`}
              className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/[0.06] hover:bg-sky-500/15 hover:border-sky-400/35 active:scale-[0.98] transition-all"
            >
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Salon</span>
              <span className="text-white font-semibold text-sm tracking-widest font-mono">{roomCode}</span>
              {codeCopied ? (
                <span className="text-emerald-400 text-[11px] font-semibold tabular-nums">Copié !</span>
              ) : (
                <span className="text-white/35" aria-hidden>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </span>
              )}
            </button>
          )}
          <button type="button" onClick={() => setShowQuitConfirm(true)}
            className="glass rounded-lg px-3 py-1.5 text-white/40 hover:text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Quitter
          </button>
        </div>

        {/* Sélecteur de difficulté */}
        <AnimatePresence>
          {gamePhase === 'playing' && isMyTurn && !activeQuestion && (
            <DifficultyPicker panne={panne} onPick={onPickDifficulty} />
          )}
        </AnimatePresence>

        {/* Question */}
        <AnimatePresence>
          {activeQuestion && activeQuestion.forPlayerId === myId && (
            <QuestionModal question={activeQuestion} onAnswer={onAnswer} />
          )}
        </AnimatePresence>

        {/* Attente spectateurs */}
        {gamePhase === 'playing' && activeQuestion && activeQuestion.forPlayerId !== myId && (
          <div className="pointer-events-auto absolute bottom-8 inset-x-0 flex justify-center px-4">
            <div className="glass rounded-xl px-5 py-2.5 flex items-center gap-3 max-w-[95vw]">
              <div className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-white/50 text-sm font-medium">
                {gamePlayers.find((p) => p.id === activeQuestion.forPlayerId)?.name ?? 'Un joueur'} répond…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal quitter */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="glass-strong rounded-2xl p-7 max-w-sm w-full text-center"
            >
              <h2 className="text-white font-semibold text-lg mb-2">Quitter ?</h2>
              <p className="text-white/40 text-sm mb-6">Tu retourneras à l&apos;écran de connexion (créer / rejoindre un salon).</p>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/70 font-medium text-sm hover:bg-white/8 transition-colors"
                >Annuler</button>
                <button type="button" onClick={() => { setShowQuitConfirm(false); onQuit(); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors"
                >Quitter</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Écran de victoire */}
      <AnimatePresence>
        {gamePhase === 'finished' && winnerId && (
          <WinScreen
            winner={gamePlayers.find((p) => p.id === winnerId)}
            isHost={amHost}
            onRestart={onRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Export principal — multijoueur uniquement
// ═════════════════════════════════════════════════════════════════════════════

export default function GameBoard() {
  return <MultiGame />;
}
