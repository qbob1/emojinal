# Emojinal - Game Engine Development Plan

## Overview
A multiplayer grid-based tile placement game where players strategically place emoji tiles with unique abilities to control territory and maximize their score.

## Game Summary

### Core Mechanics
- **Grid-based board**: NxN tile grid (configurable, recommend starting with 10x10)
- **Tile placement**: Players place emoji tiles from their hand onto the grid
- **Stack system**: Multiple tiles can exist on a single grid space (stacking)
- **Turn-based gameplay**: Players take turns placing tiles and activating effects
- **Territory control**: Players compete to control spaces and accumulate points

### Game Flow
1. **Setup Phase**: Each player draws 5 tiles from the deck
2. **First Player**: Randomly selected
3. **Turn Structure**:
   - Place one tile on the grid
   - Optionally activate tile effects
   - Draw one tile from deck (if available)
   - Tally scores at end of round
4. **End Game**: After X turns, player with most controlled spaces gets bonus points

---

## Development Phases

### Phase 1: Core Data Structures & Game State
**Priority: CRITICAL**

#### 1.1 Tile System
```typescript
interface Tile {
  emoji: string;           // The emoji character
  owner: PlayerId;         // Which player owns this tile
  type: TileType;          // Category (claim, movement, destruction, etc.)
  effects: Effect[];       // List of effects this tile can trigger
  metadata?: {             // Optional data for tile state
    turnCount?: number;    // For evolving tiles (plants)
    evolutionStage?: string;
    isPermanent?: boolean; // For ♾️
    isNegated?: boolean;   // For ➖
  }
}

enum TileType {
  CLAIM,        // 🚩, ♾️, ☠️, 💩
  MOVEMENT,     // ↔️, ↕️, ➡️, ⬅️, ⬆️, ⬇️, diagonals
  STACK_MANIP,  // ⏫️, ⏬️, ⏹️, 🔄
  PLANT,        // 🌱, 🌿, 🍀, 🌸, 🌵, 🌳, 🪓, 🍄, 🐝
  RESOURCE,     // 🪨, ⛏️, 🗿
  DESTRUCTION,  // 💣, 🔫, 🧨, 🌪️
  BIOHAZARD,    // ☢️, 🚽, 🦠, 💊, ☣️, 🪰
  SPECIAL,      // 🎲, 🧟, ➖
}
```

#### 1.2 Grid System
```typescript
interface GridSpace {
  position: { x: number; y: number };
  stack: Tile[];           // Tiles at this position (bottom to top)
  controlledBy?: PlayerId; // Who currently controls this space
  flags: SpaceFlags;       // State flags for this space
}

interface SpaceFlags {
  isNegated: boolean;      // ➖ effect active
  isPermanent: boolean;    // ♾️ placed here
  isStopped: boolean;      // ⏹️ effect active
  isDestroyed: boolean;    // 💣/🧨 destroyed
}

interface GameBoard {
  width: number;
  height: number;
  spaces: GridSpace[][];   // 2D array of grid spaces
}
```

#### 1.3 Player & Game State
```typescript
interface Player {
  id: PlayerId;
  name: string;
  hand: Tile[];            // Current tiles in hand (max 7?)
  score: number;
  controlledSpaces: number; // Count for end-game bonus
  statistics: {
    tilesPlaced: number;
    effectsActivated: number;
    spacesControlled: number;
  }
}

interface GameState {
  board: GameBoard;
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  roundNumber: number;
  deck: Tile[];            // Draw pile
  config: GameConfig;
  phase: GamePhase;
  history: GameAction[];   // For undo/replay
}

interface GameConfig {
  boardSize: number;       // NxN grid
  maxTurns: number;        // Game ends after X turns
  startingHandSize: number; // Default: 5
  endGameBonus: number;    // Bonus for most controlled spaces
  playerCount: number;     // 2-4 players
}

enum GamePhase {
  SETUP,
  PLACEMENT,
  EFFECT_ACTIVATION,
  DRAW,
  SCORING,
  GAME_OVER
}
```

#### 1.4 Effect System
```typescript
interface Effect {
  type: EffectType;
  targetingMode: TargetingMode; // How to select target
  execute: (state: GameState, source: Position, target?: Position) => GameState;
  canActivate: (state: GameState, source: Position) => boolean;
}

enum EffectType {
  CLAIM_SPACE,
  MOVE_STACK,
  DESTROY_STACK,
  EVOLVE,
  SPREAD,
  // ... etc
}

enum TargetingMode {
  SELF,           // No target needed
  ADJACENT,       // Choose adjacent space
  RADIUS,         // Choose radius from source
  ROW_COLUMN,     // Choose entire row or column
  PATH,           // Draw a path (for 🌪️)
  ANY,            // Any valid space
}
```

---

### Phase 2: Core Game Engine
**Priority: CRITICAL**

