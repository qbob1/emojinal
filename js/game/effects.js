// Complete effects engine for all tile types

export class EffectEngine {
  // ========== CLAIM EFFECTS ==========

  static claimSpace(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    space.controlledBy = playerId;
    return state;
  }

  static permanentClaim(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    space.controlledBy = playerId;
    space.flags.isPermanent = true;
    return state;
  }

  static negateSpace(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    space.flags.isNegated = true;
    space.controlledBy = playerId;
    return state;
  }

  static negateZombies(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    // Mark all zombies in stack as negated
    space.stack.forEach(tile => {
      if (tile.emoji === '🧟') {
        tile.metadata.isNegated = true;
      }
    });

    return state;
  }

  // ========== MOVEMENT EFFECTS ==========

  static moveStack(state, from, to) {
    const fromSpace = state.board.getSpace(from.x, from.y);
    const toSpace = state.board.getSpace(to.x, to.y);

    if (!fromSpace || !toSpace || fromSpace.stack.length === 0) return state;

    // Move entire stack
    toSpace.stack.push(...fromSpace.stack);
    fromSpace.stack = [];
    fromSpace.controlledBy = null;

    // Update control of destination
    const topTile = toSpace.getTopTile();
    if (topTile) {
      toSpace.controlledBy = topTile.owner;
    }

    return state;
  }

  static moveDirection(state, position, direction, distance = 1) {
    const to = {
      x: position.x + direction.dx * distance,
      y: position.y + direction.dy * distance
    };

    // Check if destination is valid
    if (!state.board.isValidPosition(to.x, to.y)) return state;

    return this.moveStack(state, position, to);
  }

  // ========== STACK MANIPULATION ==========

  static bottomToTop(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space || space.stack.length < 2) return state;

    const bottomTile = space.stack.shift();
    space.stack.push(bottomTile);
    space.controlledBy = bottomTile.owner;

