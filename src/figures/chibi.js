// Archetypes for the toy-figure kit: chibi people (the game's human style, two-and-a-half heads tall: chamfered
// blocks for head, torso, limbs, modelled hair locks, painted face and clothes) and blocky animals (loaf, sitting,
// standing), with poses. All sizes in mm; angles in degrees.
import { D, SD, shape, rgb } from './paint.js';

const R = Math.PI / 180;
const pp = (p, extra) => { const o = typeof p === 'number' ? { c: p } : { ...(p || {}) }; if (extra) o.d = [...(o.d || []), ...extra]; return o; };
export const SKIN = 0xf6cfae, SKIN2 = 0xe8b48e, INK = 0x2a1c1c;

// ------------------------------------------------------------------ hair
function lock(k, x, yTop, z, w, h, d, paint, o = {}) {
  // a hair lock: wide at the root, narrowing to the tip (pointing down unless o.up)
  const t = o.tip ?? 0.35;
  if (o.up) return k.prism([[0, w / 2, d / 2, 0, 0, 0.3], [h, w / 2 * t, d / 2 * 0.7, o.sx || 0, o.sz || 0, 0.3]], paint, { pos: [x, yTop, z], rot: o.rot });
  return k.prism([[-h, w / 2 * t, d / 2 * 0.7, o.sx || 0, o.sz || 0, 0.3], [0, w / 2, d / 2, 0, 0, 0.3]], paint, { pos: [x, yTop, z], rot: o.rot });
}

/** Hair around a head box (half sizes hw, hh, hd, centred at hy). style: short | bob | long | pony | twin | spiky | bald | bun | pomp | hime | buzz | afro | topknot. */
export function hair(k, st, c, H) {
  if (!st || st === 'bald') return;
  const { hw, hh, hd, hy } = H, top = hy + hh;
  const P = typeof c === 'object' ? { t: 'hair', ...c } : { c, t: 'hair' };
  const g = 1.4; // thickness
  if (st === 'buzz') { k.box([0, top - hh * 0.35, -0.6], [hw * 2 + 0.8, hh * 0.75, hd * 2 + 0.2], P, { ch: 0.35 }); return; }
  if (st === 'afro') { k.ball([0, top - 2, -2], [hw + 6, hh * 0.85, hd + 5], P); return; }
  // cap over the top and back of the skull
  k.box([0, top - hh * 0.32 + g * 0.5, -g * 0.6], [hw * 2 + g * 2, hh * 0.66 + g, hd * 2 + g * 1.4], P, { ch: 0.38, top: [0.94, 0.92] });
  const backLen = st === 'long' || st === 'hime' ? hh * 2 + 10 : st === 'bob' ? hh * 1.3 : hh * 1.05;
  k.box([0, top - backLen / 2, -hd - g * 0.2], [hw * 2 + g * 1.6, backLen, g * 2.4], P, { ch: 0.3, top: [1, 1] });
  // sides
  const sideLen = st === 'long' || st === 'hime' ? hh * 2 + 6 : st === 'bob' ? hh * 1.35 : hh * 0.75;
  k.mirror(() => k.box([hw + g * 0.4, top - sideLen / 2 - 1, -hd * 0.25], [g * 1.8, sideLen, hd * 1.55], P, { ch: 0.3 }));
  // fringe: locks hanging over the forehead
  const fy = top + 0.6, fz = hd + 0.2;
  if (st === 'hime') k.box([0, fy - 4, fz - 0.4], [hw * 2 + 1, 8, g * 1.6], P, { ch: 0.3 });
  else if (st === 'pomp') {
    k.prism([[0, hw * 0.9, hd * 0.7, 0, 0, 0.45], [6, hw * 0.85, hd * 0.9, 0, 4, 0.45], [9, hw * 0.6, hd * 0.6, 0, 6, 0.5]], P, { pos: [0, top - 2, 0] });
  } else {
    const n = st === 'spiky' ? 5 : 4, lw = (hw * 2 + 2) / n;
    for (let i = 0; i < n; i++) {
      const x = -hw - 1 + lw * (i + 0.5), h = (i % 2 ? 6.5 : 8) * (st === 'short' || st === 'pony' ? 0.9 : 1);
      lock(k, x, fy, fz - 0.5, lw + 0.8, h, g * 1.8, P, { tip: 0.3, sx: (x > 0 ? -1 : 1) * 0.6, rot: [-0.12, 0, 0] });
    }
  }
  if (st === 'spiky') for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.32;
    lock(k, Math.sin(a) * hw * 0.8, top - 1, -1 - Math.abs(i - 2) * 1.2, 7, 7 - Math.abs(i - 2), 6, P, { up: true, tip: 0.15, rot: [-0.3, 0, -a * 0.9] });
  }
  if (st === 'pony') k.at([0, top - 4, -hd - 2], [0.5, 0, 0], () => { k.ball([0, 0, 0], [3, 3, 3], P); lock(k, 0, -1, -1, 6, 14, 5, P, { tip: 0.4 }); });
  if (st === 'twin') k.mirror(() => k.at([hw + 2, top - 3, -2], [0, 0, 0.25], () => { k.ball([0, 0, 0], [2.6, 2.6, 2.6], P); lock(k, 1, -1, 0, 6, 17, 5, P, { tip: 0.35, sx: 1 }); }));
  if (st === 'bun' || st === 'topknot') k.ball([0, top + (st === 'bun' ? 2.5 : 3), st === 'bun' ? -3 : -1], st === 'bun' ? [5, 4, 5] : [2.6, 3.5, 2.6], P);
  if (st === 'long' || st === 'hime') k.mirror(() => lock(k, hw + 0.6, hy - hh * 0.2, hd * 0.55, 4, hh + 6, 3, P, { tip: 0.5 }));
}

