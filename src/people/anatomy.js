// The body as smooth lofted tubes (src/people/mesh.js): torso, neck, a modelled head (jaw, cheekbones, brow, crown)
// with a nose and ears, arms with deltoids / elbows / forearms, hands with a palm, four fingers and a thumb, legs with
// knees and calves, shoes with real soles and heels, skirts. Clothes are part of the same surface: a sleeve, a shirt
// tail or a trouser leg sits a little proud of the body (ease) and ends in a real hem lip.
// Rest pose (metres): feet on y = 0, facing +z, +x = the character's LEFT; limbs are authored on the left and mirrored.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ------------------------------------------------------------------ building blocks
/**
 * Cross-section: N points of a superellipse, x lateral, z forward. s = { hx, hzF, hzB, p (front), pB (back), mod }.
 * The first point sits at angle `a0` (0 = front, PI/2 = +x side); points run towards +x.
 */
export function section(N, s, a0 = Math.PI) {
  const out = [], p = s.p ?? 2.4, pB = s.pB ?? p;
  for (let k = 0; k < N; k++) {
    const a = a0 + (k / N) * Math.PI * 2, sn = Math.sin(a), cs = Math.cos(a);
    const front = cs >= 0, q = front ? p : pB;
    let x = (s.hx ?? 0) * Math.sign(sn) * Math.abs(sn) ** (2 / q);
    let z = (front ? s.hzF ?? 0 : s.hzB ?? 0) * Math.sign(cs) * Math.abs(cs) ** (2 / q);
    if (s.mod) { const d = s.mod(x, z, a); x += d[0]; z += d[1]; }
    out.push([x, z]);
  }
  return out;
}
/** Weights: one bone, or a blend a -> b (t 0..1). */
const W1 = (b) => [[b, 1]];
const WB = (a, b, t) => (t <= 0.001 ? W1(a) : t >= 0.999 ? W1(b) : [[a, 1 - t], [b, t]]);

/** A tube along +y: rings at heights ys (bottom to top), sec(y) -> section params + cx / cz, w(y) -> weights. */
export function vtube(o, ys, sec, w) {
  const N = o.N;
  const rings = ys.map((y) => {
    const s = sec(y), cx = s.cx || 0, cz = s.cz || 0;
    const pts = section(N, s, o.a0 ?? Math.PI).map(([x, z]) => [cx + x, y, cz + z]);
    return { pts, c: [cx, y, cz], w: w(y), keep: s.keep };
  });
  return { tube: true, closed: true, ...o, rings };
}

/**
 * A tube along a path: path = [{ c: [x, y, z], s: section params, w }], up: the direction the section's z points at
 * (projected off the tangent). Sections are perpendicular to the path.
 */
export function ptube(o, path, up) {
  const N = o.N;
  const rings = path.map((P, i) => {
    const a = path[Math.max(0, i - 1)].c, b = path[Math.min(path.length - 1, i + 1)].c;
    const T = norm(sub(b, a));
    const u = P.up || up;
    const k = dotv(u, T);
    const Z = norm([u[0] - T[0] * k, u[1] - T[1] * k, u[2] - T[2] * k]);
    const X = cross(T, Z);
    const pts = section(N, P.s, o.a0 ?? Math.PI).map(([x, z]) => [P.c[0] + X[0] * x + Z[0] * z, P.c[1] + X[1] * x + Z[1] * z, P.c[2] + X[2] * x + Z[2] * z]);
    return { pts, c: P.c.slice(), w: P.w, keep: P.keep };
  });
  return { tube: true, closed: true, ...o, rings };
}

/** Piecewise-linear table lookup: rows [y, ...values] sorted by y; returns the interpolated values. */
function table(rows) {
  return (y) => {
    if (y <= rows[0][0]) return rows[0].slice(1);
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i], b = rows[i + 1];
      if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0] || 1); const s = smooth(t) * 0.5 + t * 0.5; return a.slice(1).map((v, j) => lerp(v, b[j + 1], s)); }
    }
    return rows[rows.length - 1].slice(1);
  };
}
const uniq = (ys) => [...new Set(ys.map((y) => Math.round(y * 1e5) / 1e5))].sort((a, b) => a - b);
const G = (x, s) => Math.exp(-(x * x) / (2 * s * s));

// ------------------------------------------------------------------ garments: hem heights and ease (also read by paint.js)
/** Where garments end and how loose they sit (metres). */
export function garmentLines(spec, P) {
  const H = P.H, T = spec.top, Bt = spec.bottom;
  const tuck = T.tuck || ['suit', 'blazer'].includes(T.kind) ? true : T.tuck;
  const waist = P.pelvisY + 0.004 * H;
  const topHem = {
    suit: P.crotchY + 0.03 * H, blazer: P.hipY + 0.015 * H, gakuran: P.hipY + 0.004 * H, sailor: P.pelvisY - 0.008 * H, cardigan: P.hipY,
    knit: P.hipY + 0.012 * H, jacket: P.hipY + 0.01 * H, workjacket: P.hipY + 0.005 * H,
    onesie: P.crotchY - 0.006 * H, happi: P.hipY - 0.012 * H,
  }[T.kind] ?? (T.tuck ? waist : P.hipY + 0.022 * H);
  const sleeve = T.sleeve || (['tee', 'aloha', 'polo'].includes(T.kind) ? 'short' : 'long');
  const cuffY = sleeve === 'short' ? P.elbowY + (T.kind === 'tee' && T.fitted ? 0.085 : 0.065) * H : sleeve === 'mid' ? P.elbowY - 0.055 * H : P.wristY + 0.008 * H;
  const skirt = Bt.kind === 'skirt';
  const botHem = Bt.kind === 'shorts' ? P.kneeY + (spec.age === 'kid' ? 0.075 : 0.05) * H : skirt ? Infinity : P.ankleY + 0.01 * H;
  const heavy = ['suit', 'blazer', 'gakuran', 'jacket', 'workjacket', 'cardigan', 'happi', 'onesie'].includes(T.kind);
  const easeTop = (heavy ? 0.0055 : T.kind === 'knit' ? 0.0045 : tuck ? 0.002 : 0.0032) * H;
  const easeBot = (Bt.kind === 'jeans' ? 0.0022 : Bt.kind === 'cargo' || Bt.wide ? 0.0055 : Bt.kind === 'shorts' ? 0.004 : 0.0035) * H;
  const easeSleeve = (heavy ? 0.005 : T.kind === 'knit' ? 0.0042 : 0.003) * H;
  return { tuck, waist, topHem, sleeve, cuffY, skirt, botHem, easeTop, easeBot, easeSleeve, heavy };
}

