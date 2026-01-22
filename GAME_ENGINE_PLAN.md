# Emojinal - Game Engine Development Plan (Web Version)

## Overview
A multiplayer grid-based tile placement game where players strategically place emoji tiles with unique abilities to control territory and maximize their score.

## Key Features

### ⚙️ Customizable Game Settings
- **Board Size**: Adjustable from 6x6 to 15x15
- **Turn Count**: Configurable from 10 to 100 turns
- **Game Modes**: Local multiplayer, vs AI, or Online PvP (future)

### 🤖 AI Opponent
- **Three Difficulty Levels**:
  - **Easy**: Random valid moves
  - **Medium**: Greedy strategy with position evaluation
  - **Hard**: Minimax with alpha-beta pruning
- Perfect for testing and solo play

### 🌐 Network-Ready Architecture
- WebSocket client/server infrastructure designed from the start
- State serialization for network transmission
- Room-based matchmaking system
- Ready to deploy multiplayer when needed

---

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
```javascript
class Tile {
  constructor(emoji, owner, type, effects = []) {
    this.emoji = emoji;           // The emoji character
    this.owner = owner;            // Which player owns this tile
    this.type = type;              // Category (claim, movement, destruction, etc.)
    this.effects = effects;        // List of effects this tile can trigger
    this.metadata = {              // Optional data for tile state
      turnCount: 0,                // For evolving tiles (plants)
      evolutionStage: null,
      isPermanent: false,          // For ♾️
      isNegated: false             // For ➖
    };
  }
}

const TileType = {
  CLAIM: 'claim',          // 🚩, ♾️, ☠️, 💩
  MOVEMENT: 'movement',    // ↔️, ↕️, ➡️, ⬅️, ⬆️, ⬇️, diagonals
  STACK_MANIP: 'stack',    // ⏫️, ⏬️, ⏹️, 🔄
  PLANT: 'plant',          // 🌱, 🌿, 🍀, 🌸, 🌵, 🌳, 🪓, 🍄, 🐝
  RESOURCE: 'resource',    // 🪨, ⛏️, 🗿
  DESTRUCTION: 'destroy',  // 💣, 🔫, 🧨, 🌪️
  BIOHAZARD: 'biohazard',  // ☢️, 🚽, 🦠, 💊, ☣️, 🪰
  SPECIAL: 'special'       // 🎲, 🧟, ➖
};
```

#### 1.2 Grid System
```javascript
class GridSpace {
  constructor(x, y) {
    this.position = { x, y };
    this.stack = [];             // Tiles at this position (bottom to top)
    this.controlledBy = null;    // Who currently controls this space
    this.flags = {
      isNegated: false,          // ➖ effect active
      isPermanent: false,        // ♾️ placed here
      isStopped: false,          // ⏹️ effect active
      isDestroyed: false         // 💣/🧨 destroyed
    };
  }

  getTopTile() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  addTile(tile) {
    this.stack.push(tile);
  }

  removeTile() {
    return this.stack.pop();
  }
}

class GameBoard {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.spaces = Array(height).fill(null).map((_, y) =>
      Array(width).fill(null).map((_, x) => new GridSpace(x, y))
    );
  }

  getSpace(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.spaces[y][x];
  }
}
```

#### 1.3 Player & Game State
```javascript
class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];              // Current tiles in hand (max 7?)
    this.score = 0;
    this.controlledSpaces = 0;   // Count for end-game bonus
    this.emoji = ['🔴', '🔵', '🟢', '🟡'][id]; // Player identifier
    this.statistics = {
      tilesPlaced: 0,
      effectsActivated: 0,
      spacesControlled: 0
    };
  }

  addToHand(tile) {
    this.hand.push(tile);
  }

  removeFromHand(index) {
    return this.hand.splice(index, 1)[0];
  }
}

const GamePhase = {
  SETUP: 'setup',
  PLACEMENT: 'placement',
  EFFECT_ACTIVATION: 'effect_activation',
  DRAW: 'draw',
  SCORING: 'scoring',
  GAME_OVER: 'game_over'
};

class GameState {
  constructor(config) {
    this.board = new GameBoard(config.boardSize, config.boardSize);
    this.players = [];
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.roundNumber = 0;
    this.deck = [];              // Draw pile
    this.config = config;
    this.phase = GamePhase.SETUP;
    this.history = [];           // For undo/replay
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }
}

class GameConfig {
  constructor(options = {}) {
    this.boardSize = options.boardSize || 10;         // NxN grid (customizable: 6-15)
    this.maxTurns = options.maxTurns || 50;           // Game ends after X turns (customizable: 10-100)
    this.startingHandSize = options.startingHandSize || 5;   // Default: 5
    this.maxHandSize = options.maxHandSize || 7;     // Maximum tiles in hand
    this.endGameBonus = options.endGameBonus || 10;  // Bonus for most controlled spaces
    this.playerCount = options.playerCount || 2;     // 2-4 players
    this.gameMode = options.gameMode || 'local';     // 'local', 'ai', 'online'
    this.difficulty = options.difficulty || 'medium'; // AI difficulty: 'easy', 'medium', 'hard'
  }

  // Validation
  static validate(options) {
    const errors = [];

    if (options.boardSize < 6 || options.boardSize > 15) {
      errors.push('Board size must be between 6 and 15');
    }

    if (options.maxTurns < 10 || options.maxTurns > 100) {
      errors.push('Max turns must be between 10 and 100');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }
}
```

#### 1.4 Effect System
```javascript
class Effect {
  constructor(type, targetingMode, execute, canActivate) {
    this.type = type;
    this.targetingMode = targetingMode;
    this.execute = execute;      // Function: (state, source, target) => newState
    this.canActivate = canActivate; // Function: (state, source) => boolean
  }
}

const EffectType = {
  CLAIM_SPACE: 'claim_space',
  MOVE_STACK: 'move_stack',
  DESTROY_STACK: 'destroy_stack',
  EVOLVE: 'evolve',
  SPREAD: 'spread',
  // ... etc
};

const TargetingMode = {
  SELF: 'self',              // No target needed
  ADJACENT: 'adjacent',      // Choose adjacent space
  RADIUS: 'radius',          // Choose radius from source
  ROW_COLUMN: 'row_column',  // Choose entire row or column
  PATH: 'path',              // Draw a path (for 🌪️)
  ANY: 'any'                 // Any valid space
};
```

---

### Phase 2: Core Game Engine
**Priority: CRITICAL**

#### 2.1 Game Initialization
```javascript
class GameEngine {
  static initializeGame(config, playerNames) {
    const state = new GameState(config);

    // Create players
    playerNames.forEach((name, i) => {
      state.players.push(new Player(i, name));
    });

    // Create and shuffle deck
    state.deck = this.createDeck();
    this.shuffleDeck(state.deck);

    // Deal starting hands
    state.players.forEach(player => {
      for (let i = 0; i < config.startingHandSize; i++) {
        if (state.deck.length > 0) {
          player.addToHand(state.deck.pop());
        }
      }
    });

    // Select first player randomly
    state.currentPlayerIndex = Math.floor(Math.random() * state.players.length);
    state.phase = GamePhase.PLACEMENT;

    return state;
  }

  static createDeck() {
    // Load tile definitions from data/tiles.json
    // Create tiles based on deck composition from config
    // Returns array of Tile instances
  }

  static shuffleDeck(deck) {
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
}
```

