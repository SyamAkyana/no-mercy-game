# No Mercy — Online Multiplayer Card Game

UNO-style "Show 'Em No Mercy" card game with real-time online multiplayer (Node.js + Socket.IO).

## Features

- **Online Multiplayer**: Lobby, public/private rooms, quick match, real-time sync
- **Guest Players**: No login required — persistent guest sessions via localStorage
- **Authoritative Server**: All game logic validated server-side; clients never see opponents' hands
- **Reconnection**: Refresh mid-game and rejoin your seat with your hand intact
- **Local Pass-and-Play**: Original 2–10 player local mode still works
- **Premium Casino Theme**: Dark crimson poker-table visuals, ember particles, glass effects
- **Full No Mercy Rules**: Draw 2/4/6/10, Skip Everyone, Discard All, Wild Reverse Draw 4, Color Roulette, 7's Swap, 0's Pass, Stacking, Mercy Rule (25+ cards = elimination)

## Quick Start

```powershell
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in 2+ browser tabs or on multiple devices (same network).

## How to Play Online

1. Enter your player name
2. Click **Play Online** → joins the lobby
3. **Quick Match** (auto-join a room) or **Create Room** (host) or **Join Room** (enter code)
4. In the room: click **Ready**
5. Host clicks **Start Game** when all players are ready
6. Play! Cards highlight when playable; click to play, draw pile to draw
7. Call **UNO** when you have 1 card left
8. First to empty their hand wins (or last standing after mercy eliminations)

## Room Codes

- Public rooms appear in the lobby list
- Private rooms generate a code (e.g. **NM4821**) — share it with friends to join

## Reconnection

If you refresh or disconnect mid-game:
- Your `guestId` is saved in `localStorage`
- Reconnecting restores your seat and hand
- Offline players shown with **OFFLINE** tag
- After 60s grace period, the server auto-draws for disconnected players on their turn

## Local Mode (Pass-and-Play)

Click **Play Locally** on the welcome screen → original offline 2–10 player mode (no server required).

## Files

- `server.js` — Express + Socket.IO server (lobby, rooms, sessions)
- `game-engine.js` — Shared authoritative rules (UMD: runs in Node and browser)
- `index.html` — Client (premium visuals + online/local modes)
- `package.json` — Dependencies (express, socket.io)

## Architecture

**Server (authoritative)**:
- Guest sessions: `guestId` generated on first connect, persists via `localStorage`
- Rooms: in-memory, 2–6 players, public or private (with code)
- Game state: server owns the deck, hands, turn logic — clients only send actions
- Security: every action re-validated server-side; opponents' hands never sent

**Client**:
- Two modes: **online** (Socket.IO to server) and **local** (runs `game-engine.js` in-browser for pass-and-play)
- Online: renders server state; highlights playable cards from server's playable list
- Local: unchanged from original single-file game

**Engine (`game-engine.js`)**:
- Pure, synchronous, id-based rules (not index-based)
- UMD wrapper → same file works in Node `require()` and browser `<script>`
- Returns `{events, win}` — server broadcasts events for animations

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JS, CSS (no framework)
- **Game Logic**: Shared UMD module (authoritative on server, read-only client mirror for local mode)

## Port

Default: **3000**. Override with `PORT` env var:

```powershell
$env:PORT=8080; node server.js
```

## Limitations (v1 — Core Multiplayer)

- No database (rooms reset on server restart)
- No chat, sounds, PWA (deferred per scope)
- No full automated test suite (light smoke tests only)
- Turn timeout: 60s grace for disconnected players

## Development

Test locally:
- Open `http://localhost:3000` in 2 tabs
- Tab 1: Quick Match → creates room
- Tab 2: Join the room (or Quick Match again)
- Both ready → host starts → play!

## License

MIT (original game rules by Mattel; this is an original implementation with original artwork)

---

Built 2026-09 | Node.js 22+ | Works on desktop, tablet, mobile browsers
