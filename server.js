'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3333;
const PUBLIC = path.join(__dirname, 'public');

const DIFFICULTY = {
  simple: { advance: 2, back: 1, key: 'simple' },
  moyen: { advance: 5, back: 2, key: 'moyen' },
  compliqué: { advance: 10, back: 5, key: 'compliqué' },
};

function loadQuestions() {
  const base = path.join(__dirname, 'Question');
  const read = (file) => {
    const p = path.join(base, file);
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  };
  return {
    simple: read('simple.json'),
    moyen: read('moyen.json'),
    difficile: read('difficile.json'),
  };
}

const QUESTIONS = loadQuestions();

function shuffleQuestion(q) {
  const n = q.choices.length;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const newChoices = order.map((i) => q.choices[i]);
  const newCorrect = order.indexOf(q.correctIndex);
  return { ...q, choices: newChoices, correctIndex: newCorrect };
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function genId() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function isRadarCell(pos) {
  return pos > 0 && pos < 100 && pos % 10 === 0;
}

const COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#9b5de5', '#00bbf9'];

/** @type {Map<string, object>} */
const rooms = new Map();

function getRoomForSocket(socketId) {
  for (const [, room] of rooms) {
    const p = room.players.find((x) => x.socketId === socketId);
    if (p) return { room, player: p };
  }
  return null;
}

function pickRandomQuestion(pool, excludeIds = new Set()) {
  const available = pool.filter((q) => q && q.id && !excludeIds.has(q.id));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function broadcastRoom(room) {
  const payload = serializeRoom(room);
  io.to(room.code).emit('roomState', payload);
}

function serializeRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    winnerId: room.winnerId,
    currentPlayerIndex: room.currentPlayerIndex,
    activeQuestion: room.activeQuestion
      ? {
          id: room.activeQuestion.id,
          question: room.activeQuestion.question,
          choices: room.activeQuestion.choices,
          correctIndex: room.activeQuestion.correctIndex,
          difficulty: room.activeQuestion.difficulty,
          kind: room.activeQuestion.kind,
          forPlayerId: room.activeQuestion.forPlayerId,
        }
      : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      panne: p.panne,
      color: p.color,
    })),
  };
}

const app = express();
app.use(express.static(PUBLIC));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

