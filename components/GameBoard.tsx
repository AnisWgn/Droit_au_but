'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import QuestionModal from './ui/QuestionModal';
import DifficultyPicker from './ui/DifficultyPicker';
import PlayerList from './ui/PlayerList';
import WinScreen from './ui/WinScreen';

import { Question, PlayerInfo } from '@/types/game';
import { getQuestion } from '@/lib/questions';
import { DIFFICULTY_CONFIG, isRadarCell, advanceTurn, PLAYER_COLORS } from '@/lib/gameLogic';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'simple' | 'moyen' | 'compliqué';
type GameMode = 'menu' | 'solo' | 'multi';

interface RoomState {
  code: string;
  phase: 'lobby' | 'playing' | 'finished';
  hostId: string;
  winnerId: string | null;
  currentPlayerIndex: number;
  activeQuestion: Question | null;
  players: PlayerInfo[];
}

// ─── Mock player pour le mode solo ───────────────────────────────────────────

class MockPlayer {
  id: string;
  private _s: Record<string, unknown> = {};
  private _cb: () => void;

  constructor(id: string, color: string, name: string, cb: () => void) {
    this.id = id;
    this._cb = cb;
    this._s = { position: 0, panne: false, 'consecutiveCompliqué': 0, _name: name, _color: color };
  }
  get(k: string) { return this._s[k] ?? null; }
  set(k: string, v: unknown) { this._s[k] = v; this._cb(); }
  toInfo(): PlayerInfo {
    return { id: this.id, name: this._s._name as string, position: (this._s.position as number) ?? 0, panne: (this._s.panne as boolean) ?? false, color: this._s._color as string };
  }
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
// Menu principal — choix Solo / Multijoueur
// ═════════════════════════════════════════════════════════════════════════════

function MainMenu({ onMode }: { onMode: (m: GameMode) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#1e2638] gap-6">
      <h1 className="text-white text-3xl font-bold tracking-tight">Droit au But</h1>
      <p className="text-white/40 text-sm">Choisis ton mode de jeu</p>
      <div className="flex gap-4">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onMode('solo')}
          className="glass-strong rounded-2xl px-8 py-5 text-center min-w-[160px]"
        >
          <p className="text-white font-semibold text-lg mb-1">Solo</p>
          <p className="text-white/35 text-xs">Jouer localement</p>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => onMode('multi')}
          className="glass-strong rounded-2xl px-8 py-5 text-center min-w-[160px]"
        >
          <p className="text-white font-semibold text-lg mb-1">Multijoueur</p>
          <p className="text-white/35 text-xs">Socket.IO</p>
        </motion.button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Mode Solo (standalone, sans réseau)
// ═════════════════════════════════════════════════════════════════════════════

function SoloGame({ onBack }: { onBack: () => void }) {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const mockRef = useRef<MockPlayer>(new MockPlayer('local-1', PLAYER_COLORS[0], 'Joueur 1', bump));
  const mock = mockRef.current;

  const [gamePhase, setGamePhase] = useState<'lobby' | 'playing' | 'finished'>('lobby');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeQ, setActiveQ] = useState<Question | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [lastQIds, setLastQIds] = useState<string[]>([]);
  const [cameraFixed, setCameraFixed] = useState(false);

  void tick;
  const gamePlayers: PlayerInfo[] = [mock.toInfo()];
  const isMyTurn = currentIdx === 0;

  const handlePick = useCallback(async (difficulty: Difficulty) => {
    if (mock.get('panne') && difficulty !== 'simple') return;
    const excluded = lastQIds.slice(-8);
    const q = await getQuestion(difficulty, excluded);
    if (!q) return;
    setLastQIds((ids) => [...ids, q.id].slice(-20));
    setActiveQ({ ...q, kind: 'normal', forPlayerId: mock.id } as Question);
  }, [mock, lastQIds]);

  const handleRadar = useCallback(async () => {
    const q = await getQuestion('simple', lastQIds.slice(-8));
    if (!q) { setActiveQ(null); setCurrentIdx((c) => advanceTurn(c, 1)); return; }
    setLastQIds((ids) => [...ids, q.id].slice(-20));
    setActiveQ({ ...q, kind: 'radar', forPlayerId: mock.id } as Question);
  }, [mock, lastQIds]);