// ------------------------------------------------------------------ the body
export function anatomyTubes(spec, P, J) {
  const S = [], H = P.H, hu = P.hu, f = P.f, kid = P.kid, g = garmentLines(spec, P);
  const elder = spec.age === 'elder';
  const bare = (y) => y; void bare;
  // ---------------- torso: crotch to the base of the neck
  {
    const belly = P.belly, bust = P.bust;
    const tb = table([
      // y, hx, hzF, hzB, cz, p
      [P.crotchY - 0.014 * H, 0.012 * H, 0.012 * H, 0.012 * H, -0.004 * H, 2.2],
      [P.crotchY - 0.004 * H, P.hipsX * 0.55, P.hipsZ * 0.52, P.hipsZ * 0.6, -0.004 * H, 2.4],
      [P.crotchY + 0.018 * H, P.hipsX * 0.94, P.hipsZ * 0.86, P.hipsZ * 1.02, -0.003 * H, 2.5],
      [P.hipY, P.hipsX * 1.05, P.hipsZ * 0.92, P.hipsZ * 1.1, -0.003 * H, 2.5],
      [(P.hipY + P.pelvisY) / 2, P.hipsX * 1.0, P.hipsZ * 0.96 + belly * 0.3, P.hipsZ * 1.0, -0.002 * H, 2.45],
      [P.pelvisY, (P.hipsX + P.waistX) / 2, P.waistZ * 1.04 + belly * 0.75, P.waistZ * 0.98, -0.001 * H, 2.4],
      [P.waistY, P.waistX, P.waistZ + belly * 0.7, P.waistZ * 0.94, 0.001 * H, 2.4],
      [(P.waistY + P.bustY) / 2, (P.waistX + P.bustX) / 2, (P.waistZ + P.chestZ) / 2 + belly * 0.35 + bust * 0.25, (P.waistZ + P.chestZ) / 2 * 0.98, 0.002 * H, 2.45],
      [P.bustY, P.bustX, P.chestZ * (f ? 0.92 : 1) + belly * 0.1, P.chestZ * 0.98, 0.003 * H, 2.55],
      [P.bustY + (P.shoulderY - P.bustY) * 0.55, (P.bustX + P.chestTopX) / 2 * 1.06, P.chestZ * 0.9, P.chestZ * 0.95, 0, 2.7],
      [P.shoulderY - 0.012 * H, lerp(P.chestTopX, P.shX, 0.55), P.chestZ * 0.76, P.chestZ * 0.84, -0.003 * H, 3.0],
      [P.shoulderY + 0.002 * H, lerp(P.chestTopX, P.shX, 0.42), P.chestZ * 0.56, P.chestZ * 0.62, -0.005 * H, 3.0],
      [(P.shoulderY + P.neckBase) / 2 + 0.008 * H, lerp(hu * 0.42, P.chestTopX, 0.4), P.chestZ * 0.5, P.chestZ * 0.56, -0.007 * H, 2.6],
      [P.neckBase - 0.004 * H, hu * 0.4, P.chestZ * 0.46, P.chestZ * 0.5, -0.008 * H, 2.4],
      [P.neckBase + 0.012 * H, hu * 0.2, hu * 0.18, hu * 0.18, -0.011 * H, 2.2],
    ]);
    const ys = [P.crotchY - 0.014 * H, P.crotchY - 0.004 * H, P.crotchY + 0.018 * H, P.hipY, P.pelvisY, P.waistY,
      (P.waistY + P.bustY) / 2, P.bustY, P.bustY + (P.shoulderY - P.bustY) * 0.55, P.shoulderY - 0.012 * H, P.shoulderY + 0.002 * H, (P.shoulderY + P.neckBase) / 2 + 0.008 * H, P.neckBase - 0.004 * H, P.neckBase + 0.012 * H];
    // garment layers: the top over the trousers ends in a hem lip
    const hem = g.topHem, lip = 0.0016 * H;
    if (hem > P.crotchY && hem < P.waistY + 0.02 * H) ys.push(hem - lip, hem, hem + 0.012 * H);
    const ease = (y) => {
      if (y >= hem) return g.easeTop + (y < hem + 0.012 * H ? 0.0012 * H * (1 - (y - hem) / (0.012 * H)) : 0);
      return y >= hem - lip - 1e-6 ? g.easeBot * 0.6 : g.easeBot;
    };
    const easeK = (y) => smooth((P.neckBase - 0.01 * H - y) / (0.03 * H)); // no ease up into the neck
    const mod = (y) => (x, z) => {
      let dz = 0;
      if (bust > 0) { const k = G(y - P.bustY + 0.004 * H, 0.032 * H); if (k > 0.01 && z > 0) dz += bust * 1.05 * k * G(Math.abs(x) - P.bustX * 0.44, P.bustX * 0.3) * (z / (P.chestZ + 1e-6)); }
      if (!f && !kid && z > 0) dz += 0.004 * H * G(y - P.bustY - 0.02 * H, 0.03 * H) * G(Math.abs(x) - P.bustX * 0.42, P.bustX * 0.35); // pecs
      if (z < 0) { dz -= 0.006 * H * G(y - (P.hipY - 0.01 * H), 0.035 * H) * G(Math.abs(x) - P.hipsX * 0.45, P.hipsX * 0.35); // seat
        dz -= 0.003 * H * G(y - (P.bustY + 0.03 * H), 0.04 * H) * G(Math.abs(x) - P.bustX * 0.45, P.bustX * 0.3); } // shoulder blades
      if (elder && z < 0) dz -= 0.006 * H * G(y - (P.shoulderY - 0.03 * H), 0.05 * H); // a rounded upper back
      return [0, dz];
    };
    S.push(vtube({ part: 'torso', mat: 'body', N: 9, lodMinN: 8, dens: 1, partAt: (c) => (c.y < P.hipY ? 'hipsLo' : c.y < P.pelvisY ? 'hipsUp' : c.y < P.waistY ? 'spine' : c.y < P.bustY ? 'chestLo' : c.y < P.shoulderY - 0.004 * H ? 'chestHi' : 'traps') },
      uniq(ys), (y) => {
        const [hx, hzF, hzB, cz, p] = tb(y), e = ease(y) * easeK(y);
        return { hx: hx + e, hzF: hzF + e, hzB: hzB + e, cz, p, pB: p - 0.15, mod: mod(y) };
      }, (y) => {
        if (y < P.pelvisY - 0.03 * H) return W1('hips');
        if (y < P.pelvisY + 0.02 * H) return WB('hips', 'spine', (y - P.pelvisY + 0.03 * H) / (0.05 * H));
        if (y < P.waistY - 0.025 * H) return W1('spine');
        if (y < P.waistY + 0.03 * H) return WB('spine', 'chest', (y - P.waistY + 0.025 * H) / (0.055 * H));
        return W1('chest');
      }));
  }
  // ---------------- neck
  {
    const nw = hu * (f ? 0.19 : kid ? 0.2 : 0.215), nd = hu * 0.21;
    const y0 = P.neckBase - 0.03 * H, y3 = P.chin + 0.2 * hu;
    S.push(vtube({ part: 'neck', mat: 'skin', N: 6, lodMinN: 8 }, [y0, P.neckBase - 0.004 * H, (P.neckBase + P.chin) / 2, P.chin + 0.1 * hu, y3], (y) => {
      const t = (y - y0) / (y3 - y0);
      return { hx: nw * (1.08 - 0.1 * t), hzF: nd * (0.92 - 0.06 * t), hzB: nd * (1.0 - 0.04 * t), cz: lerp(-0.012 * H, -0.006 * H, t), p: 2.1 };
    }, (y) => (y < P.neckBase - 0.012 * H ? W1('chest') : y > P.chin + 0.05 * hu ? WB('neck', 'head', 0.6) : W1('neck'))));
  }
  // ---------------- a modelled collar round the neck (shirts, polos, blouses, jackets, the gakuran's standing collar)
  {
    const k = spec.top.kind, base = P.neckBase;
    const top = ['suit', 'flannel', 'workjacket'].includes(k) || (k === 'shirt' && !spec.top.open) ? base + 0.03 * H : k === 'gakuran' ? base + 0.04 * H
      : ['polo', 'jacket', 'blazer', 'cardigan', 'blouse'].includes(k) ? base + 0.022 * H : 0;
    if (top) {
      const nw = hu * (f ? 0.19 : kid ? 0.2 : 0.215), nd = hu * 0.21, y0 = base - 0.012 * H, stand = k === 'gakuran';
      S.push(vtube({ part: 'collar', mat: 'collar', N: 10, lodMinN: 8, dens: 1.1, double: 0.0016 * H }, [y0, base, top], (y) => {
        const t = (y - y0) / (top - y0), spread = stand ? 1.06 : lerp(1.32, 1.08, smooth(t * 1.4));
        return { hx: nw * spread + 0.004 * H, hzF: nd * spread * (stand ? 1.0 : 0.96) + 0.004 * H, hzB: nd * spread + 0.004 * H, cz: lerp(-0.012 * H, -0.009 * H, t), p: 2.2 };
      }, (y) => (y < base + 0.004 * H ? W1('chest') : WB('chest', 'neck', 0.45))));
    }
  }
  // ---------------- head
  S.push(...headTubes(spec, P));
  // ---------------- arms (left)
  {
    const ax = P.shX, aw = P.armX;
    const cuff = g.cuffY, es = g.easeSleeve, lip = 0.0014 * H;
    const tb = table([
      // y, hx (lateral), hzF, hzB, cx offset, cz
      [P.wristY - 0.004 * H, aw * 0.44, aw * 0.58, aw * 0.58, 0, 0.003 * H],
      [P.wristY + 0.012 * H, aw * 0.47, aw * 0.62, aw * 0.6, 0, 0.002 * H],
      [(P.elbowY + P.wristY) / 2, aw * 0.6, aw * 0.68, aw * 0.68, 0, 0.001 * H],
      [P.elbowY - 0.035 * H, aw * 0.74, aw * 0.8, aw * 0.78, 0, 0],
      [P.elbowY - 0.008 * H, aw * 0.72, aw * 0.74, aw * 0.8, 0, -0.001 * H],
      [P.elbowY + 0.012 * H, aw * 0.72, aw * 0.74, aw * 0.78, 0, -0.001 * H],
      [P.elbowY + 0.04 * H, aw * 0.8, aw * 0.86, aw * 0.8, 0, 0],
      [(P.shoulderY + P.elbowY) / 2 + 0.01 * H, aw * 0.86, aw * 0.92, aw * 0.84, 0, 0],
      [P.shoulderY - 0.032 * H, aw * 0.93, aw * 0.94, aw * 0.9, aw * 0.02, 0],
      [P.shoulderY - 0.01 * H, aw * 0.86, aw * 0.88, aw * 0.84, -aw * 0.1, 0],
      [P.shoulderY + 0.003 * H, aw * 0.62, aw * 0.7, aw * 0.66, -aw * 0.3, -0.001 * H],
      [P.shoulderY + 0.009 * H, aw * 0.08, aw * 0.08, aw * 0.08, -aw * 0.45, -0.001 * H],
    ]);
    const ys = [P.wristY - 0.004 * H, P.wristY + 0.012 * H, P.elbowY - 0.035 * H, P.elbowY, P.elbowY + 0.04 * H, P.shoulderY - 0.032 * H, P.shoulderY - 0.01 * H, P.shoulderY + 0.003 * H, P.shoulderY + 0.009 * H];
    if (cuff > P.wristY && cuff < P.shoulderY - 0.02 * H) ys.push(cuff - lip, cuff, cuff + 0.01 * H);
    const ease = (y) => (y >= cuff ? es + (y < cuff + 0.01 * H ? 0.001 * H * (1 - (y - cuff) / (0.01 * H)) : 0) * (g.sleeve === 'short' ? 1.6 : 0.8) : 0);
    S.push(vtube({ part: 'arm', mat: 'body', N: 6, lodMinN: 8, mirror: true, a0: -Math.PI / 2, partAt: (c) => (c.y > P.elbowY ? 'uarm' : 'farm') }, uniq(ys), (y) => {
      const [hx, hzF, hzB, ox, cz] = tb(y), e = y > P.shoulderY ? ease(y) * smooth((P.shoulderY + 0.009 * H - y) / (0.006 * H)) : ease(y);
      return { hx: hx + e, hzF: hzF + e, hzB: hzB + e, cx: ax + ox, cz, p: 2.2 };
    }, (y) => (y > P.elbowY + 0.022 * H ? W1('armL') : y < P.elbowY - 0.022 * H ? W1('foreL') : WB('foreL', 'armL', (y - P.elbowY + 0.022 * H) / (0.044 * H)))));
  }
  // ---------------- hands (left)
  S.push(...handTubes(spec, P));
  // ---------------- legs (left)
  {
    const lx = P.hipX, tw = P.thighX;
    const hem = g.botHem, eb = g.easeBot, lip = 0.0016 * H;
    const tb = table([
      // y, hx, hzF, hzB, cx, cz
      [P.ankleY - 0.012 * H, tw * 0.34, tw * 0.36, tw * 0.4, lx + 0.002 * H, -0.004 * H],
      [P.ankleY + 0.012 * H, tw * 0.36, tw * 0.38, tw * 0.42, lx + 0.002 * H, -0.004 * H],
      [P.ankleY + 0.06 * H, tw * 0.42, tw * 0.44, tw * 0.5, lx + 0.001 * H, -0.004 * H],
      [P.kneeY - 0.12 * H, tw * 0.56, tw * 0.52, tw * 0.74, lx, -0.006 * H],
      [P.kneeY - 0.06 * H, tw * 0.62, tw * 0.6, tw * 0.74, lx - 0.001 * H, -0.004 * H],
      [P.kneeY - 0.012 * H, tw * 0.6, tw * 0.66, tw * 0.6, lx - 0.002 * H, 0],
      [P.kneeY + 0.02 * H, tw * 0.64, tw * 0.68, tw * 0.62, lx - 0.002 * H, 0.001 * H],
      [P.kneeY + 0.07 * H, tw * 0.76, tw * 0.78, tw * 0.74, lx - 0.001 * H, 0.001 * H],
      [(P.kneeY + P.crotchY) / 2 + 0.02 * H, tw * 0.88, tw * 0.9, tw * 0.88, lx, 0],
      [P.crotchY, tw * 0.98, tw * 0.98, tw * 1.02, lx + 0.002 * H, -0.001 * H],
      [P.hipY, tw * 1.02, tw * 1.0, tw * 1.06, lx + 0.004 * H, -0.002 * H],
      [P.hipY + 0.03 * H, tw * 0.9, tw * 0.9, tw * 0.94, lx + 0.003 * H, -0.002 * H],
    ]);
    const ys = [P.ankleY - 0.012 * H, P.ankleY + 0.06 * H, P.kneeY - 0.08 * H, P.kneeY, P.crotchY, P.hipY + 0.03 * H];
    if (hem < P.hipY) ys.push(hem - lip, hem, hem + 0.012 * H);
    // trousers fall straight from the thigh: below the knee they don't follow the calf in
    const trouser = (y, hx, hzF, hzB) => {
      if (y < hem - 1e-6) return [hx, hzF, hzB];
      const k = smooth((P.kneeY + 0.02 * H - y) / (0.3 * H)), fall = Bt(spec) === 'wide' ? 1 : 0.6;
      const tx = Math.max(hx, lerp(hx, tw * (0.66 + 0.1 * fall), k * fall)), tzF = Math.max(hzF, lerp(hzF, tw * (0.68 + 0.1 * fall), k * fall)), tzB = Math.max(hzB, lerp(hzB, tw * (0.7 + 0.1 * fall), k * fall));
      const e = y >= hem + 1e-6 ? eb + (y < hem + 0.012 * H ? 0.0012 * H * (1 - (y - hem) / (0.012 * H)) : 0) : eb * 0.5;
      return [tx + e, tzF + e, tzB + e];
    };
    const longTrousers = hem < P.ankleY + 0.05 * H;
    const tobi = spec.bottom.kind === 'tobi', loose = spec.legs === 'loosesocks';
    if (tobi) ys.push(P.ankleY + 0.07 * H, P.ankleY + 0.09 * H, P.kneeY - 0.03 * H, P.kneeY + 0.04 * H);
    if (loose) ys.push(P.ankleY + 0.02 * H, P.ankleY + 0.05 * H, P.ankleY + 0.08 * H, P.ankleY + 0.105 * H, P.ankleY + 0.115 * H);
    S.push(vtube({ part: 'leg', mat: 'body', N: 7, lodMinN: 8, mirror: true, a0: -Math.PI / 2, partAt: (c) => (c.y > P.kneeY ? 'thigh' : c.y > P.kneeY - 0.1 * H ? 'calf' : 'shin') }, uniq(ys), (y) => {
      let [hx, hzF, hzB, cx, cz] = tb(y);
      if (longTrousers || y >= hem - 1e-6) [hx, hzF, hzB] = trouser(y, hx, hzF, hzB);
      let mod = null;
      if (tobi) {
        // tobi trousers: a balloon from the hip to below the knee, wrapped tight round the shin above the boots
        const b = y > P.ankleY + 0.08 * H ? 1.05 + 0.38 * Math.sin(Math.PI * clamp((y - (P.ankleY + 0.08 * H)) / (P.hipY - P.ankleY - 0.08 * H), 0, 1)) ** 0.7 : 1.0;
        const ty = Math.max(tw * 0.5, hx);
        hx = Math.max(hx, ty * b); hzF = Math.max(hzF, ty * b * 1.02); hzB = Math.max(hzB, ty * b * 1.04);
        mod = (x, z, a) => { const r = Math.hypot(x, z) || 1, d = 0.004 * H * Math.sin(a * 5 + y * 60) * (b - 1); return [x / r * d, z / r * d]; };
      }
      if (loose && y < P.ankleY + 0.115 * H) {
        // loose socks: slouched rings of white knit bunched round the ankle
        const t = clamp((y - P.ankleY) / (0.115 * H), 0, 1), b = 1.25 + 0.3 * Math.sin(t * Math.PI) + 0.12 * Math.sin(t * 19);
        hx *= b; hzF *= b; hzB *= b;
        mod = (x, z, a) => { const r = Math.hypot(x, z) || 1, d = 0.003 * H * Math.sin(a * 4 + t * 9); return [x / r * d, z / r * d]; };
      }
      return { hx, hzF, hzB, cx, cz, p: 2.15, mod };
    }, (y) => (y > P.kneeY + 0.025 * H ? W1('thighL') : y < P.kneeY - 0.025 * H ? W1('shinL') : WB('shinL', 'thighL', (y - P.kneeY + 0.025 * H) / (0.05 * H)))));
  }
  // ---------------- feet / shoes (left)
  S.push(...shoeTubes(spec, P));
  // ---------------- skirt
  if (g.skirt) S.push(skirtTube(spec, P));
  return S;
}
const Bt = (spec) => (spec.bottom.wide ? 'wide' : spec.bottom.kind);

