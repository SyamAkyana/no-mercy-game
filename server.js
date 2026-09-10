/* ============================================================================
   No Mercy — Socket.IO Multiplayer Server (authoritative)
   ----------------------------------------------------------------------------
   - Serves the client (Express static) + Socket.IO client script.
   - Guest sessions (no login): persistent guestId in localStorage, reconnection.
   - Lobby: online presence, room list, quick match, create/join private rooms.
   - Rooms: host, ready states, start game.
   - Game: authoritative shared engine (game-engine.js). The client only sends
     actions; the server validates and broadcasts state. Opponents' hands are
     NEVER sent to clients.
   ========================================================================== */
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const E = require('./game-engine');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const MAX_NAME = 12;
const TURN_TIME_MS = 30000; // auto-nudge the current player if they idle too long

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname))); // serves index.html + game-engine.js

// Catch-all route to serve index.html for any path (fixes refresh 404)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ---------------- In-memory stores ---------------- */
const profiles = new Map();  // guestId -> {guestId, name, avatar}
const sockets = new Map();   // socketId -> guestId
const rooms = new Map();     // code -> room
const chatBuckets = new Map(); // guestId -> [timestamp, …] for rate-limiting
const CHAT_MAX = 5;  // messages per window
const CHAT_WINDOW = 10_000; // ms

function avatarFor(guestId) {
  let h = 0;
  for (const ch of guestId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return E.AVATARS[h % E.AVATARS.length];
}
function sanitizeName(name) {
  name = String(name || '').replace(/[\x00-\x1f]/g, '').trim();
  if (!name) name = 'Guest';
  return name.slice(0, MAX_NAME);
}
function guestIdFor(socket) { return sockets.get(socket.id); }
function profileOf(guestId) { return profiles.get(guestId); }

function roomOf(guestId) {
  const p = profileOf(guestId);
  return p && p.roomCode ? rooms.get(p.roomCode) : null;
}

/* ---------------- Lobby state ---------------- */
function lobbyState() {
  const online = [];
  for (const [guestId, p] of profiles) {
    if (sockets.has(p.socketId)) online.push({ name: p.name, avatar: p.avatar });
  }
  const list = [];
  for (const r of rooms.values()) {
    if (r.status === 'playing' && r.isPrivate) continue; // private playing rooms not advertised
    const host = r.players.get(r.hostGuestId);
    if (r.status === 'waiting') {
      list.push({ code: r.code, isPrivate: r.isPrivate, count: r.players.size, max: MAX_PLAYERS, status: r.status, hostName: host ? host.name : 'Host' });
    } else if (r.status === 'playing') {
      list.push({ code: r.code, isPrivate: false, count: r.players.size, max: MAX_PLAYERS, status: r.status, hostName: host ? host.name : 'Host', spectate: true });
    }
  }
  return { onlineCount: online.length, players: online, rooms: list };
}
function broadcastLobby() {
  io.emit('lobby:state', lobbyState());
}

/* ---------------- Room state / game state ---------------- */
function roomPublic(room) {
  return {
    code: room.code,
    isPrivate: room.isPrivate,
    status: room.status,
    hostGuestId: room.hostGuestId,
    rules: room.rules,
    players: [...room.players.values()].map(p => ({
      guestId: p.guestId, name: p.name, avatar: p.avatar,
      ready: p.ready, connected: p.connected, host: p.guestId === room.hostGuestId
    }))
  };
}
function broadcastRoom(room) {
  const s = roomPublic(room);
  for (const p of room.players.values()) {
    if (p.connected && p.socketId) io.to(p.socketId).emit('room:state', s);
  }
}
function gameStateFor(room, guestId) {
  const g = room.game;
  const me = g.players[guestId];
  return {
    guestId,
    hand: me ? me.hand : [],
    handLen: me ? me.handLen : 0,
    topCard: g.discard.length > 0 ? g.discard[g.discard.length - 1] : null,
    drawCount: g.draw.length,
    currentPlayerId: g.currentPlayerId,
    direction: g.direction,
    pending: g.pending,
    selColor: g.selColor,
    phase: g.phase,
    pendingAction: g.pendingAction,
    order: g.order.map(id => {
      const pl = g.players[id];
      const rp = room.players.get(id);
      return {
        guestId: id, name: pl.name, avatar: pl.avatar, handLen: pl.handLen,
        elim: pl.elim, hasCalledUno: pl.hasCalledUno, stats: pl.stats,
        connected: rp ? rp.connected : false
      };
    }),
    playable: g.currentPlayerId === guestId ? E.getPlayableIds(g, guestId) : [],
    winner: g.winner,
    rules: room.rules,
    yourTurn: g.currentPlayerId === guestId,
    turnNumber: g.turnNumber,
    gameOver: g.phase === 'done',
    finalHands: g.phase === 'done' ? Object.fromEntries(
      g.order.map(id => [id, g.players[id].hand])
    ) : null
  };
}
function spectatorStateFor(room) {
  const g = room.game;
  return {
    spectator: true,
    topCard: g.discard.length > 0 ? g.discard[g.discard.length - 1] : null,
    drawCount: g.draw.length,
    currentPlayerId: g.currentPlayerId,
    direction: g.direction,
    pending: g.pending,
    selColor: g.selColor,
    phase: g.phase,
    order: g.order.map(id => {
      const pl = g.players[id];
      const rp = room.players.get(id);
      return {
        guestId: id, name: pl.name, avatar: pl.avatar, handLen: pl.handLen,
        elim: pl.elim, hasCalledUno: pl.hasCalledUno, stats: pl.stats,
        hand: pl.hand, connected: rp ? rp.connected : false
      };
    }),
    winner: g.winner,
    turnNumber: g.turnNumber,
    gameOver: g.phase === 'done',
    finalHands: g.phase === 'done' ? Object.fromEntries(
      g.order.map(id => [id, g.players[id].hand])
    ) : null
  };
}
function broadcastGame(room, events) {
  if (events && events.length) io.to(room.code).emit('game:events', events);
  for (const p of room.players.values()) {
    if (p.connected && p.socketId) {
      io.to(p.socketId).emit('game:state', gameStateFor(room, p.guestId));
    }
  }
  for (const s of room.spectators) {
    if (s.connected && s.socketId) {
      io.to(s.socketId).emit('game:state', spectatorStateFor(room));
    }
  }
}
function sendError(socket, msg) { socket.emit('game:error', { message: msg }); }

/* ---------------- Turn watch (no frozen games) ---------------- */
const turnTimers = new Map(); // code -> timer

// Least-harm auto-policy for an idle current player.
function bestColorFor(g, playerId) {
  const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const c of g.players[playerId].hand || []) if (counts[c.color] != null) counts[c.color]++;
  const best = E.COLORS.reduce((a, b) => (counts[b] > counts[a] ? b : a), 'red');
  return best;
}
function swapTargetFor(g, playerId) {
  let t = null;
  for (const id of g.order) {
    if (id === playerId || g.players[id].elim) continue;
    if (!t || g.players[id].handLen < g.players[t].handLen) t = id;
  }
  return t;
}

