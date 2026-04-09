(function () {
  const socket = io({ transports: ['websocket', 'polling'] });

  let myPlayerId = null;
  let lastState = null;
  /** @type {Record<string, number>} position affichée par joueur (pour animation) */
  let visualPlayerPositions = {};
  let tokenAnimationGeneration = 0;

  const $ = (id) => document.getElementById(id);

  const screenWelcome = $('screen-welcome');
  const screenLobby = $('screen-lobby');
  const screenGame = $('screen-game');
  const welcomeError = $('welcome-error');
  const lobbyCode = $('lobby-code');
  const lobbyPlayers = $('lobby-players');
  const lobbyRole = $('lobby-role');
  const btnCreate = $('btn-create');
  const btnJoin = $('btn-join');
  const btnStart = $('btn-start');
  const btnCopy = $('btn-copy');
  const btnRules = $('btn-rules');
  const rulesPanel = $('rules-panel');
  const inputName = $('input-name');
  const inputCode = $('input-code');
  const board = $('board');
  const turnLine = $('turn-line');
  const difficultyPanel = $('difficulty-panel');
  const questionPanel = $('question-panel');
  const questionMeta = $('question-meta');
  const questionText = $('question-text');
  const questionChoices = $('question-choices');
  const answerResultEl = $('answer-result');
  const playDockFeedbackEl = $('play-dock-feedback');
  const panneBanner = $('panne-banner');
  const winnerOverlay = $('winner-overlay');
  const winnerName = $('winner-name');
  const toastEl = $('toast');

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.classList.remove('toast--ok', 'toast--bad');
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
  }

  function showAnswerToast(correct) {
    if (!toastEl) return;
    toastEl.textContent = correct ? 'Bonne réponse !' : 'Mauvaise réponse.';
    toastEl.classList.remove('toast--ok', 'toast--bad');
    toastEl.classList.add(correct ? 'toast--ok' : 'toast--bad', 'is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toastEl.classList.remove('is-visible', 'toast--ok', 'toast--bad');
    }, 4500);
  }

  function showScreen(which) {
    screenWelcome.classList.toggle('hidden', which !== 'welcome');
    screenLobby.classList.toggle('hidden', which !== 'lobby');
    screenGame.classList.toggle('hidden', which !== 'game');

    const playDock = $('play-dock');
    const dockToggle = $('play-dock-toggle');
    if (which === 'game') {
      if (playDock) playDock.classList.remove('hidden');
      document.body.classList.add('game-play-active');
      document.body.classList.remove('play-dock-collapsed');
      if (dockToggle) {
        dockToggle.setAttribute('aria-expanded', 'true');
        dockToggle.title = 'Réduire le panneau';
      }
    } else {
      if (playDock) playDock.classList.add('hidden');
      document.body.classList.remove('game-play-active', 'play-dock-collapsed');
    }
  }

  function buildBoard() {
    visualPlayerPositions = {};
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = 'repeat(10, minmax(26px, 1fr))';
    board.style.gap = '4px';
    board.style.minWidth = '0';

    for (let i = 0; i <= 100; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.cell = String(i);
      if (i === 100) {
        cell.classList.add('cell--goal');
        cell.textContent = 'BUT';
        cell.title = 'Case 100 — victoire';
      } else {
        cell.textContent = String(i);
        if (i > 0 && i < 100 && i % 10 === 0) {
          cell.classList.add('cell--radar');
          cell.title = 'Radar — question bonus si vous vous arrêtez ici';
        }
      }
      board.appendChild(cell);
    }
  }

  function removePawnForPlayer(playerId) {
    document.querySelectorAll('.pawn[data-player-id="' + playerId + '"]').forEach((el) => el.remove());
  }

  function refreshCellTokenHighlight() {
    document.querySelectorAll('.cell--token').forEach((c) => c.classList.remove('cell--token'));
    document.querySelectorAll('.cell .pawn').forEach((pawn) => {
      const cell = pawn.closest('.cell');
      if (cell) cell.classList.add('cell--token');
    });
  }

  function placePawnAt(player, cellIndex) {
    const cell = board.querySelector('[data-cell="' + cellIndex + '"]');
    if (!cell) return;
    const pawn = document.createElement('span');
    pawn.className = 'pawn';
    pawn.dataset.playerId = player.id;
    pawn.style.background = player.color;
    pawn.title = player.name;
    cell.appendChild(pawn);
    refreshCellTokenHighlight();
  }

  function renderTokensAnimated(state, prevState) {
    tokenAnimationGeneration++;
    const gen = tokenAnimationGeneration;

    document.querySelectorAll('.cell .pawn').forEach((el) => el.remove());
    document.querySelectorAll('.cell--token').forEach((c) => c.classList.remove('cell--token'));

    const prevById = {};
    if (prevState && prevState.players) {
      prevState.players.forEach((p) => {
        prevById[p.id] = p;
      });
    }

    const incomingIds = new Set(state.players.map((p) => p.id));
    Object.keys(visualPlayerPositions).forEach((id) => {
      if (!incomingIds.has(id)) delete visualPlayerPositions[id];
    });

    state.players.forEach((p) => {
      const serverTo = p.position;
      let from =
        visualPlayerPositions[p.id] !== undefined
          ? visualPlayerPositions[p.id]
          : prevById[p.id] !== undefined
            ? prevById[p.id].position
            : serverTo;

      if (prevState && prevState.phase === 'lobby' && state.phase !== 'lobby') {
        from = 0;
      }

      if (from === serverTo) {
        placePawnAt(p, serverTo);
        visualPlayerPositions[p.id] = serverTo;
        return;
      }

      const steps = [];
      if (serverTo > from) {
        for (let c = from + 1; c <= serverTo; c++) steps.push(c);
      } else {
        for (let c = from - 1; c >= serverTo; c--) steps.push(c);
      }

      if (steps.length === 0) {
        placePawnAt(p, serverTo);
        visualPlayerPositions[p.id] = serverTo;
        return;
      }

      /* Plus lent : délai par case (min / max) et durée totale cible plus longue */
      const delayMs = Math.min(165, Math.max(80, 1100 / steps.length));

      placePawnAt(p, from);
      visualPlayerPositions[p.id] = from;

      let i = 0;
      function tick() {
        if (gen !== tokenAnimationGeneration) return;
        if (i >= steps.length) {
          visualPlayerPositions[p.id] = serverTo;
          return;
        }
        removePawnForPlayer(p.id);
        placePawnAt(p, steps[i]);
        visualPlayerPositions[p.id] = steps[i];
        i++;
        if (i < steps.length) {
          setTimeout(tick, delayMs);
        } else {
          visualPlayerPositions[p.id] = serverTo;
        }
      }
      setTimeout(tick, delayMs);
    });
  }

  function difficultyLabel(d) {
    if (d === 'simple') return 'Simple';
    if (d === 'moyen') return 'Moyen';
    if (d === 'compliqué') return 'Compliqué';
    return d || '';
  }

  function applyState(state) {
    const prevState = lastState;
    lastState = state;

    if (state.phase === 'lobby') {
      visualPlayerPositions = {};
      showScreen('lobby');
      lobbyCode.textContent = state.code;
      lobbyPlayers.innerHTML = '';
      state.players.forEach((p) => {
        const li = document.createElement('li');
        li.innerHTML =
          '<span class="player-dot" style="background:' +
          p.color +
          '"></span><span>' +
          escapeHtml(p.name) +
          '</span>';
        lobbyPlayers.appendChild(li);
      });
      const isHost = state.hostId === myPlayerId;
      lobbyRole.textContent = isHost ? 'Vous êtes l’hôte — partagez le code.' : 'En attente du lancement par l’hôte.';
      btnStart.classList.toggle('hidden', !isHost);
      return;
    }

    showScreen('game');
    if (!board.querySelector('.cell')) {
      buildBoard();
    }
    renderTokensAnimated(state, prevState);

    const current = state.players[state.currentPlayerIndex];
    const isMyTurn = current && current.id === myPlayerId;
    const me = state.players.find((p) => p.id === myPlayerId);

    if (me && me.panne) {
      panneBanner.classList.remove('hidden');
    } else {
      panneBanner.classList.add('hidden');
    }

    const turnMsg = current
      ? isMyTurn
        ? 'À vous de jouer — choisissez un niveau de risque.'
        : 'Tour de : ' + current.name
      : '';
    turnLine.textContent = turnMsg;
    const dockSummary = $('play-dock-summary');
    if (dockSummary) dockSummary.textContent = turnMsg;

    const aq = state.activeQuestion;
    const diffButtons = difficultyPanel.querySelectorAll('[data-difficulty]');

    if (state.phase === 'finished' && state.winnerId) {
      const w = state.players.find((p) => p.id === state.winnerId);
      winnerName.textContent = w ? w.name + ' atteint la case 100 !' : '';
      winnerOverlay.classList.remove('hidden');
      const endMsg = w ? w.name + ' remporte la partie.' : 'Partie terminée.';
      turnLine.textContent = endMsg;
      if (dockSummary) dockSummary.textContent = endMsg;
    } else {
      winnerOverlay.classList.add('hidden');
    }

    if (aq) {
      if (aq.forPlayerId === myPlayerId) {
        document.body.classList.remove('play-dock-collapsed');
        const dockToggle = $('play-dock-toggle');
        if (dockToggle) {
          dockToggle.setAttribute('aria-expanded', 'true');
          dockToggle.title = 'Réduire le panneau';
        }
      }
      difficultyPanel.classList.add('hidden');
      questionPanel.classList.remove('hidden');
      hideAnswerResultBanner();
      const radar = aq.kind === 'radar';
      questionMeta.textContent = radar
        ? 'Radar — question obligatoire'
        : 'Question · ' + difficultyLabel(aq.difficulty);
      questionText.textContent = aq.question;
      questionChoices.innerHTML = '';

      const canAnswer = aq.forPlayerId === myPlayerId;
      aq.choices.forEach((label, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice-btn';
        b.dataset.choiceIndex = String(idx);
        b.innerHTML =
          '<span class="choice-btn__text"></span><span class="choice-btn__mark" aria-hidden="true"></span>';
        b.querySelector('.choice-btn__text').textContent = label;
        b.disabled = !canAnswer;
        b.addEventListener('click', () => {
          socket.emit('submitAnswer', { questionId: aq.id, choiceIndex: idx });
          questionChoices.querySelectorAll('button').forEach((x) => (x.disabled = true));
        });
        questionChoices.appendChild(b);
      });
    } else {
      hideAnswerResultBanner();
      questionPanel.classList.add('hidden');
      difficultyPanel.classList.remove('hidden');
      diffButtons.forEach((btn) => {
        const d = btn.getAttribute('data-difficulty');
        let disabled = !isMyTurn || state.phase !== 'playing' || state.winnerId;
        if (me && me.panne && d !== 'simple') disabled = true;
        btn.disabled = !!disabled;
      });
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function hideAnswerResultBanner() {
    if (answerResultEl) {
      answerResultEl.classList.add('hidden');
      answerResultEl.classList.remove('answer-result--ok', 'answer-result--bad');
      answerResultEl.innerHTML = '';
    }
    if (playDockFeedbackEl) {
      playDockFeedbackEl.classList.add('hidden');
      playDockFeedbackEl.classList.remove('play-dock__feedback--ok', 'play-dock__feedback--bad');
      playDockFeedbackEl.textContent = '';
    }
  }

  function showAnswerResultBanner(correct) {
    const msg = correct ? 'Bonne réponse !' : 'Mauvaise réponse.';
    const iconOk =
      '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>';
    const iconBad =
      '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

    if (playDockFeedbackEl) {
      playDockFeedbackEl.classList.remove('hidden');
      playDockFeedbackEl.classList.remove('play-dock__feedback--ok', 'play-dock__feedback--bad');
      playDockFeedbackEl.classList.add(correct ? 'play-dock__feedback--ok' : 'play-dock__feedback--bad');
      playDockFeedbackEl.textContent = msg;
    }

    if (answerResultEl) {
      answerResultEl.classList.remove('hidden');
      answerResultEl.classList.remove('answer-result--ok', 'answer-result--bad');
      answerResultEl.classList.add(correct ? 'answer-result--ok' : 'answer-result--bad');
      answerResultEl.innerHTML =
        '<span class="answer-result__icon">' +
        (correct ? iconOk : iconBad) +
        '</span><span class="answer-result__msg">' +
        msg +
        '</span>';
    }

    showAnswerToast(correct);
  }

  btnCreate.addEventListener('click', () => {
    welcomeError.textContent = '';
    const name = inputName.value;
    socket.emit('createRoom', { name });
  });

  btnJoin.addEventListener('click', () => {
    welcomeError.textContent = '';
    const name = inputName.value;
    const code = inputCode.value;
    socket.emit('joinRoom', { code, name });
  });

  btnStart.addEventListener('click', () => {
    socket.emit('startGame');
  });

  btnCopy.addEventListener('click', async () => {
    const code = lobbyCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copié : ' + code);
    } catch {
      showToast(code);
    }
  });

  btnRules.addEventListener('click', () => {
    const open = rulesPanel.hidden;
    rulesPanel.hidden = !open;
    btnRules.setAttribute('aria-expanded', String(open));
  });

  socket.on('joined', ({ playerId }) => {
    myPlayerId = playerId;
  });

  socket.on('roomState', (state) => {
    applyState(state);
  });

  socket.on('gameError', ({ message }) => {
    showToast(message);
    if (!screenWelcome.classList.contains('hidden')) {
      welcomeError.textContent = message;
    }
  });

  difficultyPanel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-difficulty]');
    if (!btn || btn.disabled) return;
    socket.emit('requestQuestion', { difficulty: btn.getAttribute('data-difficulty') });
  });

  const ICON_ARROW_OK =
    '<svg class="choice-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>';
  const ICON_CROSS_BAD =
    '<svg class="choice-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  socket.on('answerFeedback', ({ correct, choiceIndex }) => {
    showAnswerResultBanner(correct);
    const wrap = questionChoices;
    if (!wrap) return;
    const btn = wrap.querySelector(`[data-choice-index="${choiceIndex}"]`);
    if (!btn) return;
    btn.classList.add(correct ? 'choice-btn--correct' : 'choice-btn--wrong');
    const mark = btn.querySelector('.choice-btn__mark');
    if (mark) {
      mark.innerHTML = correct ? ICON_ARROW_OK : ICON_CROSS_BAD;
      mark.classList.add('choice-btn__mark--visible');
    }
    const txt = btn.querySelector('.choice-btn__text');
    btn.setAttribute(
      'aria-label',
      (txt ? txt.textContent : '') + (correct ? ' — bonne réponse' : ' — mauvaise réponse')
    );
  });

  const dockToggle = $('play-dock-toggle');
  if (dockToggle) {
    dockToggle.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('play-dock-collapsed');
      dockToggle.setAttribute('aria-expanded', String(!collapsed));
      dockToggle.title = collapsed ? 'Agrandir le panneau' : 'Réduire le panneau';
    });
  }

  buildBoard();
})();
