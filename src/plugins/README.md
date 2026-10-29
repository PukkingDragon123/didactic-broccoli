# Plugins

Drop-in features. Every `*.js` file here that exports `install(game)` is picked up automatically by
`src/main.js` and run once the whole game is built (world, people, cutscenes, systems). Keep per-frame work
in `Game.updaters.push((game, dt) => ...)` and talk to other systems through `game.events`.