#### 2.1 Game Initialization
```typescript
class GameEngine {
  initializeGame(config: GameConfig, playerNames: string[]): GameState
  createDeck(): Tile[]  // Create full deck based on Emojis file
  shuffleDeck(deck: Tile[]): void
  dealStartingHands(state: GameState): void
  selectFirstPlayer(state: GameState): void
}
```

**Implementation Details**:
- Parse Emojis file to create tile definitions
- Determine tile distribution/frequency in deck
- Validate player count (2-4 recommended)
- Initialize empty board with all spaces

#### 2.2 Turn Management
```typescript
class TurnManager {
  startTurn(state: GameState): GameState
  placeTile(state: GameState, tile: Tile, position: Position): GameState
  activateEffects(state: GameState, position: Position, choices: EffectChoice[]): GameState
  drawTile(state: GameState): GameState
  endTurn(state: GameState): GameState

  validatePlacement(state: GameState, tile: Tile, position: Position): ValidationResult
  getAvailableActions(state: GameState): Action[]
}
```

**Turn Flow**:
1. Phase: PLACEMENT - Player selects tile from hand and position
2. Validate placement (is position valid? does player have tile?)
3. Place tile on grid (add to stack at position)
4. Phase: EFFECT_ACTIVATION - Player chooses which effects to activate
5. Execute effects in order chosen by player
6. Phase: DRAW - Draw one tile if deck not empty
7. Phase: SCORING - Update scores and controlled spaces
8. Check end-of-round conditions (all players took turn)
9. Check end-game conditions (turnNumber >= maxTurns)
10. Advance to next player

#### 2.3 Effect Engine
```typescript
class EffectEngine {
  // Claim effects
  claimSpace(state: GameState, position: Position, player: PlayerId): GameState
  permanentClaim(state: GameState, position: Position, player: PlayerId): GameState // ♾️
  negateSpace(state: GameState, position: Position, player: PlayerId): GameState    // ➖

  // Movement effects
  moveStack(state: GameState, from: Position, to: Position, direction: Direction): GameState
  moveStackDistance(state: GameState, from: Position, direction: Direction, distance: number): GameState

  // Stack manipulation
  moveBottomToTop(state: GameState, position: Position): GameState    // ⏫️
  moveTopToBottom(state: GameState, position: Position): GameState    // ⏬️
  stopEffects(state: GameState, position: Position): GameState        // ⏹️
  reshuffleStack(state: GameState, position: Position): GameState     // 🔄

  // Destruction effects
  destroyStack(state: GameState, position: Position): GameState                    // 🔫
  destroyRadius(state: GameState, center: Position, radius: number): GameState     // 💣, 🧨
  destroyPath(state: GameState, path: Position[]): GameState                       // 🌪️
  destroyRowOrColumn(state: GameState, line: Position[]): GameState                // 🚽

  // Plant system
  evolvePlant(state: GameState, position: Position): GameState
  plantSeedling(state: GameState, position: Position, player: PlayerId): GameState
  chopPlant(state: GameState, position: Position): GameState          // 🪓
  spreadMushroom(state: GameState, position: Position): GameState     // 🍄

  // Resource system
  destroyRock(state: GameState, position: Position): GameState        // ⛏️ on 🪨
  convertToMoai(state: GameState, position: Position): GameState      // ⛏️ on own 🪨

  // Biohazard system
  convertPoopToGerms(state: GameState, player: PlayerId): GameState   // ☢️
  spreadGerms(state: GameState, position: Position): GameState        // 🦠
  spreadPoop(state: GameState, position: Position): GameState         // 🪰
  cureGerms(state: GameState, player: PlayerId): GameState            // 💊
  biohazardDestruction(state: GameState, position: Position): GameState // ☣️

  // Special effects
  zombieCrawl(state: GameState, position: Position): GameState        // 🧟
  randomTile(state: GameState, position: Position): GameState         // 🎲
}
```

#### 2.4 Scoring System
```typescript
class ScoringEngine {
  calculateScore(state: GameState, player: PlayerId): number
  updateControlledSpaces(state: GameState): void
  tallyEndOfRound(state: GameState): ScoreUpdate[]
  calculateEndGameBonus(state: GameState): Map<PlayerId, number>

  // Scoring rules (to be defined)
  // - 1 point per controlled space?
  // - Bonus points for certain tile combinations?
  // - Points for plant evolution levels?
  // - Deductions for negated spaces?
}
```

**Scoring Considerations**:
- Define point values for different control types
- Handle ♾️ (permanent control) scoring
- Handle ➖ (negated) spaces in scoring
- Handle 🧟 (zombie) interaction with control
- End-game bonus calculation for most spaces

---

### Phase 3: Advanced Game Logic
**Priority: HIGH**

#### 3.1 Plant Evolution System
The plant system is complex with multiple evolution paths:

