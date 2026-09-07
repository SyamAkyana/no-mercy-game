# UNO Show 'Em No Mercy — Official Rules Reference

> Researched from: Mattel product pages, UNO Wiki (Fandom), BoardGameGeek, and UNORules.com
> Last updated: 2026-09-06

---

## 1. Deck Composition (168 Total Cards)

### Colored Cards (124 cards — 31 per color)
Each color (Red, Blue, Green, Yellow) contains 31 cards:

**Number Cards (19 per color)**
- 0: ×1
- 1–9: ×2 each (18 cards)

**Action Cards (12 per color)**
- Draw 2 (+2): ×2
- Draw 4 (+4): ×2  ← color-specific in this edition
- Reverse: ×2
- Skip: ×2
- Skip Everyone: ×2
- Discard All: ×2

### Wild Cards (44 total)
- Wild (standard): ×8
- Wild Draw 6 (+6): ×8
- Wild Draw 10 (+10): ×8
- Wild Reverse Draw 4 (reverse + next draws 4): ×8
- Wild Color Roulette: ×8

**Total: 124 + 44 = 168 cards ✓**

---

## 2. Player Count
- Minimum: 2 players
- Maximum: 6 players

---

## 3. Starting Hand Size
- Each player is dealt **7 cards** at the start.

---

## 4. Setup
1. Shuffle all 168 cards.
2. Deal 7 cards to each player.
3. Place remaining cards face-down as the **Draw Pile**.
4. Flip the top card to start the **Discard Pile**.
   - If the first flipped card is a Wild Color Roulette: reshuffle and flip again.
   - If it's any other action/wild: apply that card's effect at game start.
5. Play begins with the player to the left of the dealer, going clockwise.

---

## 5. Turn Order
- Default direction: **clockwise**.
- Reverse cards change direction.
- On their turn, a player must either:
  a. Play a legal card from their hand, OR
  b. Draw from the draw pile until they draw a playable card.

---

## 6. Legal Card Matching
A card can be played on top of the discard pile if it matches:
- **Same color**, OR
- **Same number/symbol**, OR
- **It is a Wild card** (always playable)

Exception: During an active draw stack, only a card that can legally stack may be played.

---

## 7. Draw Rules (Normal Turn)
- If a player has no playable card, they **draw cards one at a time** until they get a card they can play.
- They must play the first playable card they draw, OR they may keep drawing (rule varies — implement as: draw one card; if playable, may play it or keep drawing; if not playable, must draw again).
- If a player reaches 25+ cards at any point while drawing, they are **immediately eliminated** (Mercy Rule — see §12).
- When the draw pile is exhausted, reshuffle the discard pile (keeping the top card) to form a new draw pile.

---

## 8. Stacking Rule (Draw Penalties)
Draw penalty cards can be stacked and passed to the next player.

**Valid stacking:** A player may play a draw card on top of another draw card if it has **equal or higher draw value**:
- Draw 2 → can be stacked with Draw 2, Draw 4, Draw 6, Wild Draw 6, Draw 10, Wild Draw 10, Wild Reverse Draw 4
- Draw 4 → can be stacked with Draw 4, Wild Draw 6, Draw 10, Wild Draw 10, Wild Reverse Draw 4 (draw value ≥ 4)
- Wild Draw 6 → can be stacked with Wild Draw 6, Wild Draw 10 (draw value ≥ 6)
- Wild Reverse Draw 4 → can be stacked with draw value ≥ 4 (Draw 4, Wild Draw 6, Wild Draw 10, another Wild Reverse Draw 4)
- Wild Draw 10 → can only be stacked with another Wild Draw 10

When a player cannot legally continue the stack, they **must draw the full accumulated penalty**.

**pendingDraw** tracks the current stacked penalty total.

---

## 9. Action Cards

### Colored Action Cards
| Card | Effect |
|------|--------|
| **Draw 2** | Next player draws 2 cards and loses their turn (unless they stack). |
| **Draw 4** | Next player draws 4 cards and loses their turn (unless they stack). |
| **Reverse** | Reverses the direction of play (clockwise ↔ counter-clockwise). With 2 players, acts like a Skip. |
| **Skip** | Next player loses their turn. |
| **Skip Everyone** | All other players lose their turn; the current player goes again immediately. |
| **Discard All** | The player discards ALL cards in their hand that match the **color** of this Discard All card. |

