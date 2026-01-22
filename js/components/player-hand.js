class PlayerHand extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
    this.selectedIndex = null;
  }

  updateState(state, selectedIndex = null) {
    this.state = state;
    this.selectedIndex = selectedIndex;
    this.render();
  }

  render() {
    if (!this.state) return;

    const currentPlayer = this.state.currentPlayer;
    const tiles = currentPlayer.hand.map((tile, i) =>
      this.renderTile(tile, i)
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .hand-container {
          grid-area: hand;
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          background: linear-gradient(to bottom, rgba(15, 52, 96, 0.8), rgba(26, 26, 46, 0.8));
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
          -webkit-overflow-scrolling: touch;
        }

        .tile-card {
          flex: 1;
          min-width: 80px;
          max-width: 120px;
          padding: 0.75rem;
          background: linear-gradient(135deg, #1e3a5f 0%, #2a475e 100%);
          border: 3px solid #3a5a7f;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .tile-card:hover {
          transform: translateY(-10px) scale(1.05);
          border-color: #5a8abf;
          box-shadow: 0 10px 30px rgba(74, 158, 255, 0.4);
        }

        .tile-card:active {
          transform: translateY(-5px) scale(1.02);
        }

        .tile-card.selected {
          border-color: #4CAF50;
          background: linear-gradient(135deg, #2a4a2a 0%, #3a5a3a 100%);
          box-shadow: 0 10px 40px rgba(76, 175, 80, 0.6);
          transform: translateY(-10px) scale(1.1);
        }

        .tile-emoji {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.5rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .tile-shortcut {
          font-size: 0.7rem;
          color: #6a7a8a;
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 8px;
          border-radius: 8px;
          display: inline-block;
        }

        @media (max-width: 768px) {
          .hand-container {
            padding: 0.75rem;
            gap: 0.5rem;
          }

          .tile-card {
            min-width: 60px;
            max-width: 80px;
            padding: 0.5rem;
            border-width: 2px;
          }

          .tile-card:hover {
            transform: none;
          }

          .tile-card.selected {
            transform: scale(1.05);
            border-width: 3px;
          }

          .tile-emoji {
            font-size: 2rem;
            margin-bottom: 0.25rem;
          }

          .tile-shortcut {
            font-size: 0.6rem;
            padding: 1px 4px;
          }
        }
      </style>
      <div class="hand-container">
        ${tiles}
      </div>
    `;

    this.attachTileListeners();
  }

  renderTile(tile, index) {
    const selected = index === this.selectedIndex ? 'selected' : '';

    return `
      <div class="tile-card ${selected}" data-index="${index}">
        <span class="tile-emoji">${tile.emoji}</span>
        <div class="tile-shortcut">[${index + 1}]</div>
      </div>
    `;
  }

  attachTileListeners() {
    this.shadowRoot.querySelectorAll('.tile-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.dispatchEvent(new CustomEvent('tile-selected', {
          detail: { index },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
}

customElements.define('player-hand', PlayerHand);
