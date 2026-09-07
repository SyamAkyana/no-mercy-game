/* Engine smoke tests — node --test */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const E = require('../game-engine');

describe('Game Engine', () => {
  it('builds a deck with 164 cards', () => {
    const state = E.createGame([{ id: 'a', name: 'A', avatar: '#f00' }]);
    const total = state.draw.length + state.discard.length + state.players.a.hand.length;
    assert.strictEqual(total, 164, 'Total cards should be 164');
  });

  it('deals 7 cards to each player', () => {
    const state = E.createGame([
      { id: 'a', name: 'A', avatar: '#f00' },
      { id: 'b', name: 'B', avatar: '#0f0' },
      { id: 'c', name: 'C', avatar: '#00f' }
    ]);
    assert.strictEqual(state.players.a.hand.length, 7);
    assert.strictEqual(state.players.b.hand.length, 7);
    assert.strictEqual(state.players.c.hand.length, 7);
  });

  it('has no duplicate card ids', () => {
    const state = E.createGame([{ id: 'a', name: 'A', avatar: '#f00' }, { id: 'b', name: 'B', avatar: '#0f0' }]);
    const ids = new Set();
    for (const c of state.draw) ids.add(c.id);
    for (const c of state.discard) ids.add(c.id);
    for (const p of Object.values(state.players)) for (const c of p.hand) ids.add(c.id);
    assert.strictEqual(ids.size, 164, 'All card IDs should be unique');
  });

  it('validates illegal plays', () => {
    const state = E.createGame([{ id: 'a', name: 'A', avatar: '#f00' }, { id: 'b', name: 'B', avatar: '#0f0' }]);
    state.currentPlayerId = 'a';
    const fakeId = 'not-a-real-card';
    const res = E.playCard(state, 'a', fakeId);
    assert.strictEqual(res.events.length, 0, 'Illegal play should be rejected');
  });

  it('detects a winner when hand is empty', () => {
    const state = E.createGame([{ id: 'a', name: 'A', avatar: '#f00' }, { id: 'b', name: 'B', avatar: '#0f0' }]);
    state.currentPlayerId = 'a';
    state.players.a.hand = [state.draw.pop()]; // 1 card
    const playable = E.getPlayableIds(state, 'a');
    if (playable.length > 0) {
      const res = E.playCard(state, 'a', playable[0]);
      if (state.players.a.hand.length === 0) {
        assert.strictEqual(state.phase, 'done', 'Phase should be done');
        assert.strictEqual(state.winner, 'a', 'Winner should be player a');
      }
    }
  });

  it('maintains card invariant across random game', () => {
    const ids = ['a', 'b', 'c'];
    const state = E.createGame(ids.map(id => ({ id, name: id, avatar: '#fff' })));
    for (let step = 0; step < 200; step++) {
      if (state.phase !== 'playing') break;
      const cur = state.currentPlayerId;
      if (state.phase === 'color') {
        E.chooseColor(state, cur, ['red', 'blue', 'green', 'yellow'][step % 4]);
        continue;
      }
      const playable = E.getPlayableIds(state, cur);
      if (playable.length && Math.random() > 0.3) {
        const card = playable[Math.floor(Math.random() * playable.length)];
        const res = E.playCard(state, cur, card);
        if (res.events.some(e => e.type === 'await-swap')) {
          const targets = state.order.filter(x => x !== cur && !state.players[x].elim);
          if (targets.length) E.swapHands(state, cur, targets[0]);
        }
        if (state.phase === 'color') E.chooseColor(state, cur, ['red', 'blue', 'green', 'yellow'][step % 4]);
      } else {
        E.draw(state, cur);
      }
      // Invariant check
      let total = state.draw.length + state.discard.length;
      for (const id of state.order) total += state.players[id].hand.length;
      assert.strictEqual(total, 164, `Step ${step}: card count invariant broken`);
    }
  });
});