  const handleAnswer = useCallback(async (choiceIndex: number, question: Question) => {
    const correct = choiceIndex === question.correctIndex;
    const diff = DIFFICULTY_CONFIG[question.difficulty as keyof typeof DIFFICULTY_CONFIG];
    mock.set('feedback', { correct, timestamp: Date.now() });

    if (question.kind === 'radar') {
      if (correct) { setActiveQ(null); setCurrentIdx((c) => advanceTurn(c, 1)); }
      else {
        const pos = (mock.get('position') as number) ?? 0;
        const np = Math.max(0, pos - 2);
        mock.set('position', np);
        if (isRadarCell(np)) await handleRadar(); else { setActiveQ(null); setCurrentIdx((c) => advanceTurn(c, 1)); }
      }
      return;
    }

    if (correct) {
      if (mock.get('panne') && question.difficulty === 'simple') mock.set('panne', false);
      if (question.difficulty === 'compliqué') mock.set('consecutiveCompliqué', 0);
      const pos = (mock.get('position') as number) ?? 0;
      const next = pos + diff.advance;
      if (next > 100) { setActiveQ(null); setCurrentIdx((c) => advanceTurn(c, 1)); return; }
      mock.set('position', next);
      if (next === 100) { setWinnerId(mock.id); setGamePhase('finished'); setActiveQ(null); return; }
      if (isRadarCell(next)) { await handleRadar(); return; }
    } else {
      if (question.difficulty === 'compliqué') {
        const c = ((mock.get('consecutiveCompliqué') as number) ?? 0) + 1;
        mock.set('consecutiveCompliqué', c);
        if (c >= 2) { mock.set('panne', true); mock.set('consecutiveCompliqué', 0); }
      } else { mock.set('consecutiveCompliqué', 0); }
      const pos = (mock.get('position') as number) ?? 0;
      const np = Math.max(0, pos - diff.back);
      mock.set('position', np);
      if (isRadarCell(np)) { await handleRadar(); return; }
    }
    setActiveQ(null);
    setCurrentIdx((c) => advanceTurn(c, 1));
  }, [mock, handleRadar]);

  return (
    <GameUI
      gamePlayers={gamePlayers}
      currentPlayerIndex={currentIdx}
      gamePhase={gamePhase}
      activeQuestion={activeQ}
      winnerId={winnerId}
      isMyTurn={isMyTurn}
      myId={mock.id}
      amHost
      roomCode={null}
      cameraFixed={cameraFixed}
      setCameraFixed={setCameraFixed}
      panne={(mock.get('panne') as boolean) ?? false}
      onStart={() => {
        mock.set('position', 0); mock.set('panne', false); mock.set('consecutiveCompliqué', 0);
        setCurrentIdx(0); setActiveQ(null); setWinnerId(null); setLastQIds([]);
        setGamePhase('playing');
      }}
      onPickDifficulty={(d) => handlePick(d as Difficulty)}
      onAnswer={(ci) => activeQ && handleAnswer(ci, activeQ)}
      onRestart={() => {
        mock.set('position', 0); mock.set('panne', false); mock.set('consecutiveCompliqué', 0);
        setCurrentIdx(0); setActiveQ(null); setWinnerId(null); setLastQIds([]);
        setGamePhase('playing');
      }}
      onQuit={onBack}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Mode Multijoueur (Socket.IO)
// ═════════════════════════════════════════════════════════════════════════════

function MultiGame({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<'connect' | 'game'>('connect');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraFixed, setCameraFixed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    s.on('joined', ({ playerId }: { code: string; playerId: string }) => {
      setMyId(playerId);
      setScreen('game');
      setConnecting(false);
      setError(null);
    });

    s.on('roomState', (state: RoomState) => {
      setRoom(state);
    });

    s.on('gameError', ({ message }: { message: string }) => {
      setError(message);
      setConnecting(false);
    });

    s.on('connect_error', () => {
      setError('Impossible de se connecter au serveur. Lance `node server.js` (port 3333).');
      setConnecting(false);
    });

    s.connect();

    return () => {
      s.off('joined');
      s.off('roomState');
      s.off('gameError');
      s.off('connect_error');
      disconnectSocket();
    };
  }, []);

  const emit = useCallback((ev: string, data?: Record<string, unknown>) => {
    socketRef.current?.emit(ev, data);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) { setError('Entre un pseudo.'); return; }
    setConnecting(true);
    setError(null);
    emit('createRoom', { name: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim()) { setError('Entre un pseudo.'); return; }
    if (!joinCode.trim()) { setError('Entre un code de salon.'); return; }
    setConnecting(true);
    setError(null);
    emit('joinRoom', { code: joinCode.trim().toUpperCase(), name: name.trim() });
  };

  // Écran de connexion
  if (screen === 'connect' || !room || !myId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1e2638] gap-5 p-8">
        <h2 className="text-white text-2xl font-bold">Multijoueur</h2>
        <p className="text-white/35 text-xs">Serveur Socket.IO sur le port 3333</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton pseudo"
          maxLength={24}
          className="w-64 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-blue-500/40"
        />

        <div className="flex gap-3 w-64">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={connecting}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Créer
          </motion.button>
          <div className="flex flex-1 gap-1.5">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="w-20 px-2.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono text-center placeholder:text-white/25 focus:outline-none focus:border-blue-500/40"
            />
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin} disabled={connecting}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Rejoindre
            </motion.button>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-medium max-w-xs text-center">{error}</p>}
        {connecting && <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />}

        <button onClick={onBack} className="text-white/30 text-xs hover:text-white/50 mt-2 transition-colors">
          Retour au menu
        </button>
      </div>
    );
  }

  // En jeu — état piloté par le serveur
  const me = room.players.find((p) => p.id === myId);
  const currentPlayer = room.players[room.currentPlayerIndex];
  const isMyTurn = !!me && !!currentPlayer && me.id === currentPlayer.id;
  const amHost = room.hostId === myId;

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
      cameraFixed={cameraFixed}
      setCameraFixed={setCameraFixed}
      panne={me?.panne ?? false}
      onStart={() => emit('startGame')}
      onPickDifficulty={(d) => emit('requestQuestion', { difficulty: d })}
      onAnswer={(ci) => room.activeQuestion && emit('submitAnswer', { questionId: room.activeQuestion.id, choiceIndex: ci })}
      onRestart={() => emit('startGame')}
      onQuit={() => { disconnectSocket(); onBack(); }}
      playersCount={room.players.length}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// UI du jeu (partagée entre Solo et Multi)
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
  cameraFixed: boolean;
  setCameraFixed: (fn: (v: boolean) => boolean) => void;
  panne: boolean;
  onStart: () => void;
  onPickDifficulty: (d: string) => void;
  onAnswer: (choiceIndex: number) => void;
  onRestart: () => void;
  onQuit: () => void;
  playersCount?: number;
}

