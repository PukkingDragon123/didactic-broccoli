// Small reusable props for the toy figures (plates, bowls, sticks, lanterns, bases, signs...). Sizes in mm.
import { D } from './paint.js';

export const WOOD = 0xc8965a, LIGHTWOOD = 0xe0bc84, DARKWOOD = 0x7a5230, INK = 0x2a1c1c, WHITE = 0xfaf8f2;

/** A display base: a round (octagonal) or square plinth. */
export function base(k, w, d, paint = { c: 0x4a4a52 }, o = {}) {
  if (o.round) k.cyl([o.x || 0, (o.h ?? 3) / 2, o.z || 0], w / 2, o.h ?? 3, paint, { rz: d / 2 });
  else k.box([o.x || 0, (o.h ?? 3) / 2, o.z || 0], [w, o.h ?? 3, d], paint, { ch: 0.2 });
}
export function plate(k, pos, r, paint = { c: WHITE, t: 'ceramic' }, o = {}) {
  k.cyl([pos[0], pos[1] + 0.6, pos[2]], r * 0.7, 1.2, paint, { rz: (o.rz ?? r) * 0.7 });
  k.cyl([pos[0], pos[1] + 1.6, pos[2]], r, 1, paint, { rz: o.rz ?? r });
}
/** Bowl: walls as a tapered octagon, a filling disc inside at `fill` (0..1). */
export function bowl(k, pos, r, h, paint, fill = null, o = {}) {
  k.cyl([pos[0], pos[1] + 0.8, pos[2]], r * 0.5, 1.6, paint);
  k.prism([[0, r * 0.62, r * 0.62, 0, 0, 0.586], [h * 0.55, r * 0.92, r * 0.92, 0, 0, 0.586], [h, r, r, 0, 0, 0.586]], paint, { pos: [pos[0], pos[1] + 1.4, pos[2]], caps: 'bot' });
  // inner rim (a slightly smaller open shell, inverted look: a dark ring painted on the filling)
  if (fill) k.cyl([pos[0], pos[1] + 1.4 + h * (o.level ?? 0.82), pos[2]], r * 0.94, 0.8, fill);
}
export function cup(k, pos, r, h, paint, fill = null) {
  k.cyl([pos[0], pos[1] + h / 2, pos[2]], r, h, paint, { top: 1.08, caps: fill ? 'bot' : 'both' });
  if (fill) k.cyl([pos[0], pos[1] + h - 1.2, pos[2]], r * 1.02, 0.8, fill);
}
export function stick(k, a, b, w = 1, paint = { c: LIGHTWOOD, t: 'wood' }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  const rx = Math.atan2(dz, dy), rz = -Math.atan2(dx, Math.hypot(dy, dz));
  k.at([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [rx, 0, rz], () => k.box([0, 0, 0], [w, L, w], paint, { ch: 0.3 }), undefined);
}
/** A paper lantern (chōchin): ribbed soft block, black caps, a word on the front. */
export function lantern(k, pos, r, h, col = 0xe8402a, word = null, o = {}) {
  k.soft(pos, [r, h / 2, r], { c: col, t: 'paper', d: [D.stripes('y', 2.2, 0.5, o.rib ?? 0x00000000 | 0x9a2a1a), word ? D.txt(word, 0, 0, h * 0.42, o.ink ?? INK, { vert: [...word].length > 1 && o.vert !== false, dir: 'f' }) : null] }, { ch: 0.586, bev: 0.25 });
  k.cyl([pos[0], pos[1] + h / 2 + 0.8, pos[2]], r * 0.6, 1.6, { c: 0x1a1a1e });
  k.cyl([pos[0], pos[1] - h / 2 - 0.8, pos[2]], r * 0.6, 1.6, { c: 0x1a1a1e });
}
/** A noren curtain: n panels hanging from a pole, a word across them. */
export function noren(k, pos, w, h, col, word, o = {}) {
  const n = o.n ?? 3, pw = w / n;
  k.cyl([pos[0], pos[1] + 0.8, pos[2]], 0.7, w + 3, { c: DARKWOOD, t: 'wood' }, { rot: [0, 0, Math.PI / 2] });
  for (let i = 0; i < n; i++) {
    const x = pos[0] - w / 2 + pw * (i + 0.5), ch = [...(word || '')][i];
    k.box([x, pos[1] - h / 2, pos[2]], [pw - 0.6, h, 0.8], { c: col, t: 'cloth', d: [ch ? D.txt(ch, 0, h * 0.1, Math.min(pw, h) * 0.55, o.ink ?? WHITE) : null, ch ? D.txt(ch, 0, h * 0.1, Math.min(pw, h) * 0.55, o.ink ?? WHITE, { dir: 'b' }) : null] }, { ch: 0.1 });
  }
}
/** Chopsticks lying / held between two points. */
export function chopsticks(k, a, b, paint = { c: 0x8a3a2a, t: 'lacquer' }) {
  stick(k, a, b, 0.9, paint);
  stick(k, [a[0] + 1.4, a[1], a[2] + 0.4], [b[0] + 1.1, b[1] + 0.3, b[2] + 0.4], 0.9, paint);
}
/** Kawaii face decal defaults for food / objects. */
export function cute(o = {}) { return D.face({ eye: 'dot', er: 1.1, eh: 1.35, gap: 3.6, mouth: 'cat', mw: 2.2, blush: true, br: 1.2, ...o }); }
/** A simple sign board with text (front and back). */
export function sign(k, pos, w, h, col, word, ink = INK, o = {}) {
  k.box(pos, [w, h, o.d ?? 1.4], { c: col, t: o.t ?? 'wood', d: [D.txt(word, 0, 0, h * (o.ts ?? 0.6), ink, { vert: o.vert }), o.back !== false ? D.txt(word, 0, 0, h * (o.ts ?? 0.6), ink, { dir: 'b', vert: o.vert }) : null] }, { ch: 0.2, rot: o.rot });
}
