# Gacha Garage desktop (Electron, Windows x64)

    cd desktop && npm install && cd ..
    node desktop/pack.mjs        # -> desktop/out/GachaGarage-win-x64.zip (works on Linux, no Wine)

`npm start` inside desktop/ runs the shell locally (after a pack or with desktop/game present).
The game is served from app://game/ (main.cjs). F11 fullscreen, F12 devtools.