function GameUI({
  gamePlayers, currentPlayerIndex, gamePhase, activeQuestion, winnerId,
  isMyTurn, myId, amHost, roomCode, cameraFixed, setCameraFixed, panne,
  onStart, onPickDifficulty, onAnswer, onRestart, onQuit, playersCount,
}: GameUIProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  return (
    <div className="relative w-full h-screen bg-[#1e2638] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <SceneErrorBoundary>
          <GameScene
            players={gamePlayers}
            currentPlayerIndex={currentPlayerIndex}
            cameraFixed={gamePhase === 'playing' && cameraFixed}
          />
        </SceneErrorBoundary>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">

        <PlayerList players={gamePlayers} currentPlayerIndex={currentPlayerIndex} myPlayerId={myId} />

        {gamePhase === 'playing' && (
          <div className="absolute bottom-6 left-4 pointer-events-auto z-10">
            <button type="button" role="switch" aria-checked={cameraFixed}
              onClick={() => setCameraFixed((v: boolean) => !v)}
              className="glass rounded-xl px-3 py-2 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-white/80 text-xs font-medium leading-tight">
                Vue fixe
                <span className="block text-[10px] text-white/35 font-normal mt-0.5">Suit le joueur actif</span>
              </span>
              <span className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${cameraFixed ? 'bg-blue-500' : 'bg-white/15'}`}>
                <span className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${cameraFixed ? 'translate-x-4' : 'translate-x-0'}`} />
              </span>
            </button>
          </div>
        )}

        {/* Barre du haut */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
          {roomCode && (
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Salon</span>
              <span className="text-white font-semibold text-sm tracking-widest font-mono">{roomCode}</span>
            </div>
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

        {/* Lobby */}
        {gamePhase === 'lobby' && (
          <div className="pointer-events-auto absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
            <div className="glass-strong rounded-2xl px-8 py-6 min-w-[280px]">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">
                {roomCode ? 'Joueurs connectés' : 'Mode local'}
              </p>
              <p className="text-white text-2xl font-bold tabular-nums mb-5">{playersCount ?? gamePlayers.length}</p>
              {amHost ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onStart}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  Lancer la partie
                </motion.button>
              ) : (
                <p className="text-white/30 text-xs font-medium">En attente de l&apos;hôte…</p>
              )}
            </div>
          </div>
        )}

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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="glass rounded-xl px-5 py-2.5 flex items-center gap-3">
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
              <p className="text-white/40 text-sm mb-6">Tu retourneras au menu principal.</p>
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
// Export principal — aiguillage Menu → Solo | Multi
// ═════════════════════════════════════════════════════════════════════════════

export default function GameBoard() {
  const [mode, setMode] = useState<GameMode>('menu');

  if (mode === 'menu') return <MainMenu onMode={setMode} />;
  if (mode === 'solo') return <SoloGame onBack={() => setMode('menu')} />;
  return <MultiGame onBack={() => setMode('menu')} />;
}
