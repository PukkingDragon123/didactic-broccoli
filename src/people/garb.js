// Outfit extras the box-segment body can't do on its own, requested by a spec and added with the hair shells:
//   spec.garb = { coat: { len } }   the long skirts of a delinquent's gakuran (a chōran): two panels split front and
//                                   back that ride on the thighs, from just above the jacket hem down to `len` of the
//                                   way to the knee (1 = knee). Painted like the trousers by default (same cloth for a
//                                   school uniform); src/npc/looks.js retouches seams and buttons.
import { seg } from './body.js';

export function garbSegments(spec, P) {
  const S = [], H = P.H, coat = spec.garb?.coat;
  if (coat) {
    const y1 = P.hipY + 0.03 * H, y0 = P.hipY - (P.hipY - P.kneeY) * (coat.len ?? 0.8);
    const xi = 0.0025 * H; // the opening down the middle
    const top = [(xi + P.hipsX * 1.07 + 0.004 * H) / 2, -0.003 * H, (P.hipsX * 1.07 + 0.004 * H - xi) / 2, P.hipsZ * 1.1 + 0.004 * H];
    const bot = [(xi + P.hipsX * 1.2 + 0.006 * H) / 2, -0.004 * H, (P.hipsX * 1.2 + 0.006 * H - xi) / 2, P.hipsZ * 1.32 + 0.006 * H];
    S.push(seg('coat', 'thighL', 'body', y0, y1, bot, top, { ch: 0.3, mirror: true, caps: 'bot', dens: 0.9 }));
  }
  return S;
}