```
🌱 (seedling) → [1 turn] → 🌿 (intermediate) → [1 turn] → evolved form
                                                           ├─ 🍀 (clover): draw extra tile
                                                           ├─ 🌸 (flower): combo with 🐝
                                                           ├─ 🌵 (cactus): only destroyed by 💣/☢️
                                                           └─ 🌳 (tree): place extra seedling

Special interactions:
- 🐝 + 🌸 → plant new seedling for each flower
- 🪓 + 🌳 → leaves 🪵 (stump)
- 🪓 + other plants → reclaim space
- 🍄 + 🪵 → all user plants become 🍄
```

**Implementation**:
```typescript
class PlantEvolutionSystem {
  processEndOfTurn(state: GameState): GameState  // Age all plants
  evolvePlant(state: GameState, position: Position): Tile
  getEvolutionOptions(plant: Tile): string[]     // What this plant can evolve to
  handleBeeFlowerCombo(state: GameState, beePos: Position): GameState
  handleMushroomStumpCombo(state: GameState, mushroomPos: Position): GameState
}
```

#### 3.2 Destruction & Interaction Rules
```typescript
class DestructionRules {
  canDestroy(tile: Tile, destroyer: Tile): boolean

  // Destruction matrix
  // 🗿 cannot be destroyed by anything
  // 🌵 only destroyed by 💣, 🧨, ☣️
  // 🪨 only destroyed by ⛏️, 💣, 🧨, ☣️
  // ♾️ permanent claim - how to handle?
}
```

**Destruction Priority** (to define):
1. What happens when stack is destroyed?
   - Remove all tiles?
   - Remove top tile only?
   - Remove until indestructible tile?

2. Radius destruction (💣, 🧨, ☣️):
   - 💣: 1 tile radius
   - 🧨: 3 tile radius, claim 4 tiles from radius
   - ☣️: destroy all stacks, claim 4 flags

#### 3.3 Movement System
```typescript
class MovementSystem {
  moveStack(state: GameState, from: Position, to: Position): GameState

  // Movement types:
  // - ↔️, ↕️: choose direction (left/right or up/down)
  // - ➡️, ⬅️, ⬆️, ⬇️: move X spaces in direction
  // - ↖️, ↙️, ↘️, ↗️: diagonal movement X spaces

  getValidMovePositions(state: GameState, from: Position, direction: Direction, distance?: number): Position[]
  validateMove(state: GameState, from: Position, to: Position): boolean

  // Questions to resolve:
  // - What happens if moving to occupied space? Stack on top? Reject?
  // - What happens if move would go off board? Stop at edge? Invalid?
  // - Does moving affect control of the space moved from?
}
```

#### 3.4 Special Interactions
```typescript
class SpecialInteractions {
  // 🧟 zombie - crawls to top at end of round
  processZombies(state: GameState): GameState

  // ☠️ skull - negates all zombies in space when placed
  negateZombies(state: GameState, position: Position): GameState

  // ➖ negate - sets flag, what exactly does this prevent?
  processNegation(state: GameState, position: Position): GameState

  // ⏹️ stop - stops all effects in stack
  stopStackEffects(state: GameState, position: Position): GameState

  // 🎲 dice - random tile placement
  placeRandomTile(state: GameState, position: Position): GameState
}
```

---

### Phase 4: User Interface & Input
**Priority: HIGH**

#### 4.1 Game Display
```typescript
interface GameRenderer {
  renderBoard(state: GameState): void
  renderPlayerHand(player: Player): void
  renderScoreboard(state: GameState): void
  renderGameStatus(state: GameState): void  // Current turn, phase, etc.

  highlightValidPlacements(state: GameState, tile: Tile): void
  highlightEffectTargets(state: GameState, effect: Effect, source: Position): void

  // Stack visualization
  renderStack(stack: Tile[]): void  // Show top tile, indicate stack depth
  showStackDetails(position: Position): void  // Expand to show all tiles
}
```

#### 4.2 Player Input
```typescript
interface InputHandler {
  selectTileFromHand(): Promise<Tile>
  selectBoardPosition(): Promise<Position>
  selectEffect(availableEffects: Effect[]): Promise<Effect>
  selectEffectTarget(effect: Effect, validTargets: Position[]): Promise<Position>
  selectDirection(): Promise<Direction>
  selectDistance(max: number): Promise<number>
  selectPath(start: Position, mustEndOnEdge: boolean): Promise<Position[]>  // For 🌪️
  selectRowOrColumn(): Promise<Position[]>  // For 🚽

  confirmAction(action: string): Promise<boolean>
}
```

#### 4.3 TUI Implementation with libghostty

**Primary Implementation: libghostty TUI**

libghostty provides a modern, efficient terminal user interface framework ideal for this game.

**Key Features to Utilize**:
- Rich emoji rendering support (critical for emoji-based tiles)
- Advanced terminal graphics and colors
- Responsive layout system
- Event handling (keyboard, potentially mouse)
- Efficient screen updates for animations