#### 2.2 Turn Management
```javascript
class TurnManager {
  static startTurn(state) {
    state.phase = GamePhase.PLACEMENT;
    return state;
  }

  static placeTile(state, tileIndex, position) {
    const player = state.currentPlayer;
    const tile = player.hand[tileIndex];

    // Validate placement
    const validation = this.validatePlacement(state, tile, position);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Place tile on board
    const space = state.board.getSpace(position.x, position.y);
    space.addTile(tile);

    // Remove from hand
    player.removeFromHand(tileIndex);

    // Update stats
    player.statistics.tilesPlaced++;

    // Move to effect activation phase
    state.phase = GamePhase.EFFECT_ACTIVATION;

    return state;
  }

  static activateEffects(state, position, effectChoices) {
    const space = state.board.getSpace(position.x, position.y);
    const tile = space.getTopTile();

    // Execute each chosen effect
    effectChoices.forEach(choice => {
      const effect = tile.effects[choice.effectIndex];
      if (effect.canActivate(state, position)) {
        state = effect.execute(state, position, choice.target);
        state.currentPlayer.statistics.effectsActivated++;
      }
    });

    state.phase = GamePhase.DRAW;
    return state;
  }

  static drawTile(state) {
    const player = state.currentPlayer;

    if (state.deck.length > 0 && player.hand.length < state.config.maxHandSize) {
      player.addToHand(state.deck.pop());
    }

    state.phase = GamePhase.SCORING;
    return state;
  }

  static endTurn(state) {
    // Update scores
    state = ScoringEngine.updateControlledSpaces(state);

    // Check for end of round (all players took a turn)
    if ((state.turnNumber + 1) % state.players.length === 0) {
      state.roundNumber++;
      state = this.processEndOfRound(state);
    }

    // Advance turn
    state.turnNumber++;
    state.nextPlayer();

    // Check for game over
    if (state.turnNumber >= state.config.maxTurns) {
      state.phase = GamePhase.GAME_OVER;
    } else {
      state.phase = GamePhase.PLACEMENT;
    }

    return state;
  }

  static processEndOfRound(state) {
    // Handle zombies (🧟 crawl to top)
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        this.processZombies(space);
        this.evolvePlants(space);
      });
    });

    return state;
  }

  static validatePlacement(state, tile, position) {
    // Check if position is valid
    const space = state.board.getSpace(position.x, position.y);
    if (!space) {
      return { valid: false, error: 'Invalid position' };
    }

    // Add more validation rules as needed
    return { valid: true };
  }
}
```

#### 2.3 Effect Engine
```javascript
class EffectEngine {
  // Claim effects
  static claimSpace(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    space.controlledBy = playerId;
    return state;
  }

  static permanentClaim(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    space.controlledBy = playerId;
    space.flags.isPermanent = true;
    return state;
  }

  static negateSpace(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    space.flags.isNegated = true;
    space.controlledBy = playerId;
    return state;
  }

  // Movement effects
  static moveStack(state, from, to) {
    const fromSpace = state.board.getSpace(from.x, from.y);
    const toSpace = state.board.getSpace(to.x, to.y);

    if (!fromSpace || !toSpace) return state;

    // Move entire stack
    toSpace.stack.push(...fromSpace.stack);
    fromSpace.stack = [];
    fromSpace.controlledBy = null;

    return state;
  }

  static moveStackDistance(state, from, direction, distance) {
    const to = {
      x: from.x + direction.dx * distance,
      y: from.y + direction.dy * distance
    };

    // Check if destination is valid
    const toSpace = state.board.getSpace(to.x, to.y);
    if (!toSpace) return state; // Invalid move, do nothing

    return this.moveStack(state, from, to);
  }

  // Stack manipulation
  static moveBottomToTop(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (space.stack.length > 1) {
      const bottomTile = space.stack.shift();
      space.stack.push(bottomTile);
    }
    return state;
  }

  static moveTopToBottom(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (space.stack.length > 1) {
      const topTile = space.stack.pop();
      space.stack.unshift(topTile);
    }
    return state;
  }

  static stopEffects(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    space.flags.isStopped = true;
    return state;
  }

  static reshuffleStack(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    // Fisher-Yates shuffle on stack
    for (let i = space.stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [space.stack[i], space.stack[j]] = [space.stack[j], space.stack[i]];
    }
    return state;
  }

  // Destruction effects
  static destroyStack(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    space.stack = space.stack.filter(tile => this.isIndestructible(tile));
    if (space.stack.length === 0) {
      space.controlledBy = null;
    }
    return state;
  }

  static destroyRadius(state, center, radius, claimCount = 0) {
    const destroyed = [];

    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const distance = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
        if (distance <= radius) {
          const space = state.board.getSpace(x, y);
          if (space) {
            state = this.destroyStack(state, { x, y });
            destroyed.push({ x, y });
          }
        }
      }
    }

    // Claim some spaces from destroyed (for 🧨)
    if (claimCount > 0 && destroyed.length > 0) {
      const toClaim = destroyed.slice(0, claimCount);
      toClaim.forEach(pos => {
        state = this.claimSpace(state, pos, state.currentPlayer.id);
      });
    }

    return state;
  }

  static isIndestructible(tile) {
    return tile.emoji === '🗿'; // Moai is indestructible
  }

  // Plant system
  static evolvePlant(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    const tile = space.getTopTile();

    if (!tile || tile.type !== TileType.PLANT) return state;

    tile.metadata.turnCount++;

    const evolutionMap = {
      '🌱': '🌿',  // Seedling -> Intermediate
      '🌿': null   // Intermediate -> choice (handled separately)
    };

    if (evolutionMap[tile.emoji]) {
      tile.emoji = evolutionMap[tile.emoji];
      tile.metadata.evolutionStage = tile.emoji;
    }

    return state;
  }

  // ... more effects to be implemented
}
```

#### 2.4 Scoring System
```javascript
class ScoringEngine {
  static calculateScore(state, playerId) {
    let score = 0;
    let controlledSpaces = 0;

    state.board.spaces.forEach(row => {
      row.forEach(space => {
        if (space.controlledBy === playerId && !space.flags.isNegated) {
          score += 1; // 1 point per controlled space
          controlledSpaces++;

          // Bonus for permanent control
          if (space.flags.isPermanent) {
            score += 1;
          }
        }
      });
    });

    const player = state.players[playerId];
    player.score = score;
    player.controlledSpaces = controlledSpaces;
    player.statistics.spacesControlled = controlledSpaces;

    return score;
  }

  static updateControlledSpaces(state) {
    state.players.forEach(player => {
      this.calculateScore(state, player.id);
    });
    return state;
  }

  static calculateEndGameBonus(state) {
    const maxSpaces = Math.max(...state.players.map(p => p.controlledSpaces));
    const winners = state.players.filter(p => p.controlledSpaces === maxSpaces);

    const bonusPerWinner = state.config.endGameBonus / winners.length;
    winners.forEach(player => {
      player.score += bonusPerWinner;
    });

    return state;
  }
}
```