// ------------------------------------------------------------------ head, nose, ears
/** The head's shape: rows of [t (0 chin .. 1 crown), half width, front z, back z, front exponent]. */
function headRows(spec, P) {
  const hu = P.hu, hw = P.hw, hd = P.hd, hcz = P.hcz, zf = P.zf, f = P.f, kid = P.kid;
  const chinW = hu * (kid ? 0.25 : f ? 0.2 : 0.235), jaw = hw * (f ? 0.9 : kid ? 0.93 : 0.96);
  const ty = (v) => (v - P.chin) / hu;
  const eye = ty(P.eyeY), brow = ty(P.browY), nose = ty(P.noseY), mouth = ty(P.mouthY);
  return { eye, brow, nose, mouth, rows: [
    [0.0, chinW * 0.3, zf - 0.075 * hu, zf - 0.13 * hu, 2.2],
    [0.03, chinW * 0.7, zf - 0.04 * hu, zf - 0.2 * hu, 2.3],
    [0.09, lerp(chinW, jaw, 0.45), zf - 0.03 * hu, hcz - hd * 0.05, 2.35],
    [mouth, lerp(chinW, jaw, 0.85), zf - 0.03 * hu, hcz - hd * 0.45, 2.15],
    [nose, jaw * 1.0, zf - 0.04 * hu, hcz - hd * 0.78, 2.2],
    [(nose + eye) / 2, hw * 0.995, zf - 0.035 * hu, hcz - hd * 0.9, 2.25],
    [eye, hw, zf - 0.05 * hu, hcz - hd * 0.96, 2.25],
    [brow, hw * 0.99, zf - 0.03 * hu, hcz - hd * 1.0, 2.2],
    [(brow + 0.86) / 2 + 0.03, hw * 0.985, zf - 0.065 * hu, hcz - hd * 1.03, 2.3],
    [0.86, hw * 0.93, zf - 0.14 * hu, hcz - hd * 0.98, 2.2],
    [0.93, hw * 0.78, zf - 0.25 * hu, hcz - hd * 0.84, 2.15],
    [0.975, hw * 0.52, zf - 0.42 * hu, hcz - hd * 0.58, 2.1],
    [1.0, hw * 0.04, hcz - 0.03 * hu, hcz - 0.07 * hu, 2],
  ] };
}