**UI Components to Build**:
```typescript
// Main game view
class GameView {
  boardPanel: BoardPanel        // Grid display with emojis
  handPanel: HandPanel          // Player's current tiles
  scorePanel: ScorePanel        // Scoreboard
  statusPanel: StatusPanel      // Turn info, phase, messages
  effectPanel: EffectPanel      // Effect selection/targeting
}

// Board rendering
class BoardPanel {
  renderGrid(board: GameBoard): void
  renderStack(position: Position, stack: Tile[]): void
  highlightValidMoves(positions: Position[]): void
  showStackPopup(position: Position): void  // Detailed stack view

  // Visual elements
  // - Grid lines using box-drawing characters
  // - Each cell shows top emoji or stack indicator
  // - Color-coded borders for player control
  // - Hover/selection highlighting
}

// Player hand rendering
class HandPanel {
  renderHand(tiles: Tile[]): void
  highlightSelected(index: number): void

  // Show tiles horizontally with:
  // - Emoji display
  // - Tile name
  // - Keyboard shortcut (1-7)
}

// Keyboard controls
interface Controls {
  // Board navigation
  "Arrow Keys": "Move cursor on board"
  "Tab": "Switch between board/hand/effects"

  // Tile selection
  "1-7": "Select tile from hand"
  "Enter": "Confirm placement/selection"
  "Space": "Show stack details"

  // Effect activation
  "e": "Open effects menu"
  "a-z": "Quick-select effects"

  // Game controls
  "u": "Undo (if allowed)"
  "h": "Show help"
  "q": "Quit game"
}
```

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ EMOJINAL - Turn 12/50 - Player 1's Turn - Phase: Placement │
├─────────────────────────────────────┬───────────────────────┤
│                                     │  SCOREBOARD          │
│          GAME BOARD                 │  Player 1: 🔴  45    │
│      (Grid with emojis)             │  Player 2: 🔵  38    │
│                                     │                       │
│   🚩 💩 🌱 🪨 ➡️ 🔫 💣 ⬆️ ↔️ 🌳      │  SPACES CONTROLLED:  │
│   ♾️ 🧟 🌿 ⛏️ ⬅️ 🧨 ⏫️ ⬇️ ↕️ 🗿      │  Player 1: 12        │
│   🚩 🌸 🍀 💩 ➡️ ⏬️ 🔄 ⬆️ ↖️ 🌵      │  Player 2: 10        │
│   🪨 🐝 🌳 🚩 ⬅️ 🔫 ⏹️ ⬇️ ↙️ 🪓      │                       │
│   🦠 💩 🪰 🗿 ➡️ 💊 🧟 ⬆️ ↘️ 🍄      │  LAST ACTION:        │
│   ☢️ 🚽 🚩 🪨 ⬅️ ☠️ 💣 ⬇️ ↗️ 🌱      │  Placed 🚩 at (5,3)  │
│                                     │                       │
├─────────────────────────────────────┴───────────────────────┤
│ YOUR HAND:                                                   │
│ [1] 🚩  [2] 🌱  [3] ➡️  [4] 💣  [5] 🪨  [6] ↔️  [7] 🔫      │
├──────────────────────────────────────────────────────────────┤
│ STATUS: Select a tile to place (1-7) or press 'h' for help │
└──────────────────────────────────────────────────────────────┘
```

**Animation Support**:
- Tile placement fade-in
- Effect activation flash/highlight
- Score update counters
- Stack movement trails
- Destruction effects (flash, fade-out)

**Responsive Design**:
- Adapt grid size to terminal dimensions
- Scale UI panels based on available space
- Minimum terminal size: 80x24
- Optimal size: 120x40

**Performance Considerations**:
- Only redraw changed regions
- Use libghostty's efficient rendering
- Debounce rapid updates
- Cache rendered emoji glyphs

---

### Phase 5: AI & Multiplayer
**Priority: MEDIUM**

#### 5.1 AI Players
```typescript
interface AIPlayer {
  selectTile(state: GameState, hand: Tile[]): Tile
  selectPlacement(state: GameState, tile: Tile): Position
  selectEffects(state: GameState, tile: Tile, position: Position): EffectChoice[]

  // AI difficulty levels
  // - Easy: Random valid moves
  // - Medium: Basic scoring heuristics
  // - Hard: Minimax with effect evaluation
}

class AIStrategy {
  evaluateMove(state: GameState, move: Move): number
  getBestMove(state: GameState): Move

  // Evaluation factors:
  // - Control gain
  // - Opponent control disruption
  // - Position value (center vs edges)
  // - Combo potential
  // - Defensive value
}
```

#### 5.2 Multiplayer Architecture
```typescript
// Local multiplayer: hot-seat or pass-and-play
class LocalMultiplayer {
  obscureHand(player: Player): void  // Hide hand between turns
  waitForPlayerReady(): Promise<void>
}

