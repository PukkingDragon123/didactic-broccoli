// Hair and hats, sculpted round the modelled head (src/people/anatomy.js headShape) as smooth tubes:
//  - the hair is one shell grown out of the scalp along every 'strand column' from the crown pole down to the hem,
//    following the skull (short cuts) or falling free below the widest part of the head (bobs, long hair, which sweeps
//    back over the shoulders and rides on the chest so the head can turn); thickness varies column to column so the
//    silhouette breaks into locks; the hem itself is cut per pixel by the painter (alpha), so fringes, sideburns and
//    tips are jagged strands rather than mesh edges;
//  - pony / twin tails hang from spring-driven tail bones, buns, quiffs, spikes and tufts are tubes of their own;
//  - buzz cuts and bald heads are painted straight onto the scalp (paint.js headPx);
//  - hats: crowns that fit the skull (and the hair under them), brims as rings, visors as plates.
import { seg } from './body.js';
import { garbSegments } from './garb.js';
import { headShape, section } from './anatomy.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const W1 = (b) => [[b, 1]];
const WB = (a, b, t) => (t <= 0.001 ? W1(a) : t >= 0.999 ? W1(b) : [[a, 1 - t], [b, t]]);
const hash = (i, s) => { let h = Math.imul(i * 374761393 + s * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 10000) / 10000; };

/** Piecewise-linear in |angle| (radians, 0 = front .. PI = back). */
const keys = (K) => (A) => {
  if (A <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) if (A <= K[i + 1][0]) { const t = (A - K[i][0]) / (K[i + 1][0] - K[i][0]); return lerp(K[i][1], K[i + 1][1], smooth(t) * 0.6 + t * 0.4); }
  return K[K.length - 1][1];
};