---

### Phase 3: Advanced Game Logic
**Priority: HIGH**

#### 3.1 Plant Evolution System
```javascript
class PlantEvolutionSystem {
  static processEndOfTurn(state) {
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        const tile = space.getTopTile();
        if (tile && tile.type === TileType.PLANT) {
          this.evolvePlant(state, space.position);
        }
      });
    });
    return state;
  }

  static evolvePlant(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    const tile = space.getTopTile();

    if (!tile || tile.metadata.turnCount < 1) return tile;

    const evolutionPaths = {
      '🌱': ['🌿'],
      '🌿': ['🍀', '🌸', '🌵', '🌳'] // Player chooses
    };

    return evolutionPaths[tile.emoji] || tile;
  }

  static getEvolutionOptions(plant) {
    const evolutionPaths = {
      '🌱': ['🌿'],
      '🌿': ['🍀', '🌸', '🌵', '🌳']
    };
    return evolutionPaths[plant.emoji] || [];
  }
}
```

---

### Phase 4: Web Interface
**Priority: CRITICAL**

#### 4.1 Web Components Architecture

```javascript
// Main game component
class GameApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.initializeGame();
  }

  initializeGame() {
    const config = new GameConfig();
    this.state = GameEngine.initializeGame(config, ['Player 1', 'Player 2']);
    this.updateUI();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-areas:
            "header header"
            "board  sidebar"
            "hand   hand"
            "status status";
          grid-template-columns: 1fr 300px;
          grid-template-rows: auto 1fr auto auto;
          gap: 1rem;
          padding: 1rem;
          height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        @media (max-width: 768px) {
          :host {
            grid-template-areas:
              "header"
              "board"
              "hand"
              "sidebar"
              "status";
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto auto auto;
          }
        }
      </style>
      <game-status id="status"></game-status>
      <game-board id="board"></game-board>
      <score-panel id="score"></score-panel>
      <player-hand id="hand"></player-hand>
      <effect-selector id="effects"></effect-selector>
    `;
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('hand').addEventListener('tile-selected', (e) => {
      this.handleTileSelected(e.detail.index);
    });

    this.shadowRoot.getElementById('board').addEventListener('cell-selected', (e) => {
      this.handleCellSelected(e.detail.x, e.detail.y);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '7') {
        const index = parseInt(e.key) - 1;
        if (index < this.state.currentPlayer.hand.length) {
          this.handleTileSelected(index);
        }
      }
    });
  }

  handleTileSelected(index) {
    this.selectedTileIndex = index;
    this.updateUI();
  }

  handleCellSelected(x, y) {
    if (this.selectedTileIndex !== null && this.state.phase === GamePhase.PLACEMENT) {
      try {
        this.state = TurnManager.placeTile(this.state, this.selectedTileIndex, { x, y });
        this.selectedTileIndex = null;

        // Auto-skip effects for now (will be implemented later)
        this.state = TurnManager.drawTile(this.state);
        this.state = TurnManager.endTurn(this.state);

        this.updateUI();
      } catch (error) {
        console.error('Invalid placement:', error);
      }
    }
  }

  updateUI() {
    this.shadowRoot.getElementById('board').updateState(this.state);
    this.shadowRoot.getElementById('hand').updateState(this.state, this.selectedTileIndex);
    this.shadowRoot.getElementById('score').updateState(this.state);
    this.shadowRoot.getElementById('status').updateState(this.state);
  }
}