function scheduleTurnWatch(room) {
  clearTimeout(turnTimers.get(room.code));
  if (room.status !== 'playing' || !room.game || room.game.phase === 'done') return;
  turnTimers.set(room.code, setTimeout(() => {
    if (!rooms.has(room.code) || !room.game) return;
    const g = room.game;
    if (room.status !== 'playing' || g.phase === 'done') return;
    const cur = g.currentPlayerId;
    const events = [];
    if (g.phase === 'color') {
      // Idle during a color choice — pick their most common hand color for them.
      const r = E.chooseColor(g, cur, bestColorFor(g, cur));
      events.push(...(r.events || []));
    } else if (g.pendingAction === 'swap') {
      // Idle during a 7-swap — swap with the opponent holding the fewest cards.
      const t = swapTargetFor(g, cur);
      if (t) {
        const r = E.swapHands(g, cur, t);
        events.push(...(r.events || []));
      }
    } else if (g.phase === 'playing' && g.currentPlayerId === cur) {
      // Idle on a normal turn — auto-draw (advances the turn).
      const r = E.draw(g, cur);
      events.push(...(r.events || []));
    }
    events.push({ type: 'timeout', playerId: cur });
    broadcastGame(room, events);
    scheduleTurnWatch(room);
  }, TURN_TIME_MS));
}