/** Style table: shell thickness (head units), how it falls, the hem (y of the strand tips by angle), extras. */
function styleOf(spec, P) {
  const st = spec.hair.style, hu = P.hu, H = P.H, vol = spec.hair.volume || 1, f = P.f, part = spec.hair.part || 0;
  const { hairY, browY, earTop, earBot, napeY, chin } = P;
  const shortBack = [[1.62, earTop + 0.03 * hu], [1.98, earTop + 0.02 * hu], [2.35, napeY + 0.05 * hu], [Math.PI, napeY - 0.01 * hu]];
  const tightSides = [[1.3, earTop + 0.07 * hu], [1.6, earTop + 0.02 * hu], [1.98, earTop + 0.03 * hu], [2.4, napeY + 0.03 * hu], [Math.PI, napeY]];
  const longLen = spec.age === 'teen' ? P.shoulderY - 0.035 * H : spec.age === 'kid' ? P.shoulderY : P.bustY + 0.01 * H;
  switch (st) {
    case 'short': case 'sidepart': return {
      th: 0.05 * vol, mode: 'follow', locks: 5, side: st === 'sidepart', part: st === 'sidepart' ? part || 1 : 0,
      hem: keys([[0, hairY - (st === 'sidepart' ? 0.015 : 0.05) * hu], [0.8, hairY - 0.07 * hu], [1.3, earTop + 0.06 * hu], [1.42, earBot + 0.07 * hu], [1.56, earBot + 0.07 * hu], ...shortBack]),
      sweep: st === 'sidepart' ? 0.5 : 0.2,
    };
    case 'messy': return {
      th: 0.065 * vol, mode: 'follow', locks: 4, jag: 2.2,
      hem: keys([[0, browY + 0.05 * hu], [0.9, browY + 0.09 * hu], [1.3, earTop - 0.01 * hu], [1.9, earTop - 0.05 * hu], [2.4, napeY - 0.02 * hu], [Math.PI, napeY - 0.04 * hu]]),
    };
    case 'mushroom': case 'bowl': return {
      th: (st === 'bowl' ? 0.05 : 0.075) * vol, mode: 'follow', locks: 6, jag: 0.6, blunt: true,
      hem: keys(st === 'bowl' ? [[0, browY + 0.04 * hu], [1.2, browY + 0.02 * hu], [1.5, earTop + 0.01 * hu], [2.1, earTop + 0.0 * hu], [Math.PI, napeY + 0.01 * hu]]
        : [[0, browY + 0.02 * hu], [0.9, browY + 0.0 * hu], [1.35, earBot - 0.01 * hu], [2.0, earBot - 0.02 * hu], [Math.PI, napeY - 0.03 * hu]]),
    };
    case 'bob': return {
      th: 0.055 * vol, mode: 'fall', locks: 6, flare: 0.12, jag: 0.8, blunt: true,
      hem: keys([[0, browY + 0.03 * hu], [0.72, browY + 0.04 * hu], [0.86, chin + 0.12 * hu], [1.4, chin + 0.07 * hu], [Math.PI, chin + 0.1 * hu]]),
    };
    case 'long': return {
      th: 0.045 * vol, mode: 'fall', locks: 5, flare: 0.06, jag: 1.8, long: longLen, sweep: 0,
      hem: keys([[0, browY + 0.035 * hu], [0.7, browY + 0.05 * hu], [0.86, longLen + 0.06 * H], [1.3, longLen + 0.02 * H], [Math.PI, longLen]]),
      sideBangs: !!part,
    };
    case 'ponytail': case 'twintails': case 'pigtails': case 'bun': return {
      th: 0.032 * vol, mode: 'follow', locks: 4, tight: true, part: part || 1,
      hem: keys([[0, st === 'ponytail' || st === 'bun' ? hairY - 0.02 * hu : browY + 0.06 * hu], [0.5, st === 'ponytail' || st === 'bun' ? hairY - 0.04 * hu : browY + 0.09 * hu], [0.95, hairY - 0.12 * hu], ...tightSides]),
      sideBangs: st !== 'ponytail' && st !== 'bun',
    };
    case 'perm': return {
      th: 0.1, mode: 'follow', locks: 3, curls: true, jag: 1.2,
      hem: keys([[0, hairY - 0.06 * hu], [1.1, earTop + 0.03 * hu], [1.7, earBot + 0.07 * hu], [2.3, napeY + 0.04 * hu], [Math.PI, napeY + 0.02 * hu]]),
    };
    case 'pompadour': return {
      th: 0.045, mode: 'follow', locks: 5, slick: true,
      hem: keys([[0, hairY - 0.01 * hu], [0.8, hairY - 0.05 * hu], [1.3, earTop + 0.06 * hu], [1.42, earBot + 0.08 * hu], [1.56, earBot + 0.08 * hu], ...shortBack]),
    };
    case 'rohan': return {
      th: 0.06 * vol, mode: 'follow', locks: 5, flareTh: 0.3, jag: 1.4, part: part || 1,
      hem: keys([[0, browY + 0.04 * hu], [0.9, browY + 0.08 * hu], [1.3, earTop - 0.03 * hu], [1.95, earBot - 0.0 * hu], [2.5, napeY - 0.03 * hu], [Math.PI, napeY - 0.04 * hu]]),
    };
    case 'spiky': return {
      th: 0.026, mode: 'follow', locks: 4,
      hem: keys([[0, hairY - 0.03 * hu], [0.8, hairY - 0.06 * hu], [1.3, earTop + 0.06 * hu], ...shortBack]),
    };
    default: return null; // buzz, bald, none: painted on the scalp
  }
}

