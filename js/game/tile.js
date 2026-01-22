// Tile types
export const TileType = {
  CLAIM: 'claim',
  MOVEMENT: 'movement',
  STACK_MANIP: 'stack',
  PLANT: 'plant',
  RESOURCE: 'resource',
  DESTRUCTION: 'destroy',
  BIOHAZARD: 'biohazard',
  SPECIAL: 'special'
};

// Tile class
export class Tile {
  constructor(emoji, owner, type, effects = []) {
    this.emoji = emoji;
    this.owner = owner;
    this.type = type;
    this.effects = effects;
    this.metadata = {
      turnCount: 0,
      evolutionStage: null,
      isPermanent: false,
      isNegated: false
    };
  }

  clone() {
    const cloned = new Tile(this.emoji, this.owner, this.type, [...this.effects]);
    cloned.metadata = { ...this.metadata };
    return cloned;
  }
}