// Network multiplayer (future)
interface NetworkManager {
  sendGameState(state: GameState): void
  receiveGameState(): Promise<GameState>
  sendAction(action: GameAction): void
  receiveAction(): Promise<GameAction>

  // Sync strategy:
  // - Option 1: Full state sync (simpler, more bandwidth)
  // - Option 2: Action sync with deterministic engine (complex, less bandwidth)
}
```

---

### Phase 6: Testing & Balance
**Priority: HIGH**

#### 6.1 Unit Tests
```typescript
// Test each effect independently
describe('EffectEngine', () => {
  test('claimSpace correctly assigns control', () => { /* ... */ })
  test('moveStack validates boundaries', () => { /* ... */ })
  test('destroyRadius affects correct tiles', () => { /* ... */ })
  test('plantEvolution follows correct path', () => { /* ... */ })
  // ... etc for all effects
})

// Test game state transitions
describe('GameEngine', () => {
  test('turn advances correctly', () => { /* ... */ })
  test('scoring updates at round end', () => { /* ... */ })
  test('game ends after maxTurns', () => { /* ... */ })
})

// Test edge cases
describe('Edge Cases', () => {
  test('deck runs out mid-game', () => { /* ... */ })
  test('all spaces filled before maxTurns', () => { /* ... */ })
  test('indestructible tiles block destruction', () => { /* ... */ })
  test('movement off board handled correctly', () => { /* ... */ })
})
```

#### 6.2 Integration Tests
```typescript
describe('Full Game Flow', () => {
  test('complete 2-player game', () => { /* ... */ })
  test('plant evolution combo chains', () => { /* ... */ })
  test('destruction and claiming interactions', () => { /* ... */ })
})
```

#### 6.3 Game Balance
- **Tile Distribution**: How many of each tile in deck?
  - Common: 🚩, ➡️, ⬅️, ⬆️, ⬇️, 💩, 🌱
  - Uncommon: ↔️, ↕️, diagonals, 🪨, 🔫, 🦠
  - Rare: ♾️, 🗿, 💣, 🧨, ☣️, 🐝, 🪓
  - Very Rare: ⏹️, 🌪️, 🎲

- **Effect Balancing**:
  - Destruction radius vs cost
  - Movement distance limits
  - Evolution timing and benefits
  - Point values for different control types

- **Playtesting Metrics**:
  - Average game length
  - Win rate by first/second player
  - Most/least used tiles
  - Dominant strategies (nerf if found)

---

### Phase 7: Polish & Enhancement
**Priority: LOW**

#### 7.1 Visual Effects
- Tile placement animations
- Effect activation visuals (explosions, movement trails, etc.)
- Score updates with flyout numbers
- Stack depth indicators
- Control territory highlighting

#### 7.2 Sound Design
- Tile placement sounds
- Effect activation sounds (themed by type)
- Background music (optional, toggleable)
- Victory/defeat sounds

#### 7.3 Quality of Life
```typescript
interface QoLFeatures {
  undoLastMove(): void  // Before effect activation
  showMoveHistory(): void
  highlightRecommendedMoves(): void  // For new players
  tutorialMode(): void
  saveGame(): void
  loadGame(): void
  replayGame(history: GameAction[]): void
}
```

#### 7.4 Achievements & Stats
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (stats: PlayerStats) => boolean;
}

// Example achievements:
// - "Green Thumb": Evolve 10 plants in one game
// - "Demolition Expert": Use 💣, 🧨, and ☣️ in one game
// - "Turtle Power": Win with only 🗿 and 🪨 tiles
// - "Gardener": Have 5 different plant types on board simultaneously
```

---

## Data File Formats

### Tile Definition File
Enhance existing `Emojis` file with structured format:

```json
{
  "tiles": [
    {
      "emoji": "🚩",
      "name": "Flag",
      "type": "CLAIM",
      "description": "User claims space",
      "rarity": "common",
      "effects": [
        {
          "type": "CLAIM_SPACE",
          "targeting": "SELF"
        }
      ]
    },
    {
      "emoji": "🌱",
      "name": "Seedling",
      "type": "PLANT",
      "description": "Continues to grow through stack. After 1 turn on top evolves.",
      "rarity": "common",
      "effects": [
        {
          "type": "EVOLVE",
          "targeting": "SELF",
          "delay": 1
        }
      ],
      "evolution": {
        "turns": 1,
        "next": "🌿"
      }
    }
    // ... etc
  ]
}
```