// ------------------------------------------------------------------ hats
export function hat(k, h, H) {
  if (!h) return;
  const { hw, hh, hd, hy } = H, top = hy + hh, hc = typeof h === 'object' ? h : { kind: h };
  const P = hc.p ?? { c: hc.c ?? 0x2f5aa8, t: 'cloth' };
  switch (hc.kind) {
    case 'cap': case 'station': {
      k.box([0, top + 1, -0.5], [hw * 2 + 3, 7, hd * 2 + 3], pp(P, hc.d), { ch: 0.4, top: [0.92, 0.9] });
      k.box([0, top - 1.6, hd + 3], [hw * 1.6, 1.2, 8], hc.brim ?? (hc.kind === 'station' ? 0x1a1a1e : P), { ch: 0.4, rot: [0.08, 0, 0] });
      if (hc.kind === 'station') k.box([0, top + 0.8, hd + 1.4], [hw * 1.2, 1.4, 0.8], { c: 0xd8b040, m: 'metal' }, { ch: 0.2 });
      break;
    }
    case 'band': k.box([0, top - 3, 0], [hw * 2 + 1.6, 3, hd * 2 + 1.6], pp(P, hc.d), { ch: 0.4 }); if (hc.knot) k.box([0, top - 3, -hd - 2], [3, 3, 3], P, { ch: 0.4 }); break;
    case 'beret': k.ball([2, top + 1, -1], [hw + 2, 3.5, hd + 2], P); break;
    case 'straw': k.cyl([0, top - 1, 0], hw + 10, 1.4, { c: 0xe6c27a, t: 'tatami' }); k.cyl([0, top + 2.5, 0], hw + 1, 6, { c: 0xe6c27a, t: 'tatami', d: [D.band('y', -3, -1, hc.c ?? 0xc23a30)] }, { top: 0.92 }); break;
    case 'witch': k.cyl([0, top, 0], hw + 8, 1.4, P); k.cyl([0, top + 8, -1], hw * 0.8, 15, P, { top: 0.12, rot: [-0.25, 0, 0] }); break;
    case 'chef': k.cyl([0, top + 3, 0], hw * 0.95, 9, { c: 0xfaf8f0, t: 'cloth' }); k.ball([0, top + 9, 0], [hw + 1, 4.5, hd + 1], { c: 0xfaf8f0, t: 'cloth' }); break;
    case 'helmet': k.ball([0, hy + 1, -0.5], [hw + 2.4, hh + 2.4, hd + 2.2], pp(P, hc.d)); break;
    case 'kasa': k.cyl([0, top + 2, 0], hw + 11, 7, { c: 0xd8b878, t: 'tatami' }, { top: 0.1 }); break;
    case 'tokin': k.cyl([0, top + 1, 4], 3.2, 4, { c: 0x2a2a30 }, { top: 0.7 }); break;
    default: break;
  }
}