export function hairSegments(spec, P, J) {
  const S = spec.garb ? garbSegments(spec, P, J) : [], hu = P.hu, H = P.H, st = spec.hair.style, hat = spec.hat?.kind;
  const head = headShape(spec, P);
  const add = (part, bone, mat, y0, y1, b, t, o) => { const x = seg(part, bone, mat, y0, y1, b, t, o); S.push(x); return x; };
  void add;
  const covered = hat && hat !== 'headband'; // a hat / hood: only the hair under the band
  const yBand = P.browY + (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat' ? 0.15 : 0.2) * hu;
  const sty = styleOf(spec, P);
  const seed = (spec.seed || 1) * 31 + st.length;
  // ---------------- the shell
  let shellTh = 0;
  if (sty) {
    const N = sty.long ? 12 : 14, M = sty.mode === 'fall' ? 8 : 6;
    const th0 = sty.th * hu;
    shellTh = th0;
    // per column: thickness jitter (locks in the silhouette), the hem
    const colTh = [], colHem = [];
    const yFall = P.browY + 0.08 * hu;
    const A = (k) => Math.PI + (k / N) * Math.PI * 2; // section angle of column k (0 = front)
    for (let k = 0; k < N; k++) {
      const a = Math.atan2(Math.sin(A(k)), Math.cos(A(k)));
      const side = Math.sign(a) || 1, Aa = Math.abs(a);
      let th = th0 * (0.84 + 0.32 * hash(k, seed)) * (1 + (sty.flareTh || 0) * smooth((Aa - 1.0) / 1.2));
      if (sty.tight) th *= Aa < 1.0 ? 1 : lerp(1, 0.7, smooth((Aa - 1.0) / 0.8));
      if (sty.side && sty.part) th *= 1 + 0.25 * G1(a - sty.part * 0.5, 0.5); // the swept side is fuller
      colTh.push(th);
      // the mesh reaches a little past the lowest tip of its neighbours (the painter cuts the exact hem)
      let lo = Infinity;
      for (const d of [-1.3, -0.65, 0, 0.65, 1.3]) lo = Math.min(lo, hemAt(sty, P, a + d * (Math.PI * 2 / N)));
      colHem.push(lo - 0.035 * hu * (sty.jag || 1));
      void side;
    }
    // ring s (0 = crown .. 1 = hem) on column k
    const point = (k, s) => {
      const a = A(k), yh = colHem[k];
      const y = P.crown - (P.crown - yh) * s * s;
      // short cuts taper to the skin at the nape and over the ears (a fade), thick fringes stay thick
      const Aa = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      const th = colTh[k] * (sty.mode === 'follow' && !sty.blunt && Aa > 0.9 ? lerp(0.3, 1, smooth((y - yh) / (0.14 * hu))) : 1);
      if (covered && y > yBand + 0.005 * hu) return head.at(a, y, 0.002 * hu); // tucked under the hat
      if (sty.mode === 'follow' || y >= yFall || covered) {
        const p = head.at(a, Math.max(y, P.chin + 0.12 * hu), th);
        if (y < P.chin + 0.12 * hu) p[1] = y;
        return p;
      }
      // falling free below the widest part of the head
      const p = head.at(a, yFall, th), sec = head.sec(yFall);
      const d = yFall - y, rx = p[0], rz = p[2] - sec.cz, rl = Math.hypot(rx, rz) || 1;
      const fl = (sty.flare || 0) * d * (0.6 + 0.4 * Math.abs(Math.sin(a)));
      let x = p[0] + rx / rl * fl, z = p[2] + rz / rl * fl;
      if (sty.long && y < P.chin) {
        // long hair sweeps back over the shoulders: the sides go behind the neck / shoulders
        const k2 = smooth((P.chin - y) / (P.chin - P.neckBase + 0.03 * H));
        const zb = -P.chestZ * 0.7 - th * 0.5 - 0.01 * H * (1 - Math.abs(Math.cos(a)));
        z = lerp(z, Math.min(z, zb + Math.cos(a) * 0.02 * H), k2);
        x = lerp(x, Math.sign(x) * Math.min(Math.abs(x) * 1.05, P.hw * 1.25), k2);
        // and lies on the back below the shoulders
        const k3 = smooth((P.shoulderY - y) / (0.06 * H));
        z = lerp(z, Math.min(z, -P.chestZ * 0.95 - 0.006 * H), k3);
      }
      return [x, y, z];
    };
    const rings = [];
    for (let i = M; i >= 0; i--) {
      const s = i / M;
      const pts = [];
      for (let k = 0; k < N; k++) pts.push(point(k, s));
      const yAvg = pts.reduce((m, p) => m + p[1], 0) / N, yMin = Math.min(...pts.map((p) => p[1]));
      const c = [0, yAvg, head.sec(clamp(yAvg, P.chin + 0.12 * hu, P.crown)).cz];
      // long hair below the chin rides on the chest (the head turns inside it)
      const w = sty.long && yMin < P.chin ? (yMin < P.neckBase - 0.01 * H ? W1('chest') : WB('head', 'chest', (P.chin - yMin) / (P.chin - P.neckBase + 0.01 * H))) : W1('head');
      rings.push({ pts, c, w, keep: i === M || i === 0 });
    }
    S.push({
      tube: true, closed: true, part: 'hairShell', mat: 'hair', N, lodMinN: 8, rings, dens: 1.05,
      double: sty.long ? 0.003 * hu : 0,
      meta: { sty, P, hem: (a) => (covered ? yBand - 0.01 * hu : hemAt(sty, P, a)), A0: Math.PI, seed, covered },
    });
  }
  // ---------------- tails, buns, quiffs, spikes, tufts
  const tailTube = (bone, len, w, x, y, z, swing) => {
    J[bone] = [x, y, z];
    const path = [], n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bulge = t < 0.25 ? lerp(0.55, 1.0, t / 0.25) : lerp(1.0, 0.45, ((t - 0.25) / 0.75) ** 1.3);
      const r = w * (i === 0 ? 0.45 : bulge);
      path.push({ c: [x + swing * Math.sin(t * 2.2) * 0.02 * H * Math.sign(x || 1), y + 0.015 * hu - t * len, z - 0.012 * hu - Math.sin(t * 1.6) * 0.035 * len], s: { hx: r, hzF: r * 0.9, hzB: r * 0.95, p: 2.1 }, w: W1(bone) });
    }
    path.push({ c: [path[n].c[0], path[n].c[1] - 0.02 * len, path[n].c[2]], s: { hx: w * 0.12, hzF: w * 0.1, hzB: w * 0.1 }, w: W1(bone) });
    S.push(ptubeH({ part: 'tail', mat: 'hair', N: 6, lodMinN: 8, dens: 1.1, meta: { kind: 'tail', len, seed: seed + x * 100 } }, path, [0, 0, -1]));
  };
  const tie = (bone) => { /* the hair tie is painted at the top of the tail */ void bone; };
  if (!covered && sty) {
    const zb = P.hcz - P.hd;
    if (st === 'ponytail') { tailTube('tailL', H * (spec.age === 'kid' ? 0.11 : 0.15) * (spec.hair.volume || 1), 0.03 * H * Math.sqrt(spec.hair.volume || 1), 0, P.eyeY + 0.12 * hu, zb - shellTh * 0.6, 0); tie('tailL'); }
    else if (st === 'twintails' || st === 'pigtails') {
      const len = H * (st === 'pigtails' ? 0.07 : 0.14) * (spec.hair.volume || 1), w = (st === 'pigtails' ? 0.019 : 0.022) * H;
      for (const sx of [1, -1]) tailTube(sx > 0 ? 'tailL' : 'tailR', len, w, sx * (P.hw + 0.02 * hu), P.earTop + 0.06 * hu, P.hcz - 0.3 * hu, 0.3);
    } else if (st === 'bun') {
      const cy = P.crown - 0.2 * hu, cz = zb - 0.06 * hu, r = 0.14 * hu;
      S.push(vtubeH({ part: 'bun', mat: 'hair', N: 8, lodMinN: 8, dens: 1.1, meta: { kind: 'bun', seed } }, [-1, -0.8, -0.4, 0, 0.4, 0.8, 1], (u) => ({ y: cy + u * r * 0.85, hx: r * Math.sqrt(1 - u * u * 0.96), hz: r * 0.9 * Math.sqrt(1 - u * u * 0.96), cz: cz + u * 0.02 * hu }), W1('head')));
    } else if (st === 'pompadour') {
      // a towering roll of hair over the brow, combed up and jutting forward like a ship's prow (a loft across the head)
      const vol = spec.hair.volume || 1, f = head.at(0, P.hairY, shellTh);
      const path = [], n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = (t * 2 - 1) * P.hw * 0.86, e = Math.sin(t * Math.PI);
        const k = i === 0 || i === n ? 0.05 : 0.35 + 0.65 * Math.pow(e, 0.6);
        const top = head.at(Math.atan2(x, 0.05), P.crown - 0.05 * hu, shellTh);
        path.push({ c: [x, lerp(top[1], P.hairY + 0.16 * hu * vol, 0.7) , f[2] - 0.1 * hu + 0.05 * hu * vol * e], s: { hx: 0.15 * hu * vol * k, hzF: 0.26 * hu * vol * k, hzB: 0.16 * hu * k, p: 2.2, pB: 2.4 }, w: W1('head') });
      }
      S.push(ptubeH({ part: 'quiff', mat: 'hair', N: 8, lodMinN: 8, dens: 1.0, meta: { kind: 'quiff', seed } }, path, [0, 0.35, 1]));
    } else if (st === 'spiky') {
      const SP = [[0, 0.8, 1.1], [-0.42, 0.72, 1], [0.42, 0.72, 1], [-0.2, 0.35, 1.15], [0.22, 0.38, 1.1], [-0.66, 0.3, 0.9], [0.66, 0.3, 0.9],
        [0, -0.05, 1.1], [-0.45, -0.1, 1], [0.45, -0.1, 1], [-0.25, -0.5, 0.95], [0.25, -0.5, 0.95], [-0.6, -0.42, 0.8], [0.6, -0.42, 0.8], [0, -0.8, 0.85]];
      const len = 0.24 * hu * (spec.hair.volume || 1);
      SP.forEach(([fx, fz, w], i) => {
        const a = Math.atan2(fx, fz), y0 = P.crown - (0.06 + 0.12 * Math.hypot(fx, fz) ** 2) * hu;
        const b = head.at(a, y0, shellTh * 0.5), dir = [fx * 0.75, 1, fz * 0.62], dl = Math.hypot(...dir);
        const tip = [b[0] + dir[0] / dl * len * w, b[1] + dir[1] / dl * len * w, b[2] + dir[2] / dl * len * w];
        const r = 0.08 * hu * w;
        S.push(ptubeH({ part: 'spike', mat: 'hair', N: 5, lodMinN: 9, dens: 1.0, meta: { kind: 'spike', seed: seed + i } }, [
          { c: [b[0] - dir[0] / dl * 0.03 * hu, b[1] - dir[1] / dl * 0.03 * hu, b[2] - dir[2] / dl * 0.03 * hu], s: { hx: r, hzF: r, hzB: r }, w: W1('head') },
          { c: [lerp(b[0], tip[0], 0.45), lerp(b[1], tip[1], 0.45), lerp(b[2], tip[2], 0.45)], s: { hx: r * 0.55, hzF: r * 0.55, hzB: r * 0.55 }, w: W1('head') },
          { c: tip, s: { hx: 0, hzF: 0, hzB: 0 }, w: W1('head') }], [0, 0, 1]));
      });
    } else if (st === 'rohan') {
      for (const sx of [1, -1]) {
        const b = head.at(sx * 1.85, P.earBot + 0.02 * hu, shellTh * 0.8);
        S.push(ptubeH({ part: 'tuft', mat: 'hair', N: 6, lodMinN: 9, dens: 1.0, meta: { kind: 'tuft', seed: seed + sx } }, [
          { c: [b[0] - sx * 0.02 * hu, b[1] + 0.07 * hu, b[2] + 0.01 * hu], s: { hx: 0.03 * hu, hzF: 0.05 * hu, hzB: 0.05 * hu }, w: W1('head') },
          { c: [b[0] + sx * 0.02 * hu, b[1] - 0.01 * hu, b[2] - 0.02 * hu], s: { hx: 0.022 * hu, hzF: 0.04 * hu, hzB: 0.04 * hu }, w: W1('head') },
          { c: [b[0] + sx * 0.07 * hu, b[1] - 0.06 * hu, b[2] - 0.05 * hu], s: { hx: 0, hzF: 0, hzB: 0 }, w: W1('head') }], [0, 0, 1]));
      }
    }
  }
  // ---------------- hats
  if (hat && hat !== 'hood') S.push(...hatTubes(spec, P, head, shellTh, yBand));
  return S;
}

