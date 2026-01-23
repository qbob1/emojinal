import { GamePhase } from './state.js';
import { EffectEngine } from './effects.js';

export class TurnManager {
  static startTurn(state) {
    state.phase = GamePhase.PLACEMENT;
    return state;
  }

  static placeTile(state, tileIndex, position) {
    const player = state.currentPlayer;
    const tile = player.hand[tileIndex];

    if (!tile) {
      throw new Error('Invalid tile index');
    }

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

    // Auto-execute tile effects (unless tile requires user input)
    if (!tile.requiresInput) {
      state = this.executeTileEffects(state, tile, position, player.id);
    }

    // Move to draw phase (or stay in placement if awaiting input)
    if (!tile.requiresInput) {
      state.phase = GamePhase.DRAW;
    }

    return state;
  }

  static executeTileEffects(state, tile, position, playerId) {
    if (!tile.effects || tile.effects.length === 0) {
      // Default to claim space if no effects
      state = EffectEngine.claimSpace(state, position, playerId);
      return state;
    }

    // Execute all effects
    tile.effects.forEach(effectName => {
      state = EffectEngine.executeEffect(state, effectName, position, playerId);
    });

    return state;
  }

  static drawTile(state) {
    const player = state.currentPlayer;

    if (state.deck.length > 0 && player.hand.length < state.config.maxHandSize) {
      const tile = state.deck.pop();
      tile.owner = player.id;
      player.addToHand(tile);
    }

    state.phase = GamePhase.SCORING;
    return state;
  }

  static endTurn(state) {
    // Update scores
    this.updateScores(state);

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
      this.calculateFinalScores(state);
    } else {
      state.phase = GamePhase.PLACEMENT;
    }

    return state;
  }

  static processEndOfRound(state) {
    // Process zombies - they crawl to top of stacks
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        if (space.stack.length > 0) {
          const hasZombie = space.stack.some(tile => tile.emoji === '🧟');
          if (hasZombie) {
            state = EffectEngine.zombieCrawl(state, space.position);
          }
        }
      });
    });

    // Grow plants upward - they move up one position in the stack
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        if (space.stack.length > 1) {
          const hasPlant = space.stack.some(tile => tile.type === 'plant');
          if (hasPlant) {
            state = EffectEngine.plantGrowUpward(state, space.position);
          }
        }
      });
    });

    // Evolve plants that are on top of stacks
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        const topTile = space.getTopTile();
        if (topTile && topTile.type === 'plant') {
          state = EffectEngine.evolvePlant(state, space.position);
        }
      });
    });

    // Spread mushrooms
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        const topTile = space.getTopTile();
        if (topTile && topTile.emoji === '🍄') {
          state = EffectEngine.spreadMushroom(state, space.position, topTile.owner);
        }
      });
    });

    return state;
  }

  static updateScores(state) {
    state.players.forEach(player => {
      let score = 0;
      let controlledSpaces = 0;

      state.board.spaces.forEach(row => {
        row.forEach(space => {
          if (space.controlledBy === player.id && !space.flags.isNegated) {
            score += 1;
            controlledSpaces++;

            // Bonus for permanent control
            if (space.flags.isPermanent) {
              score += 1;
            }
          }
        });
      });

      player.score = score;
      player.controlledSpaces = controlledSpaces;
      player.statistics.spacesControlled = controlledSpaces;
    });
  }

  static calculateFinalScores(state) {
    // Add end game bonus for most controlled spaces
    const maxSpaces = Math.max(...state.players.map(p => p.controlledSpaces));
    const winners = state.players.filter(p => p.controlledSpaces === maxSpaces);

    const bonusPerWinner = state.config.endGameBonus / winners.length;
    winners.forEach(player => {
      player.score += bonusPerWinner;
    });
  }

  static validatePlacement(state, tile, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) {
      return { valid: false, error: 'Invalid position' };
    }

    // For now, allow placement anywhere
    return { valid: true };
  }
}
