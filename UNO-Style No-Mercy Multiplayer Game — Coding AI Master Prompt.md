# Build a Production-Quality Multiplayer UNO-Style "No Mercy" Card Game

You are an expert full-stack game developer, UI/UX designer, multiplayer systems engineer, and QA engineer.

Build a complete, production-quality, browser-based multiplayer card game inspired by the official **UNO Show ’Em No Mercy** rules.

The application must work extremely well on:

- Desktop browsers
- Laptop browsers
- Tablets
- Android phones
- iPhones
- Mobile browsers in portrait and landscape
- Modern Chrome, Edge, Safari and Firefox

The application must be installable as a PWA if practical.

Do NOT create a fake/demo interface. Build a fully playable multiplayer game with real-time synchronization, proper game-state management, reconnection handling, validation, animations, sound effects, and polished UI.

---

# 1. IMPORTANT — RESEARCH THE OFFICIAL RULES FIRST

Before implementing gameplay, research the current official rules from authoritative sources.

Prioritize:

1. Mattel official product pages
2. Mattel official instruction sheets/PDFs
3. Other reputable sources only when necessary to clarify something missing from the official documentation

Do NOT rely on a single random blog.

Create an internal `RULES.md` document containing:

- Deck composition
- Number of cards
- Player count
- Starting hand size
- Setup
- Turn order
- Legal card matching
- Draw rules
- UNO calling rules
- Stacking
- Mercy Rule
- 7's Swap
- 0's Pass
- Every Action Card
- Every Wild Card
- Winning conditions
- Elimination conditions
- Draw pile exhaustion/recycling
- Any special edge cases
- Any rule ambiguities discovered during research

Every implemented gameplay rule must be traceable to this rules document.

IMPORTANT:

Do not invent gameplay rules when the official rules already define them.

If official sources disagree, document the discrepancy and choose the most authoritative/current Mattel rule.

---

# 2. GAME OBJECTIVE

Implement the actual No-Mercy-style gameplay.

Players should be able to win by:

1. Getting rid of all cards in their hand

OR

2. Being the last remaining player after other players are eliminated by the Mercy Rule.

The game must correctly detect both victory conditions.

---

# 3. MULTIPLAYER — NO LOGIN REQUIRED

The game must NOT require registration or authentication for normal play.

When a user opens the website:

Show a simple welcome screen:

"Welcome to No Mercy"

Ask:

"Choose your player name"

The player enters a name.

Example:

Munny

Then:

[PLAY ONLINE]

The user immediately becomes a guest player.

Generate a unique temporary guest/player ID on the server.

Do NOT require:

- Email
- Password
- Google login
- Phone number
- Account creation

The guest identity should persist during the current session and support reconnection if the browser refreshes.

Use a temporary nickname/avatar/color assignment.

---

# 4. ONLINE LOBBY

Create a real-time multiplayer lobby.

The lobby should show:

- Number of players currently online
- Player names
- Ready status
- Available game rooms
- Join buttons
- Create Room button
- Quick Match button

Example:

ONLINE PLAYERS
----------------
Munny
Alex
Sarah
John
David

ROOMS
----------------
Room #4821
3 / 6 players
Waiting...

[JOIN]

Room #9234
5 / 6 players
Game starting...

[JOIN]

Buttons:

[QUICK MATCH]

[CREATE ROOM]

[JOIN ROOM]

---

# 5. QUICK MATCH

Implement a matchmaking system.

When a user selects:

[QUICK MATCH]

Place them into a suitable available room.

If a room does not exist, create one automatically.

Support:

2–6 players.

The host can start the game once the minimum required players are present.

---

# 6. PRIVATE ROOM

Allow players to create private rooms.

Generate a short room code such as:

NM4821

Allow friends to enter:

[ENTER ROOM CODE]

The room should have:

- Host
- Player list
- Ready status
- Start Game button
- Leave Room button

The host should not be able to start until the required minimum number of players has joined.

---

# 7. REAL-TIME MULTIPLAYER

Use a proper authoritative server architecture.

The server must be the source of truth.

NEVER trust the browser/client to decide whether a move is legal.

Client:

"Play card X"

Server:

- Validate player's turn
- Validate card ownership
- Validate card legality
- Apply rule
- Update game state
- Broadcast new state