const G1 = (x, s) => Math.exp(-(x * x) / (2 * s * s));

/** Strand-tip height at angle a (radians, 0 = front, + = left) for a style (with a side-swept fringe on side parts). */
export function hemAt(sty, P, a) {
  a = Math.atan2(Math.sin(a), Math.cos(a));
  let y = sty.hem(Math.abs(a));
  const hu = P.hu;
  if (sty.sideBangs || sty.side) {
    // a fringe swept to one side: longer on the side away from the parting
    const pt = sty.part || 1, k = G1(a + pt * 0.35, 0.45);
    y -= (sty.side ? 0.1 : 0.08) * hu * k;
  }
  if (sty.part && sty.tight && !sty.sideBangs) y += 0.0;
  return y;
}

// local tube helpers (same shapes as anatomy.js, kept here so hair can build its own)
function vtubeH(o, us, at, w) {
  const rings = us.map((u) => {
    const s = at(u), pts = section(o.N, { hx: s.hx, hzF: s.hz, hzB: s.hz, p: 2.1 }).map(([x, z]) => [(s.cx || 0) + x, s.y, s.cz + z]);
    return { pts, c: [s.cx || 0, s.y, s.cz], w };
  });
  return { tube: true, closed: true, ...o, rings };
}
function ptubeH(o, path, up) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rings = path.map((P, i) => {
    const a = path[Math.max(0, i - 1)].c, b = path[Math.min(path.length - 1, i + 1)].c;
    const T = norm(sub(b, a)), k = up[0] * T[0] + up[1] * T[1] + up[2] * T[2];
    const Z = norm([up[0] - T[0] * k, up[1] - T[1] * k, up[2] - T[2] * k]), X = cross(T, Z);
    const pts = section(o.N, P.s).map(([x, z]) => [P.c[0] + X[0] * x + Z[0] * z, P.c[1] + X[1] * x + Z[1] * z, P.c[2] + X[2] * x + Z[2] * z]);
    return { pts, c: P.c.slice(), w: P.w };
  });
  return { tube: true, closed: true, ...o, rings };
}