customElements.define('game-app', GameApp);
```

#### 4.2 Game Board Component

```javascript
class GameBoard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
  }

  updateState(state) {
    this.state = state;
    this.render();
  }

  render() {
    if (!this.state) return;

    const gridSize = this.state.board.width;
    const cells = this.state.board.spaces.map((row, y) =>
      row.map((space, x) => this.renderCell(space, x, y)).join('')
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .board-container {
          grid-area: board;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(${gridSize}, 1fr);
          gap: 4px;
          background: #0f3460;
          padding: 8px;
          border-radius: 8px;
          max-width: 600px;
          max-height: 600px;
        }

        .grid-cell {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          cursor: pointer;
          position: relative;
          border-radius: 4px;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          user-select: none;
        }

        .grid-cell:hover {
          background: linear-gradient(135deg, #2a2a3e 0%, #26314e 100%);
          transform: scale(1.05);
          border-color: #4a9eff;
          box-shadow: 0 0 15px rgba(74, 158, 255, 0.5);
        }

        .grid-cell[data-controlled-by="0"] {
          border-color: #f44336;
          box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
        }

        .grid-cell[data-controlled-by="1"] {
          border-color: #2196f3;
          box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
        }

        .grid-cell[data-controlled-by="2"] {
          border-color: #4caf50;
          box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
        }

        .grid-cell[data-controlled-by="3"] {
          border-color: #ffeb3b;
          box-shadow: 0 0 10px rgba(255, 235, 59, 0.3);
        }

        .stack-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.6em;
          background: rgba(0, 0, 0, 0.8);
          padding: 2px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-weight: bold;
          color: #4a9eff;
        }

        .empty-cell {
          color: #333;
          font-size: 1rem;
        }

        @keyframes tile-placed {
          0% {
            transform: scale(0) rotate(180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(-10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .tile-emoji {
          animation: tile-placed 0.3s ease-out;
        }
      </style>
      <div class="board-container">
        <div class="board-grid">
          ${cells}
        </div>
      </div>
    `;

    this.attachCellListeners();
  }

  renderCell(space, x, y) {
    const topTile = space.getTopTile();
    const stackCount = space.stack.length;
    const emoji = topTile ? topTile.emoji : '';
    const stackIndicator = stackCount > 1 ?
      `<span class="stack-indicator">${stackCount}</span>` : '';

    return `
      <div class="grid-cell"
           data-x="${x}"
           data-y="${y}"
           data-controlled-by="${space.controlledBy !== null ? space.controlledBy : ''}">
        <span class="tile-emoji">${emoji}</span>
        ${stackIndicator}
      </div>
    `;
  }

  attachCellListeners() {
    this.shadowRoot.querySelectorAll('.grid-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        this.dispatchEvent(new CustomEvent('cell-selected', {
          detail: { x, y },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
}

customElements.define('game-board', GameBoard);
```

#### 4.3 Player Hand Component

```javascript
class PlayerHand extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
    this.selectedIndex = null;
  }

  updateState(state, selectedIndex = null) {
    this.state = state;
    this.selectedIndex = selectedIndex;
    this.render();
  }

  render() {
    if (!this.state) return;

    const currentPlayer = this.state.currentPlayer;
    const tiles = currentPlayer.hand.map((tile, i) =>
      this.renderTile(tile, i)
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .hand-container {
          grid-area: hand;
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          background: linear-gradient(to bottom, rgba(15, 52, 96, 0.8), rgba(26, 26, 46, 0.8));
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
        }

        .tile-card {
          flex: 1;
          min-width: 100px;
          max-width: 140px;
          padding: 1rem;
          background: linear-gradient(135deg, #1e3a5f 0%, #2a475e 100%);
          border: 3px solid #3a5a7f;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .tile-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transform: rotate(45deg);
          transition: all 0.5s;
        }

        .tile-card:hover::before {
          left: 100%;
        }

        .tile-card:hover {
          transform: translateY(-10px) scale(1.05);
          border-color: #5a8abf;
          box-shadow: 0 10px 30px rgba(74, 158, 255, 0.4);
        }

        .tile-card.selected {
          border-color: #4CAF50;
          background: linear-gradient(135deg, #2a4a2a 0%, #3a5a3a 100%);
          box-shadow: 0 10px 40px rgba(76, 175, 80, 0.6);
          transform: translateY(-10px) scale(1.1);
        }

        .tile-emoji {
          font-size: 3.5rem;
          display: block;
          margin-bottom: 0.5rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .tile-name {
          font-size: 0.85rem;
          color: #b0c4de;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .tile-shortcut {
          font-size: 0.7rem;
          color: #6a7a8a;
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 8px;
          border-radius: 8px;
          display: inline-block;
        }

        .hand-title {
          position: absolute;
          top: -30px;
          left: 0;
          font-size: 0.9rem;
          color: #8a9aaa;
          font-weight: 600;
        }
      </style>
      <div class="hand-container">
        ${tiles}
      </div>
    `;

    this.attachTileListeners();
  }

  renderTile(tile, index) {
    const selected = index === this.selectedIndex ? 'selected' : '';
    const tileNames = {
      '🚩': 'Flag',
      '🌱': 'Seedling',
      '➡️': 'Move Right',
      '💣': 'Bomb',
      '🪨': 'Rock',
      '↔️': 'Move H',
      '🔫': 'Gun'
      // Add more as needed
    };

    return `
      <div class="tile-card ${selected}" data-index="${index}">
        <span class="tile-emoji">${tile.emoji}</span>
        <div class="tile-name">${tileNames[tile.emoji] || 'Tile'}</div>
        <div class="tile-shortcut">[${index + 1}]</div>
      </div>
    `;
  }

  attachTileListeners() {
    this.shadowRoot.querySelectorAll('.tile-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.dispatchEvent(new CustomEvent('tile-selected', {
          detail: { index },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
}

customElements.define('player-hand', PlayerHand);
```

#### 4.4 Score Panel Component

```javascript
class ScorePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  updateState(state) {
    this.render(state);
  }

  render(state) {
    if (!state) return;

    const playerScores = state.players.map((player, i) =>
      this.renderPlayerScore(player, state.currentPlayerIndex === i)
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .score-panel {
          grid-area: sidebar;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        h3 {
          margin: 0 0 1rem 0;
          color: #4a9eff;
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .player-score {
          margin-bottom: 1rem;
          padding: 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .player-score.active {
          background: rgba(74, 158, 255, 0.2);
          border-color: #4a9eff;
          box-shadow: 0 0 20px rgba(74, 158, 255, 0.3);
        }

        .player-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .score-emoji {
          font-size: 2rem;
          margin-right: 0.75rem;
        }

        .player-name {
          font-size: 1.1rem;
          font-weight: bold;
          color: #fff;
        }

        .player-score-value {
          font-size: 2rem;
          font-weight: bold;
          color: #4a9eff;
          margin-left: auto;
        }

        .player-stats {
          font-size: 0.85rem;
          color: #aaa;
          margin-top: 0.5rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin: 0.25rem 0;
        }

        .turn-info {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .turn-label {
          color: #888;
        }

        .turn-value {
          color: #4a9eff;
          font-weight: bold;
        }
      </style>
      <div class="score-panel">
        <h3>🏆 Scoreboard</h3>
        ${playerScores}
        <div class="turn-info">
          <div class="stat-row">
            <span class="turn-label">Turn:</span>
            <span class="turn-value">${state.turnNumber + 1} / ${state.config.maxTurns}</span>
          </div>
          <div class="stat-row">
            <span class="turn-label">Round:</span>
            <span class="turn-value">${state.roundNumber}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayerScore(player, isActive) {
    return `
      <div class="player-score ${isActive ? 'active' : ''}">
        <div class="player-header">
          <span class="score-emoji">${player.emoji}</span>
          <span class="player-name">${player.name}</span>
          <span class="player-score-value">${player.score}</span>
        </div>
        <div class="player-stats">
          <div class="stat-row">
            <span>Spaces:</span>
            <span>${player.controlledSpaces}</span>
          </div>
          <div class="stat-row">
            <span>Tiles Played:</span>
            <span>${player.statistics.tilesPlaced}</span>
          </div>
          <div class="stat-row">
            <span>Effects:</span>
            <span>${player.statistics.effectsActivated}</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('score-panel', ScorePanel);
```

#### 4.5 Game Status Component

```javascript
class GameStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  updateState(state) {
    this.render(state);
  }

  render(state) {
    if (!state) return;

    const phaseNames = {
      [GamePhase.PLACEMENT]: 'Place a Tile',
      [GamePhase.EFFECT_ACTIVATION]: 'Activate Effects',
      [GamePhase.DRAW]: 'Draw Tile',
      [GamePhase.SCORING]: 'Scoring',
      [GamePhase.GAME_OVER]: 'Game Over'
    };

    this.shadowRoot.innerHTML = `
      <style>
        .status-bar {
          grid-area: header;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .game-title {
          font-size: 1.8rem;
          font-weight: bold;
          background: linear-gradient(135deg, #4a9eff 0%, #82cfff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .status-info {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .status-label {
          font-size: 0.7rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-value {
          font-size: 1.1rem;
          color: #4a9eff;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .status-bar {
            flex-direction: column;
            gap: 1rem;
          }
        }
      </style>
      <div class="status-bar">
        <div class="game-title">🎮 EMOJINAL</div>
        <div class="status-info">
          <div class="status-item">
            <div class="status-label">Current Player</div>
            <div class="status-value">${state.currentPlayer.emoji} ${state.currentPlayer.name}</div>
          </div>
          <div class="status-item">
            <div class="status-label">Phase</div>
            <div class="status-value">${phaseNames[state.phase]}</div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('game-status', GameStatus);
```

#### 4.6 Game Setup Component

```javascript
class GameSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {
      boardSize: 10,
      maxTurns: 50,
      gameMode: 'ai',  // 'local', 'ai', 'online'
      difficulty: 'medium',
      playerNames: ['Player 1', 'Player 2']
    };
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .setup-container {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          color: #fff;
        }

        h2 {
          margin: 0 0 2rem 0;
          text-align: center;
          font-size: 2rem;
          background: linear-gradient(135deg, #4a9eff 0%, #82cfff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #b0c4de;
          font-weight: 600;
        }

        input[type="range"] {
          width: 100%;
          height: 6px;
          background: #2a2a3e;
          border-radius: 3px;
          outline: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
          background: #4a9eff;
          border-radius: 50%;
          cursor: pointer;
        }

        .range-value {
          display: inline-block;
          margin-left: 1rem;
          color: #4a9eff;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .mode-button {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid #3a5a7f;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s;
          color: #fff;
        }

        .mode-button:hover {
          background: rgba(74, 158, 255, 0.2);
          border-color: #4a9eff;
        }

        .mode-button.selected {
          background: rgba(74, 158, 255, 0.3);
          border-color: #4a9eff;
          box-shadow: 0 0 20px rgba(74, 158, 255, 0.4);
        }

        .difficulty-selector {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .difficulty-button {
          flex: 1;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid #3a5a7f;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s;
          color: #fff;
        }

        .difficulty-button:hover {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4caf50;
        }

        .difficulty-button.selected {
          background: rgba(76, 175, 80, 0.3);
          border-color: #4caf50;
        }

        .start-button {
          width: 100%;
          padding: 1.5rem;
          margin-top: 2rem;
          background: linear-gradient(135deg, #4a9eff 0%, #2196f3 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(74, 158, 255, 0.4);
        }

        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(74, 158, 255, 0.6);
        }

        .start-button:active {
          transform: translateY(0);
        }
      </style>
      <div class="setup-container">
        <h2>🎮 Game Setup</h2>

        <div class="form-group">
          <label>
            Board Size: <span class="range-value" id="boardSizeValue">10x10</span>
          </label>
          <input type="range" id="boardSize" min="6" max="15" value="10" />
        </div>

        <div class="form-group">
          <label>
            Max Turns: <span class="range-value" id="maxTurnsValue">50</span>
          </label>
          <input type="range" id="maxTurns" min="10" max="100" step="5" value="50" />
        </div>

        <div class="form-group">
          <label>Game Mode</label>
          <div class="mode-selector">
            <div class="mode-button" data-mode="local">
              👥<br>Local<br>Multiplayer
            </div>
            <div class="mode-button selected" data-mode="ai">
              🤖<br>vs<br>Computer
            </div>
            <div class="mode-button" data-mode="online">
              🌐<br>Online<br>PvP
            </div>
          </div>
        </div>

        <div class="form-group" id="difficultyGroup">
          <label>AI Difficulty</label>
          <div class="difficulty-selector">
            <div class="difficulty-button" data-difficulty="easy">
              😊 Easy
            </div>
            <div class="difficulty-button selected" data-difficulty="medium">
              😐 Medium
            </div>
            <div class="difficulty-button" data-difficulty="hard">
              😈 Hard
            </div>
          </div>
        </div>

        <button class="start-button">Start Game</button>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Board size slider
    const boardSizeSlider = this.shadowRoot.getElementById('boardSize');
    const boardSizeValue = this.shadowRoot.getElementById('boardSizeValue');
    boardSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      boardSizeValue.textContent = `${size}x${size}`;
      this.config.boardSize = parseInt(size);
    });

    // Max turns slider
    const maxTurnsSlider = this.shadowRoot.getElementById('maxTurns');
    const maxTurnsValue = this.shadowRoot.getElementById('maxTurnsValue');
    maxTurnsSlider.addEventListener('input', (e) => {
      const turns = e.target.value;
      maxTurnsValue.textContent = turns;
      this.config.maxTurns = parseInt(turns);
    });

    // Game mode buttons
    this.shadowRoot.querySelectorAll('.mode-button').forEach(button => {
      button.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.mode-button').forEach(b =>
          b.classList.remove('selected')
        );
        button.classList.add('selected');
        this.config.gameMode = button.dataset.mode;

        // Show/hide difficulty based on mode
        const difficultyGroup = this.shadowRoot.getElementById('difficultyGroup');
        difficultyGroup.style.display =
          this.config.gameMode === 'ai' ? 'block' : 'none';
      });
    });

    // Difficulty buttons
    this.shadowRoot.querySelectorAll('.difficulty-button').forEach(button => {
      button.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.difficulty-button').forEach(b =>
          b.classList.remove('selected')
        );
        button.classList.add('selected');
        this.config.difficulty = button.dataset.difficulty;
      });
    });

    // Start button
    this.shadowRoot.querySelector('.start-button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('game-start', {
        detail: this.config,
        bubbles: true,
        composed: true
      }));
    });
  }

  connectedCallback() {
    this.render();
  }
}

customElements.define('game-setup', GameSetup);
```

---

### Phase 5: AI Player System
**Priority: HIGH**

#### 5.1 AI Player Architecture

```javascript
class AIPlayer {
  constructor(playerId, difficulty = 'medium') {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.strategy = this.getStrategy(difficulty);
  }

  getStrategy(difficulty) {
    switch (difficulty) {
      case 'easy':
        return new RandomStrategy();
      case 'medium':
        return new GreedyStrategy();
      case 'hard':
        return new MinimaxStrategy();
      default:
        return new GreedyStrategy();
    }
  }

  async takeTurn(state) {
    // Add artificial delay to simulate thinking
    const delay = this.difficulty === 'hard' ? 1500 :
                  this.difficulty === 'medium' ? 1000 : 500;

    await new Promise(resolve => setTimeout(resolve, delay));

    const move = this.strategy.selectMove(state, this.playerId);
    return move;
  }
}

// Move structure
class Move {
  constructor(tileIndex, position, effects = []) {
    this.tileIndex = tileIndex;  // Index in hand
    this.position = position;     // {x, y}
    this.effects = effects;       // Effect choices
  }
}
```

#### 5.2 AI Strategies

```javascript
// Easy AI: Random valid moves
class RandomStrategy {
  selectMove(state, playerId) {
    const player = state.players[playerId];

    // Pick random tile from hand
    const tileIndex = Math.floor(Math.random() * player.hand.length);

    // Pick random valid position
    const validPositions = this.getValidPositions(state);
    const position = validPositions[
      Math.floor(Math.random() * validPositions.length)
    ];

    return new Move(tileIndex, position);
  }

  getValidPositions(state) {
    const positions = [];
    for (let y = 0; y < state.board.height; y++) {
      for (let x = 0; x < state.board.width; x++) {
        positions.push({ x, y });
      }
    }
    return positions;
  }
}

// Medium AI: Greedy strategy
class GreedyStrategy {
  selectMove(state, playerId) {
    const player = state.players[playerId];
    let bestMove = null;
    let bestScore = -Infinity;

    // Evaluate each tile in hand
    for (let tileIndex = 0; tileIndex < player.hand.length; tileIndex++) {
      const tile = player.hand[tileIndex];

      // Evaluate each position
      for (let y = 0; y < state.board.height; y++) {
        for (let x = 0; x < state.board.width; x++) {
          const position = { x, y };
          const score = this.evaluateMove(state, tile, position, playerId);

          if (score > bestScore) {
            bestScore = score;
            bestMove = new Move(tileIndex, position);
          }
        }
      }
    }

    return bestMove;
  }

  evaluateMove(state, tile, position, playerId) {
    let score = 0;

    // Prefer center positions
    const centerX = Math.floor(state.board.width / 2);
    const centerY = Math.floor(state.board.height / 2);
    const distanceFromCenter = Math.abs(position.x - centerX) +
                               Math.abs(position.y - centerY);
    score += (state.board.width - distanceFromCenter) * 2;

    // Prefer empty spaces
    const space = state.board.getSpace(position.x, position.y);
    if (space.stack.length === 0) {
      score += 10;
    }

    // Avoid opponent-controlled spaces with permanent flags
    if (space.controlledBy !== null &&
        space.controlledBy !== playerId &&
        space.flags.isPermanent) {
      score -= 50;
    }

    // Prefer tiles that claim spaces
    if (tile.type === 'claim') {
      score += 15;
    }

    // Prefer destruction tiles near opponent stacks
    if (tile.type === 'destroy') {
      const nearbyOpponentTiles = this.countNearbyOpponentTiles(
        state, position, playerId, 2
      );
      score += nearbyOpponentTiles * 10;
    }

    // Prefer planting in areas we control
    if (tile.type === 'plant') {
      if (space.controlledBy === playerId) {
        score += 12;
      }
    }

    return score;
  }

  countNearbyOpponentTiles(state, position, playerId, radius) {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = position.x + dx;
        const y = position.y + dy;
        const space = state.board.getSpace(x, y);
        if (space && space.controlledBy !== null &&
            space.controlledBy !== playerId) {
          count++;
        }
      }
    }
    return count;
  }
}

// Hard AI: Minimax with alpha-beta pruning (simplified)
class MinimaxStrategy {
  selectMove(state, playerId) {
    const depth = 2; // Look ahead 2 moves
    const result = this.minimax(state, depth, -Infinity, Infinity, true, playerId);
    return result.move;
  }

  minimax(state, depth, alpha, beta, maximizingPlayer, playerId) {
    if (depth === 0) {
      return {
        score: this.evaluateState(state, playerId),
        move: null
      };
    }

    const player = state.players[state.currentPlayerIndex];
    const moves = this.generateMoves(state, player);

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      let bestMove = moves[0];

      for (const move of moves) {
        const newState = this.simulateMove(state, move);
        const evaluation = this.minimax(
          newState, depth - 1, alpha, beta, false, playerId
        );

        if (evaluation.score > maxEval) {
          maxEval = evaluation.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, evaluation.score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }

      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      let bestMove = moves[0];

      for (const move of moves) {
        const newState = this.simulateMove(state, move);
        const evaluation = this.minimax(
          newState, depth - 1, alpha, beta, true, playerId
        );

        if (evaluation.score < minEval) {
          minEval = evaluation.score;
          bestMove = move;
        }

        beta = Math.min(beta, evaluation.score);
        if (beta <= alpha) break;
      }

      return { score: minEval, move: bestMove };
    }
  }

  evaluateState(state, playerId) {
    // Comprehensive state evaluation
    let score = 0;

    // Score based on controlled spaces
    score += state.players[playerId].score * 10;
    score += state.players[playerId].controlledSpaces * 5;

    // Penalize opponent score
    state.players.forEach((player, id) => {
      if (id !== playerId) {
        score -= player.score * 8;
        score -= player.controlledSpaces * 4;
      }
    });

    // Bonus for having more tiles in hand
    score += state.players[playerId].hand.length * 2;

    return score;
  }

  generateMoves(state, player) {
    const moves = [];

    // Sample a subset of possible moves (too many to evaluate all)
    const sampleSize = 10;

    for (let i = 0; i < Math.min(player.hand.length, 3); i++) {
      const positions = this.samplePositions(state, sampleSize);
      positions.forEach(pos => {
        moves.push(new Move(i, pos));
      });
    }

    return moves;
  }

  samplePositions(state, count) {
    const positions = [];
    const step = Math.max(1, Math.floor(state.board.width / Math.sqrt(count)));

    for (let y = 0; y < state.board.height; y += step) {
      for (let x = 0; x < state.board.width; x += step) {
        positions.push({ x, y });
      }
    }

    return positions.slice(0, count);
  }

  simulateMove(state, move) {
    // Create a deep copy of state and simulate the move
    const newState = JSON.parse(JSON.stringify(state));

    // Simplified simulation - just place the tile
    // In real implementation, would execute full turn logic
    const space = newState.board.spaces[move.position.y][move.position.x];
    const tile = newState.players[newState.currentPlayerIndex].hand[move.tileIndex];

    if (space && tile) {
      space.stack.push(tile);
      space.controlledBy = newState.currentPlayerIndex;
    }

    return newState;
  }
}
```

#### 5.3 Integrating AI into Game

```javascript
class GameApp extends HTMLElement {
  // ... existing code ...

  async handleCellSelected(x, y) {
    if (this.selectedTileIndex !== null &&
        this.state.phase === GamePhase.PLACEMENT) {
      try {
        // Human player move
        this.state = TurnManager.placeTile(
          this.state, this.selectedTileIndex, { x, y }
        );
        this.selectedTileIndex = null;

        this.state = TurnManager.drawTile(this.state);
        this.state = TurnManager.endTurn(this.state);
        this.updateUI();

        // Check if next player is AI
        if (this.isAIPlayer(this.state.currentPlayerIndex)) {
          await this.executeAITurn();
        }
      } catch (error) {
        console.error('Invalid placement:', error);
      }
    }
  }

  isAIPlayer(playerIndex) {
    return this.config.gameMode === 'ai' && playerIndex === 1;
  }

  async executeAITurn() {
    // Disable UI during AI turn
    this.setUIEnabled(false);

    const ai = new AIPlayer(
      this.state.currentPlayerIndex,
      this.config.difficulty
    );

    const move = await ai.takeTurn(this.state);

    // Execute AI's move
    this.state = TurnManager.placeTile(
      this.state, move.tileIndex, move.position
    );
    this.state = TurnManager.drawTile(this.state);
    this.state = TurnManager.endTurn(this.state);

    this.updateUI();
    this.setUIEnabled(true);
  }

  setUIEnabled(enabled) {
    const board = this.shadowRoot.getElementById('board');
    const hand = this.shadowRoot.getElementById('hand');

    if (enabled) {
      board.style.pointerEvents = 'auto';
      hand.style.pointerEvents = 'auto';
    } else {
      board.style.pointerEvents = 'none';
      hand.style.pointerEvents = 'none';
    }
  }
}
```

---

### Phase 6: Network Architecture (WebSocket-Ready)
**Priority: MEDIUM (Future)**

#### 6.1 Network Manager

```javascript
class NetworkManager {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.playerId = null;
    this.isHost = false;
    this.listeners = new Map();
  }

  // Connect to WebSocket server
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(serverUrl);

      this.socket.onopen = () => {
        console.log('Connected to game server');
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.socket.onclose = () => {
        console.log('Disconnected from server');
        this.emit('disconnect');
      };
    });
  }

  // Create a new game room
  createRoom(config) {
    this.send({
      type: 'CREATE_ROOM',
      config: config
    });
  }

  // Join an existing room
  joinRoom(roomId) {
    this.send({
      type: 'JOIN_ROOM',
      roomId: roomId
    });
  }

  // Send game action to server
  sendAction(action) {
    this.send({
      type: 'GAME_ACTION',
      roomId: this.roomId,
      action: action
    });
  }

  // Send state update (for host-authoritative model)
  sendState(state) {
    this.send({
      type: 'STATE_UPDATE',
      roomId: this.roomId,
      state: this.serializeState(state)
    });
  }

  // Handle incoming messages
  handleMessage(message) {
    switch (message.type) {
      case 'ROOM_CREATED':
        this.roomId = message.roomId;
        this.playerId = message.playerId;
        this.isHost = true;
        this.emit('room-created', message);
        break;

      case 'ROOM_JOINED':
        this.roomId = message.roomId;
        this.playerId = message.playerId;
        this.emit('room-joined', message);
        break;

      case 'PLAYER_JOINED':
        this.emit('player-joined', message.player);
        break;

      case 'GAME_START':
        this.emit('game-start', message.state);
        break;

      case 'GAME_ACTION':
        this.emit('opponent-action', message.action);
        break;

      case 'STATE_UPDATE':
        this.emit('state-update', this.deserializeState(message.state));
        break;

      case 'ERROR':
        this.emit('error', message.error);
        break;
    }
  }

  // Serialize game state for network transmission
  serializeState(state) {
    return {
      board: state.board,
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        hand: p.hand, // Don't send opponent's hand
        score: p.score,
        controlledSpaces: p.controlledSpaces,
        statistics: p.statistics
      })),
      currentPlayerIndex: state.currentPlayerIndex,
      turnNumber: state.turnNumber,
      roundNumber: state.roundNumber,
      phase: state.phase
    };
  }

  deserializeState(serialized) {
    // Reconstruct GameState object from serialized data
    const state = new GameState(new GameConfig());
    Object.assign(state, serialized);
    return state;
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
```

#### 6.2 Online Game Flow

```javascript
class OnlineGameManager {
  constructor() {
    this.network = new NetworkManager();
    this.state = null;
  }

  async createGame(config) {
    await this.network.connect('wss://your-server.com/game');
    this.network.createRoom(config);

    this.network.on('room-created', (data) => {
      console.log('Room created:', data.roomId);
      this.displayRoomCode(data.roomId);
    });

    this.network.on('player-joined', (player) => {
      console.log('Player joined:', player.name);
      this.startGame();
    });

    this.setupNetworkHandlers();
  }

  async joinGame(roomId) {
    await this.network.connect('wss://your-server.com/game');
    this.network.joinRoom(roomId);

    this.network.on('room-joined', (data) => {
      console.log('Joined room:', roomId);
    });

    this.network.on('game-start', (state) => {
      this.state = state;
      this.updateUI();
    });

    this.setupNetworkHandlers();
  }

  setupNetworkHandlers() {
    // Handle opponent actions
    this.network.on('opponent-action', (action) => {
      this.executeAction(action);
    });

    // Handle state updates (if using server-authoritative model)
    this.network.on('state-update', (state) => {
      this.state = state;
      this.updateUI();
    });

    // Handle disconnections
    this.network.on('disconnect', () => {
      this.showDisconnectMessage();
    });
  }

  // Player makes a move
  makeMove(tileIndex, position) {
    const action = {
      type: 'PLACE_TILE',
      tileIndex: tileIndex,
      position: position,
      playerId: this.network.playerId
    };

    // Optimistic update (update local state immediately)
    this.state = TurnManager.placeTile(this.state, tileIndex, position);
    this.updateUI();

    // Send to server
    this.network.sendAction(action);
  }

  executeAction(action) {
    // Execute opponent's action
    switch (action.type) {
      case 'PLACE_TILE':
        this.state = TurnManager.placeTile(
          this.state,
          action.tileIndex,
          action.position
        );
        this.updateUI();
        break;
    }
  }
}
```

#### 6.3 Server Architecture (Node.js Example)

```javascript
// server.js - Basic WebSocket game server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map(); // roomId -> Room

class Room {
  constructor(id, config) {
    this.id = id;
    this.config = config;
    this.players = [];
    this.state = null;
    this.maxPlayers = config.playerCount;
  }

  addPlayer(client, name) {
    const player = {
      id: this.players.length,
      client: client,
      name: name
    };
    this.players.push(player);
    return player;
  }

  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  broadcast(message, excludeClient = null) {
    this.players.forEach(player => {
      if (player.client !== excludeClient &&
          player.client.readyState === WebSocket.OPEN) {
        player.client.send(JSON.stringify(message));
      }
    });
  }

  startGame() {
    // Initialize game state
    const engine = new GameEngine();
    this.state = engine.initializeGame(
      this.config,
      this.players.map(p => p.name)
    );

    // Notify all players
    this.broadcast({
      type: 'GAME_START',
      state: this.state
    });
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    handleMessage(ws, message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(ws);
  });
});