### Game Configuration File
```json
{
  "gameConfig": {
    "boardSize": 10,
    "maxTurns": 50,
    "startingHandSize": 5,
    "maxHandSize": 7,
    "endGameBonus": 10,
    "playerCount": 2,
    "deckComposition": {
      "🚩": 8,
      "➖": 4,
      "♾️": 2,
      "🧟": 6,
      "☠️": 4,
      "↔️": 6,
      "↕️": 6,
      "➡️": 8,
      "⬅️": 8,
      "⬆️": 8,
      "⬇️": 8,
      "↖️": 4,
      "↙️": 4,
      "↘️": 4,
      "↗️": 4,
      "⏫️": 4,
      "⏬️": 4,
      "⏹️": 2,
      "🔄": 4,
      "🌱": 10,
      "🪨": 6,
      "⛏️": 4,
      "🗿": 2,
      "💣": 3,
      "🔫": 6,
      "🧨": 2,
      "🌪️": 2,
      "☢️": 2,
      "🚽": 4,
      "💩": 8,
      "🪰": 4,
      "🦠": 6,
      "💊": 4,
      "☣️": 1,
      "🎲": 4
    }
  }
}
```

---

## Technical Stack Recommendations

### Selected Technology Stack

**Primary Implementation: Zig + libghostty**

**Core Language: Zig**
- Pros:
  - Excellent performance for game logic
  - Memory safety without garbage collection
  - Great interop with C libraries (libghostty)
  - Simple, readable syntax
  - Fast compilation
- Cons:
  - Smaller ecosystem than JS/Python
  - Newer language, evolving tooling
- Best for: High-performance TUI applications

**UI Framework: libghostty**
- Modern terminal UI library
- Excellent emoji and Unicode support
- Efficient rendering for smooth gameplay
- Cross-platform terminal compatibility
- Event-driven architecture

**Alternative Stack (if Zig not preferred): Rust + libghostty**
- Rust also has excellent libghostty bindings
- Similar performance characteristics
- More mature ecosystem
- Steeper learning curve

**Alternative Stack (rapid prototyping): Python + Textual**
- If libghostty bindings unavailable for preferred language
- Textual provides similar TUI capabilities
- Faster initial development
- Trade-off: slower runtime performance

### Libraries & Frameworks

**For TUI (Primary)**:
- libghostty: Terminal UI framework
- Zig standard library for data structures
- Random number generation (for shuffling, first player)

**For Testing**:
- Zig built-in testing framework
- Integration tests for game logic
- TUI snapshot testing for interface

**For Future Multiplayer**:
- WebSocket library for real-time communication
- JSON serialization for state sync
- Optional: database for persistent games (SQLite)

---

## libghostty Integration Details

### Project Structure
```
emojinal/
├── src/
│   ├── main.zig              # Entry point
│   ├── game/
│   │   ├── engine.zig        # Core game engine
│   │   ├── state.zig         # Game state management
│   │   ├── tile.zig          # Tile definitions
│   │   ├── board.zig         # Board logic
│   │   ├── effects.zig       # Effect system
│   │   ├── scoring.zig       # Scoring logic
│   │   └── ai.zig            # AI player
│   ├── ui/
│   │   ├── app.zig           # Main TUI application
│   │   ├── board_view.zig    # Board rendering
│   │   ├── hand_view.zig     # Hand display
│   │   ├── score_view.zig    # Scoreboard
│   │   ├── input.zig         # Input handling
│   │   └── theme.zig         # Colors and styling
│   └── utils/
│       ├── config.zig        # Configuration loading
│       └── data.zig          # Tile data parsing
├── data/
│   ├── tiles.json            # Tile definitions (parsed from Emojis)
│   └── config.json           # Game configuration
├── tests/
│   ├── game_test.zig         # Game logic tests
│   ├── effects_test.zig      # Effect tests
│   └── integration_test.zig  # Full game tests
├── build.zig                 # Build configuration
├── Emojis                    # Original emoji definitions
└── GAME_ENGINE_PLAN.md       # This document
```

### libghostty Event Loop
```zig
const ghostty = @import("ghostty");

pub fn main() !void {
    var app = try ghostty.App.init();
    defer app.deinit();

    var game_state = try initializeGame();

    // Main game loop
    while (game_state.phase != .GAME_OVER) {
        // Render current state
        try renderGame(app, game_state);

        // Handle input
        const event = try app.nextEvent();
        switch (event) {
            .key => |key| try handleKeyPress(key, &game_state),
            .resize => try handleResize(app),
            .quit => break,
        }

        // Update game state
        try updateGame(&game_state);
    }

    // Show final scores
    try renderGameOver(app, game_state);
}
```

### Rendering Optimization
```zig
// Only redraw changed regions
const DirtyRegions = struct {
    board: bool,
    hand: bool,
    scores: bool,
    status: bool,
};

fn render(app: *App, state: GameState, dirty: DirtyRegions) !void {
    if (dirty.board) try renderBoard(app, state.board);
    if (dirty.hand) try renderHand(app, state.current_player);
    if (dirty.scores) try renderScores(app, state.players);
    if (dirty.status) try renderStatus(app, state);

    try app.flush();
}
```

