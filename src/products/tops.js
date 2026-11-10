// What you see when you tip a drink towards you: the can's lid with its stay-on tab and the "あけくち" arrow, a PET cap
// with the maker's initial, a crown-gold tonic cap, the pull-off lid of a cup of sake, and the can's base with the
// ink-jet date the back label points to ("賞味期限 缶底に記載"). Square Px, the round thing touching all four sides,
// drawn as seen from above with the front of the label towards the bottom of the picture.
import { Px, dk, lt, on } from './px.js';
import { m5, m3, mk, bold, label } from './type.js';
import { BRANDS, DRINKS } from './brands.js';
import { CONT, topSize } from './spec.js';

const SIL = 0xc9ced4, SIL_D = 0x9aa0a8, SIL_L = 0xe6eaee, INK = 0x2e1f28;

function canLid(D, o = {}) {
  const p = new Px(D, D), c = D / 2, R = D / 2;
  const metal = o.gold ? 0xd8b860 : SIL, md = dk(metal, 0.25), ml = lt(metal, 0.45);
  p.fill(md);
  p.ell(c, c, R, R, ml);                 // the rolled seam
  p.ell(c, c, R - 3, R - 3, md);         // its inner wall
  p.ell(c, c, R - 6, R - 6, metal);      // the panel
  p.ring(c, c, R - 6, R - 6, 1, dk(metal, 0.4));
  p.ring(c, c, R - 11, R - 11, 1, ml);   // a stiffening bead
  // the mouth: a scored tear-drop below the rivet, towards the front
  const my = c + R * 0.34;
  p.ell(c, my, R * 0.26, R * 0.3, dk(metal, 0.12)); p.ring(c, my, R * 0.26, R * 0.3, 1, md);
  // the stay-on tab: a ring to pull, a rivet
  const tw = Math.round(R * 0.36), th = Math.round(R * 0.74), tx = Math.round(c - tw / 2), ty = Math.round(c - th * 0.74);
  p.rrect(tx - 1, ty - 1, tw + 2, th + 2, 5, dk(metal, 0.5));
  p.rrect(tx, ty, tw, th, 4, o.tab ?? lt(metal, 0.2));
  p.rrect(tx + 3, ty + 3, tw - 6, Math.round(th * 0.4), 3, dk(metal, 0.5)); p.rrect(tx + 4, ty + 4, tw - 8, Math.round(th * 0.4) - 2, 2, metal);
  p.rect(tx + 1, ty + 1, 1, th - 3, SIL_L);
  p.ell(c, c + 1, 3.5, 3.5, dk(metal, 0.5)); p.ell(c, c + 1, 2.5, 2.5, ml);
  // embossed lettering round the panel
  if (D >= 120) {
    label(p, mk('あけくち', 12), c, D - 21, { c: dk(metal, 0.45), align: 'c' });
    for (const s of [-1, 1]) { const ax = c + s * (R - 22); p.poly([[ax - 4, c - 4], [ax + 4, c - 4], [ax, c + 6]], dk(metal, 0.4)); p.rect(ax - 1, c - 12, 3, 8, dk(metal, 0.4)); }
    label(p, m3(o.text || 'PULL UP'), c, 14, { c: dk(metal, 0.45), align: 'c' });
  } else {
    label(p, m3('OPEN'), c, D - 15, { c: dk(metal, 0.45), align: 'c' });
    label(p, m3(o.text || 'PULL'), c, 10, { c: dk(metal, 0.45), align: 'c' });
  }
  if (o.dot) { p.ell(c + R * 0.5, c - R * 0.42, 5, 5, o.dot); p.ring(c + R * 0.5, c - R * 0.42, 5, 5, 1, dk(o.dot, 0.4)); }
  return p;
}
function petCap(D, b) {
  const p = new Px(D, D), c = D / 2, R = D / 2, col = b.cap ?? b.main;
  p.fill(dk(col, 0.3));
  p.ell(c, c, R, R, dk(col, 0.25));
  for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; p.rect(Math.round(c + Math.cos(a) * (R - 1.5) - 1), Math.round(c + Math.sin(a) * (R - 1.5) - 1), 2, 2, lt(col, 0.25)); }
  p.ell(c, c, R - 4, R - 4, col); p.ring(c, c, R - 8, R - 8, 1, lt(col, 0.4));
  label(p, bold(mk([...b.jp][0], 16)), c, c - 9, { c: on(col), align: 'c' });
  label(p, m3('99.10.21'), c, D - 14, { c: on(col), align: 'c' });
  return p;
}
function crownCap(D, b) {
  const p = new Px(D, D), c = D / 2, R = D / 2, G = 0xe2bc50;
  p.fill(dk(G, 0.4));
  p.ell(c, c, R, R, dk(G, 0.3));
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; p.rect(Math.round(c + Math.cos(a) * (R - 1.5) - 1), Math.round(c + Math.sin(a) * (R - 1.5) - 1), 2, 2, lt(G, 0.5)); }
  p.ell(c, c, R - 4, R - 4, G); p.ring(c, c, R - 7, R - 7, 1, b.accent ?? 0xc8281e);
  label(p, bold(mk([...b.jp][0], 16)), c, c - 9, { c: b.accent ?? 0xc8281e, align: 'c' });
  return p;
}
function cupLid(D, b, d) {
  const p = canLid(D, { text: 'PULL OFF' });
  const c = D / 2, R = D / 2;
  p.ell(c, c, R - 7, R - 7, SIL); p.ring(c, c, R - 7, R - 7, 1, SIL_D);
  p.ring(c, c, R - 14, R - 14, 3, b.main);
  label(p, bold(mk('ワンカップ', 16)), c, c - 26, { c: b.main, align: 'c' });
  label(p, mk(b.jp, 12), c, c + 14, { c: b.main, align: 'c' });
  label(p, m3('ALC.' + (d.alc ?? 15) + '%'), c, c + 30, { c: b.main, align: 'c' });
  // the ring pull lying flat
  p.ring(c, c - 2, 9, 7, 2, SIL_D); p.ring(c, c - 3, 9, 7, 1, SIL_L); p.rect(c - 2, c + 4, 4, 6, SIL_D);
  return p;
}
function ramuneCap(D) {
  const p = new Px(D, D), c = D / 2, R = D / 2, B = 0x2a7ae0;
  p.fill(dk(B, 0.3)); p.ell(c, c, R, R, B); p.ring(c, c, R - 3, R - 3, 2, lt(B, 0.35));
  p.ell(c, c, R - 10, R - 10, 0x8ad8f0); p.ell(c, c, R - 13, R - 13, 0x58c8d8); p.rect(Math.round(c - 5), Math.round(c - 6), 4, 1, 0xffffff); p.rect(Math.round(c - 6), Math.round(c - 5), 1, 3, 0xffffff);
  return p;
}
/** The lid / cap of a drink (square Px). */
export function paintTop(id) {
  const d = DRINKS[id], b = BRANDS[d.brand], cont = CONT[d.cont], D = topSize(d.cont);
  if (cont.kind === 'pet') return petCap(D, { ...b, cap: d.cap });
  if (cont.kind === 'bottle') return crownCap(D, b);
  if (cont.kind === 'cup') return cupLid(D, b, d);
  if (cont.kind === 'ramune') return ramuneCap(D);
  return canLid(D, { gold: d.brand === 'hoho' && d.alc > 0 && id !== 'vd_dryy', dot: d.hot ? 0xe0443a : null, text: d.mat === 'steel' ? 'STEEL' : 'ALUMI' });
}
/** Which drinks share a lid picture: the key. */
export function topKey(id) {
  const d = DRINKS[id], cont = CONT[d.cont];
  if (cont.kind === 'can') return 'lid:' + cont.d + ':' + (d.brand === 'hoho' && d.alc > 0 && id !== 'vd_dryy' ? 'g' : 's') + (d.hot ? 'h' : '') + d.mat;
  if (cont.kind === 'pet') return 'cap:' + d.brand + ':' + (d.cap ?? '');
  return cont.kind + ':' + d.brand;
}
/** A can's base: the stand ring, the dome, the date stamped in dots. */
export function paintBase(D, date = '99.10.21') {
  const p = new Px(D, D), c = D / 2, R = D / 2;
  p.fill(SIL_D);
  p.ell(c, c, R, R, SIL); p.ring(c, c, R - 2, R - 2, 3, SIL_L); p.ring(c, c, R - 6, R - 6, 2, SIL_D);
  p.ell(c, c, R - 10, R - 10, dk(SIL, 0.12)); p.crescent(c, c, R - 10, R - 10, 5, 5, SIL);
  const dots = (s, y) => { const m = m5(s); const x0 = Math.round(c - m.w); for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.b[j * m.w + i]) p.rect(x0 + i * 2, y + j * 2, 1, 1, INK); };
  if (D >= 120) { dots(date, Math.round(c - 16)); dots('MK3/A', Math.round(c + 4)); } else { dots(date.slice(0, 5), Math.round(c - 15)); dots(date.slice(6) + ' K3', Math.round(c + 3)); }
  return p;
}