// ------------------------------------------------------------------ hats
function hatTubes(spec, P, head, hairTh, yBand) {
  const hu = P.hu, hat = spec.hat.kind, out = [];
  const th = Math.max(hairTh * 0.45, 0.01 * hu) + 0.012 * hu;
  // a crown that fits over the skull + hair from the band up, closed at the top (shape: top lift, front tilt)
  const crown = (part, lift, round, fwd = 0, N = 12, flat = false) => {
    const M = 4, rings = [];
    for (let i = 0; i <= M; i++) {
      const s = i / M; // 0 = band .. 1 = top
      const y = lerp(yBand, P.crown, Math.sin(s * Math.PI / 2) ** 0.9);
      const pts = [];
      for (let k = 0; k < N; k++) {
        const a = Math.PI + (k / N) * Math.PI * 2;
        const p = head.at(a, Math.min(y, P.crown - 0.002 * hu), th + 0.004 * hu * s);
        // squash towards the top into a domed lid
        const sec = head.sec(Math.min(y, P.crown - 0.002 * hu)), k2 = s ** 3 * (1 - round);
        p[0] *= 1 - k2 * 0.15; p[2] = sec.cz + (p[2] - sec.cz) * (1 - k2 * 0.12) + fwd * s * hu;
        p[1] = i === M ? P.crown + th + lift * 0.9 : p[1] + lift * s * s;
        if (i === M) { p[0] = 0; p[2] = sec.cz + fwd * hu; }
        if (flat) { // a flat cap: the crown pressed down flat and pulled forward over the brow
          const yc = P.crown + th - 0.035 * hu;
          if (p[1] > yc) p[1] = yc + (p[1] - yc) * 0.22;
          p[2] += 0.06 * hu * s * s * (0.6 + 0.4 * Math.max(0, Math.cos(a)));
        }
        pts.push(p);
      }
      rings.push({ pts, c: [0, pts[0][1], head.sec(Math.min(y, P.crown)).cz], w: W1('head') });
    }
    return { tube: true, closed: true, part, mat: 'hat', N, lodMinN: 8, rings, dens: 1.05, meta: { kind: hat } };
  };
  // a ring brim: from the band out by `w` (front / back can differ), drooping by `droop`
  const brim = (w, wF, droop, N = 12) => {
    const rings = [];
    const steps = [0, 0.5, 1];
    for (const s of steps) {
      const pts = [];
      for (let k = 0; k < N; k++) {
        const a = Math.PI + (k / N) * Math.PI * 2;
        const p = head.at(a, yBand, th + 0.002 * hu), sec = head.sec(yBand);
        const rx = p[0], rz = p[2] - sec.cz, rl = Math.hypot(rx, rz) || 1;
        const ww = lerp(w, wF, smooth(Math.cos(a) * 0.5 + 0.5)) * s;
        pts.push([p[0] + rx / rl * ww, yBand - 0.006 * hu - droop * s * s, p[2] + rz / rl * ww]);
      }
      rings.push({ pts, c: [0, yBand, head.sec(yBand).cz], w: W1('head') });
    }
    return { tube: true, closed: true, part: 'brim', mat: 'hat', N, lodMinN: 8, rings: rings.reverse(), dens: 0.95, double: 0.006 * hu, normalFix: (n) => (n[1] < 0 ? n.map((x) => -x) : n), meta: { kind: hat, brimW: Math.max(w, wF) } };
  };
  // a visor plate (caps) jutting forward from the band
  const visor = (len, wd, tilt) => {
    const f = head.at(0, yBand, th), path = [];
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const half = P.hw * wd * Math.sqrt(1 - (t * 0.92) ** 2);
      path.push({ c: [0, yBand - 0.004 * hu - tilt * t * t * hu, f[2] - 0.02 * hu + t * len * hu], s: { hx: Math.max(half, 0.002), hzF: 0.007 * hu, hzB: 0.007 * hu, p: 8 }, w: W1('head') });
    }
    return { ...ptubeH({ part: 'visor', mat: 'hat', N: 10, lodMinN: 9, dens: 1.0, meta: { kind: hat } }, path, [0, 1, 0]) };
  };
  if (hat === 'cap') { out.push(crown('hatCrown', 0.0, 0.7, -0.01)); out.push(visor(0.42, 0.8, 0.06)); }
  else if (hat === 'flatcap') { out.push(crown('hatCrown', -0.01 * hu, 0.15, 0.04, 14, true)); out.push(visor(0.24, 0.86, 0.06)); }
  else if (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat') {
    out.push(crown('hatCrown', 0.06 * hu, hat === 'schoolhat' ? 0.5 : 0.75, 0));
    const w = hat === 'sunhat' ? 0.38 * hu : hat === 'schoolhat' ? 0.24 * hu : 0.2 * hu;
    out.push(brim(w, w, hat === 'sunhat' ? 0.07 * hu : 0.05 * hu));
  } else if (hat === 'hardhat') {
    out.push(crown('hatCrown', 0.05 * hu, 0.85, 0));
    out.push(brim(0.06 * hu, 0.16 * hu, 0.02 * hu));
  } else if (hat === 'headband') {
    // tenugui headband just above the brows
    const N = 14, rings = [];
    for (const y of [P.browY + 0.1 * hu, P.browY + 0.15 * hu, P.browY + 0.2 * hu]) {
      const pts = [];
      for (let k = 0; k < N; k++) pts.push(head.at(Math.PI + (k / N) * Math.PI * 2, y, hairTh * 0.7 + 0.014 * hu));
      rings.push({ pts, c: [0, y, head.sec(y).cz], w: W1('head') });
    }
    out.push({ tube: true, closed: true, part: 'headband', mat: 'hat', N, lodMinN: 8, rings, dens: 1.1, meta: { kind: hat } });
  }
  return out;
}