### Color Scheme for Player Differentiation
```zig
const PlayerColors = enum {
    player1_primary,    // Bright Red
    player1_secondary,  // Light Red
    player2_primary,    // Bright Blue
    player2_secondary,  // Light Blue
    player3_primary,    // Bright Green (if 3+ players)
    player3_secondary,  // Light Green
    player4_primary,    // Bright Yellow
    player4_secondary,  // Light Yellow

    neutral,            // White/Gray
    highlight,          // Bright Cyan
    warning,            // Bright Magenta
    error,              // Bright Red

    // Territory borders use primary colors
    // Tiles use emojis (naturally colored)
    // Stack indicators use secondary colors
};
```

### Input State Machine
```zig
const InputMode = enum {
    TILE_SELECTION,      // Choosing tile from hand
    POSITION_SELECTION,  // Placing tile on board
    EFFECT_SELECTION,    // Choosing which effects to activate
    TARGET_SELECTION,    // Targeting for effects
    CONFIRMATION,        // Confirm/cancel action
};

fn handleKeyPress(key: Key, state: *GameState) !void {
    switch (state.input_mode) {
        .TILE_SELECTION => try handleTileSelection(key, state),
        .POSITION_SELECTION => try handlePositionSelection(key, state),
        .EFFECT_SELECTION => try handleEffectSelection(key, state),
        .TARGET_SELECTION => try handleTargetSelection(key, state),
        .CONFIRMATION => try handleConfirmation(key, state),
    }
}
```

---

## Design Decisions Needed

### Critical Questions to Resolve

1. **Scoring System**:
   - How many points per controlled space?
   - Do different control types (🚩 vs ♾️ vs 💩) have different values?
   - How much is the end-game bonus?
   - Are there points for tile placement/effects beyond control?

2. **Deck Size & Composition**:
   - Total number of tiles in deck?
   - Rarity distribution?
   - Should deck be balanced per-player or shared?

3. **Stack Mechanics**:
   - Maximum stack height?
   - Can players place tiles on opponent-controlled spaces?
   - What determines control when stack has mixed ownership?
   - Does top tile always control, or do certain tiles override?

4. **Movement Rules**:
   - Can stacks move to occupied spaces (stack on top)?
   - Moving off board: invalid or stop at edge?
   - Does moving a stack change control of source position?
   - Can you move opponent's stacks?

5. **Destruction Resolution**:
   - Destroying stack: all tiles or just top?
   - What happens to indestructible tiles in destroyed stack?
   - Can you destroy your own tiles?
   - Priority when multiple destruction effects conflict?

6. **Plant Evolution**:
   - Is evolution automatic or player choice?
   - Player chooses which evolution path?
   - Does plant need to stay on top of stack to evolve?
   - What happens if plant is covered before evolution?

7. **♾️ Permanent Claim**:
   - Can it be destroyed by anything?
   - Can it be moved?
   - Does it prevent other tiles being placed on that space?

8. **➖ Negation**:
   - What exactly does "negates a claimed space" mean?
   - Does it remove control, points, both?
   - Does it prevent future claims?
   - "Sets flag for user that placed it" - what flag?

9. **End of Round vs End of Turn**:
   - Round = all players took 1 turn?
   - Or round = X number of turns?
   - When do zombies crawl (🧟)?
   - When do plants evolve?
   - When are scores tallied?

10. **Game End Conditions**:
    - Only turn limit, or also:
      - Board full?
      - Deck empty?
      - One player controls X% of board?

---

## Implementation Roadmap

### Milestone 1: Core Engine (Weeks 1-3)
- ✅ Data structures defined
- ✅ Basic game state management
- ✅ Tile placement logic
- ✅ Simple effects (claim, basic movement)
- ✅ Turn management
- ✅ Basic scoring
- ✅ CLI interface for testing

**Deliverable**: 2-player game with basic tiles, no complex effects

### Milestone 2: Effect System (Weeks 4-6)
- ✅ All movement effects
- ✅ Stack manipulation effects
- ✅ Basic destruction (🔫, 💣)
- ✅ Effect targeting system
- ✅ Effect validation

**Deliverable**: Full movement and basic destruction working

### Milestone 3: Advanced Effects (Weeks 7-10)
- ✅ Plant evolution system
- ✅ Resource system (🪨, ⛏️, 🗿)
- ✅ Biohazard system
- ✅ Advanced destruction (🧨, 🌪️, ☣️)
- ✅ Special tiles (🧟, 🎲, ➖)

**Deliverable**: All tile effects implemented and tested

### Milestone 4: UI Development (Weeks 11-14)
- ✅ Improved CLI or Web UI
- ✅ Visual board representation
- ✅ Intuitive tile selection
- ✅ Effect targeting interface
- ✅ Stack visualization
- ✅ Score display

**Deliverable**: Playable game with good UX

### Milestone 5: AI & Balance (Weeks 15-17)
- ✅ Basic AI opponent
- ✅ Game balance testing
- ✅ Tile distribution tuning
- ✅ Scoring adjustments
- ✅ Bug fixes from playtesting