The server must prevent:

- Playing cards not owned by the player
- Playing out of turn
- Drawing when not allowed
- Invalid stacking
- Invalid color choices
- Duplicate card usage
- Manipulated card counts
- Client-side cheating

Use WebSockets or an equivalent real-time technology.

Recommended:

- Socket.IO OR native WebSockets

---

# 8. GAME STATE

Create a clean server-side game state model.

Example:

GameState

- gameId
- roomId
- status
- players[]
- currentPlayerId
- direction
- drawPile
- discardPile
- pendingDraw
- lastAction
- winner
- eliminatedPlayers
- selectedColor
- turnNumber

Player:

- id
- guestId
- name
- avatar
- hand
- cardCount
- isConnected
- isReady
- isEliminated
- hasCalledUno
- lastSeen

Never expose another player's actual hand to clients.

A player should only receive:

- Their own cards
- Other players' card counts
- Public game information

---

# 9. GAME FLOW

Implement:

LOBBY

↓

PLAYER READY

↓

GAME START

↓

DEAL 7 CARDS

↓

CREATE DRAW PILE

↓

CREATE DISCARD PILE

↓

PLAYER TURN

↓

PLAY CARD / DRAW

↓

ACTION RESOLUTION

↓

NEXT PLAYER

↓

UNO CHECK

↓

MERCY CHECK

↓

WIN CHECK

↓

NEXT TURN

↓

GAME END

---

# 10. CARD SYSTEM

Create a reusable card engine.

Do NOT hard-code gameplay logic into UI components.

Use a card model such as:

Card:

- id
- type
- color
- value
- action
- isWild
- drawValue

Examples:

NUMBER

SKIP

REVERSE

DRAW_TWO

WILD

WILD_DRAW_FOUR

DRAW_SIX

DRAW_TEN

SKIP_EVERYONE

WILD_DRAW_SIX

WILD_DRAW_TEN

etc.

Use the exact cards/rules discovered from the official rules research.

The architecture must make it easy to add future cards.

---

# 11. RULE ENGINE

Create a dedicated rule engine.

Example functions:

canPlayCard()

resolveCardEffect()

applyStacking()

applySevenSwap()

applyZeroPass()

applyMercyRule()

canCallUno()

checkWinner()

checkElimination()

calculateNextPlayer()

rebuildDrawPile()

The game engine must be independently testable without the UI.

---

# 12. STACKING

Implement the official stacking rule exactly.

Draw cards must be stackable according to the official rule.

Track:

pendingDraw

When a player plays a valid stacking card:

pendingDraw increases.

The penalty moves to the next player.

When a player cannot legally continue the stack:

apply the complete accumulated penalty.

Do not implement simplified or house-rule stacking.

Add automated tests for:

+2 → +2

+4 → +6

+6 → +10

multi-player stacking

invalid stack

player unable to stack

---

# 13. 7'S SWAP

Implement the official 7 rule.

When a player plays a 7:

They must select another eligible player.

Show a visually attractive player-selection interface.

Example:

SWAP YOUR HAND

Choose a player:

[ Alex — 5 cards ]

[ Sarah — 11 cards ]

[ John — 3 cards ]

The hands are exchanged.

The turn direction remains unchanged according to the official rules.

---

# 14. 0'S PASS

Implement the official 0 rule.

When a 0 is played:

All players pass their hands to the next player in the current direction.

This must happen simultaneously from the user's perspective.

Animate the card hands moving around the table.

Do NOT implement sequential swapping incorrectly.

---

# 15. MERCY RULE

Implement the official Mercy Rule.

If a player reaches the official elimination threshold:

25 or more cards

they are eliminated.

Show a dramatic elimination animation.

Example:

"NO MERCY!"

"Sarah has 25 cards."

"ELIMINATED"

Remove the player from active gameplay.

Continue until:

- Someone wins by emptying their hand

OR

- Only one active player remains.

---

# 16. UNO SYSTEM

When a player reaches one card:

Show a large animated:

UNO!

button.

The player must call UNO.

Implement the official timing/catching rule.

If another player catches them before the appropriate deadline:

apply the official penalty.

Do not simply display an UNO button without enforcing the actual rule.

---

# 17. DRAW SYSTEM

Implement the official draw behavior.

When a player cannot play:

