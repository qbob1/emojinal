// Grid space class
export class GridSpace {
  constructor(x, y) {
    this.position = { x, y };
    this.stack = [];
    this.controlledBy = null;
    this.flags = {
      isNegated: false,
      isPermanent: false,
      isStopped: false,
      isDestroyed: false
    };
  }

  getTopTile() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  addTile(tile) {
    this.stack.push(tile);
    // Update control when tile is placed
    if (tile && tile.owner !== undefined && tile.owner !== null) {
      this.controlledBy = tile.owner;
    }
  }

  removeTile() {
    const tile = this.stack.pop();
    // Update control when tile is removed
    if (this.stack.length === 0) {
      this.controlledBy = null;
    } else {
      const topTile = this.getTopTile();
      if (topTile && topTile.owner !== undefined) {
        this.controlledBy = topTile.owner;
      }
    }
    return tile;
  }
}

// Game board class
export class GameBoard {
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

  isValidPosition(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}
