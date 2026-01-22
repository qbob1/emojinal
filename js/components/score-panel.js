class ScorePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  updateState(state) {
    this.render(state);
  }

  render(state) {
    if (!state) return;

    const playerScores = state.players.map((player, i) =>
      this.renderPlayerScore(player, state.currentPlayerIndex === i)
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .score-panel {
          grid-area: sidebar;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        h3 {
          margin: 0 0 1rem 0;
          color: #4a9eff;
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .player-score {
          margin-bottom: 1rem;
          padding: 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .player-score.active {
          background: rgba(74, 158, 255, 0.2);
          border-color: #4a9eff;
          box-shadow: 0 0 20px rgba(74, 158, 255, 0.3);
        }

        .player-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .score-emoji {
          font-size: 2rem;
          margin-right: 0.75rem;
        }

        .player-name {
          font-size: 1.1rem;
          font-weight: bold;
          color: #fff;
        }

        .player-score-value {
          font-size: 2rem;
          font-weight: bold;
          color: #4a9eff;
          margin-left: auto;
        }

        .player-stats {
          font-size: 0.85rem;
          color: #aaa;
          margin-top: 0.5rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin: 0.25rem 0;
        }

        .turn-info {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .turn-label {
          color: #888;
        }

        .turn-value {
          color: #4a9eff;
          font-weight: bold;
        }
      </style>
      <div class="score-panel">
        <h3>🏆 Scoreboard</h3>
        ${playerScores}
        <div class="turn-info">
          <div class="stat-row">
            <span class="turn-label">Turn:</span>
            <span class="turn-value">${state.turnNumber + 1} / ${state.config.maxTurns}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayerScore(player, isActive) {
    return `
      <div class="player-score ${isActive ? 'active' : ''}">
        <div class="player-header">
          <span class="score-emoji">${player.emoji}</span>
          <span class="player-name">${player.name}</span>
          <span class="player-score-value">${player.score}</span>
        </div>
        <div class="player-stats">
          <div class="stat-row">
            <span>Spaces:</span>
            <span>${player.controlledSpaces}</span>
          </div>
          <div class="stat-row">
            <span>Tiles Played:</span>
            <span>${player.statistics.tilesPlaced}</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('score-panel', ScorePanel);
