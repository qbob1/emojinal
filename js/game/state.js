import { GameBoard } from './board.js';

// Game phases
export const GamePhase = {
  SETUP: 'setup',
  PLACEMENT: 'placement',
  EFFECT_ACTIVATION: 'effect_activation',
  DRAW: 'draw',
  SCORING: 'scoring',
  GAME_OVER: 'game_over'
};

// Player class
export class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.score = 0;
    this.controlledSpaces = 0;
    this.emoji = ['🔴', '🔵', '🟢', '🟡'][id];
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

// Game configuration
export class GameConfig {
  constructor(options = {}) {
    this.boardSize = options.boardSize || 10;
    this.maxTurns = options.maxTurns || 50;
    this.startingHandSize = options.startingHandSize || 5;
    this.maxHandSize = options.maxHandSize || 7;
    this.endGameBonus = options.endGameBonus || 10;
    this.playerCount = options.playerCount || 2;
    this.gameMode = options.gameMode || 'local';
    this.difficulty = options.difficulty || 'medium';
  }

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

// Game state
export class GameState {
  constructor(config) {
    this.board = new GameBoard(config.boardSize, config.boardSize);
    this.players = [];
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.roundNumber = 0;
    this.deck = [];
    this.config = config;
    this.phase = GamePhase.SETUP;
    this.history = [];
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }
}
