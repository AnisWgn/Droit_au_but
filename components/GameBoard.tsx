'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  insertCoin,
  myPlayer,
  isHost,
  getRoomCode,
  useMultiplayerState,
  usePlayersList,
  useIsHost,
} from 'playroomkit';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import QuestionModal from './ui/QuestionModal';
import DifficultyPicker from './ui/DifficultyPicker';
import PlayerList from './ui/PlayerList';
import WinScreen from './ui/WinScreen';

import { Question, PlayerInfo } from '@/types/game';
import { getQuestion } from '@/lib/questions';
import { DIFFICULTY_CONFIG, isRadarCell, advanceTurn, PLAYER_COLORS } from '@/lib/gameLogic';

// Chargement dynamique de la scène Three.js (client uniquement)
const GameScene = dynamic(() => import('./three/Scene'), { ssr: false });

// ─── Types utilitaires ────────────────────────────────────────────────────────

type Difficulty = 'simple' | 'moyen' | 'compliqué';

interface PendingAnswer {
  questionId: string;
  choiceIndex: number;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GameBoard() {
  const [initialized, setInitialized] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // État partagé entre tous les joueurs (Playroom Kit)
  const [gamePhase, setGamePhase] = useMultiplayerState('gamePhase', 'lobby');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useMultiplayerState('currentPlayerIndex', 0);
  const [activeQuestion, setActiveQuestion] = useMultiplayerState('activeQuestion', null);
  const [winnerId, setWinnerId] = useMultiplayerState('winnerId', null);
  const [lastQuestionIds, setLastQuestionIds] = useMultiplayerState('lastQuestionIds', []);

  const players = usePlayersList(true);
  const amHost = useIsHost();

  // ─── Initialisation Playroom ────────────────────────────────────────────────

  useEffect(() => {
    insertCoin({
      skipLobby: false,
      defaultPlayerStates: { position: 0, panne: false, consecutiveCompliqué: 0 },
    })
      .then(() => {
        setInitialized(true);
      })
      .catch((err: unknown) => {
        console.error(err);
        setSetupError('Erreur de connexion à Playroom Kit. Vérifie ta connexion internet.');
      });
  }, []);

  // ─── Logique hôte : gestion des événements de tour ─────────────────────────

  const handlePickDifficulty = useCallback(
    async (playerObj: ReturnType<typeof myPlayer>, difficulty: Difficulty) => {
      if (!playerObj) return;
      if (playerObj.getState('panne') && difficulty !== 'simple') return;

      const excluded = (lastQuestionIds as string[]).slice(-8);
      const q = await getQuestion(difficulty, excluded);
      if (!q) return;

      const updatedIds = [...(lastQuestionIds as string[]), q.id].slice(-20);
      setLastQuestionIds(updatedIds);

      setActiveQuestion({
        ...q,
        kind: 'normal',
        forPlayerId: playerObj.id,
      } as Question);
    },
    [lastQuestionIds, setLastQuestionIds, setActiveQuestion]
  );

  const handleRadar = useCallback(
    async (
      playerObj: ReturnType<typeof myPlayer>,
      currentIdx: number,
      playersLen: number
    ) => {
      if (!playerObj) return;
      const excluded = (lastQuestionIds as string[]).slice(-8);
      const q = await getQuestion('simple', excluded);

      if (!q) {
        setActiveQuestion(null);
        setCurrentPlayerIndex(advanceTurn(currentIdx, playersLen));
        return;
      }

      const updatedIds = [...(lastQuestionIds as string[]), q.id].slice(-20);
      setLastQuestionIds(updatedIds);

      setActiveQuestion({
        ...q,
        kind: 'radar',
        forPlayerId: playerObj.id,
      } as Question);
    },
    [lastQuestionIds, setLastQuestionIds, setActiveQuestion, setCurrentPlayerIndex]
  );

  const handleAnswer = useCallback(
    async (
      playerObj: ReturnType<typeof myPlayer>,
      choiceIndex: number,
      question: Question,
      currentIdx: number,
      playersLen: number
    ) => {
      if (!playerObj) return;

      const correct = choiceIndex === question.correctIndex;
      const diff = DIFFICULTY_CONFIG[question.difficulty as keyof typeof DIFFICULTY_CONFIG];

      // Feedback visible par le joueur via son état local
      playerObj.setState('feedback', { correct, timestamp: Date.now() });

      // ── Case Radar ──────────────────────────────────────────────────────────
      if (question.kind === 'radar') {
        if (correct) {
          setActiveQuestion(null);
          setCurrentPlayerIndex(advanceTurn(currentIdx, playersLen));
        } else {
          const pos = (playerObj.getState('position') as number) ?? 0;
          const newPos = Math.max(0, pos - 2);
          playerObj.setState('position', newPos);

          if (isRadarCell(newPos)) {
            await handleRadar(playerObj, currentIdx, playersLen);
          } else {
            setActiveQuestion(null);
            setCurrentPlayerIndex(advanceTurn(currentIdx, playersLen));
          }
        }
        return;
      }

      // ── Question normale ────────────────────────────────────────────────────
      if (correct) {
        const panne = playerObj.getState('panne') as boolean;
        if (panne && question.difficulty === 'simple') playerObj.setState('panne', false);
        if (question.difficulty === 'compliqué') playerObj.setState('consecutiveCompliqué', 0);

        const pos = (playerObj.getState('position') as number) ?? 0;
        const next = pos + diff.advance;

        if (next > 100) {
          // Trop loin : passe le tour sans bouger
          setActiveQuestion(null);
          setCurrentPlayerIndex(advanceTurn(currentIdx, playersLen));
          return;
        }

        playerObj.setState('position', next);

        if (next === 100) {
          setWinnerId(playerObj.id);
          setGamePhase('finished');
          setActiveQuestion(null);
          return;
        }

        if (isRadarCell(next)) {
          await handleRadar(playerObj, currentIdx, playersLen);
          return;
        }
      } else {
        if (question.difficulty === 'compliqué') {
          const consec = ((playerObj.getState('consecutiveCompliqué') as number) ?? 0) + 1;
          playerObj.setState('consecutiveCompliqué', consec);
          if (consec >= 2) {
            playerObj.setState('panne', true);
            playerObj.setState('consecutiveCompliqué', 0);
          }
        } else {
          playerObj.setState('consecutiveCompliqué', 0);
        }

        const pos = (playerObj.getState('position') as number) ?? 0;
        const newPos = Math.max(0, pos - diff.back);
        playerObj.setState('position', newPos);

        if (isRadarCell(newPos)) {
          await handleRadar(playerObj, currentIdx, playersLen);
          return;
        }
      }

      setActiveQuestion(null);
      setCurrentPlayerIndex(advanceTurn(currentIdx, playersLen));
    },
    [
      setActiveQuestion,
      setCurrentPlayerIndex,
      setWinnerId,
      setGamePhase,
      handleRadar,
    ]
  );

  // ─── Hôte : surveille les états joueurs pour piloter la partie ─────────────

  useEffect(() => {
    if (!amHost || !initialized || gamePhase !== 'playing' || winnerId) return;

    const currentPlayer = players[currentPlayerIndex as number];
    if (!currentPlayer) return;

    // Joueur a choisi une difficulté
    const pickedDifficulty = currentPlayer.getState('pickedDifficulty') as Difficulty | null;
    if (pickedDifficulty && !activeQuestion) {
      currentPlayer.setState('pickedDifficulty', null);
      handlePickDifficulty(currentPlayer, pickedDifficulty);
    }

    // Joueur a soumis une réponse
    const submittedAnswer = currentPlayer.getState('submittedAnswer') as PendingAnswer | null;
    if (
      submittedAnswer &&
      activeQuestion &&
      submittedAnswer.questionId === (activeQuestion as Question).id
    ) {
      currentPlayer.setState('submittedAnswer', null);
      handleAnswer(
        currentPlayer,
        submittedAnswer.choiceIndex,
        activeQuestion as Question,
        currentPlayerIndex as number,
        players.length
      );
    }
  }, [
    players,
    currentPlayerIndex,
    activeQuestion,
    amHost,
    initialized,
    gamePhase,
    winnerId,
    handlePickDifficulty,
    handleAnswer,
  ]);

  // ─── Données joueurs formatées pour l'UI et la 3D ──────────────────────────

  const gamePlayers: PlayerInfo[] = players.map((p, i) => ({
    id: p.id,
    name: p.getProfile().name ?? `Joueur ${i + 1}`,
    position: (p.getState('position') as number) ?? 0,
    panne: (p.getState('panne') as boolean) ?? false,
    color: p.getProfile().color?.hexString ?? PLAYER_COLORS[i % PLAYER_COLORS.length],
  }));

  const me = myPlayer();
  const currentPlayer = players[currentPlayerIndex as number];
  const isMyTurn = !!me && !!currentPlayer && me.id === currentPlayer.id;

  // ─── Rendu : erreur de configuration ───────────────────────────────────────

  if (setupError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a] p-8">
        <div className="max-w-md w-full bg-red-900/40 border border-red-500/40 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-white font-bold text-xl mb-3">Erreur de connexion</h2>
          <p className="text-red-300 text-sm leading-relaxed">{setupError}</p>
        </div>
      </div>
    );
  }

  // ─── Rendu : chargement ─────────────────────────────────────────────────────

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a]">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-white text-2xl font-bold"
        >
          Connexion au salon...
        </motion.div>
      </div>
    );
  }

  // ─── Rendu : jeu ───────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen bg-[#0a0a1a] overflow-hidden">
      {/* Scène 3D */}
      <GameScene
        players={gamePlayers}
        currentPlayerIndex={currentPlayerIndex as number}
      />

      {/* ── Overlays UI ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">

        {/* Liste des joueurs */}
        <PlayerList
          players={gamePlayers}
          currentPlayerIndex={currentPlayerIndex as number}
          myPlayerId={me?.id ?? ''}
        />

        {/* Barre du haut : code salon + bouton quitter */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {getRoomCode() && (
            <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm font-mono">
              Salon : <span className="text-white font-bold tracking-widest">{getRoomCode()}</span>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowQuitConfirm(true)}
            className="pointer-events-auto bg-black/50 backdrop-blur border border-white/10 hover:border-red-400/40 hover:bg-red-900/30 rounded-xl px-4 py-2 text-white/70 hover:text-red-300 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Quitter
          </motion.button>
        </div>

        {/* Lobby : bouton de démarrage */}
        {gamePhase === 'lobby' && (
          <div className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/60 text-sm mb-3">
              {players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}
            </p>
            {amHost && players.length >= 1 && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  players.forEach((p) => {
                    p.setState('position', 0);
                    p.setState('panne', false);
                    p.setState('consecutiveCompliqué', 0);
                  });
                  setCurrentPlayerIndex(0);
                  setActiveQuestion(null);
                  setWinnerId(null);
                  setLastQuestionIds([]);
                  setGamePhase('playing');
                }}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xl rounded-2xl shadow-xl shadow-green-500/30"
              >
                🎮 Lancer la partie
              </motion.button>
            )}
            {!amHost && (
              <p className="text-white/40 text-sm">En attente que l&apos;hôte démarre...</p>
            )}
          </div>
        )}

        {/* Sélecteur de difficulté */}
        <AnimatePresence>
          {gamePhase === 'playing' && isMyTurn && !activeQuestion && (
            <DifficultyPicker
              panne={(me?.getState('panne') as boolean) ?? false}
              onPick={(d) => me?.setState('pickedDifficulty', d)}
            />
          )}
        </AnimatePresence>

        {/* Question pour le joueur actif */}
        <AnimatePresence>
          {activeQuestion &&
            me &&
            (activeQuestion as Question).forPlayerId === me.id && (
              <QuestionModal
                question={activeQuestion as Question}
                onAnswer={(choiceIndex) =>
                  me.setState('submittedAnswer', {
                    questionId: (activeQuestion as Question).id,
                    choiceIndex,
                  })
                }
              />
            )}
        </AnimatePresence>

        {/* Message d'attente pour les spectateurs */}
        {gamePhase === 'playing' &&
          activeQuestion &&
          me &&
          (activeQuestion as Question).forPlayerId !== me.id && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="bg-black/50 backdrop-blur border border-white/10 rounded-2xl px-6 py-3 text-white/70 text-sm"
              >
                ⏳ En attente de la réponse de {gamePlayers.find(
                  (p) => p.id === (activeQuestion as Question).forPlayerId
                )?.name ?? 'un joueur'}...
              </motion.div>
            </div>
          )}
      </div>

      {/* Modal de confirmation : quitter */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto z-40"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="bg-[#1a1a3e] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <p className="text-4xl mb-4">🚪</p>
              <h2 className="text-white font-black text-2xl mb-2">Quitter la partie ?</h2>
              <p className="text-white/50 text-sm mb-8">
                Tu seras déconnecté du salon. Les autres joueurs pourront continuer.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/8 border border-white/10 text-white font-semibold hover:bg-white/12 transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold shadow-lg shadow-red-500/25"
                >
                  Quitter
                </motion.button>
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
            onRestart={() => {
              if (!isHost()) return;
              players.forEach((p) => {
                p.setState('position', 0);
                p.setState('panne', false);
                p.setState('consecutiveCompliqué', 0);
                p.setState('feedback', null);
              });
              setCurrentPlayerIndex(0);
              setActiveQuestion(null);
              setWinnerId(null);
              setLastQuestionIds([]);
              setGamePhase('playing');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
