// Input arbitration between the inventory and the money / building systems. The inventory (src/game/Held.js) reads the
// number keys and the mouse wheel to switch slots; while the ATM wants digits for a PIN, or the builder wants the wheel
// to rotate a ghost, those inputs are hidden from it for that frame (and stay readable for everyone after it).
//   const gate = installInputGate(game);   gate.digits = true / false; gate.wheel = true / false; gate.keys.add('KeyQ')
export function installInputGate(game) {
  if (game.inputGate) return game.inputGate;
  const gate = { digits: false, wheel: false, keys: new Set() };
  const H = game.held, inp = game.input;
  const update = H.update.bind(H);
  H.update = (dt) => {
    const stash = [];
    if (gate.digits) for (let i = 0; i <= 9; i++) { const c = 'Digit' + i; if (inp.pressed.has(c)) { inp.pressed.delete(c); stash.push(c); } }
    for (const k of gate.keys) if (inp.pressed.has(k)) { inp.pressed.delete(k); stash.push(k); }
    const wheel = inp.mouse.wheel;
    if (gate.wheel) inp.mouse.wheel = 0;
    try { update(dt); } finally {
      for (const c of stash) inp.pressed.add(c);
      inp.mouse.wheel = wheel;
    }
  };
  game.inputGate = gate;
  return gate;
}