// ------------------------------------------------------------------ outfits (decals on the torso box; local coords, centre origin)
function outfitDecals(o, T) {
  const { hw, hh, hd } = T, d = [];
  const c2 = o.c2 ?? 0xffffff;
  switch (o.kind) {
    case 'shirt': d.push(D.poly([[-hw * 0.55, hh], [hw * 0.55, hh], [0, hh - 4]], c2, { ink: o.ink ?? 0x3a3a40, iw: 0.3 })); d.push(D.buttons(0, hh - 5, -hh + 2, 3, 0.55, o.bc ?? 0xf4f0e8)); break;
    case 'gakuran': d.push(D.rect(-hw, hh - 1.6, hw, hh, 0x111116)); d.push(D.line(0, hh, 0, -hh, 0.35, 0x0a0a0e)); d.push(D.buttons(0, hh - 2.6, -hh + 2, 4, 0.6, 0xe6c040, { ink: 0x8a6a10 })); break;
    case 'sailor':
      d.push(D.poly([[-hw, hh], [hw, hh], [hw * 0.15, hh - 6], [-hw * 0.15, hh - 6]], o.collar ?? 0x24356e, { ink: 0xf0f0f0, iw: 0.45 }));
      d.push(D.poly([[-2.4, hh - 5.2], [2.4, hh - 5.2], [0, hh - 8.6]], o.scarf ?? 0xc8202e, { ink: 0x7a1018, iw: 0.25 }));
      d.push(D.poly([[-hw, hh], [hw, hh], [hw, hh - 3], [-hw, hh - 3]], o.collar ?? 0x24356e, { dir: 'b' }));
      d.push(D.band('y', hh - 3.2, hh - 2.6, 0xf0f0f0, { only: 'b' }));
      break;
    case 'kimono': {
      const col = o.collar ?? 0xf4efe4;
      d.push(D.path([[-hw * 0.6, hh], [hw * 0.35, -hh * 0.35]], 1.8, col)); d.push(D.path([[hw * 0.6, hh], [-hw * 0.15, hh * 0.05]], 1.8, col));
      d.push(D.band('y', -hh + 0.2, -hh + 4, o.obi ?? 0xc23a30)); d.push(D.band('y', -hh + 1.6, -hh + 2.2, o.obiC ?? 0xf2c84a));
      break;
    }
    case 'suit':
      d.push(D.poly([[-hw * 0.45, hh], [hw * 0.45, hh], [0, -hh * 0.2]], c2)); d.push(D.poly([[-0.9, hh - 0.6], [0.9, hh - 0.6], [1.2, -hh * 0.1], [0, -hh * 0.35], [-1.2, -hh * 0.1]], o.tie ?? 0xb02a2a, { ink: 0x40141a, iw: 0.22 }));
      d.push(D.path([[-hw * 0.45, hh], [-hw * 0.2, hh * 0.3], [0, -hh * 0.2]], 0.5, 0x1a1a1e)); d.push(D.path([[hw * 0.45, hh], [hw * 0.2, hh * 0.3], [0, -hh * 0.2]], 0.5, 0x1a1a1e));
      d.push(D.buttons(0, -hh * 0.45, -hh * 0.75, 2, 0.5, 0x2a2a2e));
      break;
    case 'apron': d.push(D.rect(-hw * 0.7, -hh, hw * 0.7, hh * 0.45, o.apron ?? 0xf4efe4, { ink: 0x8a7a6a, iw: 0.25 })); d.push(D.line(-hw * 0.7, hh * 0.45, -hw * 0.45, hh, 0.7, o.apron ?? 0xf4efe4)); d.push(D.line(hw * 0.7, hh * 0.45, hw * 0.45, hh, 0.7, o.apron ?? 0xf4efe4)); if (o.logo) d.push(o.logo); break;
    case 'hoodie': d.push(D.rect(-hw * 0.55, -hh + 1, hw * 0.55, -hh * 0.15, null, { ink: 0x00000040 & 0x333333, iw: 0.3 })); d.push(D.line(-1.5, hh, -1.8, hh - 5, 0.4, 0xf0f0f0)); d.push(D.line(1.5, hh, 1.8, hh - 5, 0.4, 0xf0f0f0)); break;
    case 'jersey': d.push(D.line(0, hh, 0, -hh, 0.5, o.zip ?? 0xf0f0f0)); d.push(D.band('x', hw - 1.4, hw - 0.6, c2)); d.push(D.band('x', -hw + 0.6, -hw + 1.4, c2)); break;
    case 'tee': d.push(D.arc(0, hh + 0.4, 3.2, 2.4, Math.PI + 0.2, 2 * Math.PI - 0.2, 0.6, o.trim ?? 0x00000000 | 0x3a3a40)); break;
    case 'hanten': d.push(D.path([[-hw * 0.55, hh], [-hw * 0.2, -hh]], 2.2, o.collar ?? 0x1a1a24)); d.push(D.path([[hw * 0.55, hh], [hw * 0.2, -hh]], 2.2, o.collar ?? 0x1a1a24)); break;
    default: break;
  }
  if (o.d) d.push(...o.d);
  return d;
}

// ------------------------------------------------------------------ the chibi person
/**
 * s: { H, skin, face: {...}, hair: style, hairC, hat, top: paint, outfit: { kind, ... }, sleeve: paint, bottom: paint,
 *      legs: 'pants' | 'shorts' | 'skirt' | 'hakama' | 'robe', shoes, socks, armL / armR: [forward, out, bend], legL / legR:
 *      [forward, out], head: [nod, turn, tilt], lean, sit, holdL(k) / holdR(k) (built in the hand frame, arm axis = -y),
 *      onHead(k, H) (head frame), onBody(k, T) (torso frame), animal: { ears, c, c2, muzzle, whiskers } }
 * Returns the frames { H (head box), T (torso) }.
 */