function handleMessage(client, message) {
  switch (message.type) {
    case 'CREATE_ROOM':
      const roomId = generateRoomId();
      const room = new Room(roomId, message.config);
      rooms.set(roomId, room);

      const host = room.addPlayer(client, 'Host');
      client.roomId = roomId;

      client.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomId: roomId,
        playerId: host.id
      }));
      break;

    case 'JOIN_ROOM':
      const existingRoom = rooms.get(message.roomId);
      if (!existingRoom) {
        client.send(JSON.stringify({
          type: 'ERROR',
          error: 'Room not found'
        }));
        return;
      }

      if (existingRoom.isFull()) {
        client.send(JSON.stringify({
          type: 'ERROR',
          error: 'Room is full'
        }));
        return;
      }

      const player = existingRoom.addPlayer(client, 'Player ' + existingRoom.players.length);
      client.roomId = message.roomId;

      client.send(JSON.stringify({
        type: 'ROOM_JOINED',
        roomId: message.roomId,
        playerId: player.id
      }));

      existingRoom.broadcast({
        type: 'PLAYER_JOINED',
        player: { id: player.id, name: player.name }
      }, client);

      // Start game if room is full
      if (existingRoom.isFull()) {
        existingRoom.startGame();
      }
      break;

    case 'GAME_ACTION':
      const gameRoom = rooms.get(message.roomId);
      if (gameRoom) {
        // Broadcast action to all other players
        gameRoom.broadcast({
          type: 'GAME_ACTION',
          action: message.action
        }, client);
      }
      break;
  }
}