/**
 * The head surface for hair and hats: sec(y) -> { hx, hz, cz, p }, at(a, y, off) -> [x, y, z] on the skull at angle a
 * (0 = front, PI/2 = the left side) pushed out by `off` along the surface normal.
 */
export function headShape(spec, P) {
  const { rows } = headRows(spec, P), hu = P.hu;
  const tb = table(rows.map((r) => [r[0], ...r.slice(1)]));
  const sec = (y) => { const [hx, zF, zB, p] = tb((y - P.chin) / hu); return { hx, hz: (zF - zB) / 2, cz: (zF + zB) / 2, p }; };
  const pt = (a, y) => {
    const s = sec(Math.min(P.crown, y)), sn = Math.sin(a), cs = Math.cos(a), q = cs >= 0 ? s.p : 2.05;
    return [s.hx * Math.sign(sn) * Math.abs(sn) ** (2 / q), y, s.cz + s.hz * Math.sign(cs) * Math.abs(cs) ** (2 / q)];
  };
  const at = (a, y, off = 0) => {
    const p = pt(a, y);
    if (!off) return p;
    // normal: the horizontal outward direction tilted up by the profile's slope (numeric)
    const e = 0.004 * hu, pa = pt(a, y + e), pb = pt(a, y - e), sa = pt(a + 0.02, y), sb = pt(a - 0.02, y);
    let n = cross(sub(sa, sb), sub(pa, pb));
    const out = [p[0], 0, p[2] - sec(y).cz];
    if (dotv(n, out) < 0) n = n.map((x) => -x);
    if (y >= P.crown - 1e-4) n = [0, 1, 0];
    n = norm(n);
    return [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off];
  };
  return { sec, at };
}

