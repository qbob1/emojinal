# Emojinal - Game Engine Development Plan (Web Version)

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
  constructor() {
    this.boardSize = 10;         // NxN grid
    this.maxTurns = 50;          // Game ends after X turns
    this.startingHandSize = 5;   // Default: 5
    this.maxHandSize = 7;        // Maximum tiles in hand
    this.endGameBonus = 10;      // Bonus for most controlled spaces
    this.playerCount = 2;        // 2-4 players
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

---

### Phase 5: Project Structure

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
│   │   └── ai.js                 # AI player (future)
│   ├── components/
│   │   ├── game-app.js           # Main game component
│   │   ├── game-board.js         # Board component
│   │   ├── player-hand.js        # Hand component
│   │   ├── score-panel.js        # Score component
│   │   ├── game-status.js        # Status component
│   │   └── effect-selector.js    # Effect selection UI
│   └── utils/
│       ├── config.js             # Configuration
│       └── tile-data.js          # Tile definitions loader
├── data/
│   ├── tiles.json                # Tile definitions
│   └── config.json               # Game configuration
├── assets/
│   └── sounds/                   # Sound effects (future)
├── tests/
│   ├── game.test.js              # Game logic tests
│   └── components.test.js        # Component tests
├── Emojis                        # Original emoji definitions
├── GAME_ENGINE_PLAN_WEB.md       # This document
└── package.json                  # NPM dependencies (if any)
```

---

### Phase 6: Implementation Roadmap

#### Milestone 1: Core Engine (Week 1-2)
- ✅ Implement all data structures (Tile, GridSpace, GameBoard, Player, GameState)
- ✅ Implement GameEngine initialization
- ✅ Implement basic TurnManager
- ✅ Implement simple effects (claim, basic movement)
- ✅ Create tile data file from Emojis

**Deliverable**: Console-based game that can initialize and process basic turns

#### Milestone 2: Web Components (Week 3)
- ✅ Create all Web Components (game-app, game-board, player-hand, score-panel, game-status)
- ✅ Implement event-driven architecture
- ✅ Add CSS styling and animations
- ✅ Test component interactions

**Deliverable**: Playable 2-player game with basic tiles in browser

#### Milestone 3: Complete Effect System (Week 4-5)
- ✅ Implement all movement effects
- ✅ Implement stack manipulation
- ✅ Implement destruction effects
- ✅ Implement plant evolution
- ✅ Implement biohazard system

**Deliverable**: All 44 tiles fully functional

#### Milestone 4: Polish & UX (Week 6)
- ✅ Add animations for tile placement and effects
- ✅ Improve visual feedback
- ✅ Add sound effects (optional)
- ✅ Implement effect selection UI
- ✅ Add game over screen
- ✅ Mobile responsiveness

**Deliverable**: Polished, enjoyable game experience

#### Milestone 5: AI & Testing (Week 7)
- ✅ Implement basic AI opponent
- ✅ Write comprehensive tests
- ✅ Balance gameplay
- ✅ Bug fixes

**Deliverable**: Complete game with AI

#### Milestone 6: Deployment (Week 8)
- ✅ Optimize performance
- ✅ Add PWA support (optional)
- ✅ Deploy to hosting (Netlify, Vercel, GitHub Pages)
- ✅ Documentation

**Deliverable**: Deployed, playable game

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