function handleDisconnect(client) {
  if (client.roomId) {
    const room = rooms.get(client.roomId);
    if (room) {
      room.broadcast({
        type: 'PLAYER_DISCONNECTED'
      }, client);
    }
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

console.log('Game server running on ws://localhost:8080');
```

---

### Phase 7: Project Structure

```
emojinal/
├── index.html                    # Main HTML file
├── css/
│   └── main.css                  # Global styles
├── js/
│   ├── main.js                   # Entry point
│   ├── game/
│   │   ├── engine.js             # GameEngine class
│   │   ├── state.js              # GameState, Player, etc.
│   │   ├── tile.js               # Tile class
│   │   ├── board.js              # GameBoard, GridSpace
│   │   ├── effects.js            # EffectEngine
│   │   ├── scoring.js            # ScoringEngine
│   │   ├── turn-manager.js       # TurnManager
│   │   └── plant-evolution.js    # PlantEvolutionSystem
│   ├── ai/
│   │   ├── ai-player.js          # AIPlayer class
│   │   ├── random-strategy.js    # Easy AI
│   │   ├── greedy-strategy.js    # Medium AI
│   │   └── minimax-strategy.js   # Hard AI
│   ├── network/
│   │   ├── network-manager.js    # WebSocket client
│   │   └── online-game.js        # Online game manager
│   ├── components/
│   │   ├── game-app.js           # Main game component
│   │   ├── game-setup.js         # Setup/config screen
│   │   ├── game-board.js         # Board component
│   │   ├── player-hand.js        # Hand component
│   │   ├── score-panel.js        # Score component
│   │   ├── game-status.js        # Status component
│   │   └── effect-selector.js    # Effect selection UI
│   └── utils/
│       ├── config.js             # Configuration
│       └── tile-data.js          # Tile definitions loader
├── server/
│   ├── server.js                 # WebSocket game server
│   ├── room.js                   # Room management
│   └── package.json              # Server dependencies
├── data/
│   ├── tiles.json                # Tile definitions
│   └── config.json               # Game configuration
├── assets/
│   └── sounds/                   # Sound effects (future)
├── tests/
│   ├── game.test.js              # Game logic tests
│   ├── ai.test.js                # AI strategy tests
│   └── components.test.js        # Component tests
├── Emojis                        # Original emoji definitions
├── GAME_ENGINE_PLAN.md           # This document
├── README.md                     # Project documentation
└── package.json                  # Client dependencies
```

---

### Phase 8: Implementation Roadmap

#### Milestone 1: Core Engine (Week 1-2)
- ✅ Implement all data structures (Tile, GridSpace, GameBoard, Player, GameState)
- ✅ Implement GameConfig with customizable options
- ✅ Implement GameEngine initialization
- ✅ Implement basic TurnManager
- ✅ Implement simple effects (claim, basic movement)
- ✅ Create tile data file from Emojis

**Deliverable**: Console-based game that can initialize and process basic turns

#### Milestone 2: Web Components & Setup UI (Week 3)
- ✅ Create game-setup component with customizable settings
- ✅ Create all game Web Components (game-app, game-board, player-hand, score-panel, game-status)
- ✅ Implement event-driven architecture
- ✅ Add CSS styling and animations
- ✅ Test component interactions
- ✅ Add board size and turn count sliders

**Deliverable**: Playable 2-player game with customizable settings in browser

#### Milestone 3: Complete Effect System (Week 4-5)
- ✅ Implement all movement effects
- ✅ Implement stack manipulation
- ✅ Implement destruction effects
- ✅ Implement plant evolution system
- ✅ Implement biohazard system
- ✅ Implement resource system (rocks, pickaxe, moai)
- ✅ Implement all special tiles

**Deliverable**: All 44 tiles fully functional

#### Milestone 4: AI Opponent (Week 6)
- ✅ Implement RandomStrategy (Easy AI)
- ✅ Implement GreedyStrategy (Medium AI)
- ✅ Implement MinimaxStrategy (Hard AI)
- ✅ Integrate AI into game flow
- ✅ Add AI difficulty selector
- ✅ Add "thinking" animation/delay for AI
- ✅ Test AI balance and difficulty levels

**Deliverable**: Fully functional AI opponent with 3 difficulty levels

#### Milestone 5: Polish & UX (Week 7)
- ✅ Add animations for tile placement and effects
- ✅ Improve visual feedback
- ✅ Add sound effects (optional)
- ✅ Implement effect selection UI
- ✅ Add game over screen with winner display
- ✅ Mobile responsiveness
- ✅ Add tutorial/help screen

**Deliverable**: Polished, enjoyable game experience

#### Milestone 6: Testing & Balance (Week 8)
- ✅ Write comprehensive unit tests for game logic
- ✅ Write tests for AI strategies
- ✅ Integration tests for full game flow
- ✅ Balance gameplay (tile distribution, scoring)
- ✅ Test with different board sizes and turn counts
- ✅ Performance optimization
- ✅ Bug fixes

**Deliverable**: Stable, balanced game

#### Milestone 7: Deployment (Week 9)
- ✅ Optimize performance and bundle size
- ✅ Add PWA support (offline play)
- ✅ Deploy client to hosting (Netlify, Vercel, GitHub Pages)
- ✅ Create comprehensive README
- ✅ Write gameplay guide

**Deliverable**: Deployed, playable game accessible online

#### Milestone 8: Multiplayer Foundation (Week 10+) - FUTURE
- ✅ Implement NetworkManager with WebSocket support
- ✅ Implement OnlineGameManager
- ✅ Create room creation/joining UI
- ✅ Add lobby system
- ✅ Implement basic Node.js game server
- ✅ Test peer-to-peer gameplay
- ✅ Add reconnection handling
- ✅ Deploy server infrastructure

**Deliverable**: Online multiplayer PvP functionality

---

## Technology Stack Summary

**Frontend**:
- **Web Components**: Native custom elements
- **JavaScript (ES6+)**: Modern JavaScript features
- **CSS Grid/Flexbox**: Responsive layouts
- **CSS Animations**: Smooth transitions and effects

**Optional Enhancements**:
- **Lit**: Lightweight web components library (if needed)
- **Vite**: Fast build tool and dev server
- **Vitest**: Testing framework
- **TypeScript**: Type safety (migrate later if desired)

**No Framework Required**: Pure vanilla JavaScript with Web Components

---

## Next Steps

1. ✅ Review this updated plan
2. ✅ Set up project structure
3. ✅ Create `index.html` and basic file structure
4. ✅ Convert Emojis file to JSON format
5. ✅ Implement core data structures
6. ✅ Start with Milestone 1

This web-based approach provides:
- ✨ Modern, beautiful UI
- 📱 Mobile-friendly
- 🚀 Easy to deploy and share
- 🎨 Rich animations and visual effects
- 🔧 Simple to develop and maintain