function headTubes(spec, P) {
  const hu = P.hu, hw = P.hw, hd = P.hd, hcz = P.hcz, zf = P.zf, f = P.f, kid = P.kid;
  const t = (y) => (y - P.chin) / hu;
  const y = (tt) => P.chin + tt * hu;
  const { eye, brow, nose, mouth, rows } = headRows(spec, P);
  const tb = table(rows.map((r) => [r[0], ...r.slice(1)]));
  const ts = uniq([...rows.map((r) => r[0]), (mouth + nose) / 2, (eye + brow) / 2]);
  const head = vtube({ part: 'head', mat: 'head', N: 18, lodMinN: 8, block: 'face', blockNz: 0.12, dens: 1.25, partAt: (c) => (c.y < P.noseY ? 'jaw' : 'cranium') }, ts.map(y), (yy) => {
    const [hx, zF, zB, p] = tb(t(yy)), cz = (zF + zB) / 2, hz = (zF - zB) / 2;
    const tt = t(yy);
    // cheekbones: the front corners a little fuller between the nose and the eyes; a slight temple hollow above
    const mod = (x, z) => {
      if (z <= 0) return [0, 0];
      const corner = Math.abs(x) / (hx + 1e-6) * (z / (hz + 1e-6));
      const ck = 0.012 * hu * G(tt - (nose + eye) / 2, 0.08) * corner * 2 - 0.006 * hu * G(tt - brow - 0.08, 0.06) * corner * 2;
      const ax = Math.abs(x) / (hw + 1e-6), front = Math.max(0, z / (hz + 1e-6)) ** 3;
      let dz = 0.014 * hu * G(tt - brow + 0.01, 0.035) * G(ax - 0.42, 0.28) // brow ridge
        - 0.016 * hu * G(tt - eye, 0.045) * G(ax - 0.4, 0.17) // eye sockets
        + 0.012 * hu * G(tt - mouth, 0.03) * G(ax, 0.24) // lips
        - 0.006 * hu * G(tt - (mouth - 0.06), 0.02) * G(ax, 0.2) // under the lower lip
        + 0.01 * hu * G(tt - 0.05, 0.035) * G(ax, 0.22); // chin
      return [Math.sign(x) * ck * 0.5, ck + dz * front];
    };
    return { hx, hzF: hz, hzB: hz, cz, p, pB: 2.05, mod };
  }, () => W1('head'));
  // the nose: bridge to tip, wings at the base, closed underneath (nostrils painted there)
  const nz = kid ? 0.72 : f ? 0.84 : 1;
  const nb = P.noseY - 0.012 * hu, nt = P.eyeY - 0.03 * hu;
  const nrows = [
    [nb - 0.004 * hu, 0.004 * hu, zf + 0.0 * hu, 0.004 * hu],
    [nb, 0.05 * hu * nz, zf - 0.004 * hu, 0.026 * hu * nz],
    [nb + 0.026 * hu, 0.052 * hu * nz, zf - 0.003 * hu, 0.026 * hu * nz],
    [nb + 0.07 * hu, 0.04 * hu * nz, zf - 0.016 * hu, 0.018 * hu * nz],
    [lerp(nb, nt, 0.72), 0.038 * hu, zf - 0.03 * hu, 0.013 * hu],
    [nt, 0.036 * hu, zf - 0.042 * hu, 0.01 * hu],
  ];
  const ntb = table(nrows);
  const noseT = vtube({ part: 'nose', mat: 'nose', N: 6, lodMinN: 11, block: 'face', blockNz: 0.25, blockNy: -0.45, dens: 1.4 }, nrows.map((r) => r[0]), (yy) => {
    const [hx, cz, hzF] = ntb(yy);
    return { hx, hzF, hzB: hzF * 0.4, cz, p: 2.0, pB: 2.2 };
  }, () => W1('head'));
  // ears (left; mirrored): a thin shell, tilted back
  const ex = hw - 0.004 * hu, ez = hcz - 0.11 * hu;
  const erows = [
    [P.earBot - 0.01 * hu, 0.006 * hu, 0.012 * hu, 0],
    [(P.earBot + P.earTop) / 2, 0.022 * hu, 0.05 * hu, 0.0],
    [P.earTop + 0.012 * hu, 0.008 * hu, 0.02 * hu, -0.012 * hu],
  ];
  const etb = table(erows);
  const ear = vtube({ part: 'ear', mat: 'ear', N: 6, lodMinN: 9, mirror: true, dens: 1.5, a0: -Math.PI / 2 }, erows.map((r) => r[0]), (yy) => {
    const [hx, hz, dz] = etb(yy);
    return { hx, hzF: hz, hzB: hz * 0.9, cx: ex + hx * 0.9, cz: ez + dz, p: 2.2 };
  }, () => W1('head'));
  return [head, noseT, ear];
}