Follow the official rule for drawing.

Handle:

- Draw pile empty
- Discard pile recycling
- Action card handling
- Stacking
- Wild cards

When recycling the discard pile:

Keep the top discard card.

Shuffle the remaining discard cards into the new draw pile.

Never duplicate cards.

Never lose cards.

---

# 18. DRAW PILE VALIDATION

Create automated invariants.

At every major game state:

TOTAL CARDS

=

draw pile

+

discard pile

+

all active player hands

+

eliminated player cards

The total must remain consistent with the selected official deck.

If an invariant fails:

Log a critical server error.

Never silently continue with corrupted game state.

---

# 19. UI / UX DESIGN

The game must feel like a polished commercial-quality card game.

Do NOT create a boring HTML form with cards.

Use:

- Modern responsive layout
- Smooth animations
- Glass/gradient surfaces where appropriate
- Strong typography
- Large touch-friendly controls
- Responsive card scaling
- Clear player states
- Turn indicators
- Animated effects
- Subtle shadows
- High-quality icons
- Game-status indicators

The visual identity should be:

CHAOTIC

FUN

FAST

COLORFUL

COMPETITIVE

DRAMATIC

But still clean and readable.

---

# 20. ORIGINAL VISUAL DESIGN

IMPORTANT:

Do not copy copyrighted Mattel artwork.

Do not scrape official UNO card images.

Do not copy Mattel logos or proprietary visual assets.

Instead create original artwork inspired by:

- Bright card-game aesthetics
- Neon gradients
- Explosive action effects
- Dynamic typography
- Original card patterns
- Original icons
- Original animations

The game can be called something like:

"No Mercy"

or another original project name.

Keep the implementation legally safer by separating:

GAMEPLAY RULES

from

ORIGINAL VISUAL ASSETS.

---

# 21. CARD DESIGN

Create beautiful original cards.

Cards should have:

- Rounded corners
- Large central symbol/number
- Strong color identity
- High contrast
- Drop shadow
- Subtle texture
- Animated hover state
- Selected state
- Playable-card glow
- Invalid-card visual state

On desktop:

Cards should fan naturally across the bottom.

On mobile:

Cards should remain usable without becoming microscopic.

Use horizontal scrolling/fan interaction when necessary.

---

# 22. CREATIVE ACTION GRAPHICS

Every important action should have a visual effect.

Examples:

DRAW 2

Show:

"+2"

with cards flying toward the affected player.

DRAW 4

Show:

"STACK IT!"

with cards exploding outward.

DRAW 6

Show:

"NO MERCY!"

with a dramatic screen effect.

DRAW 10

Show:

"10 CARDS?!"

with cards raining down.

SKIP

Show:

"SKIPPED!"

with the player's avatar being crossed out.

REVERSE

Show:

"DIRECTION REVERSED"

with an animated circular arrow around the table.

7

Show:

"SWAP!"

with two hands/cards visually exchanging.

0

Show:

"PASS!"

with cards moving around the table.

MERCY ELIMINATION

Show:

"NO MERCY"

with a dramatic elimination animation.

UNO

Show:

"UNO!"

with a large attention-grabbing animation.

WIN

Show:

"YOU WIN!"

with a celebratory effect.

---

# 23. PLAYER TABLE

Create a virtual card table.

Desktop layout:

               PLAYER 2

      PLAYER 3          PLAYER 4


              DISCARD
              DRAW


               YOU

For 5–6 players, dynamically position players around the table.

Each player should have:

- Avatar
- Name
- Card count
- Connection status
- Current turn indicator
- UNO indicator
- Eliminated indicator

Do not display opponents' actual cards.

Show card backs representing their hand size.

---

# 24. MOBILE UI

Mobile must NOT simply be a shrunk desktop layout.

Design a dedicated responsive experience.

Portrait:

Top:

Opponent information

Center:

Discard + Draw piles

Bottom:

Your hand

Bottom controls:

[DRAW]

[UNO]

[PLAY]

Optional:

[MORE]

Use large touch targets.

Minimum recommended touch target:

44px+

Avoid tiny buttons.

Prevent accidental card plays.

Support swipe/drag interactions where useful.

---

# 25. CARD INTERACTION

Support:

