class GameSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {
      boardSize: 10,
      maxTurns: 50,
      gameMode: 'local',
      difficulty: 'medium',
      playerNames: ['Player 1', 'Player 2']
    };
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .setup-container {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          color: #fff;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        h2 {
          margin: 0 0 2rem 0;
          text-align: center;
          font-size: 2rem;
          background: linear-gradient(135deg, #4a9eff 0%, #82cfff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #b0c4de;
          font-weight: 600;
        }

        input[type="range"] {
          width: 100%;
          height: 6px;
          background: #2a2a3e;
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #4a9eff;
          border-radius: 50%;
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #4a9eff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .range-value {
          display: inline-block;
          margin-left: 1rem;
          color: #4a9eff;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .mode-button {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid #3a5a7f;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s;
          color: #fff;
        }

        .mode-button:hover {
          background: rgba(74, 158, 255, 0.2);
          border-color: #4a9eff;
        }

        .mode-button.selected {
          background: rgba(74, 158, 255, 0.3);
          border-color: #4a9eff;
          box-shadow: 0 0 20px rgba(74, 158, 255, 0.4);
        }

        .start-button {
          width: 100%;
          padding: 1.5rem;
          margin-top: 2rem;
          background: linear-gradient(135deg, #4a9eff 0%, #2196f3 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(74, 158, 255, 0.4);
        }

        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(74, 158, 255, 0.6);
        }

        .start-button:active {
          transform: translateY(0);
        }
      </style>
      <div class="setup-container">
        <h2>🎮 Game Setup</h2>

        <div class="form-group">
          <label>
            Board Size: <span class="range-value" id="boardSizeValue">10x10</span>
          </label>
          <input type="range" id="boardSize" min="6" max="15" value="10" />
        </div>

        <div class="form-group">
          <label>
            Max Turns: <span class="range-value" id="maxTurnsValue">50</span>
          </label>
          <input type="range" id="maxTurns" min="10" max="100" step="5" value="50" />
        </div>

        <div class="form-group">
          <label>Game Mode</label>
          <div class="mode-selector">
            <div class="mode-button selected" data-mode="local">
              👥<br>Local<br>Multiplayer
            </div>
            <div class="mode-button" data-mode="ai">
              🤖<br>vs<br>Computer
            </div>
          </div>
        </div>

        <button class="start-button">Start Game</button>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Board size slider
    const boardSizeSlider = this.shadowRoot.getElementById('boardSize');
    const boardSizeValue = this.shadowRoot.getElementById('boardSizeValue');
    boardSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      boardSizeValue.textContent = `${size}x${size}`;
      this.config.boardSize = parseInt(size);
    });

    // Max turns slider
    const maxTurnsSlider = this.shadowRoot.getElementById('maxTurns');
    const maxTurnsValue = this.shadowRoot.getElementById('maxTurnsValue');
    maxTurnsSlider.addEventListener('input', (e) => {
      const turns = e.target.value;
      maxTurnsValue.textContent = turns;
      this.config.maxTurns = parseInt(turns);
    });

    // Game mode buttons
    this.shadowRoot.querySelectorAll('.mode-button').forEach(button => {
      button.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.mode-button').forEach(b =>
          b.classList.remove('selected')
        );
        button.classList.add('selected');
        this.config.gameMode = button.dataset.mode;
      });
    });

    // Start button
    this.shadowRoot.querySelector('.start-button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('game-start', {
        detail: this.config,
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define('game-setup', GameSetup);
