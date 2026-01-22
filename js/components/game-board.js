class GameBoard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
  }

  updateState(state) {
    this.state = state;
    this.render();
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
        }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(${gridSize}, 1fr);
          gap: 4px;
          background: #0f3460;
          padding: 8px;
          border-radius: 8px;
          max-width: min(600px, 90vw);
          max-height: min(600px, 60vh);
        }

        .grid-cell {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1rem, 3vw, 2.5rem);
          cursor: pointer;
          position: relative;
          border-radius: 4px;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          user-select: none;
        }

        .grid-cell:hover {
          background: linear-gradient(135deg, #2a2a3e 0%, #26314e 100%);
          transform: scale(1.05);
          border-color: #4a9eff;
          box-shadow: 0 0 15px rgba(74, 158, 255, 0.5);
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