- Tap card to select
- Tap again to play
- Drag card toward discard pile
- Swipe card upward to play where appropriate
- Highlight legal cards
- Dim illegal cards
- Show selected card
- Confirm dangerous actions where necessary

Do not force complicated gestures.

Every action must also have an accessible button alternative.

---

# 26. COLOR SELECTION

For Wild cards:

Show a beautiful color-selection wheel/panel.

Example:

CHOOSE COLOR

🔴 RED

🔵 BLUE

🟢 GREEN

🟡 YELLOW

Animate the selected color.

Do not allow the turn to continue until a valid color is selected when required.

---

# 27. SOUND DESIGN

Add optional sound effects.

Examples:

Card play
Card draw
Shuffle
UNO
Stack
Skip
Reverse
Swap
Pass
Elimination
Victory

Include:

[SOUND ON/OFF]

and

[MUSIC ON/OFF]

Do not make sound mandatory.

Respect browser autoplay restrictions.

---

# 28. ACCESSIBILITY

Support:

- Keyboard navigation
- Screen-reader-friendly labels
- High contrast
- Reduced motion
- Large text option if practical
- Color-independent card identification
- Accessible buttons
- Proper ARIA labels

Do not rely solely on color to communicate game state.

---

# 29. CONNECTION HANDLING

Multiplayer games must survive temporary network problems.

If disconnected:

Show:

"CONNECTION LOST"

Attempt automatic reconnection.

When reconnected:

Restore the current game state.

Show:

"RECONNECTED"

If another player disconnects:

Show:

"Alex disconnected"

The server should decide how disconnected players are handled.

Do not let a disconnected player freeze the entire game indefinitely.

Implement a reasonable timeout/grace period.

---

# 30. ANTI-CHEAT

The server must control:

- Deck
- Shuffle
- Hands
- Turns
- Card legality
- Draws
- Actions
- Winners

Never send the complete deck to the client.

Never allow the client to choose which card is drawn.

Never trust:

client card count

client turn

client winner state

client action result

---

# 31. LOBBY PRESENCE

Show online users.

Example:

ONLINE NOW: 17

Players:

Munny
Alex
Sarah
John
David

Do not expose sensitive information.

Only expose:

- Guest name
- Avatar
- Basic online status
- Room/game status

---

# 32. CHAT — OPTIONAL

If implemented, provide simple room chat.

Requirements:

- Text only
- Rate limiting
- Maximum message length
- Basic profanity filtering
- No private messaging required
- No account required

Do not allow chat to interfere with gameplay.

---

# 33. GAME HISTORY

After a game ends, display:

Winner

Players

Final card counts

Eliminated players

Major statistics:

- Cards played
- Cards drawn
- Draw penalties
- Number of UNO calls
- Number of successful stacks
- Number of swaps
- Number of passes

Example:

GAME OVER

🏆 Munny WON!

Sarah — Eliminated at 25 cards

Alex — 4 cards remaining

John — 8 cards remaining

[PLAY AGAIN]

[RETURN TO LOBBY]

---

# 34. PLAY AGAIN

After a game:

[PLAY AGAIN]

should allow players to start another match using the same room.

Players should not need to re-enter their names.

Allow players to leave the room.

---

# 35. TECH STACK

Choose a modern, maintainable stack.

Preferred architecture:

Frontend:

React + TypeScript

Recommended:

Vite or Next.js

Styling:

Tailwind CSS or another clean component system

Animations:

Framer Motion or equivalent

Backend:

Node.js + TypeScript

Real-time:

Socket.IO or native WebSockets

Database:

Use a lightweight database if persistence is required.

Redis may be used for scalable multiplayer room state if necessary.

For the initial version, keep the architecture simple enough to run locally.

---

# 36. PROJECT STRUCTURE

Use clean separation.

Example:

/client
  /components
  /pages
  /game
  /hooks
  /animations
  /assets
  /styles

/server
  /game
  /rules
  /rooms
  /players
  /socket
  /services

/shared
  /types
  /constants
  /rules

/tests
  /unit
  /integration
  /game

RULES.md

README.md

Do not create a single giant source file.

---

# 37. GAME ENGINE

The game engine must be independent from React/UI.

For example:

GameEngine

GameState

Player

Deck

Card

RuleEngine

ActionResolver

TurnManager

RoomManager

This allows the game to be tested without a browser.