// ------------------------------------------------------------------ hands
function handTubes(spec, P) {
  const H = P.H, f = P.f, hs = f ? 0.92 : 1, out = [];
  const ax = P.shX, hz = 0.004 * H; // hand centre (palm faces -x, the thumb side is +z)
  const k = H * hs; // hand scale
  const wr = P.wristY, kn = wr - 0.05 * k; // knuckle line
  // palm: thick at the heel, flatter and wider at the knuckles
  out.push(vtube({ part: 'palm', mat: 'hand', N: 6, lodMinN: 9, mirror: true, dens: 1.5, a0: -Math.PI / 2 }, [kn - 0.004 * k, kn + 0.006 * k, wr - 0.03 * k, wr - 0.008 * k, wr + 0.008 * H], (y) => {
    const t = clamp((wr - y) / (wr - kn), 0, 1.1);
    return { hx: lerp(0.0092, 0.0074, t) * k, hzF: lerp(0.019, 0.0235, t) * k, hzB: lerp(0.019, 0.0228, t) * k, cx: ax - 0.0012 * k - t * 0.0016 * k, cz: hz + (y < kn ? 0.0005 * k : 0), p: 2.6 };
  }, () => W1('handL')));
  // fingers: relaxed, curling a little towards the palm (-x); index at +z
  const FING = [[0.0168, 0.95, 0.0049], [0.0056, 1.0, 0.0052], [-0.0058, 0.95, 0.005], [-0.0168, 0.78, 0.0044]];
  const L = 0.054 * k; // middle finger length
  FING.forEach(([z, len, r], fi) => {
    const l = L * len, segs = [0.45, 0.3, 0.25];
    let p = [ax - 0.0028 * k, kn + 0.004 * k, hz + z * k], dir = [-0.08, -1, 0.0];
    const path = [];
    const curl = [0.18, 0.32, 0.3].map((a) => a + fi * 0.04);
    path.push({ c: p.slice(), s: { hx: r * 0.95 * k, hzF: r * 1.05 * k, hzB: r * 1.05 * k, p: 2.3 }, w: W1('handL') });
    let acc = 0;
    for (let j = 0; j < 3; j++) {
      // rotate dir about z (towards -x) by curl[j]
      const a = curl[j], c = Math.cos(a), s = Math.sin(a);
      dir = norm([dir[0] * c + dir[1] * s, -dir[0] * s + dir[1] * c, dir[2]]);
      const sl = l * segs[j];
      p = [p[0] + dir[0] * sl, p[1] + dir[1] * sl, p[2] + dir[2] * sl];
      acc += sl;
      const rr = r * (1 - 0.16 * (j + 1) / 3) * k;
      if (j < 2) path.push({ c: p.slice(), s: { hx: rr * 0.95, hzF: rr * 1.02, hzB: rr * 1.02, p: 2.3 }, w: W1('handL'), keep: true });
      else {
        path.push({ c: p.slice(), s: { hx: rr * 0.7, hzF: rr * 0.75, hzB: rr * 0.75, p: 2 }, w: W1('handL') });
        const tip = [p[0] + dir[0] * rr * 0.4, p[1] + dir[1] * rr * 0.4, p[2] + dir[2] * rr * 0.4];
        path.push({ c: tip, s: { hx: 0, hzF: 0, hzB: 0 }, w: W1('handL') });
      }
    }
    out.push(ptube({ part: 'fingers', mat: 'hand', N: 4, lodMinN: 6, mirror: true, dens: 1.7, fi, a0: Math.PI / 2 }, path, [1, 0, 0]));
  });
  // thumb: from the heel of the palm on the +z side, forward and down
  {
    const r = 0.0062 * k;
    const p0 = [ax - 0.004 * k, wr - 0.014 * k, hz + 0.017 * k];
    const d1 = norm([-0.35, -0.72, 0.6]), d2 = norm([-0.5, -0.86, 0.12]);
    const p1 = [p0[0] + d1[0] * 0.03 * k, p0[1] + d1[1] * 0.03 * k, p0[2] + d1[2] * 0.03 * k];
    const p2 = [p1[0] + d2[0] * 0.026 * k, p1[1] + d2[1] * 0.026 * k, p1[2] + d2[2] * 0.026 * k];
    const p3 = [p2[0] + d2[0] * 0.016 * k, p2[1] + d2[1] * 0.016 * k, p2[2] + d2[2] * 0.016 * k];
    const tip = [p3[0] + d2[0] * 0.004 * k, p3[1] + d2[1] * 0.004 * k, p3[2] + d2[2] * 0.004 * k];
    out.push(ptube({ part: 'thumb', mat: 'hand', N: 4, lodMinN: 6, mirror: true, dens: 1.7, a0: Math.PI / 2 }, [
      { c: [p0[0] + 0.004 * k, p0[1] + 0.006 * k, p0[2] - 0.008 * k], s: { hx: r * 1.3, hzF: r * 1.5, hzB: r * 1.5, p: 2.2 }, w: W1('handL') },
      { c: p1, s: { hx: r * 1.02, hzF: r * 1.05, hzB: r * 1.05, p: 2.3 }, w: W1('handL'), keep: true },
      { c: p2, s: { hx: r * 0.96, hzF: r * 0.98, hzB: r * 0.98, p: 2.3 }, w: W1('handL'), keep: true },
      { c: tip, s: { hx: 0, hzF: 0, hzB: 0 }, w: W1('handL') },
    ], [1, 0, 0]));
  }
  return out;
}