export function chibi(k, s = {}) {
  const S = (s.H ?? 64) / 64;
  const skin = s.skin ?? SKIN;
  const legLen = 12 * S * (s.legK ?? 1), hipY = (4 + legLen) * 1;
  const T = { hw: 8.6 * S * (s.wide ?? 1), hh: 7 * S, hd: 5.6 * S * (s.wide ?? 1) };
  const torsoY = hipY + 1.2 * S + T.hh;
  const neckY = torsoY + T.hh;
  const Hd = { hw: 15 * S * (s.headK ?? 1), hh: 13.5 * S * (s.headK ?? 1), hd: 13 * S * (s.headK ?? 1) };
  Hd.hy = Hd.hh + 0.6 * S;
  const sitDrop = s.sit ? legLen - 1 : 0;
  const shoes = s.shoes ?? 0x6a4a3a;
  const legPaint = s.legs === 'shorts' || s.legs === 'skirt' ? (s.socks ? { c: s.socks, t: 'knit' } : { c: skin }) : pp(s.bottom ?? { c: 0x3a4a6a, t: 'cloth' });
  k.at([0, -sitDrop, 0], [0, 0, 0], () => {
    // legs
    for (const side of [1, -1]) {
      const pose = (side > 0 ? s.legL : s.legR) || [s.sit ? 88 : 0, 0];
      k.at([side * 4.1 * S, hipY, 0], [-pose[0] * R, 0, side * (pose[1] || 0) * R], () => {
        k.box([0, -legLen / 2, 0], [6.4 * S, legLen + 1, 6.8 * S], legPaint, { ch: 0.3, top: [1.08, 1.06] });
        if (s.legs === 'shorts') k.box([0, -2.4 * S, 0], [7.2 * S, 5 * S, 7.6 * S], pp(s.bottom ?? 0x3a4a6a), { ch: 0.3 });
        // shoe
        k.box([0, -legLen - 0.4, 1.4 * S], [7 * S, 4.2 * S, 9.4 * S], { c: shoes, top: shoes, d: [D.band('y', -2.2 * S, -1.4 * S, s.sole ?? 0xf0ece4)] }, { ch: 0.42, top: [0.92, 0.8], sh: [0, -0.8] });
      });
    }
    k.at([0, 0, 0], [(s.lean || 0) * R, 0, 0], () => {
      // hips / skirt
      if (s.legs === 'skirt') k.prism([[hipY - 5 * S, T.hw * 1.3, T.hd * 1.45, 0, 0, 0.4], [hipY + 3 * S, T.hw * 0.98, T.hd * 1.02, 0, 0, 0.4]], pp(s.bottom ?? { c: 0x24356e, t: 'cloth', d: [D.stripes('x', 2.4, 0.4, 0x1a2550)] }));
      else if (s.legs === 'hakama' || s.legs === 'robe') k.prism([[0.8, T.hw * 1.35, T.hd * 1.5, 0, 0, 0.4], [hipY + 3 * S, T.hw * 1.0, T.hd * 1.04, 0, 0, 0.4]], pp(s.bottom ?? { c: 0xc8202e, t: 'cloth' }, s.legs === 'hakama' ? [D.stripes('x', 3.2, 0.4, 0x00000000 | 0x8a1018, { dir: 'f' })] : null));
      else k.box([0, hipY + 1, 0], [T.hw * 2 - 0.4, 5 * S, T.hd * 2 - 0.2], pp(s.legs === 'shorts' ? s.bottom ?? 0x3a4a6a : s.bottom ?? { c: 0x3a4a6a, t: 'cloth' }), { ch: 0.35 });
      // torso
      const top = pp(s.top ?? { c: 0xe8e4dc, t: 'cloth' }, s.outfit ? outfitDecals(s.outfit, T) : null);
      k.box([0, torsoY, 0], [T.hw * 2, T.hh * 2, T.hd * 2], top, { ch: 0.32, top: [0.9, 0.88] });
      if (s.onBody) k.at([0, torsoY, 0], [0, 0, 0], () => s.onBody(k, T));
      // arms
      const sleeve = pp(s.sleeve ?? s.top ?? { c: 0xe8e4dc, t: 'cloth' });
      for (const side of [1, -1]) {
        const pose = (side > 0 ? s.armL : s.armR) || [0, 8, 0];
        k.at([side * (T.hw + 2.2 * S), neckY - 2.2 * S, 0], [-pose[0] * R, 0, side * (pose[1] ?? 8) * R], () => {
          k.box([0, -3.6 * S, 0], [5 * S, 8 * S, 5.4 * S], sleeve, { ch: 0.35 });
          k.at([0, -7.2 * S, 0], [-(pose[2] || 0) * R, 0, 0], () => {
            k.box([0, -2.6 * S, 0], [4.6 * S, 5.6 * S, 5 * S], s.sleeveShort ? { c: skin } : sleeve, { ch: 0.35 });
            k.box([0, -6.6 * S, 0.2], [4.8 * S, 4.2 * S, 4.8 * S], s.gloves ?? { c: skin }, { ch: 0.45 });
            const hold = side > 0 ? s.holdL : s.holdR;
            if (hold) k.at([0, -7 * S, 0], [0, 0, 0], () => hold(k));
          });
        });
      }
      // head
      k.at([0, neckY, 0], (s.head || [0, 0, 0]).map((a) => a * R), () => {
        k.box([0, 0.4, 0], [5.4 * S, 2.2, 5 * S], { c: skin }, { ch: 0.4 });
        const fc = { y: -2 * S, gap: 6.4 * S, er: 2.1 * S, eh: 2.7 * S, eye: 'anime', mouth: 'smile', mw: 2.8 * S, my: -8.6 * S, blush: true, ...(s.face || {}) };
        const an = s.animal;
        const headP = an ? { c: an.c, t: 'fur', d: [an.mask ? D.ell(0, -6 * S, 8 * S, 6 * S, an.c2 ?? 0xfff4e4) : null, ...(an.d || []), ...D.face(fc), an.whiskers ? D.whiskers(0, -7 * S, 4 * S, { gap: 4 * S }) : null] } : { c: skin, d: [...D.face(fc), ...(s.faceD || [])] };
        k.box([0, Hd.hy, 0], [Hd.hw * 2, Hd.hh * 2, Hd.hd * 2], s.headP ? (typeof s.headP === 'function' ? s.headP(Hd, S) : s.headP) : headP, { ch: 0.36, top: [0.96, 0.95], dens: 1.25 });
        if (s.headP) { /* helmet / mask heads: no ears or hair */ } else if (!an) {
          k.mirror(() => k.box([Hd.hw + 0.6, Hd.hy - 2 * S, -0.5], [1.8, 4.4 * S, 3.4 * S], { c: skin, d: [D.ell(0, 0, 0.6, 1.4, SKIN2, { dir: 'l' })] }, { ch: 0.45 }));
          hair(k, s.hair ?? 'short', s.hairC ?? 0x2a2220, { ...Hd });
        } else animalBits(k, an, Hd, S);
        hat(k, s.hat, Hd);
        if (s.onHead) s.onHead(k, Hd);
      });
    });
  });
  return { H: Hd, T, neckY, torsoY };
}

