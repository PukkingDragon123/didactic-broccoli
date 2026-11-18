// Pose Beasts figures carry `kana: { kind, t, dur }` in their series data: pressing one floats the pixel-art
// ゴゴゴ / ドドド sprites (game.jojo.kana) round the figure, timed to its clip.
import { onFigurePress } from '../game/figureGimmicks.js';

export function install(game) {
  onFigurePress((mesh, item) => {
    const k = item?.kana;
    const kana = game.jojo?.kana;
    if (!k || !kana || !mesh) return;
    setTimeout(() => {
      if (!mesh.parent) return;
      kana.spawn({ kind: k.kind || 'go', at: mesh, n: 3, dur: k.dur || 2.4, side: 1, size: 0.5 });
    }, Math.max(0, (k.t || 0) * 1000));
  });
}