// ------------------------------------------------------------------ shoes
/** Shoe shapes: collar height (above the ankle), toe height, toe shape, sole thickness, heel lift. */
export function shoeShape(spec, P) {
  const H = P.H, k = spec.shoes.kind;
  const sole = k === 'platform' ? 0.032 * H : k === 'sneaker' || k === 'comfort' || k === 'boots' || k === 'tabi' ? 0.014 * H : k === 'sandal' ? 0.012 * H : 0.008 * H;
  const heel = k === 'pumps' ? 0.04 * H : k === 'oxford' || k === 'loafer' ? 0.012 * H : k === 'boots' ? 0.016 * H : 0;
  const collar = k === 'boots' ? 0.07 * H : k === 'tabi' ? 0.06 * H : k === 'sneaker' ? 0.012 * H : k === 'pumps' ? -0.02 * H : k === 'sandal' ? -0.03 * H : -0.006 * H;
  const toeH = k === 'pumps' ? 0.026 * H : k === 'sneaker' || k === 'comfort' || k === 'boots' ? 0.036 * H : 0.03 * H;
  const point = k === 'pumps' ? 1.5 : k === 'oxford' ? 1.1 : 1;
  return { sole, heel, collar, toeH, point, bare: k === 'sandal' };
}

function shoeTubes(spec, P) {
  const H = P.H, out = [], S = shoeShape(spec, P);
  const fl = P.footL * 0.96, fx = P.footX * (spec.shoes.kind === 'boots' || spec.shoes.kind === 'sneaker' ? 0.98 : 0.9), lx = P.hipX + 0.003 * H;
  const z0 = -0.24 * fl, z1 = z0 + fl;
  const sole = S.sole, heel = S.heel;
  // the sole plane rises towards the heel (heel lift) and curls up at the toe
  const base = (z) => sole + heel * smooth((z0 + fl * 0.5 - z) / (fl * 0.35)) * (S.heel > 0.03 * H ? 1 : 1);
  // the upper: rings along z (heel to toe), sections in x / y (up = +y)
  const top = (z) => {
    const t = (z - z0) / fl;
    const ankle = P.ankleY + 0.02 * H + Math.max(-0.02 * H, S.collar * 0.5);
    if (t < 0.32) return lerp(ankle, ankle - 0.004 * H, t / 0.32);
    if (t < 0.62) return lerp(ankle - 0.004 * H, base(z) + S.toeH * 1.05, (t - 0.32) / 0.3);
    return lerp(base(z) + S.toeH * 1.05, base(z) + S.toeH * 0.5, ((t - 0.62) / 0.38) ** 1.2);
  };
  const width = (z) => {
    const t = (z - z0) / fl;
    if (t < 0.05) return fx * 0.55;
    if (t < 0.25) return lerp(fx * 0.78, fx * 0.82, (t - 0.05) / 0.2);
    if (t < 0.72) return lerp(fx * 0.82, fx * 1.06, (t - 0.25) / 0.47);
    return lerp(fx * 1.06, fx * 0.25 / S.point, ((t - 0.72) / 0.28) ** (1.6 / S.point));
  };
  const zs = [z0 - 0.002, z0 + 0.05 * fl, z0 + 0.3 * fl, z0 + 0.6 * fl, z0 + 0.84 * fl, z1 - 0.004, z1];
  const path = zs.map((z, i) => {
    const b = base(z) - 0.0015 * H, tp = top(z), hy = Math.max(0.004, (tp - b) / 2), hx = width(z);
    const last = i === zs.length - 1, first = i === 0;
    const sh = first || last ? 0.25 : 1;
    return { c: [lx + (z - z0) / fl * 0.003 * H, b + hy * (last ? 0.7 : 1), z], s: { hx: hx * sh, hzF: hy * (last ? 0.3 : first ? 0.6 : 1), hzB: hy * (last ? 0.3 : first ? 0.6 : 1), p: 3.4, pB: 4.2 }, w: W1('footL') };
  });
  out.push(ptube({ part: 'foot', mat: 'shoe', N: 6, lodMinN: 8, mirror: true, dens: 1.15, partAt: (c) => (c.z > z0 + 0.62 * fl ? 'toe' : 'foot'), meta: { z0, fl, base, top, lx, width, S } }, path, [0, 1, 0]));
  // the sole: a slab a little wider than the upper, following the heel lift
  const sz = [z0 - 0.004, z0 + 0.3 * fl, z0 + 0.8 * fl, z1 + 0.004];
  const solePath = sz.map((z, i) => {
    const b0 = Math.max(0, base(z) - sole), b1 = base(z) + 0.001 * H, hx = width(Math.min(z1 - 0.01, Math.max(z0 + 0.01, z))) + 0.0016 * H;
    const end = i === 0 || i === sz.length - 1;
    const hy = (b1 - b0) / 2;
    return { c: [lx + (z - z0) / fl * 0.003 * H, b0 + hy, z], s: { hx: hx * (end ? 0.7 : 1), hzF: hy, hzB: hy, p: 6, pB: 8 }, w: W1('footL') };
  });
  out.push(ptube({ part: 'sole', mat: 'shoe', N: 4, lodMinN: 8, mirror: true, dens: 1.1, meta: { z0, fl, base, lx, S } }, solePath, [0, 1, 0]));
  // a block heel under women's pumps / a real heel on dress shoes is part of the sole's rise; pumps get a slim heel post
  if (heel > 0.02 * H) {
    const hzc = z0 + 0.1 * fl;
    out.push(vtube({ part: 'heel', mat: 'shoe', N: 4, lodMinN: 9, mirror: true, dens: 1.2, meta: { z0, fl, base, lx, S } }, [0, heel * 0.5, base(hzc) - sole + 0.002], (y) => ({ hx: 0.006 * H * (y < 0.01 ? 0.8 : 1), hzF: 0.007 * H, hzB: 0.008 * H, cx: lx, cz: hzc - 0.004 * H * (y / heel), p: 2.6 }), () => W1('footL')));
  }
  return out;
}

