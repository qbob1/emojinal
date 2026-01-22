import { GameState, Player, GamePhase } from './state.js';
import { Tile, TileType } from './tile.js';

export class GameEngine {
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
          const tile = state.deck.pop();
          tile.owner = player.id;
          player.addToHand(tile);
        }
      }
    });

    // Select first player randomly
    state.currentPlayerIndex = Math.floor(Math.random() * state.players.length);
    state.phase = GamePhase.PLACEMENT;

    return state;
  }

  static createDeck() {
    // For now, create a simple deck with basic tiles
    // This will be replaced with data from tiles.json
    const deck = [];

    // Create tiles with different emojis
    const basicTiles = [
      { emoji: '🚩', type: TileType.CLAIM, count: 10 },
      { emoji: '🌱', type: TileType.PLANT, count: 8 },
      { emoji: '➡️', type: TileType.MOVEMENT, count: 6 },
      { emoji: '⬅️', type: TileType.MOVEMENT, count: 6 },
      { emoji: '⬆️', type: TileType.MOVEMENT, count: 6 },
      { emoji: '⬇️', type: TileType.MOVEMENT, count: 6 },
      { emoji: '💣', type: TileType.DESTRUCTION, count: 4 },
      { emoji: '🪨', type: TileType.RESOURCE, count: 6 },
      { emoji: '💩', type: TileType.BIOHAZARD, count: 8 },
      { emoji: '🔫', type: TileType.DESTRUCTION, count: 5 }
    ];

    basicTiles.forEach(({ emoji, type, count }) => {
      for (let i = 0; i < count; i++) {
        deck.push(new Tile(emoji, null, type));
      }
    });

    return deck;
  }

  static shuffleDeck(deck) {
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
}
