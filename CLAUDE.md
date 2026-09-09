# Plan: Connection States + Game Event Feed

## Changes

Two independent changes to `index.html` (client-only, no server changes).

---

## 1. Connection-state messaging (`#1, #29`)

### Problem
`initSocket()` shows nothing until `disconnect` fires. A slow first connect can show the red "CONNECTION LOST" banner with no real error. There's no "Connecting…" state and no `connect_error` / `reconnect_attempt` handler.

### Solution

**Add `connectingBanner` helper + new socket event handlers** inside `initSocket()`:

```
"Connecting to No Mercy..."   (yellow/neutral)  → shown as soon as initSocket() is called
"✓ Connected"                (green, 2s)        → on first 'connect' event
"Connection lost — reconnecting..."  (red)       → only on actual 'disconnect' after initial connect
```

**Implementation — modify `initSocket()`** (line ~1571):

1. **At top of initSocket**: call `showConnBanner('connecting')` (new overload — `'connecting'` puts the banner in a yellow neutral state with "Connecting to No Mercy..." text)
2. **Add handlers** for `connect_error`, `reconnect_attempt`, `reconnecting`, `reconnect`, `disconnect`:
   - `connect_error`: if first connect attempt, stay on "Connecting…" (yellow). Only show red banner after 2 failed attempts or timeout.
   - `reconnect_attempt(n)`: show red banner "Connection lost — reconnecting... (attempt n)" if `n > 1`
   - `reconnect`: flash green "✓ Connected" for 2s then hide; increment `connAttempts` so future disconnects show the real loss banner
   - `disconnect`: if `connAttempts === 0` (never connected), hide banner; else show red banner

3. **Modify `showConnBanner` overload** to handle three states: `'connecting'` (neutral/yellow), `'connected'` (green flash + auto-hide), and boolean `true/false` (red banner, existing behavior).

**CSS addition** — new `#connBanner.connecting` style: amber/yellow background gradient, different text.

**Result**: users never see a scary red banner during normal startup; re-connections after initial connect correctly show "reconnecting" state.

---

## 2. Game Event Feed (`#14`)

### Problem
`ann()` toasts flash and vanish (1800ms). There's no persistent log of what happened — in multiplayer especially, it's hard to follow ("did Alex's +4 get stacked or resolved?").

### Solution

**Add a collapsible `#gameFeed` panel** in the game-screen top-bar, driven by the existing `onGameEvents` pipeline.

**New HTML** (in `#gameScreen`, below `.top-bar`, above `.penalty-display`):
```html
<div id="gameFeed" class="feed-collapsed" aria-live="polite">
  <button class="feed-toggle" id="feedToggle">FEED ◀</button>
  <div class="feed-log" id="feedLog"></div>
</div>
```

**New CSS**:
- `#gameFeed`: fixed-width (200px) slide-out panel on the right side of the screen, `position: fixed; right: 0; top: 48px; bottom: 80px;`
- `.feed-collapsed`: width 32px (only toggle button visible)
- `.feed-log`: scrollable, 8 newest events, newest on top
- Each event: icon + text, color-coded by type (attack=orange, skip=blue, swap=gold, color=purple, uno=red, mercy=green, turn=neutral)
- Feed toggle button: click to expand/collapse; persisted in localStorage
- `aria-live="polite"` so screen readers announce new events

**New JS — `gameFeed` module**:
```js
const FEED_MAX = 8;
let feedEvents = [];

function pushFeedEvent(e) {
  // e.type: 'announce' | 'uno' | 'mercy' | 'turn' | 'await-color' | 'await-swap'
  feedEvents.unshift({ ...e, ts: Date.now() });
  if (feedEvents.length > FEED_MAX) feedEvents.pop();
  renderFeed();
}

function renderFeed() {
  const log = document.getElementById('feedLog');
  if (!log) return;
  log.innerHTML = feedEvents.map(ev => feedEventHTML(ev)).join('');
}
```

**Feed event renderer** — maps engine event types to icon + readable text:
- `'announce'`: icon for the card type (⚡ for draw, ⛔ for skip, ⟳ for reverse, ⚔ for discardAll, ⟦⟧ for pass, 💱 for color roulette), text from `e.text`
- `'uno'`: 🔥 "UNO!"
- `'mercy'`: 💀 "NAME was eliminated (X cards)"
- `'turn'`: ⏳ "NAME's turn"
- `'await-color'`: 🎨 "NAME chooses a color"
- `'await-swap'`: ⇄ "NAME must choose a player to swap"
- `'uno-available'`: (no feed entry — too noisy)
- `'timeout'`: ⏰ "NAME timed out"
- `'winner'`: 🏆 "NAME wins!"

**Wire up — `onGameEvents`** (line ~1697): after each `if/else if` branch, call `pushFeedEvent(e)`.

**Wire up — local mode**: in the local `resolveCard()`, `ann()`, `showMercyScreen()`, `showUNOBtn()`, `showGameOver()`, and `showTransition()` — add `pushFeedEvent()` calls alongside the existing UI calls. Local mode events don't go through `onGameEvents`, so they need direct calls.

**Toggle persistence**: `localStorage.getItem('nm_feedOpen')` / `setItem('nm_feedOpen', open)`.

---

## Files touched

| File | Changes |
|------|---------|
| `index.html` | All changes (client-only) |
| — CSS (2 new rulesets + banner states) | |
| — HTML (feed panel + toggle button) | |
| — JS (connection handlers + feed module) | |

---

## Testing plan

1. **Connection messaging**: Open devtools, thottle network to "Slow 3G", click Play Online — should see yellow "Connecting to No Mercy..." before socket connects. After connect, green flash then no banner. Then manually disconnect (or use Socket.IO disconnect) — should see red banner.
2. **Event feed**: Play a local game. Play a draw2 → should see "⚡ STACKED +4" in feed. Play skip → "⛔ SKIPPED!". Play 7 → "⚔ SWAP!" then "⇄ NAME must choose a player to swap". UNO → "🔥 UNO!". Mercy → "💀 NAME was eliminated". Toggle feed open/closed — state persists on reload.
3. **Online mode**: Play online game and watch feed populate from `onGameEvents` (same pipeline as local).