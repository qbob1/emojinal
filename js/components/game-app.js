import { GameEngine } from '../game/engine.js';
import { GameConfig, GamePhase } from '../game/state.js';
import { TurnManager } from '../game/turn-manager.js';

class GameApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
    this.selectedTileIndex = null;
    this.showSetup = true;
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
              grid-template-rows: auto 1fr auto auto;
            }
          }
        </style>
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
    if (this.selectedTileIndex === null || this.state.phase !== GamePhase.PLACEMENT) {
      return;
    }

    try {
      // Place tile
      this.state = TurnManager.placeTile(this.state, this.selectedTileIndex, { x, y });
      this.selectedTileIndex = null;

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