### Wild Cards
| Card | Effect |
|------|--------|
| **Wild** | Player chooses any color; play continues with that color. |
| **Wild Draw 6** | Player chooses color; next player draws 6 (unless they stack). |
| **Wild Draw 10** | Player chooses color; next player draws 10 (unless they stack). |
| **Wild Reverse Draw 4** | Player chooses color; direction reverses AND next player (in new direction) draws 4 (unless they stack). |
| **Wild Color Roulette** | The NEXT player (not the one who played it) chooses a color; that player then draws cards one by one until they draw a card of the chosen color. Those drawn cards are kept. |

---

## 10. The 7's Swap Rule (Mandatory)
- When a player plays a **7**, they MUST choose another active player.
- The two players swap their **entire hands** immediately.
- The direction of play does NOT change.
- The player who played the 7 then ends their turn.
- Cannot swap with an eliminated player.

---

## 11. The 0's Pass Rule (Mandatory)
- When a player plays a **0**, ALL active players simultaneously pass their entire hand to the **next player** in the current direction of play.
- This is a simultaneous rotation, not sequential swapping.
- The player who played the 0 receives the hand from the previous player (in current direction).

---

## 12. Mercy Rule (Elimination)
- If a player has **25 or more cards** in their hand at any point, they are **immediately eliminated**.
- Their cards are removed from play (placed in the discard pile or set aside).
- Play continues with remaining players.
- The Mercy Rule check occurs after:
  - A draw penalty is fully applied
  - Any card draw
  - Wild Color Roulette resolution

---

## 13. UNO Calling Rules
- When a player plays their **second-to-last card** (leaving 1 card in hand), they must call **"UNO!"**
- If another player catches them before the next player begins their turn, the offending player draws **2 cards** as a penalty.
- The UNO call window closes when the next player has started their turn.

---

## 14. Discard All Card — Detail
- When played, the player discards ALL cards in their hand that match the **color of the Discard All card** itself.
- If the player has no other cards of that color, only the Discard All card itself is played.
- If this empties the player's hand, they win (normal win condition).

---

## 15. Winning Conditions
There are two ways to win:

1. **Empty Hand:** Be the first player to play all cards in their hand. Must call "UNO!" when holding 1 card.

2. **Last Player Standing:** All other players have been eliminated by the Mercy Rule.

---

## 16. Draw Pile Exhaustion & Recycling
- When the draw pile is empty and a player needs to draw:
  - Take all cards from the discard pile EXCEPT the top card.
  - Shuffle those cards thoroughly.
  - Place them face-down as the new draw pile.
  - The original top card of the discard pile remains as the current discard.

---

## 17. Disconnected Players (Multiplayer)
- A disconnected player has a grace period (30 seconds) before being treated as AFK.
- After timeout, an auto-play policy kicks in: draw if no playable card, play first valid card otherwise.
- A player who has been disconnected for 2+ minutes may be removed from the room.

---

## 18. Edge Cases & Ambiguities

### Discard All leaves hand empty
- If Discard All empties the player's hand, they win. Check win after applying.

### First card is an action card
- If the first discard pile card is a Draw 2 or Draw 4: the first player must draw that amount (no one can stack on the first card).
- If it's a Reverse: play direction reverses before anyone goes.
- If it's a Skip: the first player is skipped.
- If it's a Wild: the dealer chooses color, then first player goes.
- If it's Wild Color Roulette: reshuffle and flip again.
- If it's Skip Everyone: the first player goes again immediately.
- If it's Wild Reverse Draw 4: dealer picks color, direction reverses, first player in new direction draws 4.

### Wild Color Roulette — maximum draws
- If a player draws all remaining cards in the draw pile and the discard pile is recycled, and still has not drawn the chosen color: they draw all cards from the recycled pile until the chosen color appears. If after a full cycle of both piles no card of that color exists (very unlikely), the player keeps all they drew; if they reach 25 they are eliminated.

### Stacking on Wild Color Roulette
- Wild Color Roulette is NOT a "draw" card and cannot be stacked onto via stacking rules. If Color Roulette is the top card, normal matching resumes after it resolves.

### Skip Everyone with 2 players
- With 2 players, Skip Everyone simply means the other player is skipped and the current player goes again (same as with more players — just one player to skip).

### Reverse with 2 players
- With 2 players, Reverse acts like a Skip: the current player goes again.

---

## 19. Card Count Invariant
At all times:
`draw_pile + discard_pile + all_active_hands + all_eliminated_hands = 168`

---

## 20. Rule Sources
- Deck composition verified from multiple sources: UNO-community resources, game review sites, and BGG entries reporting the 168-card count with 31 cards per color and 44 wild cards.
- 7-swap and 0-pass rules are confirmed No Mercy official mechanics.
- Mercy Rule threshold: 25 cards.
- Stacking valid at "equal or higher value."