// ------------------------------------------------------------------ skirts
function skirtTube(spec, P) {
  const H = P.H, cut = spec.bottom.cut;
  const hem = { pleated: P.kneeY + 0.075 * H, pencil: P.kneeY - 0.02 * H, long: P.kneeY - 0.13 * H, mini: P.hipY - 0.085 * H, aline: P.kneeY - 0.025 * H, kneepleat: P.kneeY - 0.045 * H }[cut] ?? P.kneeY;
  const flare = { pleated: 1.32, pencil: 0.98, long: 1.32, mini: 1.24, aline: 1.34, kneepleat: 1.36 }[cut] ?? 1.2;
  const yh = P.hipY - 0.01 * H, yt0 = P.pelvisY + 0.016 * H, topHem0 = garmentLines(spec, P).topHem;
  // an untucked top hangs over the skirt: the skirt then starts just under its hem (no facets poking through)
  const yt = topHem0 < yt0 ? Math.max(yh + 0.006 * H, topHem0 - 0.004 * H) : yt0;
  const pleats = cut === 'pleated' || cut === 'kneepleat' ? 8 : cut === 'long' ? 5 : 0;
  const N = pleats ? 16 : 10;
  // an untucked top hangs over the skirt's waistband: the skirt then hugs the body under it (no poke-through at the hem)
  const g = garmentLines(spec, P), under = g.topHem < yt, k1 = under ? 0.94 : 1.08, k2 = under ? 0.95 : 1.1;
  const tb = table([
    [hem - 0.002 * H, P.hipsX * flare, P.hipsZ * (flare + 0.12), P.hipsZ * (flare + 0.12)],
    [yh, P.hipsX * (under ? 0.98 : 1.08), P.hipsZ * (under ? 0.96 : 1.12), P.hipsZ * (under ? 1.04 : 1.2)],
    [P.pelvisY, (P.hipsX + P.waistX) / 2 * k2, P.waistZ * (under ? 1.02 : 1.14) + P.belly * 0.75, P.waistZ * (under ? 0.98 : 1.1)],
    [yt, P.waistX * k1, P.waistZ * (under ? 1.0 : 1.1) + P.belly * 0.7, P.waistZ * (under ? 0.95 : 1.08)],
  ]);
  const ys = uniq([hem - 0.002 * H, (hem + yh) / 2, yh, yt]);
  return vtube({ part: 'skirt', mat: 'acc', N, lodMinN: 8, double: 0, dens: 0.95, meta: { hem, yt, pleats }, partAt: (c) => (c.y > yh + 0.004 * H ? 'skirtUp' : 'skirt') }, ys, (y) => {
    const [hx, hzF, hzB] = tb(y);
    const pk = pleats ? clamp((yh - y) / (yh - hem), 0, 1) : 0;
    const mod = pleats ? (x, z, a) => { const q = ((a / (Math.PI * 2)) * pleats) % 1; const zz = (q < 0.5 ? q : 1 - q) * 2; const r = Math.hypot(x, z) || 1; const d = (zz - 0.5) * 0.012 * H * pk; return [x / r * d, z / r * d]; } : null;
    return { hx, hzF, hzB, cz: -0.004 * H, p: 2.2, mod };
  }, (y) => (y > P.pelvisY ? WB('skirt', 'hips', 0.5) : W1('skirt')));
}
