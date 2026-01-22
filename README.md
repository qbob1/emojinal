# 🎮 Emojinal

A strategic grid-based tile placement game where players use emoji tiles with unique abilities to control territory and maximize their score.

## 🚀 Play Now

Play the game at: https://qbob1.github.io/emojinal/

## 🎯 Game Overview

Emojinal is a turn-based strategy game where:
- Players place emoji tiles on an NxN grid
- Each tile has unique effects and abilities
- Control spaces to earn points
- The player with the most points after X turns wins!

## ✨ Features

### Current (MVP)
- ⚙️ Customizable board size (6x6 to 15x15)
- 🔢 Configurable game length (10 to 100 turns)
- 👥 Local multiplayer (hot-seat)
- 🎨 Beautiful gradient UI with animations
- 📱 Mobile-responsive design
- 🎯 10 different tile types to start

### Coming Soon
- 🤖 AI opponent with 3 difficulty levels
- 🌐 Online multiplayer via WebSockets
- 🎮 44+ unique emoji tiles with special abilities
- 🌱 Plant evolution system
- 💣 Destruction and movement mechanics
- 🏆 Statistics and achievements

## 🎮 How to Play

1. Choose your game settings (board size, turn count)
2. Select a tile from your hand (click or press 1-7)
3. Click a grid space to place your tile
4. Tiles you place control that space
5. Draw a new tile at the end of your turn
6. Player with the most controlled spaces wins!

## 🛠️ Technology

- **Frontend**: Vanilla JavaScript with Web Components
- **Styling**: Pure CSS with gradients and animations
- **Architecture**: Modular ES6+ classes
- **Deployment**: GitHub Pages

## 📁 Project Structure

```
emojinal/
├── index.html          # Main entry point
├── css/
│   └── main.css        # Global styles
├── js/
│   ├── game/           # Core game logic
│   │   ├── tile.js
│   │   ├── board.js
│   │   ├── state.js
│   │   ├── engine.js
│   │   └── turn-manager.js
│   └── components/     # Web components
│       ├── game-app.js
│       ├── game-setup.js
│       ├── game-board.js
│       ├── player-hand.js
│       ├── score-panel.js
│       └── game-status.js
└── Emojis             # Tile definitions
```

## 🚧 Development

### Local Development

Simply open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge).

No build step required!

### Adding New Features

The codebase is organized into:
- **Game Logic** (`js/game/`): Core game mechanics
- **UI Components** (`js/components/`): Web Components for the interface
- **Styling** (`css/`): Global styles and animations

## 📝 Roadmap

See [GAME_ENGINE_PLAN.md](GAME_ENGINE_PLAN.md) for the complete development plan.

**Phase 1**: ✅ Core engine and basic tiles
**Phase 2**: ⏳ AI opponent
**Phase 3**: ⏳ Complete effect system
**Phase 4**: ⏳ Polish and UX improvements
**Phase 5**: ⏳ Online multiplayer

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📄 License

MIT License - feel free to use this code for learning purposes.

## 🎉 Credits

Created as a fun project to explore emoji-based game mechanics!