function animalBits(k, an, Hd, S) {
  const { hw, hh, hd, hy } = Hd, top = hy + hh, c = an.c, c2 = an.inner ?? 0xf4a8b0;
  const fur = { c, t: 'fur' };
  switch (an.ears || 'tri') {
    case 'tri': k.mirror(() => k.prism([[0, 4.2 * S, 2 * S, 0, 0, 0.3], [7 * S, 0.5, 0.6, -0.6, 0, 0]], { c, t: 'fur', d: [D.poly([[-2.4 * S, 0.6], [2.4 * S, 0.6], [-0.3, 5.6 * S]], c2, { dir: 'f' })] }, { pos: [hw * 0.62, top - 1.2, -1], rot: [0, 0, -0.18] })); break;
    case 'round': k.mirror(() => k.cyl([hw * 0.72, top + 0.6, -1.5], 3.8 * S, 2.6 * S, { c, t: 'fur', d: [D.circ(0, 0, 2 * S, c2, { dir: 'f' })] }, { rot: [Math.PI / 2, 0, 0] })); break;
    case 'long': k.mirror(() => k.box([hw * 0.45, top + 8 * S, -1], [4.4 * S, 18 * S, 2.6 * S], { c, t: 'fur', d: [D.rect(-1.2 * S, -7 * S, 1.2 * S, 7 * S, c2, { r: 1, dir: 'f' })] }, { ch: 0.5, top: [0.8, 0.8], rot: [-0.1, 0, -0.12] })); break;
    case 'floppy': k.mirror(() => k.box([hw + 1, hy + 2, -1], [3 * S, 11 * S, 7 * S], { c: an.earC ?? c, t: 'fur' }, { ch: 0.5, rot: [0, 0, 0.15] })); break;
    case 'small': k.mirror(() => k.box([hw * 0.7, top + 0.5, -2], [4 * S, 3 * S, 2 * S], fur, { ch: 0.5 })); break;
    default: break;
  }
  if (an.muzzle) k.box([0, hy - 5 * S, hd + 1.4], [10 * S, 6 * S, 4 * S], { c: an.muzzle, t: 'fur', d: [D.ell(0, 1.2, 1.4, 1, INK, { dir: 'f' }), ...(an.muzzleD || [])] }, { ch: 0.45, dens: 1.2 });
}

