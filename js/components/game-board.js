class GameBoard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
  }

  updateState(state) {
    this.state = state;
    this.render();
    this.handleAnimations();
  }

  handleAnimations() {
    if (!this.state || !this.state.animations || this.state.animations.length === 0) return;

    this.state.animations.forEach(animation => {
      if (animation.type === 'explosion') {
        this.playExplosionAnimation(animation.position, animation.radius);
      }
    });

    // Clear animations after playing
    this.state.animations = [];
  }

  playExplosionAnimation(center, radius) {
    // Add explosion effect to all cells in radius
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const distance = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
        if (distance <= radius) {
          const cell = this.shadowRoot.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
          if (cell) {
            // Add explosion class with delay based on distance
            const delay = distance * 100;
            setTimeout(() => {
              cell.classList.add('exploding');
              setTimeout(() => {
                cell.classList.remove('exploding');
              }, 600);
            }, delay);
          }
        }
      }
    }
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
          overflow: auto;
        }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(${gridSize}, 1fr);
          gap: 4px;
          background: #0f3460;
          padding: 8px;
          border-radius: 8px;
          width: min(600px, 90vw);
          height: min(600px, 90vw);
          max-width: 100%;
        }

        .grid-cell {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(0.8rem, calc(90vw / ${gridSize} / 2), 2.5rem);
          cursor: pointer;
          position: relative;
          border-radius: 4px;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          user-select: none;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .grid-cell:hover {
          background: linear-gradient(135deg, #2a2a3e 0%, #26314e 100%);
          transform: scale(1.05);
          border-color: #4a9eff;
          box-shadow: 0 0 15px rgba(74, 158, 255, 0.5);
        }

        .grid-cell:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .board-container {
            padding: 0.5rem;
          }

          .board-grid {
            width: 95vw;
            height: 95vw;
            gap: 2px;
            padding: 4px;
          }

          .grid-cell {
            border-width: 1px;
            border-radius: 2px;
          }

          .grid-cell:hover {
            transform: none;
          }
        }

        .grid-cell[data-controlled-by="0"] {
          border-color: #f44336;
          box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
        }

        .grid-cell[data-controlled-by="1"] {
          border-color: #2196f3;
          box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
        }

        .stack-indicator {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.5em;
          background: rgba(0, 0, 0, 0.8);
          padding: 1px 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-weight: bold;
          color: #4a9eff;
          line-height: 1;
          min-width: 12px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .stack-indicator {
            font-size: 0.4em;
            padding: 0px 2px;
            top: 1px;
            right: 1px;
            min-width: 10px;
          }
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

        @keyframes explode {
          0% {
            transform: scale(1);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            box-shadow: 0 0 0 rgba(255, 100, 0, 0);
          }
          30% {
            transform: scale(1.3);
            background: linear-gradient(135deg, #ff6600 0%, #ff3300 100%);
            box-shadow: 0 0 30px rgba(255, 100, 0, 0.8);
            border-color: #ff6600 !important;
          }
          60% {
            transform: scale(1.4);
            background: linear-gradient(135deg, #ffaa00 0%, #ff6600 100%);
            box-shadow: 0 0 40px rgba(255, 150, 0, 1);
          }
          100% {
            transform: scale(1);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            box-shadow: 0 0 0 rgba(255, 100, 0, 0);
          }
        }

        .grid-cell.exploding {
          animation: explode 0.6s ease-out;
          z-index: 10;
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