**Deliverable**: Balanced game with AI opponent

### Milestone 6: Polish (Weeks 18-20)
- ✅ Animations and effects
- ✅ Sound design
- ✅ Save/load game
- ✅ Statistics and achievements
- ✅ Tutorial mode
- ✅ Final bug fixes

**Deliverable**: Release-ready game

### Milestone 7: Multiplayer (Future)
- ✅ Network architecture
- ✅ Server implementation
- ✅ Sync logic
- ✅ Matchmaking
- ✅ Spectator mode

**Deliverable**: Online multiplayer support

---

## Risk Assessment

### High Risk
1. **Game Balance**: With 44+ unique tiles, balancing will be extremely complex
   - Mitigation: Extensive playtesting, iterative adjustments, data-driven balance

2. **Effect Interactions**: Complex combos may create unintended exploits
   - Mitigation: Comprehensive unit tests, integration tests for all combos

3. **Performance**: Large board + many effects could cause lag
   - Mitigation: Optimize critical paths, consider performance profiling early

### Medium Risk
1. **Scope Creep**: Feature-rich design could delay completion
   - Mitigation: Strict milestone adherence, MVP-first approach

2. **UI Complexity**: Visualizing stacks and effects clearly is challenging
   - Mitigation: User testing, iterative UI improvements

3. **AI Quality**: Good AI is hard with complex game state
   - Mitigation: Start simple, improve iteratively, consider ML approaches later

### Low Risk
1. **Technical Implementation**: Core game logic is straightforward
2. **Testing**: Game rules are well-defined and testable

---

## Success Metrics

### MVP (Minimum Viable Product)
- ✅ 2-player local game works
- ✅ All tile effects implemented
- ✅ Basic scoring functional
- ✅ Game can be completed
- ✅ No game-breaking bugs

### 1.0 Release
- ✅ Polished UI
- ✅ AI opponent (medium difficulty)
- ✅ Balanced gameplay (no dominant strategy)
- ✅ Save/load functionality
- ✅ Tutorial for new players

### Future Goals
- ✅ Online multiplayer
- ✅ Mobile version
- ✅ Tournament mode
- ✅ Ranked matchmaking
- ✅ Custom tile creation
- ✅ Map editor

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of this document
2. **Resolve Design Decisions**: Answer critical questions listed above
3. **Set Up Development Environment**: Choose tech stack, initialize project
4. **Create Tile Definition Format**: Convert Emojis file to structured data
5. **Implement Phase 1**: Build core data structures
6. **Begin Milestone 1**: Start core engine development

---

## Appendix: Tile Reference Quick Guide

### Claim & Control (7 tiles)
- 🚩 Claim space
- ➖ Negate space, set flag
- ♾️ Permanent control
- 🧟 Zombie (crawls to top)
- ☠️ Claim + negate zombies
- 💩 Claim space (biohazard)
- 🗿 Indestructible claim

### Movement (14 tiles)
- ↔️ Left or right (choice)
- ↕️ Up or down (choice)
- ➡️ Right X spaces
- ⬅️ Left X spaces
- ⬆️ Up X spaces
- ⬇️ Down X spaces
- ↖️ Diagonal up-left X spaces
- ↙️ Diagonal down-left X spaces
- ↘️ Diagonal down-right X spaces
- ↗️ Diagonal up-right X spaces

### Stack Manipulation (4 tiles)
- ⏫️ Bottom to top
- ⏬️ Top to bottom
- ⏹️ Stop all effects
- 🔄 Reshuffle stack

### Plants (9 tiles)
- 🌱 Seedling (evolves)
- 🌿 Intermediate (evolves)
- 🍀 Clover (draw extra tile)
- 🌸 Flower (combo with bee)
- 🐝 Bee (plant seedling per flower)
- 🌵 Cactus (hard to destroy)
- 🌳 Tree (plant extra seedling)
- 🪓 Axe (chop plants)
- 🍄 Mushroom (spread, combo with stump)

### Resources (3 tiles)
- 🪨 Rock (hard to destroy)
- ⛏️ Pickaxe (destroy rock or make moai)
- 🗿 Moai (indestructible)

### Destruction (5 tiles)
- 💣 Bomb (1 radius, place flag)
- 🔫 Gun (destroy 1 stack)
- 🧨 Dynamite (3 radius, claim 4)
- 🌪️ Tornado (path destruction)
- ☣️ Biohazard (destroy all, claim 4)

### Biohazard System (6 tiles)
- ☢️ Radioactive (poop → germs)
- 🚽 Toilet (destroy row/column, leave poop)
- 💩 Poop (claim)
- 🪰 Fly (spread poop/contagion)
- 🦠 Germ (spread germs)
- 💊 Pill (cure germs → flags)

### Special (1 tile)
- 🎲 Dice (random tile)

**Total: 44 unique tiles**

---

*This plan is a living document and should be updated as design decisions are made and implementation progresses.*