// ------------------------------------------------------------------ animals
/**
 * kind: 'loaf' (round mochi body with a face), 'sit' (sitting: body + head + front paws + tail), 'stand' (four legs).
 * s: { c, c2 (belly / muzzle), ears: 'tri' | 'round' | 'long' | 'floppy' | 'small' | 'none', earC, inner, face, muzzle: colour,
 *      tail: 'curl' | 'long' | 'bushy' | 'stub' | 'none', size, bodyD: decals, headD, t (fur | plush | vinyl), whiskers,
 *      head: [nod, turn, tilt], onHead(k, H), onBody(k) }
 */
export function beast(k, kind, s = {}) {
  const c = s.c ?? 0xe8a25a, c2 = s.c2 ?? 0xfff1df, S = (s.size ?? 1), tx = s.t ?? 'fur';
  const P = (extra) => ({ c, t: tx, d: extra });
  if (kind === 'loaf') {
    const rx = 15 * S * (s.wk ?? 1), ry = 12 * S * (s.hk ?? 1), rz = 13 * S;
    const fc = { y: ry * 0.18, gap: rx * 0.36, er: 1.5 * S, eh: 1.8 * S, eye: 'dot', mouth: 'cat', mw: 3 * S, my: -ry * 0.1, blush: true, ...(s.face || {}) };
    k.soft([0, ry, 0], [rx, ry, rz], { c, t: tx, d: [s.belly !== false ? D.ell(0, -ry * 0.35, rx * 0.62, ry * 0.5, c2) : null, ...(s.bodyD || []), ...D.face(fc), s.whiskers ? D.whiskers(0, fc.my + 1, 4 * S, { gap: 3 * S }) : null] }, { flat: true, ch: 0.5, bev: 0.32, bs: 0.78, top: [0.92, 0.9], dens: 1.15 });
    const Hd = { hw: rx * 0.95, hh: ry * 0.9, hd: rz * 0.8, hy: ry };
    animalBits(k, { ears: s.ears ?? 'tri', c: s.earC ?? c, inner: s.inner }, { ...Hd, hw: rx * 0.9, hh: ry * 0.86 }, S);
    k.mirror(() => k.box([rx * 0.45, 1.4 * S, rz * 0.62], [5 * S, 3 * S, 4 * S], { c: s.pawC ?? c2, t: tx }, { ch: 0.5 }));
    tail(k, s.tail ?? 'none', [0, ry * 0.6, -rz * 0.95], c, c2, S, tx);
    if (s.onBody) s.onBody(k, { rx, ry, rz });
    return { rx, ry, rz };
  }
  if (kind === 'sit') {
    const bw = 15 * S, bh = 17 * S, bd = 15 * S;
    k.box([0, bh / 2, -1], [bw, bh, bd], P([D.ell(0, -bh * 0.1, bw * 0.3, bh * 0.38, c2, { dir: 'f' }), ...(s.bodyD || [])]), { ch: 0.45, top: [0.78, 0.72] });
    k.mirror(() => k.box([bw * 0.24, 4.4 * S, bd * 0.42], [4.4 * S, 9 * S, 5 * S], { c: s.pawC ?? c, t: tx }, { ch: 0.45 }));
    k.mirror(() => k.box([bw * 0.42, 2.6 * S, -1], [4.4 * S, 5.2 * S, 11 * S], P(), { ch: 0.5 }));
    tail(k, s.tail ?? 'long', [0, 3 * S, -bd / 2 - 1], c, c2, S, tx);
    const head = () => headBlock(k, s, S, c, c2, tx);
    k.at([0, bh - 1 * S, 1 * S], (s.head || [0, 0, 0]).map((a) => a * R), head);
    if (s.onBody) s.onBody(k, { bw, bh, bd });
    return { bw, bh, bd };
  }
  // stand: four legs
  const bl = 24 * S * (s.lk ?? 1), bw = 12 * S, bh = 11 * S, legH = (s.legH ?? 8) * S;
  k.box([0, legH + bh / 2, 0], [bw, bh, bl], P([D.ell(0, 0, bw * 0.3, bl * 0.4, c2, { dir: 'u' }), ...(s.bodyD || [])]), { ch: 0.42 });
  for (const zz of [1, -1]) k.mirror(() => k.box([bw * 0.3, legH / 2 + 0.6, zz * bl * 0.34], [4 * S, legH + 1.4, 4.4 * S], { c: s.legC ?? c, t: tx, d: s.sock ? [D.band('y', -legH, -legH / 2 + 1.6, s.sock)] : null }, { ch: 0.42 }));
  tail(k, s.tail ?? 'long', [0, legH + bh * 0.8, -bl / 2 - 0.5], c, c2, S, tx);
  k.at([0, legH + bh * 0.95, bl / 2 - 1 * S], (s.head || [0, 0, 0]).map((a) => a * R), () => headBlock(k, s, S, c, c2, tx));
  if (s.onBody) s.onBody(k, { bw, bh, bl, legH });
  return { bw, bh, bl, legH };
}

