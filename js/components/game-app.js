import { GameEngine } from '../game/engine.js';
import { GameConfig, GamePhase } from '../game/state.js';
import { TurnManager } from '../game/turn-manager.js';
import { EffectEngine } from '../game/effects.js';

class GameApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
    this.selectedTileIndex = null;
    this.showSetup = true;
    this.pendingEffect = null; // {tile, position, playerId, inputType}
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    if (this.showSetup) {
      this.shadowRoot.innerHTML = '<game-setup></game-setup>';
    } else {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: grid;
            grid-template-areas:
              "header header"
              "board  sidebar"
              "hand   hand";
            grid-template-columns: 1fr 300px;
            grid-template-rows: auto 1fr auto;
            gap: 1rem;
            padding: 1rem;
            min-height: 100vh;
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          @media (max-width: 768px) {
            :host {
              grid-template-areas:
                "header"
                "board"
                "hand"
                "sidebar";
              grid-template-columns: 1fr;
              grid-template-rows: auto minmax(0, 1fr) auto auto;
              gap: 0.5rem;
              padding: 0.5rem;
            }
          }

          .effect-prompt {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
            z-index: 1000;
            min-width: 300px;
            text-align: center;
          }

          .effect-prompt h3 {
            margin: 0 0 1rem 0;
            color: #4a9eff;
            font-size: 1.5rem;
          }

          .effect-prompt p {
            margin: 0 0 1.5rem 0;
            color: #b0c4de;
          }

          .effect-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .effect-button {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #4a9eff 0%, #2196f3 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
          }

          .effect-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(74, 158, 255, 0.6);
          }

          .prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 999;
          }
        </style>
        ${this.pendingEffect ? this.renderEffectPrompt() : ''}
        <game-status id="status"></game-status>
        <game-board id="board"></game-board>
        <score-panel id="score"></score-panel>
        <player-hand id="hand"></player-hand>
      `;
    }
  }

  setupEventListeners() {
    // Listen for game start event from setup screen
    this.shadowRoot.addEventListener('game-start', (e) => {
      this.initializeGame(e.detail);
    });
  }

  async initializeGame(config) {
    const gameConfig = new GameConfig(config);
    const playerNames = config.gameMode === 'ai'
      ? ['You', 'Computer']
      : ['Player 1', 'Player 2'];

    this.state = await GameEngine.initializeGame(gameConfig, playerNames);
    this.showSetup = false;
    this.render();

    // Setup game event listeners after rendering game UI
    setTimeout(() => {
      this.setupGameListeners();
      this.updateUI();
    }, 0);
  }

  setupGameListeners() {
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
        if (this.state && index < this.state.currentPlayer.hand.length) {
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
    // If we're waiting for effect input (germ position), handle it
    if (this.pendingEffect && this.pendingEffect.inputType === 'position') {
      this.handleEffectPositionInput(x, y);
      return;
    }

    if (this.selectedTileIndex === null || this.state.phase !== GamePhase.PLACEMENT) {
      return;
    }

    try {
      const tile = this.state.currentPlayer.hand[this.selectedTileIndex];
      const position = { x, y };

      // Place tile
      this.state = TurnManager.placeTile(this.state, this.selectedTileIndex, position);
      this.selectedTileIndex = null;

      // Check if tile requires user input for its effect
      if (tile.requiresInput) {
        this.pendingEffect = {
          tile: tile,
          position: position,
          playerId: this.state.players[(this.state.currentPlayerIndex + this.state.players.length - 1) % this.state.players.length].id,
          inputType: tile.inputType
        };
        this.updateUI();
        return;
      }

      // Draw tile
      this.state = TurnManager.drawTile(this.state);

      // End turn
      this.state = TurnManager.endTurn(this.state);

      this.updateUI();

      // Check for game over
      if (this.state.phase === GamePhase.GAME_OVER) {
        setTimeout(() => this.showGameOver(), 500);
      }
    } catch (error) {
      console.error('Invalid placement:', error);
    }
  }

  handleEffectDirectionInput(isRow) {
    if (!this.pendingEffect) return;

    // Execute the effect with user's direction choice
    this.state = EffectEngine.executeEffect(
      this.state,
      this.pendingEffect.tile.effects[0],
      this.pendingEffect.position,
      this.pendingEffect.playerId,
      { isRow }
    );

    this.pendingEffect = null;

    // Continue with turn
    this.state = TurnManager.drawTile(this.state);
    this.state = TurnManager.endTurn(this.state);

    this.updateUI();

    if (this.state.phase === GamePhase.GAME_OVER) {
      setTimeout(() => this.showGameOver(), 500);
    }
  }

  handleEffectPositionInput(x, y) {
    if (!this.pendingEffect) return;

    // Execute the effect with user's position choice
    this.state = EffectEngine.executeEffect(
      this.state,
      this.pendingEffect.tile.effects[0],
      this.pendingEffect.position,
      this.pendingEffect.playerId,
      { targetPosition: { x, y } }
    );

    this.pendingEffect = null;

    // Continue with turn
    this.state = TurnManager.drawTile(this.state);
    this.state = TurnManager.endTurn(this.state);

    this.updateUI();

    if (this.state.phase === GamePhase.GAME_OVER) {
      setTimeout(() => this.showGameOver(), 500);
    }
  }

  renderEffectPrompt() {
    if (!this.pendingEffect) return '';

    if (this.pendingEffect.inputType === 'direction') {
      return `
        <div class="prompt-overlay"></div>
        <div class="effect-prompt">
          <h3>🚽 Toilet Flush</h3>
          <p>Choose which direction to flush:</p>
          <div class="effect-buttons">
            <button class="effect-button" id="flush-row">Flush Row ↔️</button>
            <button class="effect-button" id="flush-column">Flush Column ↕️</button>
          </div>
        </div>
      `;
    } else if (this.pendingEffect.inputType === 'position') {
      return `
        <div class="prompt-overlay"></div>
        <div class="effect-prompt">
          <h3>🦠 Spread Germ</h3>
          <p>Click on the board to place a germ</p>
        </div>
      `;
    }

    return '';
  }

  updateUI() {
    if (!this.state) return;

    const board = this.shadowRoot.getElementById('board');
    const hand = this.shadowRoot.getElementById('hand');
    const score = this.shadowRoot.getElementById('score');
    const status = this.shadowRoot.getElementById('status');

    if (board) board.updateState(this.state);
    if (hand) hand.updateState(this.state, this.selectedTileIndex);
    if (score) score.updateState(this.state);
    if (status) status.updateState(this.state);

    // Attach effect prompt button listeners
    if (this.pendingEffect && this.pendingEffect.inputType === 'direction') {
      const flushRowBtn = this.shadowRoot.getElementById('flush-row');
      const flushColumnBtn = this.shadowRoot.getElementById('flush-column');

      if (flushRowBtn) {
        flushRowBtn.addEventListener('click', () => this.handleEffectDirectionInput(true));
      }
      if (flushColumnBtn) {
        flushColumnBtn.addEventListener('click', () => this.handleEffectDirectionInput(false));
      }
    }
  }

  showGameOver() {
    const winner = this.state.players.reduce((prev, current) =>
      (prev.score > current.score) ? prev : current
    );

    const message = `Game Over!\n\nWinner: ${winner.emoji} ${winner.name}\nScore: ${winner.score}\n\nPlay again?`;

    if (confirm(message)) {
      this.showSetup = true;
      this.state = null;
      this.selectedTileIndex = null;
      this.render();
      this.setupEventListeners();
    }
  }
}

customElements.define('game-app', GameApp);