    return state;
  }

  static topToBottom(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space || space.stack.length < 2) return state;

    const topTile = space.stack.pop();
    space.stack.unshift(topTile);

    // Update control
    const newTop = space.getTopTile();
    if (newTop) {
      space.controlledBy = newTop.owner;
    }

    return state;
  }

  static stopEffects(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    space.flags.isStopped = true;
    return state;
  }

  static shuffleStack(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space || space.stack.length < 2) return state;

    // Fisher-Yates shuffle
    const stack = space.stack;
    for (let i = stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stack[i], stack[j]] = [stack[j], stack[i]];
    }

    // Update control
    const topTile = space.getTopTile();
    if (topTile) {
      space.controlledBy = topTile.owner;
    }

    return state;
  }

  // ========== DESTRUCTION EFFECTS ==========

  static destroyStack(state, position, respectIndestructible = true) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    if (respectIndestructible) {
      // Keep indestructible tiles
      space.stack = space.stack.filter(tile => this.isIndestructible(tile));
    } else {
      space.stack = [];
    }

    // Update control
    if (space.stack.length === 0) {
      space.controlledBy = null;
    } else {
      const topTile = space.getTopTile();
      if (topTile) {
        space.controlledBy = topTile.owner;
      }
    }

    return state;
  }

  static destroyRadius(state, center, radius, playerId, claimCount = 0) {
    const destroyed = [];

    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const distance = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
        if (distance <= radius && distance > 0) { // Don't destroy center
          const space = state.board.getSpace(x, y);
          if (space) {
            state = this.destroyStack(state, { x, y });
            destroyed.push({ x, y });
          }
        }
      }
    }

    // Claim center
    state = this.claimSpace(state, center, playerId);

    // Claim additional spaces
    if (claimCount > 0 && destroyed.length > 0) {
      const toClaim = destroyed.slice(0, Math.min(claimCount, destroyed.length));
      toClaim.forEach(pos => {
        state = this.claimSpace(state, pos, playerId);
      });
    }

    return state;
  }

  static isIndestructible(tile) {
    // Moai (🗿) is always indestructible
    if (tile.emoji === '🗿') return true;

    // Cactus (🌵) is indestructible except by bombs/nukes
    // (Handled in bomb logic)

    return false;
  }

  static canDestroyWithBomb(tile) {
    // Bombs can destroy everything except Moai
    return tile.emoji !== '🗿';
  }

  // ========== PLANT EFFECTS ==========

  static evolvePlant(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    const tile = space.getTopTile();

    if (!tile || tile.type !== 'plant') return state;

    tile.metadata.turnCount++;

    // Check if ready to evolve
    const evolutionMap = {
      '🌱': { turns: 1, next: '🌿' }
    };

    const evolution = evolutionMap[tile.emoji];
    if (evolution && tile.metadata.turnCount >= evolution.turns) {
      tile.emoji = evolution.next;
      tile.metadata.turnCount = 0;
      tile.metadata.evolutionStage = evolution.next;
    }

    return state;
  }

  static plantSeedling(state, position, playerId) {
    // Find an adjacent empty or controlled space
    const directions = [
      {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}
    ];

    for (const dir of directions) {
      const x = position.x + dir.dx;
      const y = position.y + dir.dy;
      const space = state.board.getSpace(x, y);

      if (space && (space.stack.length === 0 || space.controlledBy === playerId)) {
        const seedling = { emoji: '🌱', owner: playerId, type: 'plant', effects: [], metadata: { turnCount: 0 } };
        space.addTile(seedling);
        return state;
      }
    }

    return state;
  }

  static chopPlant(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    const topTile = space.getTopTile();

    if (!topTile || topTile.type !== 'plant') return state;

    if (topTile.emoji === '🌳') {
      // Leave stump
      space.removeTile();
      const stump = { emoji: '🪵', owner: playerId, type: 'resource', effects: [], metadata: {} };
      space.addTile(stump);
    } else {
      // Reclaim space
      space.removeTile();
      state = this.claimSpace(state, position, playerId);
    }

    return state;
  }

  static spreadMushroom(state, position, playerId) {
    // Find adjacent spaces
    const directions = [
      {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}
    ];

    const dir = directions[Math.floor(Math.random() * directions.length)];
    const x = position.x + dir.dx;
    const y = position.y + dir.dy;
    const space = state.board.getSpace(x, y);

    if (space) {
      const mushroom = { emoji: '🍄', owner: playerId, type: 'plant', effects: [], metadata: {} };
      space.addTile(mushroom);
    }

    return state;
  }

  static beePollinate(state, position, playerId) {
    // Count flowers on board
    let flowerCount = 0;

    state.board.spaces.forEach(row => {
      row.forEach(space => {
        space.stack.forEach(tile => {
          if (tile.emoji === '🌸' && tile.owner === playerId) {
            flowerCount++;
          }
        });
      });
    });

    // Plant seedling for each flower
    for (let i = 0; i < flowerCount; i++) {
      state = this.plantSeedling(state, position, playerId);
    }

    return state;
  }

  static drawExtra(state, playerId) {
    const player = state.players[playerId];

    if (state.deck.length > 0 && player.hand.length < state.config.maxHandSize) {
      const tile = state.deck.pop();
      tile.owner = playerId;
      player.addToHand(tile);
    }

    return state;
  }

  // ========== RESOURCE EFFECTS ==========

  static pickaxeEffect(state, position, playerId) {
    const space = state.board.getSpace(position.x, position.y);
    const topTile = space.getTopTile();

    if (!topTile) return state;

    if (topTile.emoji === '🪨') {
      if (topTile.owner === playerId) {
        // Convert own rock to moai
        space.removeTile();
        const moai = { emoji: '🗿', owner: playerId, type: 'resource', effects: [], metadata: { isPermanent: true } };
        space.addTile(moai);
      } else {
        // Destroy opponent rock
        space.removeTile();
        state = this.claimSpace(state, position, playerId);
      }
    }

    return state;
  }

  // ========== BIOHAZARD EFFECTS ==========

  static poopToGerms(state, playerId) {
    // Convert all player's poop to germs
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        space.stack.forEach(tile => {
          if (tile.emoji === '💩' && tile.owner === playerId) {
            tile.emoji = '🦠';
          }
        });
      });
    });

    return state;
  }

  static toiletFlush(state, position, playerId, isRow) {
    const spaces = [];

    if (isRow) {
      // Destroy entire row
      for (let x = 0; x < state.board.width; x++) {
        if (x !== position.x) {
          spaces.push({ x, y: position.y });
        }
      }
    } else {
      // Destroy entire column
      for (let y = 0; y < state.board.height; y++) {
        if (y !== position.y) {
          spaces.push({ x: position.x, y });
        }
      }
    }

    // Destroy and leave poop
    spaces.forEach(pos => {
      state = this.destroyStack(state, pos);
      const space = state.board.getSpace(pos.x, pos.y);
      const poop = { emoji: '💩', owner: playerId, type: 'biohazard', effects: [], metadata: {} };
      space.addTile(poop);
    });

    return state;
  }

  static spreadPoop(state, position, playerId) {
    // Count player's poop
    let poopCount = 0;

    state.board.spaces.forEach(row => {
      row.forEach(space => {
        space.stack.forEach(tile => {
          if ((tile.emoji === '💩' || tile.emoji === '🦠') && tile.owner === playerId) {
            poopCount++;
          }
        });
      });
    });

    // Spread additional poop
    const directions = [
      {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0},
      {dx: 1, dy: 1}, {dx: -1, dy: 1}, {dx: 1, dy: -1}, {dx: -1, dy: -1}
    ];

    for (let i = 0; i < Math.min(poopCount, 4); i++) {
      const dir = directions[i % directions.length];
      const x = position.x + dir.dx;
      const y = position.y + dir.dy;
      const space = state.board.getSpace(x, y);

      if (space) {
        const poop = { emoji: '💩', owner: playerId, type: 'biohazard', effects: [], metadata: {} };
        space.addTile(poop);
      }
    }

    return state;
  }

  static spreadGerms(state, position, playerId) {
    // Count player's germs
    let germCount = 0;

    state.board.spaces.forEach(row => {
      row.forEach(space => {
        space.stack.forEach(tile => {
          if (tile.emoji === '🦠' && tile.owner === playerId) {
            germCount++;
          }
        });
      });
    });

    // Spread germs adjacently
    const directions = [
      {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}
    ];

    for (let i = 0; i < Math.min(germCount, directions.length); i++) {
      const dir = directions[i];
      const x = position.x + dir.dx;
      const y = position.y + dir.dy;
      const space = state.board.getSpace(x, y);

      if (space) {
        const germ = { emoji: '🦠', owner: playerId, type: 'biohazard', effects: [], metadata: {} };
        space.addTile(germ);
      }
    }

    return state;
  }

  static cureGerms(state, playerId) {
    // Convert all player's germs to flags
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        for (let i = space.stack.length - 1; i >= 0; i--) {
          const tile = space.stack[i];
          if (tile.emoji === '🦠' && tile.owner === playerId) {
            space.stack.splice(i, 1);
            // Add flag
            const flag = { emoji: '🚩', owner: playerId, type: 'claim', effects: [], metadata: {} };
            space.addTile(flag);
          }
        }
      });
    });

    return state;
  }

  static biohazardNuke(state, playerId) {
    // Destroy ALL stacks on board
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        state = this.destroyStack(state, space.position, false); // Destroy everything
      });
    });

    // Claim 4 random spaces
    const emptySpaces = [];
    state.board.spaces.forEach(row => {
      row.forEach(space => {
        if (space.stack.length === 0) {
          emptySpaces.push(space.position);
        }
      });
    });

    // Shuffle and claim first 4
    for (let i = emptySpaces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptySpaces[i], emptySpaces[j]] = [emptySpaces[j], emptySpaces[i]];
    }

    emptySpaces.slice(0, 4).forEach(pos => {
      const flag = { emoji: '🚩', owner: playerId, type: 'claim', effects: [], metadata: {} };
      const space = state.board.getSpace(pos.x, pos.y);
      space.addTile(flag);
    });

    return state;
  }

  // ========== SPECIAL EFFECTS ==========

  static zombieCrawl(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space) return state;

    // Find all non-negated zombies and move to top
    const zombies = [];
    for (let i = space.stack.length - 1; i >= 0; i--) {
      const tile = space.stack[i];
      if (tile.emoji === '🧟' && !tile.metadata.isNegated) {
        zombies.push(space.stack.splice(i, 1)[0]);
      }
    }

    // Add zombies back to top
    space.stack.push(...zombies);

    // Update control
    if (zombies.length > 0) {
      space.controlledBy = zombies[zombies.length - 1].owner;
    }

    return state;
  }

  static plantGrowUpward(state, position) {
    const space = state.board.getSpace(position.x, position.y);
    if (!space || space.stack.length < 2) return state;

    // Move each plant tile up one position (iterate from top to bottom to avoid double-moving)
    for (let i = space.stack.length - 2; i >= 0; i--) {
      const tile = space.stack[i];
      if (tile.type === 'plant' && !tile.metadata.isNegated) {
        // Swap with tile above
        [space.stack[i], space.stack[i + 1]] = [space.stack[i + 1], space.stack[i]];
      }
    }

    // Update control based on new top tile
    const topTile = space.getTopTile();
    if (topTile) {
      space.controlledBy = topTile.owner;
    }

    return state;
  }

  static randomTile(state, position, playerId) {
    // Place a random tile from deck
    if (state.deck.length > 0) {
      const randomIndex = Math.floor(Math.random() * state.deck.length);
      const randomTile = state.deck.splice(randomIndex, 1)[0];
      randomTile.owner = playerId;

      const space = state.board.getSpace(position.x, position.y);
      space.addTile(randomTile);
    }

    return state;
  }

  // ========== EFFECT EXECUTOR ==========

  static executeEffect(state, effectName, position, playerId, params = {}) {
    const directions = {
      move_right: { dx: 1, dy: 0 },
      move_left: { dx: -1, dy: 0 },
      move_up: { dx: 0, dy: -1 },
      move_down: { dx: 0, dy: 1 },
      move_diagonal_ul: { dx: -1, dy: -1 },
      move_diagonal_ur: { dx: 1, dy: -1 },
      move_diagonal_dl: { dx: -1, dy: 1 },
      move_diagonal_dr: { dx: 1, dy: 1 }
    };

    switch (effectName) {
      case 'claim_space':
        return this.claimSpace(state, position, playerId);

      case 'permanent_claim':
        return this.permanentClaim(state, position, playerId);

      case 'negate_space':
        return this.negateSpace(state, position, playerId);

      case 'negate_zombies':
        return this.negateZombies(state, position);

      case 'move_right':
      case 'move_left':
      case 'move_up':
      case 'move_down':
      case 'move_diagonal_ul':
      case 'move_diagonal_ur':
      case 'move_diagonal_dl':
      case 'move_diagonal_dr':
        return this.moveDirection(state, position, directions[effectName], params.distance || 1);

      case 'bottom_to_top':
        return this.bottomToTop(state, position);

      case 'top_to_bottom':
        return this.topToBottom(state, position);

      case 'stop_effects':
        return this.stopEffects(state, position);

      case 'shuffle_stack':
        return this.shuffleStack(state, position);

      case 'bomb_explode':
        return this.destroyRadius(state, position, 1, playerId, 0);

      case 'destroy_single':
        return this.destroyStack(state, position);

      case 'dynamite_explode':
        return this.destroyRadius(state, position, 3, playerId, 4);

      case 'plant_evolve':
        return this.evolvePlant(state, position);

      case 'plant_seedling':
        return this.plantSeedling(state, position, playerId);

      case 'chop_plant':
        return this.chopPlant(state, position, playerId);

      case 'spread_mushroom':
        return this.spreadMushroom(state, position, playerId);

      case 'bee_pollinate':
        return this.beePollinate(state, position, playerId);

      case 'draw_extra':
        return this.drawExtra(state, playerId);

      case 'pickaxe_effect':
        return this.pickaxeEffect(state, position, playerId);

      case 'poop_to_germs':
        return this.poopToGerms(state, playerId);

      case 'toilet_flush':
        return this.toiletFlush(state, position, playerId, params.isRow);

      case 'spread_poop':
        return this.spreadPoop(state, position, playerId);

      case 'spread_germs':
        return this.spreadGerms(state, position, playerId);

      case 'cure_germs':
        return this.cureGerms(state, playerId);

      case 'biohazard_nuke':
        return this.biohazardNuke(state, playerId);

      case 'zombie_crawl':
        return this.zombieCrawl(state, position);

      case 'random_tile':
        return this.randomTile(state, position, playerId);

      default:
        console.warn(`Unknown effect: ${effectName}`);
        return state;
    }
  }
}