function headBlock(k, s, S, c, c2, tx) {
  const hw = 9.5 * S * (s.hk ?? 1), hh = 8 * S * (s.hk ?? 1), hd = 8.5 * S * (s.hk ?? 1), hy = hh;
  const fc = { y: 1 * S, gap: hw * 0.42, er: 1.4 * S, eh: 1.7 * S, eye: 'dot', mouth: s.muzzle ? 'none' : 'cat', mw: 2.6 * S, my: -3 * S, blush: true, ...(s.face || {}) };
  k.box([0, hy, 0], [hw * 2, hh * 2, hd * 2], { c, t: tx, d: [s.mask ? D.ell(0, -hh * 0.45, hw * 0.75, hh * 0.55, c2, { dir: 'f' }) : null, ...(s.headD || []), ...D.face(fc), s.whiskers ? D.whiskers(0, -3 * S, 4 * S, { gap: 3 * S }) : null] }, { ch: 0.4, top: [0.95, 0.92], dens: 1.2 });
  if (s.muzzle) k.box([0, hy - 3.4 * S, hd + 1.8 * S], [8 * S, 5.2 * S, 4.6 * S], { c: s.muzzle === true ? c2 : s.muzzle, t: tx, d: [D.ell(0, 1.4 * S, 1.6 * S, 1.1 * S, 0x2a1c1c, { dir: 'f' }), D.line(0, 0.4, 0, -0.8, 0.35, 0x2a1c1c), ...D.face({ eye: 'none', mouth: s.face?.mouth ?? 'cat', my: -0.9 * S, mw: 2.6 * S, blush: false })] }, { ch: 0.45, top: [0.9, 0.85] });
  animalBits(k, { ears: s.ears ?? 'tri', c: s.earC ?? c, inner: s.inner }, { hw, hh, hd, hy }, S);
  if (s.onHead) s.onHead(k, { hw, hh, hd, hy });
}

export function tail(k, kind, at, c, c2, S = 1, tx = 'fur') {
  const P = { c, t: tx };
  switch (kind) {
    case 'curl': k.at(at, [0.6, 0, 0], () => { k.box([0, 3 * S, -1], [4 * S, 7 * S, 4 * S], P, { ch: 0.5, rot: [-0.6, 0, 0] }); k.ball([0, 6.5 * S, -3.5 * S], [3 * S, 3 * S, 3 * S], { c: c2, t: tx }); }); break;
    case 'long': k.at(at, [-0.9, 0, 0.2], () => { k.box([0, 0, -6 * S], [3 * S, 3 * S, 13 * S], P, { ch: 0.5, top: [0.85, 0.85] }); }); break;
    case 'up': k.at(at, [0.5, 0, 0], () => { k.box([0, 7 * S, -1], [3 * S, 15 * S, 3 * S], P, { ch: 0.5, top: [0.85, 0.85] }); }); break;
    case 'bushy': k.at(at, [-0.6, 0, 0], () => { k.ball([0, 3 * S, -6 * S], [4.5 * S, 4.5 * S, 8 * S], { c, t: tx, d: [D.band('z', -20, -5.5 * S, c2)] }); }); break;
    case 'stub': k.ball(at, [2.6 * S, 2.6 * S, 2.6 * S], P); break;
    case 'striped': k.at(at, [-0.5, 0, 0], () => { k.ball([0, 2 * S, -7 * S], [4 * S, 4 * S, 9 * S], { c, t: tx, d: [D.stripes('z', 3.5 * S, 1.6 * S, c2)] }); }); break;
    default: break;
  }
}

export { D, SD, shape, rgb };

