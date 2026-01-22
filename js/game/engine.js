import { GameState, Player, GamePhase } from './state.js';
import { Tile, TileType } from './tile.js';

export class GameEngine {
  static tileDefinitions = null;

  static async loadTileDefinitions() {
    if (this.tileDefinitions) return this.tileDefinitions;

    try {
      const response = await fetch('data/tiles.json');
      const data = await response.json();
      this.tileDefinitions = data.tiles;
      return this.tileDefinitions;
    } catch (error) {
      console.error('Failed to load tile definitions:', error);
      // Fallback to basic tiles
      return this.getBasicTiles();
    }
  }

  static getBasicTiles() {
    // Fallback basic tiles if JSON fails to load
    return [
      { emoji: '🚩', name: 'Flag', type: 'claim', count: 10, effects: ['claim_space'] },
      { emoji: '🌱', name: 'Seedling', type: 'plant', count: 8, effects: ['plant_evolve'] },
      { emoji: '➡️', name: 'Move Right', type: 'movement', count: 6, effects: ['move_right'] },
      { emoji: '⬅️', name: 'Move Left', type: 'movement', count: 6, effects: ['move_left'] },
      { emoji: '⬆️', name: 'Move Up', type: 'movement', count: 6, effects: ['move_up'] },
      { emoji: '⬇️', name: 'Move Down', type: 'movement', count: 6, effects: ['move_down'] },
      { emoji: '💣', name: 'Bomb', type: 'destroy', count: 4, effects: ['bomb_explode'] },
      { emoji: '🪨', name: 'Rock', type: 'resource', count: 6, effects: ['claim_space'] },
      { emoji: '💩', name: 'Poop', type: 'biohazard', count: 8, effects: ['claim_space'] },
      { emoji: '🔫', name: 'Gun', type: 'destroy', count: 5, effects: ['destroy_single'] }
    ];
  }

  static async initializeGame(config, playerNames) {
    const state = new GameState(config);

    // Create players
    playerNames.forEach((name, i) => {
      state.players.push(new Player(i, name));
    });

    // Load tile definitions and create deck
    await this.loadTileDefinitions();
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
    const deck = [];
    const definitions = this.tileDefinitions || this.getBasicTiles();

    definitions.forEach(def => {
      const count = def.count || 0;
      for (let i = 0; i < count; i++) {
        const tile = new Tile(def.emoji, null, def.type, def.effects || []);
        tile.name = def.name;
        tile.description = def.description;
        tile.rarity = def.rarity;

        // Add evolution data if present
        if (def.evolution) {
          tile.metadata.evolution = def.evolution;
        }

        deck.push(tile);
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

  static getTileInfo(emoji) {
    const definitions = this.tileDefinitions || this.getBasicTiles();
    return definitions.find(def => def.emoji === emoji);
  }
}