/* ---------------- Room lifecycle ---------------- */
function newRoom(hostGuestId, isPrivate) {
  let code;
  do { code = 'NM' + (1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(code));
  const room = {
    code, isPrivate, hostGuestId,
    status: 'waiting',
    players: new Map(),
    spectators: [],
    game: null,
    chat: [],
    rules: { mercy: 25, stacking: true, sevenSwap: true, zeroPass: true }
  };
  rooms.set(code, room);
  return room;
}
function joinRoom(room, guestId) {
  const p = profileOf(guestId);
  room.players.set(guestId, {
    guestId, name: p.name, avatar: p.avatar,
    ready: false, connected: true, socketId: p.socketId
  });
  if (!room.hostGuestId) room.hostGuestId = guestId;
  p.roomCode = room.code;
}
function leaveRoom(guestId) {
  const room = roomOf(guestId);
  const p = profileOf(guestId);
  if (!room) { if (p) p.roomCode = null; return; }
  room.players.delete(guestId);
  if (p) p.roomCode = null;
  if (room.players.size === 0) {
    rooms.delete(room.code);
    turnTimers.delete(room.code);
  } else {
    if (room.hostGuestId === guestId) {
      // transfer host to first connected (or first) player
      const first = [...room.players.values()].find(x => x.connected) || [...room.players.values()][0];
      room.hostGuestId = first.guestId;
    }
    if (room.status === 'playing') broadcastGame(room, [{ type: 'left', guestId }]);
    broadcastRoom(room);
  }
  broadcastLobby();
}

function startGame(room) {
  const order = [...room.players.keys()]; // insertion order = seating
  const enginePlayers = order.map(id => {
    const p = room.players.get(id);
    return { id, name: p.name, avatar: p.avatar };
  });
  room.game = E.createGame(enginePlayers, room.rules);
  room.status = 'playing';
  room.players.forEach(p => { p.ready = false; });
  const events = [{ type: 'game-start' }, { type: 'turn', playerId: room.game.currentPlayerId }];
  broadcastGame(room, events);
  broadcastRoom(room);
  broadcastLobby();
  scheduleTurnWatch(room);
}

/* ---------------- Socket handling ---------------- */
function onGuestJoin(socket, data) {
  let guestId = String(data && data.guestId || '');
  let name = sanitizeName(data && data.name);

  let isNew = false;
  if (!guestId || !profiles.has(guestId)) {
    guestId = crypto.randomUUID();
    isNew = true;
  }
  const profile = profiles.get(guestId) || { guestId, name, avatar: avatarFor(guestId) };
  if (isNew || name !== profile.name) profile.name = name || profile.name;
  if (!profile.avatar) profile.avatar = avatarFor(guestId);
  // Always update socketId so roomOf() resolves correctly on reconnect
  profile.socketId = socket.id;
  profiles.set(guestId, profile);

  // Always update sockets map so guestId→socketId lookup is current
  sockets.set(socket.id, guestId);

  socket.emit('guest:profile', { guestId, name: profile.name, avatar: profile.avatar });

  // Reconnect into an existing room
  const room = roomOf(guestId);
  if (room && room.players.has(guestId)) {
    const rp = room.players.get(guestId);
    rp.connected = true; rp.socketId = socket.id;
    socket.join(room.code);
    broadcastRoom(room);
    if (room.status === 'playing' && room.game) {
      socket.emit('game:state', gameStateFor(room, guestId));
      scheduleTurnWatch(room);
    }
    socket.emit('chat:history', room.chat.slice(-50));
  } else if (room && room.spectators.some(s => s.guestId === guestId)) {
    const sp = room.spectators.find(s => s.guestId === guestId);
    sp.connected = true; sp.socketId = socket.id;
    socket.join(room.code);
    if (room.status === 'playing' && room.game) {
      socket.emit('game:state', spectatorStateFor(room));
      scheduleTurnWatch(room);
    }
    socket.emit('chat:history', room.chat.slice(-50));
  }
  broadcastLobby();
}

/* Action throttle (light anti-spam) */
const lastAction = new Map(); // socketId -> timestamp
function throttled(socket) {
  const now = Date.now();
  const last = lastAction.get(socket.id) || 0;
  if (now - last < 120) return true;
  lastAction.set(socket.id, now);
  return false;
}
function requireGame(socket) {
  const guestId = guestIdFor(socket);
  const room = guestId ? roomOf(guestId) : null;
  if (!guestId || !room || !room.game) return null;
  return { guestId, room };
}

io.on('connection', (socket) => {
  socket.on('guest:join', (data) => onGuestJoin(socket, data));

  socket.on('lobby:quickMatch', () => {
    const guestId = guestIdFor(socket);
    if (!guestId) return;
    if (roomOf(guestId)) return sendError(socket, 'You are already in a room.');
    let room = [...rooms.values()].find(r => r.status === 'waiting' && !r.isPrivate && r.players.size < MAX_PLAYERS);
    if (!room) room = newRoom(guestId, false);
    socket.join(room.code);
    joinRoom(room, guestId);
    broadcastRoom(room); broadcastLobby();
    socket.emit('chat:history', room.chat.slice(-50));
  });

  socket.on('lobby:createRoom', (data) => {
    const guestId = guestIdFor(socket);
    if (!guestId) return;
    if (roomOf(guestId)) return sendError(socket, 'You are already in a room.');
    const isPrivate = !!(data && data.isPrivate);
    const room = newRoom(guestId, isPrivate);
    socket.join(room.code);
    joinRoom(room, guestId);
    broadcastRoom(room); broadcastLobby();
    socket.emit('chat:history', room.chat.slice(-50));
  });

  socket.on('room:join', (data) => {
    const guestId = guestIdFor(socket);
    if (!guestId) return;
    if (roomOf(guestId)) return sendError(socket, 'You are already in a room.');
    const code = String(data && data.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('room:error', { message: 'Room not found.' });
    if (room.status !== 'waiting') return socket.emit('room:error', { message: 'Game already started.' });
    if (room.players.size >= MAX_PLAYERS) return socket.emit('room:error', { message: 'Room is full.' });
    socket.join(code);
    joinRoom(room, guestId);
    broadcastRoom(room); broadcastLobby();
    socket.emit('chat:history', room.chat.slice(-50));
  });

  socket.on('room:leave', () => {
    const guestId = guestIdFor(socket);
    if (!guestId) return;
    const room = roomOf(guestId);
    if (room) socket.leave(room.code);
    leaveRoom(guestId);
    // Also remove as spectator
    for (const r of rooms.values()) {
      const idx = r.spectators.findIndex(s => s.guestId === guestId);
      if (idx >= 0) { r.spectators.splice(idx, 1); }
    }
    broadcastLobby();
  });

  socket.on('room:spectate', (data) => {
    const guestId = guestIdFor(socket);
    if (!guestId) return;
    if (roomOf(guestId)) return sendError(socket, 'Leave your room first.');
    const code = String(data && data.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('room:error', { message: 'Room not found.' });
    if (room.status !== 'playing') return socket.emit('room:error', { message: 'Game not in progress.' });
    socket.join(code);
    const profile = profileOf(guestId);
    // Remove from any other room's spectator list first
    for (const r of rooms.values()) {
      const idx = r.spectators.findIndex(s => s.guestId === guestId);
      if (idx >= 0) r.spectators.splice(idx, 1);
    }
    room.spectators.push({ guestId, name: profile.name, avatar: profile.avatar, connected: true, socketId: socket.id });
    profile.roomCode = room.code;
    socket.emit('room:spectating', { code: room.code });
    socket.emit('game:state', spectatorStateFor(room));
    socket.emit('chat:history', room.chat.slice(-50));
  });

  socket.on('room:ready', (data) => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room || room.status !== 'waiting') return;
    const p = room.players.get(guestId);
    if (p) p.ready = !!(data && data.ready);
    broadcastRoom(room); broadcastLobby();
  });

  socket.on('room:setRules', (data) => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room || room.status !== 'waiting') return;
    if (guestId !== room.hostGuestId) return sendError(socket, 'Only the host can change rules.');
    const r = data && typeof data === 'object' ? data : {};
    if (typeof r.mercy === 'number') room.rules.mercy = Math.max(10, Math.min(50, r.mercy));
    if (typeof r.stacking === 'boolean') room.rules.stacking = r.stacking;
    if (typeof r.sevenSwap === 'boolean') room.rules.sevenSwap = r.sevenSwap;
    if (typeof r.zeroPass === 'boolean') room.rules.zeroPass = r.zeroPass;
    broadcastRoom(room);
  });

  socket.on('room:rematch', () => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room || guestId !== room.hostGuestId) return;
    room.status = 'waiting';
    room.game = null;
    room.players.forEach(p => { p.ready = false; });
    broadcastRoom(room);
    broadcastLobby();
  });

  socket.on('room:start', () => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room || room.status !== 'waiting') return;
    if (guestId !== room.hostGuestId) return sendError(socket, 'Only the host can start.');
    const connected = [...room.players.values()].filter(p => p.connected);
    if (connected.length < MIN_PLAYERS) return sendError(socket, 'Need at least 2 players.');
    if (connected.some(p => !p.ready)) return sendError(socket, 'All players must be ready.');
    startGame(room);
  });

  /* ---- In-game actions ---- */
  const actions = {
    'game:playCard': (ctx, data) => E.playCard(ctx.room.game, ctx.guestId, data && data.cardId),
    'game:draw': (ctx) => E.draw(ctx.room.game, ctx.guestId),
    'game:callUno': (ctx) => E.callUno(ctx.room.game, ctx.guestId),
    'game:chooseColor': (ctx, data) => E.chooseColor(ctx.room.game, ctx.guestId, data && data.color),
    'game:swapHands': (ctx, data) => E.swapHands(ctx.room.game, ctx.guestId, data && data.targetId)
  };
  for (const [evt, fn] of Object.entries(actions)) {
    socket.on(evt, (data) => {
      if (throttled(socket)) return;
      const ctx = requireGame(socket);
      if (!ctx || ctx.room.status !== 'playing') return;
      const res = fn(ctx, data);
      if (res && res.events && res.events.length) {
        broadcastGame(ctx.room, res.events);
        scheduleTurnWatch(ctx.room);
      }
    });
  }

  /* ---- Room chat ---- */
  socket.on('chat:send', (data) => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room) return;
    // Sanitize message
    let msg = String(data && data.message || '').replace(/[\x00-\x1f]/g, '').trim();
    if (!msg) return;
    msg = msg.slice(0, 200);
    // Rate limit: max 5 messages per 10s per guestId
    const now = Date.now();
    const bucket = chatBuckets.get(guestId) || [];
    const recent = bucket.filter(t => now - t < CHAT_WINDOW);
    if (recent.length >= CHAT_MAX) {
      const cooldown = Math.ceil((CHAT_WINDOW - (now - recent[0])) / 1000);
      return socket.emit('chat:error', { cooldown });
    }
    recent.push(now);
    chatBuckets.set(guestId, recent);
    const profile = profileOf(guestId);
    const entry = { guestId, name: profile.name, avatar: profile.avatar, message: msg, ts: now };
    room.chat.push(entry);
    if (room.chat.length > 50) room.chat.shift();
    io.to(room.code).emit('chat:message', entry);
  });

  /* ---- Emoji quick-reactions (in-game, no rate-limit) ---- */
  const VALID_EMOJIS = ['🔥','😱','😂','👍','⏳','💀','❤️','🎉'];
  socket.on('chat:emoji', (data) => {
    const guestId = guestIdFor(socket);
    const room = guestId ? roomOf(guestId) : null;
    if (!room) return;
    const emoji = VALID_EMOJIS.includes(data && data.emoji) ? data.emoji : null;
    if (!emoji) return;
    const profile = profileOf(guestId);
    if (!profile) return;
    io.to(room.code).emit('chat:emoji', { guestId, name: profile.name, avatar: profile.avatar, emoji, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    const guestId = sockets.get(socket.id);
    if (!guestId) return;
    sockets.delete(socket.id);
    const profile = profiles.get(guestId);
    if (profile && profile.socketId === socket.id) profile.socketId = null;
    const room = roomOf(guestId);
    if (room && room.players.has(guestId)) {
      const rp = room.players.get(guestId);
      rp.connected = false; rp.socketId = null;
      socket.leave(room.code);
      if (room.status === 'playing') broadcastGame(room, [{ type: 'disconnected', guestId }]);
      broadcastRoom(room);
      if (room.status === 'playing') scheduleTurnWatch(room);
    } else if (room) {
      // Spectator disconnect — keep in list, mark offline
      const sp = room.spectators.find(s => s.guestId === guestId);
      if (sp) { sp.connected = false; sp.socketId = null; }
    }
    broadcastLobby();
  });
});

server.listen(PORT, () => {
  console.log(`No Mercy server running → http://localhost:${PORT}`);
  console.log(`Open this URL in 2+ browser tabs/windows to play together.`);
});