/** Keychain hardware on top of a figure: an eye pin, a short ball chain and a split ring. */
export function keychain(k, at, s = 1) {
  const M = { c: 0xd4d6dc, m: 'gloss', t: 'metal' };
  k.cyl([at[0], at[1] + 1 * s, at[2]], 1 * s, 2 * s, M);
  for (let i = 0; i < 3; i++) k.ball([at[0], at[1] + (2.8 + i * 1.7) * s, at[2]], [0.8 * s, 0.8 * s, 0.8 * s], M, { n: 2 });
  const r = 4.2 * s, cy = at[1] + 8.6 * s + r;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.box([at[0] + Math.cos(a) * r, cy + Math.sin(a) * r, at[2]], [2.8 * s, 1.1 * s, 1.1 * s], M, { rot: [0, 0, a + Math.PI / 2], ch: 0.4 });
  }
}

// ------------------------------------------------------------------ people presets -> chibi figures
import { makeSpec } from '../people/presets.js';
const toHex = (c) => (Array.isArray(c) ? (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]) : c);
const HAIRMAP = { bald: 'bald', short: 'short', buzz: 'buzz', bob: 'bob', long: 'long', ponytail: 'pony', pigtails: 'twin', bowl: 'short', pompadour: 'pomp', bun: 'bun', spiky: 'spiky', afro: 'afro', perm: 'afro', wavy: 'long', twintails: 'twin' };
const TOPMAP = { sailor: 'sailor', gakuran: 'gakuran', suit: 'suit', blazer: 'suit', jacket: 'suit', polo: 'shirt', shirt: 'shirt', tee: 'tee', apron: 'apron', hoodie: 'hoodie', workjacket: 'jersey', cardigan: 'shirt', kimono: 'kimono', jersey: 'jersey' };
/**
 * A chibi figure of a people preset (src/people/presets.js): the same skin, hair, clothes and colours as the person
 * walking the lane, at two and a half heads tall. o overrides any chibi() option (pose, props, face...).
 */
export function chibiPreset(k, id, o = {}, seed = 1) {
  const p = makeSpec(id, seed);
  const top = p.top || {}, bot = p.bottom || {};
  const topC = toHex(top.col ?? [220, 220, 214]);
  const kind = TOPMAP[top.kind] || 'tee';
  const legs = /skirt|dress/.test(bot.kind || '') ? 'skirt' : /shorts/.test(bot.kind || '') ? 'shorts' : 'pants';
  const face = { eye: p.sex === 'f' || p.age === 'kid' ? 'anime' : 'dot', iris: toHex(p.face?.iris ?? [72, 44, 30]), lash: p.sex === 'f', mouth: 'smile', brow: p.face?.browW > 1.1 ? 'thick' : null, browC: toHex(p.hair?.col ?? 0x2a2220), ...(o.face || {}) };
  const faceD = [];
  if (p.glasses) faceD.push(D.ring(-6.4, -2, 3.4, 0.6, toHex(p.glasses.col)), D.ring(6.4, -2, 3.4, 0.6, toHex(p.glasses.col)), D.line(-3, -1.6, 3, -1.6, 0.6, toHex(p.glasses.col)));
  if (p.face?.mustache) faceD.push(D.rect(-4, -7, 4, -5.8, toHex(p.hair?.col ?? 0xe2ded6), { r: 0.6 }));
  if (p.face?.stubble > 0.4) faceD.push(D.fn('f', (c, out) => { if (c.y < -6 && ((Math.floor(c.x * 2) + Math.floor(c.y * 2)) & 1)) { out[0] *= 0.86; out[1] *= 0.86; out[2] *= 0.88; } }));
  const hatKind = p.hat ? ({ flatcap: 'beret', cap: 'cap', schoolhat: 'cap', bucket: 'cap', straw: 'straw', beanie: 'beret' }[p.hat.kind] || 'cap') : null;
  return chibi(k, {
    skin: toHex(p.skin), hair: HAIRMAP[p.hair?.style] || 'short', hairC: toHex(p.hair?.col ?? 0x2a2220),
    top: { c: topC, t: /knit|cardigan/.test(top.kind || '') ? 'knit' : 'cloth' }, sleeve: { c: toHex(top.vest ? topC : topC), t: 'cloth' },
    outfit: { kind, c2: toHex(top.shirt ?? top.col2 ?? [240, 238, 232]), collar: toHex(top.collar ?? [36, 52, 106]), scarf: toHex(top.scarf ?? [200, 32, 46]), apron: toHex(top.apron ?? [240, 236, 226]) },
    bottom: { c: toHex(bot.col ?? [60, 70, 100]), t: /jeans|denim/.test(bot.kind || '') ? 'denim' : 'cloth' }, legs,
    shoes: toHex(p.shoes?.col ?? [90, 70, 60]), socks: p.socks?.col ? toHex(p.socks.col) : null,
    hat: hatKind ? { kind: hatKind, c: toHex(p.hat.col) } : null, face, faceD, wide: p.build || 1,
    ...o, face,
    faceD: [...faceD, ...(o.faceD || [])],
  });
}