---

# 38. TESTING

Write extensive automated tests.

At minimum test:

Game creation

Player joining

Player leaving

2-player game

3-player game

6-player game

Deck generation

Initial deal

Card matching

Invalid card

Drawing

Draw pile recycling

UNO

UNO penalty

Stacking

7 swap

0 pass

Skip

Reverse

Wild

Wild Draw 6

Wild Draw 10

Mercy elimination

Winning by empty hand

Winning by elimination

Disconnected player

Reconnection

Duplicate card prevention

Turn validation

Client cheating attempts

Game state synchronization

Card-count invariants

---

# 39. SIMULATION TEST

Create a simulation that can automatically play thousands of games using random legal moves.

Example:

simulateGame()

Run:

10,000 simulated games

Check:

- No impossible card counts
- No duplicated card IDs
- No lost cards
- No invalid turns
- No deadlocks
- Games eventually terminate
- Winners are valid
- Mercy rule works
- Stacking works

Fix all discovered issues.

---

# 40. PERFORMANCE

The game must perform smoothly on mobile devices.

Optimize:

- React rendering
- Card animations
- WebSocket messages
- Image assets
- Audio
- Bundle size

Avoid unnecessary re-renders.

Do not send the entire game state after every tiny UI interaction if a smaller event/state update is sufficient.

---

# 41. SECURITY

Implement:

- Server-side validation
- Rate limiting
- Input validation
- Room-code validation
- Name sanitization
- WebSocket validation
- Basic anti-spam protection
- Maximum room size
- Maximum name length
- Maximum chat length

Never trust user input.

---

# 42. ERROR HANDLING

Never show raw stack traces to users.

Use friendly messages:

"Something went wrong. Please reconnect."

"Room no longer exists."

"Game already started."

"That card cannot be played."

"Waiting for another player."

Log detailed technical errors on the server.

---

# 43. LOADING EXPERIENCE

Create a polished loading screen.

Example:

NO MERCY

"Shuffle the deck..."

Animated cards.

Then:

"Ready?"

[PLAY]

---

# 44. EMPTY STATES

Design proper empty states.

No players:

"No players online yet."

No rooms:

"No active games."

Searching:

"Finding players..."

Disconnected:

"Trying to reconnect..."

Waiting:

"Waiting for players..."

---

# 45. RESPONSIVE BREAKPOINTS

Test at minimum:

320 × 568

375 × 667

390 × 844

412 × 915

768 × 1024

1024 × 768

1280 × 720

1440 × 900

1920 × 1080

The game must remain playable at all these sizes.

---

# 46. BROWSER COMPATIBILITY

Test:

Chrome

Edge

Firefox

Safari

iOS Safari

Android Chrome

Do not use browser-specific APIs without fallbacks.

---

# 47. PWA

If practical, make the game a Progressive Web App.

Provide:

- Manifest
- App icon
- Install prompt
- Offline shell
- Service worker

IMPORTANT:

Offline mode should NOT pretend to support multiplayer.

If offline:

"You're offline. Multiplayer requires an internet connection."

---

# 48. DEPLOYMENT

Provide production deployment instructions.

Recommended architecture:

Frontend:
Vercel / Netlify / Cloudflare Pages

Backend:
Render / Railway / Fly.io / AWS / equivalent

Database:
PostgreSQL if persistence is needed

Redis:
Only if required for scalable real-time state

The README must explain:

1. Installation
2. Environment variables
3. Local development
4. Running frontend
5. Running backend
6. Running tests
7. Production build
8. Deployment
9. WebSocket configuration
10. Troubleshooting

---

# 49. ENVIRONMENT VARIABLES

Create `.env.example`.

Do not hard-code secrets.

Example:

CLIENT_URL=

SERVER_PORT=

DATABASE_URL=

REDIS_URL=

NODE_ENV=

---

# 50. DEVELOPMENT MODES

Implement:

DEVELOPMENT

PRODUCTION

TEST

Do not use fake production data.

---

# 51. DEBUG MODE

Create a developer-only debug mode.

It may show:

Game ID

Room ID

Current turn

Direction

Pending draw

Player IDs

Card counts

Discard top card

Deck size

But this must NEVER be exposed in production to normal players.

---

# 52. VISUAL POLISH

