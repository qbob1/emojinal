import { GamePhase } from '../game/state.js';

class GameStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  updateState(state) {
    this.render(state);
  }

  render(state) {
    if (!state) return;

    const phaseNames = {
      [GamePhase.PLACEMENT]: 'Place a Tile',
      [GamePhase.EFFECT_ACTIVATION]: 'Activate Effects',
      [GamePhase.DRAW]: 'Draw Tile',
      [GamePhase.SCORING]: 'Scoring',
      [GamePhase.GAME_OVER]: 'Game Over'
    };

    this.shadowRoot.innerHTML = `
      <style>
        .status-bar {
          grid-area: header;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .game-title {
          font-size: 1.8rem;
          font-weight: bold;
          background: linear-gradient(135deg, #4a9eff 0%, #82cfff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .status-info {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .status-label {
          font-size: 0.7rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-value {
          font-size: 1.1rem;
          color: #4a9eff;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .status-bar {
            flex-direction: column;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
          }

          .game-title {
            font-size: 1.3rem;
          }

          .status-info {
            gap: 1rem;
            width: 100%;
            justify-content: space-around;
          }

          .status-label {
            font-size: 0.65rem;
          }

          .status-value {
            font-size: 0.9rem;
          }
        }
      </style>
      <div class="status-bar">
        <div class="game-title">🎮 EMOJINAL</div>
        <div class="status-info">
          <div class="status-item">
            <div class="status-label">Current Player</div>
            <div class="status-value">${state.currentPlayer.emoji} ${state.currentPlayer.name}</div>
          </div>
          <div class="status-item">
            <div class="status-label">Phase</div>
            <div class="status-value">${phaseNames[state.phase]}</div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('game-status', GameStatus);
