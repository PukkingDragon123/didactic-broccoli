// Hair, scalp and hat painters for the sculpted hair / hat tubes (src/people/hair.js).
// Hair is painted the way a pixel artist does it: locks (clumps 3-6 px wide) that run along the strand direction and
// wave a little, each lock rounded (lighter in the middle, a dark gap at its edges), single strands of a neighbouring
// tone inside it, a broken sheen band where the hair turns towards the light, darker roots and thinner, lighter tips,
// and every lock ends in its own pointed tip (alpha cut) at the hem.
import { clamp01, sstep, mixc, mixT, G, h2, vnoise, shadeInto, over } from './paintlib.js';
import { hemAt } from './hair.js';

const INK = [28, 22, 22], WHITE = [244, 242, 236];

export function makeHairPainters(spec, P, fabricK) {
  const hair = spec.hair, hu = P.hu;
  const col = hair.col, hi = mixc(hair.hi, [214, 200, 186], 0.45);
  const dark = mixc(col, [20, 14, 24], 0.55), shadow = mixc(col, [36, 26, 44], 0.3);
  const grey = hair.grey ? 1 : 0;
  const lum01 = Math.min(1, (col[0] * 0.3 + col[1] * 0.59 + col[2] * 0.11) / 160); // dark hair keeps a subtler sheen

  /** Shade one hair texel. u: across strands (px), v: along (px, increasing towards the tips), light: 0..1 form light. */
  function strands(o, u, v, lockW, light, sheen, seed, curl = 0) {
    const wob = Math.sin(v * 0.09 + Math.floor(u / lockW) * 1.7 + seed) * 1.3 + Math.sin(v * 0.031 + seed * 0.3) * 2;
    const uu = u + wob * (1 - curl);
    const lock = Math.floor(uu / lockW), q = uu / lockW - lock;
    const lh = h2(lock, 3, seed);
    // lock body: rounded, with its own tone
    let k = 0.72 + 0.34 * Math.sin(Math.PI * q) + (lh - 0.5) * 0.16;
    const strand = Math.floor(uu);
    const sh = h2(strand, lock, seed + 7);
    if (sh > 0.78) k += 0.08; else if (sh < 0.16) k -= 0.1;
    // the long wave along a lock (clusters, not noise)
    k += (vnoise(lock * 0.7, v * 0.045, seed + 3) - 0.5) * 0.18;
    // dark gaps between locks
    if (q < 0.1 || q > 0.94) k *= 0.62;
    k *= 0.55 + 0.6 * light;
    let c = k < 0.62 ? mixT(dark, shadow, clamp01((k - 0.35) / 0.27)) : k < 0.9 ? mixT(shadow, col, (k - 0.62) / 0.28) : mixT(col, mixT(col, hi, 0.2), clamp01((k - 0.9) / 0.35));
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = 255;
    // sheen: a band broken by locks and strands
    if (sheen > 0.02) {
      const b = sheen * (0.45 + 0.7 * Math.sin(Math.PI * q)) * (sh > 0.35 ? 1 : 0.35);
      if (b > 0.18) over(o, mixT(col, hi, 0.5 + 0.25 * lum01), Math.min(0.8, b));
    }
    if (grey && h2(strand, lock * 3 + (v >> 3), seed + 11) > 0.62) over(o, mixT(WHITE, hi, 0.3), 0.55 * grey);
    return lock;
  }

  /** Form light of a hair surface from its normal (key light above front-left) + a soft top light. */
  const formLight = (c) => clamp01(0.55 + 0.32 * c.ny + 0.18 * c.nz + 0.1 * c.nx);
  const sheenOf = (c, band = 0.55) => G(c.ny - band, 0, 0.17, 1) * (0.55 + 0.45 * Math.max(0, c.nz + 0.4));

  // ---------------------------------------------------------------- the shell
  function shellPx(c, o) {
    const M = c.seg.meta, sty = M.sty, R = c.seg.rect;
    const u = c.i - R.x, v = c.j - R.y;
    const a = Math.atan2(Math.sin(M.A0 + c.lu * Math.PI * 2), Math.cos(M.A0 + c.lu * Math.PI * 2));
    const lockW = sty.locks || 5;
    if (sty.curls) { curlsPx(c, o, u, v, M.seed); }
    else {
      const lock = strands(o, u, v, lockW, formLight(c), sheenOf(c) * (sty.slick ? 1.5 : 1), M.seed);
      // the hem: every lock ends in its own pointed tip
      const hem = M.hem(a), jag = (sty.jag ?? 1) * (sty.blunt ? 0.35 : 1);
      const uu = u + Math.sin(v * 0.09 + lock * 1.7 + M.seed) * 1.3;
      const q = uu / lockW - Math.floor(uu / lockW);
      const tip = hem - h2(lock, 9, M.seed) * 0.03 * hu * jag + Math.abs(q - 0.5) * 2 * 0.022 * hu * (sty.blunt ? 0.3 : 1) * Math.min(1.4, jag + 0.4);
      if (c.y < tip) { o[3] = 0; return; }
      // ends lighter and thinner just above the tip
      if (c.y < tip + 0.02 * hu) over(o, mixT(col, hi, 0.2), 0.12);
    }
    // roots: darker where the shell meets the scalp at the hairline / crown whorl
    const top = c.ny > 0.86;
    if (top) { const cw = G(c.x, c.z - (P.hcz - 0.25 * P.hd), 0.02, 0.02); if (cw > 0.2) { o[0] *= 0.82; o[1] *= 0.82; o[2] *= 0.84; } }
    // a parting line
    if (sty.part && !sty.tight && !sty.curls && c.ny > 0.6 && c.z > P.hcz - 0.15 * hu) {
      const px = sty.part * P.hw * 0.34;
      if (Math.abs(c.x - px) < c.px * 0.5) shadeInto(o, mixT(spec.skin, col, 0.35), 0.8);
      else if (Math.abs(c.x - px) < c.px * 1.6) { o[0] *= 0.82; o[1] *= 0.82; o[2] *= 0.84; }
    }
    if (M.covered) { o[0] *= 0.9; o[1] *= 0.9; o[2] *= 0.9; }
  }

  // tight curls (perms): little coils as clusters with a bright top and a dark underside
  function curlsPx(c, o, u, v, seed) {
    const s = 3.4, cu = Math.floor(u / s), cv = Math.floor(v / s);
    let best = 9, bx = 0, by = 0, id = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const gx = cu + a, gy = cv + b;
      const fx = (gx + 0.2 + h2(gx, gy, seed) * 0.6) * s, fy = (gy + 0.2 + h2(gx, gy, seed + 1) * 0.6) * s;
      const d = Math.hypot(u - fx, v - fy);
      if (d < best) { best = d; bx = u - fx; by = v - fy; id = h2(gx, gy, seed + 2); }
    }
    const r = s * 0.62;
    let k = best < r ? 0.95 - 0.35 * (by / r) - 0.1 * Math.abs(bx / r) : 0.5;
    if (best > r * 0.75 && best < r) k *= 0.8;
    k *= 0.6 + 0.55 * formLight(c);
    k += (id - 0.5) * 0.12;
    const cc = k < 0.62 ? mixT(dark, shadow, clamp01((k - 0.35) / 0.27)) : k < 0.92 ? mixT(shadow, col, (k - 0.62) / 0.3) : mixT(col, hi, clamp01((k - 0.92) / 0.4) * 0.6);
    o[0] = cc[0]; o[1] = cc[1]; o[2] = cc[2]; o[3] = 255;
    if (grey && id > 0.5) over(o, mixT(WHITE, hi, 0.3), 0.35);
    // the hem: curls, not a straight line
    const M = c.seg.meta, a = Math.atan2(Math.sin(M.A0 + c.lu * Math.PI * 2), Math.cos(M.A0 + c.lu * Math.PI * 2));
    const hem = M.hem(a) - Math.abs(Math.sin(u * 0.55)) * 0.025 * hu;
    if (c.y < hem) o[3] = 0;
  }

  // ---------------------------------------------------------------- tails, buns, quiffs, spikes
  function partPx(c, o) {
    const M = c.seg.meta, R = c.seg.rect;
    const u = c.i - R.x, v = c.j - R.y;
    if (M.kind === 'bun') {
      // hair wound round the bun: strands run across
      strands(o, v * 1.2 + Math.sin(u * 0.2) * 2, u, 4, formLight(c), sheenOf(c, 0.4), M.seed);
      return;
    }
    if (M.kind === 'tail') {
      const lock = strands(o, u, v, 4, formLight(c), sheenOf(c, 0.2) * 0.8 + 0.25 * G(c.lt - 0.3, 0, 0.1, 1), M.seed);
      // the tie near the root, pointed tips at the end
      if (c.lt > 0.03 && c.lt < 0.075) { shadeInto(o, spec.hair.tie || [60, 40, 90], 0.75 + 0.3 * formLight(c)); if (Math.abs(c.lt - 0.05) < 0.006) over(o, WHITE, 0.12); }
      if (c.lt < 0.03) { o[0] *= 0.8; o[1] *= 0.8; o[2] *= 0.8; }
      const tipStart = 0.78 + h2(lock, 4, M.seed) * 0.16;
      if (c.lt > tipStart + (1 - Math.abs(((u % 4) / 4) - 0.5) * 2) * 0.06) o[3] = 0;
      return;
    }
    if (M.kind === 'quiff') {
      strands(o, u, v * 0.8, 6, formLight(c), sheenOf(c, 0.3) * 1.6, M.seed);
      return;
    }
    // spikes and tufts: strands along to the tip, darker at the root
    strands(o, u * 1.5, v, 3, formLight(c) * (0.75 + 0.35 * c.lt), sheenOf(c, 0.3), M.seed);
  }

  function hairTubePx(c, o) {
    if (c.seg.part === 'hairShell') shellPx(c, o); else partPx(c, o);
  }

  // ---------------------------------------------------------------- the scalp under it all (and buzz cuts / bald heads)
  const st = hair.style, hat = spec.hat?.kind;
  const buzzHem = (A) => {
    // short back-and-sides line for buzz cuts / the fringe round a bald head
    const K = [[0, P.hairY - 0.02 * hu], [0.8, P.hairY - 0.05 * hu], [1.3, P.earTop + 0.06 * hu], [1.42, P.earBot + 0.07 * hu], [1.56, P.earBot + 0.07 * hu], [1.62, P.earTop + 0.03 * hu], [1.98, P.earTop + 0.02 * hu], [2.35, P.napeY + 0.05 * hu], [Math.PI, P.napeY - 0.01 * hu]];
    for (let i = 0; i < K.length - 1; i++) if (A <= K[i + 1][0]) return K[i][1] + (K[i + 1][1] - K[i][1]) * (A - K[i][0]) / (K[i + 1][0] - K[i][0]);
    return K[K.length - 1][1];
  };
  /** 0..1: how much hair covers this scalp texel, and its kind ('stubble' | 'hair'). */
  function scalpCover(c) {
    if (st === 'none') return 0;
    const sec = P.hcz, a = Math.atan2(c.x, c.z - sec * 0.5), A = Math.abs(a);
    if (st === 'bald') {
      // a horseshoe of short hair round the back and sides, from temple to temple above the ears
      if (A < 1.2) return 0;
      const top = P.earTop + 0.09 * hu + Math.sin((A - 1.2) * 1.6) * 0.03 * hu + (vnoise(A * 9, 3, 77) - 0.5) * 0.03 * hu;
      return c.y < top && c.y > buzzHem(A) ? 1 : 0;
    }
    return c.y > buzzHem(A) ? 1 : 0;
  }
  function scalpPx(c, o) {
    // called after the skin is painted: lays stubble / short hair / hair roots over it
    const cov = scalpCover(c);
    if (cov <= 0) return false;
    if (st === 'bald') {
      // short combed hair: little strokes running back, lighter tips at the top edge
      strands(o, c.i * 1.3, c.j * 0.5, 3, 0.55 + 0.4 * clamp01(c.ny + 0.6), 0.1, 9);
      return true;
    }
    const buzz = st === 'buzz' || st === 'spiky' || hat === 'hood';
    if (buzz) {
      // close-cropped: dense dark dots over skin, denser on top
      const d = h2(c.i, c.j, 71), d2 = vnoise(c.i * 0.5, c.j * 0.5, 72);
      over(o, shadow, (st === 'bald' ? 0.45 : 0.62) * cov); // the cropped hair tints the scalp
      if (d < 0.6 * cov) over(o, d2 > 0.5 ? dark : mixT(shadow, col, 0.5), 0.5 + 0.4 * d2);
      if (st !== 'bald' && c.ny > 0.3 && d > 0.9) over(o, mixT(col, hi, 0.5), 0.35 * c.ny); // a little sheen on top
      if (grey && d > 0.78) over(o, mixT(WHITE, hi, 0.3), 0.5);
      return true;
    }
    // under a shell: plain hair so gaps never show skin
    strands(o, c.i, c.j, 4, 0.6, 0, 5);
    return true;
  }

  // ---------------------------------------------------------------- hats
  const H0 = spec.hat;
  function hatTubePx(c, o) {
    const M = c.seg.meta, k = M.kind, R = c.seg.rect, u = c.i - R.x, v = c.j - R.y;
    let base = H0.col;
    const light = clamp01(0.62 + 0.3 * c.ny + 0.16 * c.nz);
    let kk = 0.72 + 0.4 * light;
    if (k === 'cap') {
      // cotton twill: diagonal weave, six panels stitched to a top button, a front panel patch
      kk *= 1 + (((u + v) % 3) === 0 ? -0.05 : 0.02);
      if (c.seg.part === 'hatCrown') {
        const a = Math.atan2(c.x, c.z - P.hcz) / (Math.PI / 3);
        if (Math.abs(a - Math.round(a)) < 0.03 + c.px * 6 * (1 - c.ny * 0.6) && c.lt > 0.05) kk *= 0.8;
        if (c.ny > 0.97) base = mixT(base, INK, 0.3);
        if (c.nz > 0.75 && c.lt > 0.25 && c.lt < 0.62 && Math.abs(c.x) < 0.03 * hu * 1.4) base = H0.col2 || WHITE;
        if (c.lt < 0.06) kk *= 0.86; // the sweatband edge
      }
      if (c.seg.part === 'visor') { if (c.ny < -0.3) base = mixT(base, [40, 70, 50], 0.5); if (Math.abs(((u / 3) % 1) - 0.5) < 0.12 && c.ny > 0.3) kk *= 0.92; }
    } else if (k === 'flatcap') {
      // wool tweed: herringbone + flecks
      const hb = ((Math.floor(u / 3) % 2 ? u + v : u - v) % 4 + 4) % 4;
      kk *= hb < 2 ? 1.04 : 0.95;
      if (h2(c.i, c.j, 61) > 0.965) base = mixT(base, h2(c.i, c.j, 62) > 0.5 ? [170, 150, 124] : [70, 54, 44], 0.35);
      if (c.seg.part === 'visor' && c.ny < -0.3) kk *= 0.75;
    } else if (k === 'sunhat' || k === 'bucket' || k === 'schoolhat') {
      if (k === 'sunhat') { const w = ((u >> 1) + (v >> 1)) % 2; kk *= w ? 1.06 : 0.9; if ((u + v * 3) % 7 === 0) kk *= 0.85; }
      else kk *= ((u + v) % 2) ? 1.02 : 0.96;
      // a ribbon round the crown just above the brim
      if (c.seg.part === 'hatCrown' && c.lt < 0.22) { base = H0.col2 || mixT(base, INK, 0.35); if (Math.abs(c.lt - 0.22) < 0.03) kk *= 0.8; }
      if (c.seg.part === 'brim') { if (c.ny < 0) kk *= 0.72; if (c.lt < 0.08) kk *= 0.85; }
    } else if (k === 'hardhat') {
      kk = 0.8 + 0.3 * light;
      if (c.ny > 0.5 && c.nz > 0.2) over(o, WHITE, 0);
      if (c.seg.part === 'hatCrown' && c.nz > 0.85 && c.lt > 0.25 && c.lt < 0.6) {
        const cx = Math.abs(c.x) / (0.035 * hu), cy = Math.abs(c.lt - 0.43) / 0.17;
        if ((cx < 1 && cy < 0.3) || (cx < 0.3 && cy < 1)) base = [40, 150, 60];
      }
    } else if (k === 'fedora') {
      // brushed felt, a grosgrain ribbon above the brim, the pinch down the middle of the crown
      kk *= 0.97 + 0.05 * h2(c.i >> 1, c.j, 71);
      if (c.seg.part === 'hatCrown') {
        if (c.lt < 0.2) { base = H0.col2 || mixT(base, INK, 0.5); if ((u + v * 2) % 4 === 0) kk *= 0.92; if (Math.abs(c.lt - 0.2) < 0.03) kk *= 0.78; }
        if (c.lt > 0.7 && Math.abs(c.x) < 0.012 * hu) kk *= 0.8 - 0.1 * (c.lt - 0.7);
      }
      if (c.seg.part === 'brim') { if (c.ny < 0) kk *= 0.7; if (c.lt > 0.85) kk *= 0.9; }
    } else if (k === 'gakubo') {
      // black serge, a gold school badge on the front, a lacquered peak with a shine line
      kk *= ((u + v) % 3 === 0) ? 0.95 : 1.02;
      if (c.seg.part === 'hatCrown') {
        if (c.lt < 0.3) kk *= 0.88;
        if (Math.abs(c.lt - 0.3) < 0.025) kk *= 0.7;
        if (c.ny > 0.9) kk *= 1.06;
        if (c.nz > 0.8 && c.lt > 0.32 && c.lt < 0.62 && Math.abs(c.x) < 0.022 * hu) { base = [206, 166, 70]; if (Math.abs(c.x) < 0.006 * hu || Math.abs(c.lt - 0.47) < 0.03) base = [150, 110, 40]; }
      }
      if (c.seg.part === 'visor') { base = [26, 24, 28]; kk = c.ny > 0.3 ? (Math.abs(((u / 4) % 1) - 0.5) < 0.1 ? 1.6 : 1.0) : 0.6; }
    } else if (k === 'scarf') {
      // printed cotton: small dots or a check in col2, a knot shadow at the nape
      const dot = H0.col2 && (((u >> 2) + (v >> 2)) % 2 === 0) && (u % 4 === 1) && (v % 4 === 1);
      if (dot) base = H0.col2;
      kk *= 0.95 + 0.06 * (((u >> 1) + v) % 2);
      if (c.nz < -0.7 && c.lt < 0.3) kk *= 0.85;
      if (c.lt < 0.04) kk *= 0.82;
    } else if (k === 'headband') {
      // tenugui: printed cotton
      const pat = ((Math.floor(u / 4) + Math.floor(v / 4)) % 2);
      kk *= 0.96 + (pat ? 0.06 : 0);
      if (H0.col2 && ((u % 8 < 2) || (v % 8 < 1))) base = H0.col2;
    }
    shadeInto(o, base, kk * fabricK(c, 'cotton'));
    o[3] = 255;
    // stitched edges
    if (c.seg.part === 'brim' && c.lt > 0.92) over(o, INK, 0.25);
    if (c.seg.part === 'hatCrown' && c.lt < 0.025) over(o, INK, 0.3);
    if (k === 'hardhat') { const g = G(c.ny - 0.6, 0, 0.12, 1) * Math.max(0, c.nz); if (g > 0.3) over(o, WHITE, 0.35 * g); }
  }

  void hemAt; void sstep; void INK;
  return { hairTube: hairTubePx, scalp: scalpPx, hatTube: hatTubePx, scalpCover };
}