Before declaring the project complete, perform a UI polish pass.

Look for:

- Misaligned cards
- Bad spacing
- Text overflow
- Small buttons
- Broken animations
- Mobile overflow
- Slow transitions
- Unclear turn state
- Unclear playable cards
- Poor contrast
- Empty-looking screens

Fix everything.

The result should look like a real commercial multiplayer card game, not a coding tutorial project.

---

# 53. DO NOT USE PLACEHOLDER UI

Do NOT leave:

"TODO"

"Coming soon"

"Insert card here"

"Sample player"

"Test button"

"Lorem ipsum"

unless it is explicitly part of developer documentation.

All visible game UI should be functional.

---

# 54. GAME SCREEN PRIORITY

The game screen should immediately communicate:

1. Whose turn it is
2. How many cards each opponent has
3. What card is currently on the discard pile
4. Which cards I can play
5. What actions are available
6. Current stacking penalty
7. Direction
8. My own cards
9. UNO state
10. Connection status

The player should never have to guess what they can do.

---

# 55. RULE HELP

Add a small:

[? RULES]

button.

It opens a friendly rules panel containing the actual implemented rules.

Include:

- How to play
- Stacking
- 7 Swap
- 0 Pass
- Mercy
- Action cards
- UNO
- Winning

The rules displayed in the UI must match the actual game engine.

---

# 56. ORIGINAL BRANDING

Do not use official Mattel branding.

Create an original visual identity.

Possible title:

NO MERCY

Subtitle:

"How ruthless are you?"

Use an original logo and original card-back design.

---

# 57. FINAL QUALITY CHECK

Before saying the project is complete:

1. Research official rules.
2. Document rules.
3. Implement rules.
4. Write unit tests.
5. Write multiplayer integration tests.
6. Run simulation games.
7. Fix bugs.
8. Test mobile layout.
9. Test desktop layout.
10. Test reconnection.
11. Test room creation.
12. Test Quick Match.
13. Test 2–6 players.
14. Test all action cards.
15. Test Mercy.
16. Test UNO.
17. Test stacking.
18. Test 7 swap.
19. Test 0 pass.
20. Verify no client-side cheating vulnerability.
21. Verify card-count invariants.
22. Verify no duplicate cards.
23. Verify game termination.
24. Verify responsive UI.
25. Verify production build.

Do not declare success merely because the application compiles.

---

# 58. DELIVERABLES

At completion provide:

1. Complete source code
2. Frontend
3. Backend
4. Shared game engine
5. Multiplayer implementation
6. Rules engine
7. Automated tests
8. Simulation test
9. Original graphics/assets
10. Animations
11. Sound system
12. Responsive mobile UI
13. PWA support if implemented
14. `.env.example`
15. `README.md`
16. `RULES.md`
17. Deployment instructions

---

# 59. DEVELOPMENT APPROACH

Do NOT attempt to generate everything blindly in one step.

Work in phases.

PHASE 1
Research and document rules.

PHASE 2
Create architecture and data models.

PHASE 3
Implement card/deck/game engine.

PHASE 4
Implement rule engine.

PHASE 5
Implement multiplayer server.

PHASE 6
Implement lobby and guest identity.

PHASE 7
Implement game UI.

PHASE 8
Implement animations and visual effects.

PHASE 9
Implement mobile optimization.

PHASE 10
Implement sound.

PHASE 11
Testing and simulation.

PHASE 12
Security and anti-cheat.

PHASE 13
Production optimization.

PHASE 14
Deployment documentation.

After each phase:

- Run tests
- Fix errors
- Do not continue with known critical bugs

---

# 60. FIRST TASK

Do NOT start by writing the complete application.

Start by:

1. Researching the official current UNO Show ’Em No Mercy rules.
2. Identifying the complete card set.
3. Identifying every special/action card.
4. Identifying every rule and edge case.
5. Creating `RULES.md`.
6. Creating the proposed technical architecture.
7. Creating the project folder structure.
8. Explaining the multiplayer architecture.
9. Creating the initial implementation plan.

Then wait for the next development instruction.

IMPORTANT:

Do not skip the rules research.

Do not use unofficial rules when official Mattel rules are available.

Do not copy copyrighted Mattel artwork.

Build the gameplay faithfully while using completely original visual assets and UI.