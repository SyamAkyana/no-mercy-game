/* ============================================================================
   No Mercy — Shared Game Engine
   ----------------------------------------------------------------------------
   Pure, DOM-free, authoritative rules for UNO Show 'Em No Mercy.

   Runs BOTH:
     - Server-side (Node `require('./game-engine')`) — the source of truth.
     - Client-side (browser `<script src="/game-engine.js">` → window.GameEngine)
       for local pass-and-play mode and for client-side legal-move highlighting
       (the server ALWAYS re-validates every action).

   UMD wrapper so one file works in CommonJS (Node) and as a browser global.

   State is keyed by PLAYER ID (not index) because online guest/socket ids are
   not sequential. All actions are synchronous and return { events, win }.
   The server broadcasts the resulting state + events.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.GameEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- Constants ---------------- */
  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const COLOR_HEX = { red: '#e82040', blue: '#2080e0', green: '#20b810', yellow: '#e8c020' };
  const AVATARS = ['#e82040', '#2080e0', '#20b810', '#e8c020', '#d4a017', '#8b0000'];
  const MERCY = 25;      // elimination threshold
  const START_CARDS = 7; // cards dealt to each player
  const MAX_CARDS = 190; // not used for enforcement, informational

  /* ---------------- Deck ---------------- */
  const _icons = {
    draw2: '+', draw4: '+', reverse: '➲', skip: '⊘',
    skipEveryone: '⊘⊘', discardAll: '⟦⟧',
    wildDraw6: '+', wildDraw10: '+', wildReverseDraw4: '➲+', wildColorRoulette: '◎'
  };
  const _labels = {
    draw2: 'Draw 2', draw4: 'Draw 4', reverse: 'Reverse', skip: 'Skip',
    skipEveryone: 'Skip All', discardAll: 'Discard All', wild: 'Wild',
    wildDraw6: 'Wild +6', wildDraw10: 'Wild +10', wildReverseDraw4: 'Rev +4',
    wildColorRoulette: 'Roulette'
  };
  const _dv = { draw2: 2, draw4: 4, wildDraw6: 6, wildDraw10: 10, wildReverseDraw4: 4 };

  function mkCard(state, color, type, value) {
    return {
      id: 'c' + (state.cardSeq++),
      color, type, value,
      icon: _icons[type] || String(value),
      label: _labels[type] || '',
      drawValue: _dv[type] || 0,
      svg: true
    };
  }
  function buildDeck(state) {
    let d = [];
    for (const c of COLORS) {
      d.push(mkCard(state, c, 'number', 0));
      for (let n = 1; n <= 9; n++) {
        d.push(mkCard(state, c, 'number', n));
        d.push(mkCard(state, c, 'number', n));
      }
      for (const a of ['draw2', 'draw4', 'reverse', 'skip', 'skipEveryone', 'discardAll']) {
        d.push(mkCard(state, c, a, 0));
        d.push(mkCard(state, c, a, 0));
      }
    }
    for (let i = 0; i < 8; i++) {
      d.push(mkCard(state, 'wild', 'wild', 0));
      d.push(mkCard(state, 'wild', 'wildDraw6', 0));
      d.push(mkCard(state, 'wild', 'wildDraw10', 0));
      d.push(mkCard(state, 'wild', 'wildReverseDraw4', 0));
      d.push(mkCard(state, 'wild', 'wildColorRoulette', 0));
    }
    return d;
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function isWild(c) { return c.color === 'wild'; }

  /* ---------------- Legality ---------------- */
  function canPlay(card, topCard, selColor) {
    if (isWild(card)) return true;
    const ec = selColor || topCard.color;
    if (card.color === ec) return true;
    if (card.type === topCard.type && card.type !== 'number') return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    return false;
  }
  function canStack(card, topCard, state) {
    if (state && !state.rules.stacking) return false;
    if (card.drawValue <= 0 || topCard.drawValue <= 0) return false;
    return card.drawValue >= topCard.drawValue;
  }
  function getPlayableIds(state, playerId) {
    const h = state.players[playerId].hand, top = topCard(state);
    if (!top) return [];
    if (state.pending > 0) return h.filter(c => canStack(c, top, state)).map(c => c.id);
    return h.filter(c => canPlay(c, top, state.selColor)).map(c => c.id);
  }

  /* ---------------- Turn / active helpers ---------------- */
  function topCard(state) { return state.discard[state.discard.length - 1]; }
  function activeList(state) { return state.order.filter(id => !state.players[id].elim); }
  function activeCount(state) { return activeList(state).length; }
  function nextActive(state, fromId) {
    const order = state.order, dir = state.direction, n = order.length;
    let idx = order.indexOf(fromId);
    if (idx < 0) return null;
    let steps = 0;
    let cur = (idx + dir + n) % n;
    while (state.players[order[cur]].elim && steps++ < n) cur = (cur + dir + n) % n;
    return state.players[order[cur]].elim ? null : order[cur];
  }
  function recycle(state) {
    if (state.discard.length <= 1) return;
    const t = state.discard.pop();
    state.draw = shuffle([...state.discard]);
    state.discard = [t];
  }
  function dealFrom(state) {
    if (state.draw.length === 0) recycle(state);
    return state.draw.length ? state.draw.pop() : null;
  }

  /* ---------------- Events helper ---------------- */
  function evtAnn(evt, text, color) {
    evt.push({ type: 'announce', text, color: color || '#fff' });
  }
  function evtTurn(evt, playerId) { evt.push({ type: 'turn', playerId }); }

  /* ---------------- Setup ---------------- */
  function createGame(players, rules) {
    // players: [{id, name, avatar}]
    // rules: { mercy:25, stacking:true, sevenSwap:true, zeroPass:true }  (optional)
    const state = {
      phase: 'playing',
      order: players.map(p => p.id),
      players: {},
      draw: [], discard: [],
      currentPlayerId: null,
      direction: 1,
      pending: 0, pendingType: null,
      selColor: null,
      pendingWild: null, pendingWildRev: false,
      startupWild: false,
      pendingAction: null,   // 'swap' | 'color' — survives reconnection
      winner: null,
      turnNumber: 0,
      turnStartPlayerId: null,
      cardSeq: 0,
      rules: Object.assign({ mercy: MERCY, stacking: true, sevenSwap: true, zeroPass: true }, rules || {})
    };
    for (const p of players) {
      state.players[p.id] = {
        id: p.id, name: p.name, avatar: p.avatar,
        hand: [], handLen: 0, elim: false, hasCalledUno: false,
        stats: { played: 0, drawn: 0, penalties: 0, swaps: 0, passes: 0 }
      };
    }
    state.draw = shuffle(buildDeck(state));
    for (let r = 0; r < START_CARDS; r++) {
      for (const id of state.order) state.players[id].hand.push(state.draw.pop());
    }
    for (const id of state.order) state.players[id].handLen = state.players[id].hand.length;

    let c = state.draw.pop();
    while (c.type === 'wildColorRoulette') { state.draw.unshift(c); shuffle(state.draw); c = state.draw.pop(); }
    state.discard.push(c);
    applyStart(state, c);
    state.currentPlayerId = state.order[0];
    return state;
  }
  function applyStart(state, c) {
    if (c.type === 'reverse') state.direction = -1;
    else if (c.type === 'skip') state.currentPlayerId = nextActive(state, state.order[0]);
    else if (c.type === 'skipEveryone') { /* no-op */ }
    else if (c.type === 'draw2') state.pending = 2;
    else if (c.type === 'draw4') state.pending = 4;
    else if (c.type === 'wildDraw6') state.pending = 6;
    else if (c.type === 'wildDraw10') state.pending = 10;
    else if (c.type === 'wildReverseDraw4') { state.direction *= -1; state.pending = 4; }
    else if (c.type === 'wild') state.startupWild = true;
    else if (c.type === 'discardAll') { /* no matching cards at deal */ }
  }

  /* ---------------- Mercy / win ---------------- */
  function checkMercy(state, playerId, evt) {
    const p = state.players[playerId];
    if (p.handLen >= (state.rules.mercy || MERCY) && !p.elim) {
      p.elim = true;
      if (evt) evt.push({ type: 'mercy', playerId, name: p.name, count: p.handLen });
      return true;
    }
    return false;
  }
  function checkLastStanding(state, evt) {
    if (activeCount(state) <= 1) {
      const w = activeList(state)[0];
      if (w != null) {
        state.phase = 'done';
        state.winner = w;
        if (evt) evt.push({ type: 'winner', playerId: w, name: state.players[w].name });
        return true;
      }
    }
    return false;
  }

  function checkUnoPenalty(state, playerId, evt) {
    const p = state.players[playerId];
    if (!p || p.elim || p.handLen !== 1 || p.hasCalledUno) return;
    let drew = 0;
    for (let i = 0; i < 2; i++) {
      const c = dealFrom(state);
      if (c) { p.hand.push(c); p.handLen++; drew++; }
    }
    p.stats.penalties += 2;
    if (evt) evtAnn(evt, 'NO UNO! +2', '#e82040');
  }

  function advanceTurn(state, fromId, evt) {
    state.turnStartPlayerId = fromId;
    if (checkLastStanding(state, evt)) return;
    checkUnoPenalty(state, fromId, evt);
    state.currentPlayerId = nextActive(state, fromId);
    state.turnNumber++;
    if (evt) evtTurn(evt, state.currentPlayerId);
  }
  function skipTurn(state, fromId, evt) {
    state.turnStartPlayerId = fromId;
    if (checkLastStanding(state, evt)) return;
    checkUnoPenalty(state, fromId, evt);
    const skipped = nextActive(state, fromId);
    state.currentPlayerId = nextActive(state, skipped);
    state.turnNumber++;
    if (evt) evtTurn(evt, state.currentPlayerId);
  }

  function finishPlay(state, playerId, evt) {
    const p = state.players[playerId];
    p.hasCalledUno = false;
    if (p.hand.length === 0) {
      state.phase = 'done';
      state.winner = playerId;
      if (evt) evt.push({ type: 'winner', playerId, name: p.name });
      return 'win';
    }
    return null;
  }

  /* ---------------- Play card ---------------- */
  function playCard(state, playerId, cardId) {
    const evt = [];
    if (state.phase !== 'playing') return { events: [], win: null };
    if (state.currentPlayerId !== playerId) return { events: [], win: null };
    const p = state.players[playerId];
    const ci = p.hand.findIndex(c => c.id === cardId);
    if (ci < 0) return { events: [], win: null };
    if (!getPlayableIds(state, playerId).includes(cardId)) return { events: [], win: null };

    const card = p.hand.splice(ci, 1)[0];
    p.handLen = p.hand.length;
    state.discard.push(card);
    p.stats.played++;
    state.selColor = null;
    state.pendingWild = null; state.pendingWildRev = false;

    if (finishPlay(state, playerId, evt) === 'win') return { events: evt, win: playerId };
    if (p.hand.length === 1) evt.push({ type: 'uno-available', playerId });

    resolveCard(state, card, playerId, evt);
    return { events: evt, win: null };
  }

  function resolveCard(state, card, pi, evt) {
    switch (card.type) {
      case 'draw2':
        state.pending += 2; state.pendingType = 'draw2';
        evtAnn(evt, state.pending === 2 ? '+2' : 'STACKED +' + state.pending, COLOR_HEX[card.color]);
        advanceTurn(state, pi, evt); break;
      case 'draw4':
        state.pending += 4; state.pendingType = 'draw4';
        evtAnn(evt, state.pending === 4 ? '+4' : 'STACKED +' + state.pending, COLOR_HEX[card.color]);
        advanceTurn(state, pi, evt); break;
      case 'reverse':
        if (state.order.length === 2) {
          evtAnn(evt, 'SKIP!', COLOR_HEX[card.color]);
          skipTurn(state, pi, evt); break;
        }
        state.direction *= -1;
        evtAnn(evt, 'REVERSED!', COLOR_HEX[card.color]);
        advanceTurn(state, pi, evt); break;
      case 'skip':
        evtAnn(evt, 'SKIPPED!', COLOR_HEX[card.color]);
        skipTurn(state, pi, evt); break;
      case 'skipEveryone':
        evtAnn(evt, 'SKIP ALL!', COLOR_HEX[card.color]);
        // current player goes again
        evtTurn(evt, state.currentPlayerId);
        break;
      case 'discardAll': resolveDiscardAll(state, card, pi, evt); break;
      case 'number':
        if (card.value === 7) {
          state.pendingAction = 'swap';
          evtAnn(evt, 'SWAP!', '#d4a017');
          evt.push({ type: 'await-swap', playerId: pi });
        } else if (card.value === 0) {
          resolveZero(state, pi, evt);
        } else {
          advanceTurn(state, pi, evt);
        }
        break;
      case 'wild':
        state.phase = 'color';
        evt.push({ type: 'await-color', playerId: pi });
        break;
      case 'wildDraw6': state.pendingWild = 6; state.pendingWildRev = false; state.phase = 'color'; evt.push({ type: 'await-color', playerId: pi }); break;
      case 'wildDraw10': state.pendingWild = 10; state.pendingWildRev = false; state.phase = 'color'; evt.push({ type: 'await-color', playerId: pi }); break;
      case 'wildReverseDraw4': state.pendingWild = 4; state.pendingWildRev = true; state.phase = 'color'; evt.push({ type: 'await-color', playerId: pi }); break;
      case 'wildColorRoulette': state.pendingWild = 'roulette'; state.pendingWildRev = false; state.phase = 'color'; evt.push({ type: 'await-color', playerId: pi }); break;
      default: advanceTurn(state, pi, evt);
    }
  }

  function resolveDiscardAll(state, card, pi, evt) {
    const mc = card.color, p = state.players[pi];
    const keep = [], toss = [];
    for (const c of p.hand) { (c.color === mc ? toss : keep).push(c); }
    p.hand = keep;
    p.handLen = keep.length;
    for (const c of toss) { state.discard.push(c); p.stats.played++; }
    evtAnn(evt, 'DISCARD ALL!', COLOR_HEX[mc]);
    if (keep.length === 0) {
      state.phase = 'done'; state.winner = pi;
      evt.push({ type: 'winner', playerId: pi, name: p.name });
      return;
    }
    if (keep.length === 1) evt.push({ type: 'uno-available', playerId: pi });
    advanceTurn(state, pi, evt);
  }

  /* ---------------- Swap (7) ---------------- */
  function swapHands(state, playerId, targetId) {
    const evt = [];
    if (state.phase !== 'playing' || state.pendingAction !== 'swap') return { events: [], win: null };
    if (state.currentPlayerId !== playerId) return { events: [], win: null };
    const p = state.players[playerId], t = state.players[targetId];
    if (!p || !t || t.elim || targetId === playerId) return { events: [], win: null };
    state.pendingAction = null;
    const tmp = [...p.hand];
    p.hand = [...t.hand];
    t.hand = tmp;
    p.handLen = p.hand.length;
    t.handLen = t.hand.length;
    p.stats.swaps++;
    evtAnn(evt, 'SWAP!', '#d4a017');
    if (p.handLen === 1) evt.push({ type: 'uno-available', playerId });
    advanceTurn(state, playerId, evt);
    return { events: evt, win: null };
  }

  /* ---------------- Zero pass ---------------- */
  function resolveZero(state, pi, evt) {
    const active = activeList(state);
    const temp = active.map(id => [...state.players[id].hand]);
    for (let i = 0; i < active.length; i++) {
      const toId = active[(i + 1) % active.length];
      state.players[toId].hand = temp[i];
      state.players[toId].handLen = temp[i].length;
    }
    state.players[pi].stats.passes++;
    evtAnn(evt, 'PASS ALL!', COLOR_HEX.yellow);
    if (state.players[pi].handLen === 1) evt.push({ type: 'uno-available', playerId: pi });
    advanceTurn(state, pi, evt);
  }

  /* ---------------- Color selection ---------------- */
  function chooseColor(state, playerId, color) {
    const evt = [];
    if (state.phase !== 'color' || state.currentPlayerId !== playerId) return { events: [], win: null };
    if (!COLORS.includes(color)) return { events: [], win: null };
    state.selColor = color; state.phase = 'playing'; state.pendingAction = null;

    if (state.startupWild) { state.startupWild = false; evtTurn(evt, state.currentPlayerId); return { events: evt, win: null }; }

    if (state.pendingWild === 'roulette') {
      const ni = nextActive(state, state.currentPlayerId);
      if (ni == null) return { events: evt, win: null };
      let safety = 600;
      while (safety-- > 0) {
        const c = dealFrom(state);
        if (!c) break;
        state.players[ni].hand.push(c);
        state.players[ni].handLen = state.players[ni].hand.length;
        if (c.color === color) break;
      }
      const cn = color.charAt(0).toUpperCase() + color.slice(1);
      evtAnn(evt, 'UNTIL ' + cn.toUpperCase() + '!', COLOR_HEX[color]);
      if (checkMercy(state, ni, evt)) { afterMercy(state, ni, evt); return { events: evt, win: null }; }
      if (checkLastStanding(state, evt)) return { events: evt, win: null };
      advanceTurn(state, ni, evt);
      return { events: evt, win: null };
    }

    if (state.pendingWild) {
      const amt = state.pendingWild;
      state.pending += amt;
      state.pendingType = 'wildDraw' + amt;
      if (state.pendingWildRev) {
        state.direction *= -1;
        evtAnn(evt, 'REVERSED!', COLOR_HEX[color] || '#d4a017');
        state.pendingWildRev = false;
      }
      evtAnn(evt, 'DRAW ' + amt + '!', COLOR_HEX[color] || '#d4a017');
      state.pendingWild = null;
      advanceTurn(state, state.currentPlayerId, evt);
      return { events: evt, win: null };
    }

    state.pendingWild = null;
    advanceTurn(state, state.currentPlayerId, evt);
    return { events: evt, win: null };
  }

  function afterMercy(state, fromId, evt) {
    if (checkLastStanding(state, evt)) return;
    advanceTurn(state, fromId, evt);
  }

  /* ---------------- Draw ---------------- */
  function draw(state, playerId) {
    const evt = [];
    if (state.phase !== 'playing' || state.currentPlayerId !== playerId) return { events: [], win: null };
    const p = state.players[playerId];

    // Draw all pending penalty cards first, then draw until playable (or pile empty).
    let guard = 0;
    while (true) {
      if (state.draw.length === 0) recycle(state);
      if (state.draw.length === 0) {
        state.pending = 0; state.pendingType = null;
        if (checkMercy(state, playerId, evt)) { afterMercy(state, playerId, evt); return { events: evt, win: null }; }
        if (checkLastStanding(state, evt)) return { events: evt, win: null };
        advanceTurn(state, playerId, evt);
        return { events: evt, win: null };
      }
      const card = state.draw.pop();
      p.hand.push(card);
      p.handLen = p.hand.length;
      p.stats.drawn++;
      if (checkMercy(state, playerId, evt)) { afterMercy(state, playerId, evt); return { events: evt, win: null }; }

      if (state.pending > 0) {
        state.pending--;
        if (state.pending > 0) continue;      // keep drawing penalty
        state.pendingType = null;
        if (p.handLen === 1) evt.push({ type: 'uno-available', playerId });
        // after paying penalty, still draw until playable
        const top = topCard(state);
        const drawn = card;
        if (canPlay(drawn, top, state.selColor)) break;
        continue;
      }
      const top = topCard(state);
      if (canPlay(card, top, state.selColor)) break;
      if (++guard > 300) break; // safety
    }
    if (checkMercy(state, playerId, evt)) { afterMercy(state, playerId, evt); return { events: evt, win: null }; }
    advanceTurn(state, playerId, evt);
    return { events: evt, win: null };
  }

  /* ---------------- UNO ---------------- */
  function callUno(state, playerId) {
    const evt = [];
    if (state.players[playerId]) {
      state.players[playerId].hasCalledUno = true;
      evt.push({ type: 'uno', playerId, name: state.players[playerId].name });
    }
    return { events: evt, win: null };
  }

  /* ---------------- Public API ---------------- */
  return {
    COLORS, COLOR_HEX, AVATARS, MERCY, START_CARDS,
    createGame, playCard, draw, chooseColor, swapHands, callUno,
    canPlay, canStack, getPlayableIds, isWild, buildDeck, shuffle,
    activeList, activeCount, nextActive, topCard, checkMercy, checkLastStanding
  };
});