function notifyAnswerAndBroadcast(room, correct, playerId, choiceIdx) {
  io.to(room.code).emit('answerFeedback', {
    correct,
    playerId,
    choiceIndex: choiceIdx,
  });
  setTimeout(() => broadcastRoom(room), 520);
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name } = {}) => {
    const nickname = (name || 'Joueur').trim().slice(0, 24) || 'Joueur';
    let code = genCode();
    while (rooms.has(code)) code = genCode();

    const player = {
      id: genId(),
      socketId: socket.id,
      name: nickname,
      position: 0,
      panne: false,
      color: COLORS[0],
    };

    const room = {
      code,
      hostId: player.id,
      players: [player],
      currentPlayerIndex: 0,
      phase: 'lobby',
      winnerId: null,
      activeQuestion: null,
      lastQuestionIds: [],
    };

    rooms.set(code, room);
    socket.join(code);
    socket.emit('joined', { code, playerId: player.id });
    broadcastRoom(room);
  });

  socket.on('joinRoom', ({ code, name } = {}) => {
    const c = String(code || '')
      .trim()
      .toUpperCase();
    const nickname = (name || 'Joueur').trim().slice(0, 24) || 'Joueur';
    const room = rooms.get(c);
    if (!room) {
      socket.emit('gameError', { message: 'Salon introuvable.' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('gameError', { message: 'La partie a déjà commencé.' });
      return;
    }
    if (room.players.length >= 6) {
      socket.emit('gameError', { message: 'Salon complet (6 joueurs max).' });
      return;
    }

    const player = {
      id: genId(),
      socketId: socket.id,
      name: nickname,
      position: 0,
      panne: false,
      color: COLORS[room.players.length % COLORS.length],
    };
    room.players.push(player);
    socket.join(c);
    socket.emit('joined', { code: c, playerId: player.id });
    broadcastRoom(room);
  });

  socket.on('startGame', () => {
    const found = getRoomForSocket(socket.id);
    if (!found) {
      socket.emit('gameError', { message: 'Pas de salon.' });
      return;
    }
    const { room, player } = found;
    if (room.hostId !== player.id) {
      socket.emit('gameError', { message: 'Seul l’hôte peut lancer la partie.' });
      return;
    }
    if (room.players.length < 1) {
      socket.emit('gameError', { message: 'Aucun joueur.' });
      return;
    }
    room.phase = 'playing';
    room.currentPlayerIndex = 0;
    room.winnerId = null;
    room.activeQuestion = null;
    room.lastQuestionIds = [];
    broadcastRoom(room);
  });

  socket.on('requestQuestion', ({ difficulty } = {}) => {
    const found = getRoomForSocket(socket.id);
    if (!found) {
      socket.emit('gameError', { message: 'Pas de salon.' });
      return;
    }
    const { room, player } = found;
    if (room.phase !== 'playing' || room.winnerId) {
      socket.emit('gameError', { message: 'Partie non active.' });
      return;
    }
    const current = room.players[room.currentPlayerIndex];
    if (!current || current.id !== player.id) {
      socket.emit('gameError', { message: 'Ce n’est pas votre tour.' });
      return;
    }
    if (room.activeQuestion) {
      socket.emit('gameError', { message: 'Une question est déjà en cours.' });
      return;
    }

    let d = String(difficulty || '').toLowerCase();
    if (d === 'complique' || d === 'compliqué') d = 'compliqué';

    if (player.panne && d !== 'simple') {
      socket.emit('gameError', { message: 'En panne : choisissez le mode Simple pour redémarrer.' });
      return;
    }
    if (!DIFFICULTY[d]) {
      socket.emit('gameError', { message: 'Niveau invalide.' });
      return;
    }

    const poolKey = d === 'compliqué' ? 'difficile' : d;
    const pool = QUESTIONS[poolKey];
    const recent = new Set(room.lastQuestionIds.slice(-8));
    let q = pickRandomQuestion(pool, recent);
    if (!q) q = pickRandomQuestion(pool, new Set());
    if (!q) {
      socket.emit('gameError', { message: 'Aucune question disponible pour ce niveau.' });
      return;
    }

    room.lastQuestionIds.push(q.id);
    if (room.lastQuestionIds.length > 20) room.lastQuestionIds.shift();

    const sq = shuffleQuestion(q);
    room.activeQuestion = {
      id: sq.id,
      question: sq.question,
      choices: sq.choices,
      correctIndex: sq.correctIndex,
      difficulty: d,
      kind: 'normal',
      forPlayerId: player.id,
      consecutiveSlot: d === 'compliqué' ? 'compliqué' : null,
    };
    broadcastRoom(room);
  });

  socket.on('submitAnswer', ({ questionId, choiceIndex } = {}) => {
    const found = getRoomForSocket(socket.id);
    if (!found) {
      socket.emit('gameError', { message: 'Pas de salon.' });
      return;
    }
    const { room, player } = found;
    const aq = room.activeQuestion;
    if (!aq || aq.id !== questionId) {
      socket.emit('gameError', { message: 'Question invalide.' });
      return;
    }
    if (aq.forPlayerId !== player.id) {
      socket.emit('gameError', { message: 'Ce n’est pas votre question.' });
      return;
    }

    const choiceIdx = Number(choiceIndex);
    const correct = choiceIdx === aq.correctIndex;
    const diff = DIFFICULTY[aq.difficulty];

    if (aq.kind === 'radar') {
      if (correct) {
        room.activeQuestion = null;
        advanceTurn(room);
      } else {
        player.position = Math.max(0, player.position - 2);
        if (isRadarCell(player.position)) {
          applyRadarOrPassTurn(room, player);
        } else {
          room.activeQuestion = null;
          advanceTurn(room);
        }
      }
      notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
      return;
    }

    // Normal question
    if (correct) {
      if (player.panne && aq.difficulty === 'simple') {
        player.panne = false;
      }
      if (aq.difficulty === 'compliqué') {
        player._consecutiveCompliqué = 0;
      }

      let next = player.position + diff.advance;
      if (next > 100) {
        // Victoire précise : ne pas dépasser 100
        room.activeQuestion = null;
        advanceTurn(room);
        notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
        return;
      }
      player.position = next;
      if (player.position === 100) {
        room.winnerId = player.id;
        room.phase = 'finished';
        room.activeQuestion = null;
        notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
        return;
      }
      if (isRadarCell(player.position)) {
        applyRadarOrPassTurn(room, player);
        notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
        return;
      }
      room.activeQuestion = null;
      advanceTurn(room);
    } else {
      if (aq.difficulty === 'compliqué') {
        player._consecutiveCompliqué = (player._consecutiveCompliqué || 0) + 1;
        if (player._consecutiveCompliqué >= 2) {
          player.panne = true;
          player._consecutiveCompliqué = 0;
        }
      } else {
        player._consecutiveCompliqué = 0;
      }

      player.position = Math.max(0, player.position - diff.back);
      if (isRadarCell(player.position)) {
        applyRadarOrPassTurn(room, player);
        notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
        return;
      }
      room.activeQuestion = null;
      advanceTurn(room);
    }

    notifyAnswerAndBroadcast(room, correct, player.id, choiceIdx);
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx === -1) continue;

      const removed = room.players[idx];
      room.players.splice(idx, 1);

      if (room.players.length === 0) {
        rooms.delete(code);
        break;
      }

      if (removed.id === room.hostId) {
        room.hostId = room.players[0].id;
      }

      if (idx < room.currentPlayerIndex) {
        room.currentPlayerIndex--;
      } else if (idx === room.currentPlayerIndex && room.currentPlayerIndex >= room.players.length) {
        room.currentPlayerIndex = 0;
      }
      if (room.currentPlayerIndex >= room.players.length) {
        room.currentPlayerIndex = 0;
      }

      room.activeQuestion = null;
      broadcastRoom(room);
      break;
    }
  });
});

function buildRadarQuestion(room, playerId) {
  const pool = QUESTIONS.simple;
  const recent = new Set(room.lastQuestionIds.slice(-8));
  let q = pickRandomQuestion(pool, recent) || pickRandomQuestion(pool, new Set());
  if (!q) return null;
  room.lastQuestionIds.push(q.id);
  const sq = shuffleQuestion(q);
  return {
    id: String(sq.id) + '-radar-' + Date.now(),
    question: '[Radar] ' + sq.question,
    choices: sq.choices,
    correctIndex: sq.correctIndex,
    difficulty: 'simple',
    kind: 'radar',
    forPlayerId: playerId,
  };
}

function applyRadarOrPassTurn(room, player) {
  const rq = buildRadarQuestion(room, player.id);
  if (rq) room.activeQuestion = rq;
  else {
    room.activeQuestion = null;
    advanceTurn(room);
  }
}

function advanceTurn(room) {
  if (room.players.length === 0) return;
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
}

server.listen(PORT, () => {
  console.log(`Droit au But — http://localhost:${PORT}`);
});
