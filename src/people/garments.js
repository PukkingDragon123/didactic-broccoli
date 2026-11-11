// Clothes shaped on the fitted base body (src/people/mesh.js). Every garment is a layer standing off the skin by its
// cloth's thickness and its ease (shirts fall straight from the chest, trouser legs hang straight from the thigh,
// sleeves from the upper arm), smoothed so the anatomy underneath no longer shows. Where a layer ends (a hem, a cuff,
// a neckline, the opening of a jacket, a lapel's edge) the surface is cut along the line and the step between the
// two levels is modelled: the garment's edge has its real thickness. Folds bunch at the elbows, knees and ankles.
// The painters (src/people/paint.js) use the same lines (garmentLines), so cloth and paint agree.
import { BONE_INDEX } from './body.js';

const B = BONE_INDEX;
const TORSO = new Set([B.hips, B.spine, B.chest]), NECKB = B.neck;
// (skirts are lofted below; dressBody's layers never cover the legs under one)
const ARMB = new Set([B.armL, B.foreL, B.armR, B.foreR]), LEGB = new Set([B.thighL, B.shinL, B.thighR, B.shinR, B.footL, B.footR]);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/** The lines the clothes end at (metres; shared with the painters). */
export function garmentLines(spec, P) {
  const H = P.H, T = spec.top, Bt = spec.bottom;
  const tuck = T.tuck || ['suit', 'blazer'].includes(T.kind) ? true : T.tuck;
  const waist = P.pelvisY + 0.004 * H; // trousers waistband top
  const topHem = {
    suit: P.crotchY + 0.03 * H, blazer: P.hipY + 0.015 * H, gakuran: P.hipY + 0.004 * H, sailor: P.pelvisY - 0.008 * H, cardigan: P.hipY,
    knit: P.hipY + 0.012 * H, jacket: P.hipY + 0.01 * H, workjacket: P.hipY + 0.005 * H,
    onesie: P.crotchY - 0.006 * H, happi: P.hipY - 0.012 * H, // costumes (cosmetics.js)
  }[T.kind] ?? (T.tuck ? waist : P.hipY + 0.022 * H);
  const sleeve = T.sleeve || (['tee', 'aloha', 'polo'].includes(T.kind) ? 'short' : 'long');
  const cuffY = sleeve === 'short' ? P.elbowY + (T.kind === 'tee' && T.fitted ? 0.085 : 0.065) * H : sleeve === 'mid' ? P.elbowY - 0.055 * H : P.wristY + 0.008 * H;
  const skirt = Bt.kind === 'skirt';
  const botHem = Bt.kind === 'shorts' ? P.kneeY + (spec.age === 'kid' ? 0.075 : 0.05) * H : skirt ? Infinity : P.ankleY + 0.01 * H;
  const sockTop = spec.legs === 'kneesocks' ? P.kneeY - 0.025 * H : spec.legs === 'loosesocks' ? P.ankleY + 0.11 * H : spec.socks ? P.ankleY + 0.055 * H : 0;
  const bootTop = spec.shoes.kind === 'tabi' ? P.ankleY + 0.08 * H : spec.shoes.kind === 'boots' ? P.ankleY + 0.035 * H : 0;
  // the open front of a jacket / cardigan (the shirt shows in the V)
  const k = T.kind, V = k === 'suit' || k === 'blazer' || k === 'cardigan' || (k === 'polo' && T.vest);
  const vb = k === 'suit' ? P.bustY - 0.055 * H : k === 'blazer' ? P.bustY - 0.07 * H : P.bustY - 0.03 * H;
  const vw = k === 'cardigan' ? 0.04 * H : 0.045 * H;
  const vx = (y) => (y > vb ? ((y - vb) / (P.neckBase - vb)) * vw + 0.004 : -1);
  return { tuck, waist, topHem, sleeve, cuffY, skirt, botHem, sockTop, bootTop, V, vb, vw, vx };
}

// cloth thickness off the skin (m) and how much it hangs straight (0 = skin-tight, 1 = straight from the widest part)
const TOP = {
  tee: [0.004, 0.55], polo: [0.0045, 0.6], shirt: [0.0045, 0.6], blouse: [0.004, 0.4], knit: [0.007, 0.65], cardigan: [0.008, 0.7],
  suit: [0.009, 0.75], blazer: [0.009, 0.7], gakuran: [0.009, 0.75], jacket: [0.011, 0.8], workjacket: [0.011, 0.8], sailor: [0.005, 0.6],
  aloha: [0.005, 0.7], flannel: [0.006, 0.7], onesie: [0.009, 0.8], happi: [0.008, 0.85],
};
const BOTTOM = { slacks: [0.005, 0.8, 0.82], jeans: [0.0035, 0.55, 0.72], cargo: [0.007, 0.85, 0.9], shorts: [0.006, 0.8, 1.05], tobi: [0.006, 1, 1.0] };

/**
 * Dress the fitted body in place: body = { n, pos, apx, bi, bw, flags, src, weld, nWeld, idx, uv } (see mesh.js).
 */
export function dressBody(body, plan, lod) {
  const { spec, P } = plan, H = P.H, T = spec.top, Bt = spec.bottom;
  if (!T || !Bt) return;
  const Lx = garmentLines(spec, P), far = lod === 'far';
  // ---- per vertex: its class (by the main bone)
  const cls = (i) => { const b = body.bi[i * 4]; return TORSO.has(b) ? 1 : b === NECKB ? 2 : ARMB.has(b) ? 3 : LEGB.has(b) ? 4 : 0; };
  // ---- reference sections: the torso at the bust and the hips (radius by angle), for the drape
  const NA = 32, bustR = new Float32Array(NA), hipR = new Float32Array(NA);
  const ang = (x, z) => Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * NA) % NA;
  for (let i = 0; i < body.n; i++) {
    if (cls(i) !== 1) continue;
    const x = body.pos[i * 3], y = body.pos[i * 3 + 1], z = body.pos[i * 3 + 2], r = Math.hypot(x, z), a = ang(x, z);
    if (Math.abs(y - P.bustY) < 0.03 * H) bustR[a] = Math.max(bustR[a], r);
    if (Math.abs(y - P.hipY) < 0.025 * H) hipR[a] = Math.max(hipR[a], r);
  }
  for (const R of [bustR, hipR]) for (let it = 0; it < 4; it++) for (let a = 0; a < NA; a++) if (!R[a]) R[a] = Math.max(R[(a + 1) % NA], R[(a + NA - 1) % NA]) * 0.98;
  // ---- the layers: inside(i or point) > 0, offset at a point
  const k = T.kind, tb = TOP[k] || TOP.tee, bb = BOTTOM[Bt.kind] || BOTTOM.slacks;
  const front = (z) => z > 0.0;
  const neckTop = ['shirt', 'polo', 'blouse', 'flannel', 'aloha', 'suit', 'blazer', 'gakuran', 'workjacket', 'jacket'].includes(k) ? 0.012 * H : 0.004 * H;
  const neckline = (x, z) => P.neckBase + neckTop - (front(z) ? 0.018 * H * sstep(0, P.chestZ * 0.6, z) * (k === 'knit' || k === 'tee' || k === 'onesie' ? 1 : 0.3) : 0);
  const legAxis = (x) => (x > 0 ? P.hipX : -P.hipX), armAxis = (x) => (x > 0 ? P.shX : -P.shX);
  const L = [];
  // socks
  if (Lx.sockTop > 0 && spec.legs !== 'tights') L.push({ name: 'socks', smooth: 0, f: (c, x, y) => (c === 4 ? Lx.sockTop - y : -1), off: () => (spec.legs === 'loosesocks' ? 0.004 : 0.0015) });
  // trousers / shorts
  if (!Lx.skirt) {
    const wide = Bt.wide || Bt.kind === 'tobi';
    L.push({
      name: 'bottom', smooth: 1,
      f: (c, x, y) => (c === 1 ? Lx.waist - y : c === 4 ? Math.min(Lx.waist - y, y - Lx.botHem) : -1),
      off: (c, x, y, z) => {
        let o = bb[0];
        if (Lx.tuck && Math.abs(y - Lx.waist) < 0.04 * H) o = Math.max(o, tb[0] + 0.0025); // the waistband over a tucked shirt
        if (c === 4) {
          // trouser legs hang straight from the thigh to the hem
          const t = clamp01((P.hipY - y) / Math.max(0.05, P.hipY - Lx.botHem));
          let R = P.thighX * lerp(1.12, bb[2] * (wide ? 1.35 : 1), t);
          if (Bt.kind === 'tobi') R = P.thighX * (1.2 + 0.55 * Math.sin(Math.min(1, t * 1.25) * Math.PI) * (t < 0.85 ? 1 : 0.4));
          const r = Math.hypot(x - legAxis(x), z);
          o += Math.max(0, R - r) * bb[1];
          if (!far) { // folds: a break over the shoe, creases behind the knee
            o += 0.0025 * sstep(Lx.botHem + 0.06 * H, Lx.botHem, y) * (0.5 + 0.5 * Math.sin(y * 260 + x * 90));
            if (z < 0) o += 0.002 * Math.exp(-(((y - P.kneeY) / (0.02 * H)) ** 2)) * (0.5 + 0.5 * Math.sin(y * 420));
          }
        }
        return o;
      },
    });
  }
  // the shirt under an open jacket / cardigan
  if (Lx.V) {
    L.push({ name: 'shirt', smooth: 0.6, f: (c, x, y, z) => (c === 1 || c === 2 ? Math.min(P.neckBase + 0.012 * H - y, y - (Lx.waist - 0.03 * H)) : c === 3 ? y - (P.wristY + 0.004 * H) : -1), off: () => 0.0035 });
  }
  // the main top
  L.push({
    name: 'top', smooth: 1,
    f: (c, x, y, z) => {
      if (c === 1 || c === 2) {
        let f = Math.min(neckline(x, z) - y, y - Lx.topHem);
        if (Lx.V && front(z) && y > Lx.vb) f = Math.min(f, Math.abs(x) - Lx.vx(y));
        return f;
      }
      return c === 3 ? y - Lx.cuffY : -1;
    },
    off: (c, x, y, z) => {
      let o = tb[0];
      if (!Lx.tuck && !Lx.skirt && y < Lx.waist + 0.03 * H && (c === 1 || c === 2)) o = Math.max(o, bb[0] + 0.0028); // an untucked hem over the trousers
      if (c === 1 || c === 2) {
        // falls straight from the chest (and over the belly), not into the waist
        if (y < P.bustY) {
          const a = ang(x, z), r = Math.hypot(x, z);
          const Rb = bustR[a] * lerp(1, 0.94, clamp01((P.bustY - y) / (P.bustY - P.hipY)));
          o += Math.max(0, Rb - r) * tb[1] * sstep(Lx.topHem - 0.02 * H, P.bustY - 0.02 * H, y) * (P.f && (k === 'blouse' || k === 'sailor') ? 0.55 : 1);
        }
        if (!far && z < 0 && y > P.waistY && y < P.bustY + 0.04 * H) o += 0.0015 * (0.5 + 0.5 * Math.sin(x * 160 + y * 40)); // back drape
      } else if (c === 3) {
        // sleeves hang straight from the upper arm
        const t = clamp01((P.shoulderY - y) / Math.max(0.05, P.shoulderY - Lx.cuffY));
        const R = P.armX * lerp(1.1, Lx.sleeve === 'short' ? 1.15 : 0.95, t) + 0.004;
        const r = Math.hypot(x - armAxis(x), z);
        o += Math.max(0, R - r) * tb[1];
        if (!far) { // bunching at the elbow and over the cuff
          o += 0.0022 * Math.exp(-(((y - P.elbowY) / (0.025 * H)) ** 2)) * (0.5 + 0.5 * Math.sin(y * 380 + z * 120));
          if (Lx.sleeve === 'long') o += 0.0018 * sstep(Lx.cuffY + 0.05 * H, Lx.cuffY, y) * (0.5 + 0.5 * Math.sin(y * 520));
        }
      }
      return o;
    },
  });
  // lapels on a suit / blazer: a raised flap along the V
  if (k === 'suit' || k === 'blazer') {
    const topL = L[L.length - 1];
    L.push({
      name: 'lapel', smooth: 0,
      f: (c, x, y, z) => {
        if (c !== 1 && c !== 2) return -1;
        if (!front(z) || y < Lx.vb || y > P.neckBase - 0.02 * H) return -1;
        const lx = Math.abs(x) - Lx.vx(y);
        return Math.min(lx, 0.026 * H - (y - Lx.vb) * 0.12 - lx, P.neckBase - 0.02 * H - y, y - Lx.vb);
      },
      off: (c, x, y, z) => topL.off(c, x, y, z) + 0.0025,
    });
  }
  // a tie on the shirt front (suits), from under the collar to the belt
  if (T.tie && (k === 'suit' || k === 'shirt')) {
    const shirtL = L.find((l) => l.name === 'shirt') || L.find((l) => l.name === 'top');
    const kw = (y) => 0.012 * H - (P.neckBase - y) * 0.1 + (y < P.bustY ? 0.004 * H * sstep(P.bustY, P.waistY, y) : 0);
    L.push({
      name: 'tie', smooth: 0,
      f: (c, x, y, z) => (c === 1 || c === 2) && front(z) ? Math.min(kw(y) - Math.abs(x), P.neckBase - 0.004 * H - y, y - (Lx.waist + 0.01 * H)) : -1,
      off: (c, x, y, z) => shirtL.off(c, x, y, z) + 0.0035,
    });
  }
  if (!L.length) return;
  cutAndOffset(body, L, cls, far ? 2 : 6);
}

// ------------------------------------------------------------------ the geometry
const WB = { i: new Int32Array(8), w: new Float32Array(8), s: new Float32Array(4) };
function cutAndOffset(body, L, clsOf, smoothIt) {
  // growable copies
  let pos = Array.from(body.pos.subarray(0, body.n * 3)), apx = Array.from(body.apx.subarray(0, body.n * 2));
  let bi = Array.from(body.bi.subarray(0, body.n * 4)), bw = Array.from(body.bw.subarray(0, body.n * 4));
  let flags = Array.from(body.flags.subarray(0, body.n)), src = Array.from(body.src.subarray(0, body.n)), weld = Array.from(body.weld.subarray(0, body.n));
  let nWeld = body.nWeld, idx = body.idx;
  const n0 = body.n;
  const cls = [];
  for (let i = 0; i < n0; i++) cls.push(clsOf(i));
  const fAt = (l, i) => l.f(cls[i], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  // ---- 1. smooth what's under cloth (Taubin over welded positions), so muscles don't show through
  {
    const W = nWeld, P0 = new Float32Array(W * 3), mask = new Float32Array(W);
    for (let i = 0; i < n0; i++) {
      const w = weld[i]; P0[w * 3] = pos[i * 3]; P0[w * 3 + 1] = pos[i * 3 + 1]; P0[w * 3 + 2] = pos[i * 3 + 2];
      let m = 0; for (const l of L) if (l.smooth && fAt(l, i) > 0.01) m = Math.max(m, l.smooth);
      if (m > mask[w]) mask[w] = m;
    }
    // neighbours (welded), as compressed rows; duplicates across UV seams only weigh a neighbour twice
    const deg = new Int32Array(W + 1);
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { deg[weld[idx[t + k]] + 1] += 2; }
    for (let w = 0; w < W; w++) deg[w + 1] += deg[w];
    const adj = new Int32Array(deg[W]), fill = deg.slice(0, W);
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = weld[idx[t + k]], b = weld[idx[t + (k + 1) % 3]], c = weld[idx[t + (k + 2) % 3]]; adj[fill[a]++] = b; adj[fill[a]++] = c; }
    const Q = new Float32Array(W * 3);
    const step = (lam) => {
      Q.set(P0);
      for (let w = 0; w < W; w++) {
        const m = mask[w]; if (!m) continue;
        const a0 = deg[w], a1 = deg[w + 1]; if (a1 === a0) continue;
        let x = 0, y = 0, z = 0; for (let j = a0; j < a1; j++) { const o = adj[j] * 3; x += P0[o]; y += P0[o + 1]; z += P0[o + 2]; }
        const s = a1 - a0, kk = lam * m;
        Q[w * 3] += kk * (x / s - P0[w * 3]); Q[w * 3 + 1] += kk * (y / s - P0[w * 3 + 1]) * 0.5; Q[w * 3 + 2] += kk * (z / s - P0[w * 3 + 2]);
      }
      P0.set(Q);
    };
    for (let it = 0; it < smoothIt; it++) { step(0.5); step(-0.52); }
    for (let i = 0; i < n0; i++) { const w = weld[i]; pos[i * 3] = P0[w * 3]; pos[i * 3 + 1] = P0[w * 3 + 1]; pos[i * 3 + 2] = P0[w * 3 + 2]; }
  }
  // ---- 2. cut along every layer's line
  const addVert = (a, b, t, wkey, wmap) => {
    const n = pos.length / 3;
    for (let c = 0; c < 3; c++) pos.push(pos[a * 3 + c] + (pos[b * 3 + c] - pos[a * 3 + c]) * t);
    for (let c = 0; c < 2; c++) apx.push(apx[a * 2 + c] + (apx[b * 2 + c] - apx[a * 2 + c]) * t);
    // weights: blend, keep the 4 heaviest
    const ib = WB.i, wbuf = WB.w; let nb = 0;
    for (let k = 0; k < 8; k++) {
      const v = k < 4 ? a : b, kk = k & 3, w = bw[v * 4 + kk] * (k < 4 ? 1 - t : t); if (!w) continue;
      const bone = bi[v * 4 + kk]; let j = 0; while (j < nb && ib[j] !== bone) j++;
      if (j === nb) { ib[nb] = bone; wbuf[nb++] = w; } else wbuf[j] += w;
    }
    for (let k = 0; k < 4; k++) { // pick the heaviest four
      let best = -1; for (let j = 0; j < nb; j++) if (wbuf[j] >= 0 && (best < 0 || wbuf[j] > wbuf[best])) best = j;
      if (best < 0) { bi.push(0); bw.push(0); WB.s[k] = 0; continue; }
      bi.push(ib[best]); bw.push(wbuf[best]); WB.s[k] = wbuf[best]; wbuf[best] = -1;
    }
    const tot = WB.s[0] + WB.s[1] + WB.s[2] + WB.s[3] || 1, nn = bw.length;
    for (let k = 1; k <= 4; k++) bw[nn - k] /= tot;
    flags.push(0); src.push(t < 0.5 ? src[a] : src[b]);
    let w = wmap.get(wkey); if (w === undefined) { w = nWeld++; wmap.set(wkey, w); }
    weld.push(w);
    cls.push(t < 0.5 ? cls[a] : cls[b]);
    return n;
  };
  for (const l of L) {
    const f = []; for (let i = 0; i < pos.length / 3; i++) f.push(fAt(l, i));
    const emap = new Map(), wmap = new Map(), out = [];
    const cut = (a, b) => {
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let v = emap.get(key);
      if (v === undefined) {
        const t = f[a] / (f[a] - f[b]);
        const wa = weld[a], wb = weld[b], wkey = wa < wb ? (wa * 65536 + wb) * 10001 + Math.round(t * 1e4) : (wb * 65536 + wa) * 10001 + Math.round((1 - t) * 1e4);
        v = addVert(a, b, t, wkey, wmap); f.push(0); emap.set(key, v);
      }
      return v;
    };
    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2], s0 = f[i0] > 0, s1 = f[i1] > 0, s2 = f[i2] > 0;
      if (s0 === s1 && s1 === s2) { out.push(i0, i1, i2); continue; }
      // rotate so the odd one out is first
      const r = s0 !== s1 && s0 !== s2 ? 0 : s1 !== s0 && s1 !== s2 ? 1 : 2;
      const a = r === 0 ? i0 : r === 1 ? i1 : i2, b = r === 0 ? i1 : r === 1 ? i2 : i0, c = r === 0 ? i2 : r === 1 ? i0 : i1;
      if (Math.abs(f[a]) < 1e-7 || (Math.abs(f[b]) < 1e-7 && Math.abs(f[c]) < 1e-7)) { out.push(i0, i1, i2); continue; }
      const ab = cut(a, b), ac = cut(a, c);
      out.push(a, ab, ac, ab, b, c, ab, c, ac);
    }
    idx = out;
  }
  // ---- 3. which layer is on top, per triangle; the vertex copies per layer
  const nv = pos.length / 3, lay = new Int8Array(idx.length / 3), offAt = (li, i) => (li < 0 ? 0 : L[li].off(cls[i], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3, cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    const cc = cls[a] === cls[b] ? cls[a] : cls[c];
    let best = -1, bo = 0;
    for (let li = 0; li < L.length; li++) if (L[li].f(cc, cx, cy, cz) > 0) { const o = L[li].off(cc, cx, cy, cz); if (o >= bo) { bo = o; best = li; } }
    lay[t / 3] = best;
  }
  // normals of the smoothed skin (welded) to offset along
  const W = nWeld, acc = new Float32Array(W * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [idx[t], idx[t + 1], idx[t + 2]]) { const w = weld[i] * 3; acc[w] += nx; acc[w + 1] += ny; acc[w + 2] += nz; }
  }
  for (let w = 0; w < W; w++) { const l = Math.hypot(acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]) || 1; acc[w * 3] /= l; acc[w * 3 + 1] /= l; acc[w * 3 + 2] /= l; }
  const copies = new Map(); // vertex|layer -> new index
  const used = new Map(); // vertex -> its first layer
  const copyVert = (i) => {
    const n = pos.length / 3;
    for (let c = 0; c < 3; c++) pos.push(pos[i * 3 + c]);
    apx.push(apx[i * 2], apx[i * 2 + 1]);
    for (let k = 0; k < 4; k++) { bi.push(bi[i * 4 + k]); bw.push(bw[i * 4 + k]); }
    flags.push(flags[i]); src.push(src[i]); weld.push(weld[i]); cls.push(cls[i]);
    return n;
  };
  const vOff = []; // offset per final vertex
  const nidx = idx.slice();
  for (let t = 0; t < idx.length; t += 3) {
    const li = lay[t / 3];
    for (let k = 0; k < 3; k++) {
      const i = idx[t + k];
      const first = used.get(i);
      let j;
      if (first === undefined) { used.set(i, li); j = i; } else if (first === li) j = i;
      else { const key = i * 16 + li + 1; j = copies.get(key); if (j === undefined) { j = copyVert(i); copies.set(key, j); } }
      vOff[j] = offAt(li, i);
      nidx[t + k] = j;
    }
  }
  // ---- 4. the steps: where neighbouring triangles sit on different layers, a quad joins the two edges
  const edges = new Map();
  for (let t = 0; t < nidx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = nidx[t + k], b = nidx[t + (k + 1) % 3], wa = weld[a], wb = weld[b];
      const key = wa < wb ? wa * 65536 + wb : wb * 65536 + wa;
      let e = edges.get(key); if (!e) { e = []; edges.set(key, e); }
      e.push({ t: t / 3, a, b });
    }
  }
  const ledge = [];
  for (const e of edges.values()) {
    if (e.length !== 2) continue;
    const [p, q] = e;
    if (lay[p.t] === lay[q.t]) continue;
    const op = ((vOff[p.a] || 0) + (vOff[p.b] || 0)), oq = ((vOff[q.a] || 0) + (vOff[q.b] || 0));
    if (Math.abs(op - oq) < 0.0006) continue;
    const thick = op > oq ? p : q, thin = op > oq ? q : p;
    // the thin triangle's copies of the same two points (its edge runs the other way)
    const aThin = weld[thin.a] === weld[thick.a] ? thin.a : thin.b, bThin = aThin === thin.a ? thin.b : thin.a;
    ledge.push([thick.a, aThin, bThin, thick.b, thick.t]);
  }
  // ---- 5. offset every vertex along the skin normal; the ledges get their own vertices (crisp, nudged into the cloth)
  const nAll = pos.length / 3;
  const base = pos.slice();
  for (let i = 0; i < nAll; i++) {
    const o = vOff[i] || 0; if (!o) continue;
    const w = weld[i] * 3;
    pos[i * 3] = base[i * 3] + acc[w] * o; pos[i * 3 + 1] = base[i * 3 + 1] + acc[w + 1] * o; pos[i * 3 + 2] = base[i * 3 + 2] + acc[w + 2] * o;
  }
  for (const [a, b, c, d, tt] of ledge) {
    const t3 = tt * 3, cxp = (apx[nidx[t3] * 2] + apx[nidx[t3 + 1] * 2] + apx[nidx[t3 + 2] * 2]) / 3, cyp = (apx[nidx[t3] * 2 + 1] + apx[nidx[t3 + 1] * 2 + 1] + apx[nidx[t3 + 2] * 2 + 1]) / 3;
    const q = [a, b, c, d].map((i) => {
      const j = copyVert(i);
      weld[j] = nWeld++;
      // sample the cloth just inside its edge
      const dx = cxp - apx[i * 2], dy = cyp - apx[i * 2 + 1], l = Math.hypot(dx, dy) || 1;
      apx[j * 2] += (dx / l) * 1.2; apx[j * 2 + 1] += (dy / l) * 1.2;
      return j;
    });
    nidx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
  }
  // ---- write back
  const N = pos.length / 3;
  body.pos = Float32Array.from(pos); body.apx = Float32Array.from(apx);
  body.bi = Uint8Array.from(bi); body.bw = Float32Array.from(bw);
  body.flags = Uint8Array.from(flags); body.src = Uint8Array.from(src); body.weld = Uint16Array.from(weld); body.nWeld = nWeld;
  body.idx = nidx; body.n = N; body.n0 = N;
}

// ------------------------------------------------------------------ skirts: a lofted, pleated tube from the waist
const SKIRT = { pleated: [0.075, 0.3, 14], pencil: [-0.02, -0.02, 0], long: [-0.13, 0.36, 10], mini: [null, 0.24, 12] }; // hem (x H from the knee), flare, pleats
const SKIRT_BONE = B.skirt, HIPS_BONE = B.hips;

/** The atlas islands the extra garments need (px), before packing: [{ key, w, h }]. */
export function garmentIslands(spec, P) {
  const out = [];
  if (spec.garb?.coat) { const H = P.H, top = P.hipY + 0.03 * H, hem = P.hipY - (P.hipY - P.kneeY) * (spec.garb.coat.len ?? 0.8); out.push({ key: 'coat', mw: Math.PI * 2 * P.hipsX * 1.2, mh: top - hem + 0.01 }); }
  if (spec.bottom.kind === 'skirt' && SKIRT[spec.bottom.cut]) {
    const sk = SKIRT[spec.bottom.cut], H = P.H;
    const hem = sk[0] === null ? P.hipY - 0.085 * H : P.kneeY + sk[0] * H, top = P.pelvisY + 0.016 * H;
    const circ = Math.PI * 2 * P.hipsX * (1 + sk[1] * 0.6) * 1.05;
    out.push({ key: 'skirt', mw: circ, mh: top - hem + 0.01 });
  }
  return out;
}

/** Add the skirt (if any) to the dressed body: a loft round the body's own hips, flaring to the hem. */
export function skirtPiece(body, plan, lod, rect, coatRect) {
  const { spec, P } = plan, H = P.H;
  if (spec.garb?.coat && coatRect) { // a long gakuran's tails (a chōran): open at the front, from just above the jacket's hem
    const top = P.hipY + 0.03 * H, hem = P.hipY - (P.hipY - P.kneeY) * (spec.garb.coat.len ?? 0.8);
    drape(body, plan, lod, coatRect, { top, hem, flare: 0.16, pleats: 0, gap: 0.2, ease: 0.012, parts: ['coat', 'coat', 'body'] });
  }
  const sk = SKIRT[spec.bottom.cut];
  if (!sk || !rect) return;
  const top = P.pelvisY + 0.016 * H, hem = sk[0] === null ? P.hipY - 0.085 * H : P.kneeY + sk[0] * H;
  P.skirtTop = top; P.skirtHem = hem;
  drape(body, plan, lod, rect, { top, hem, flare: sk[1], pleats: sk[2], gap: 0, ease: 0.004, parts: ['skirtUp', 'skirt', 'acc'] });
}

function drape(body, plan, lod, rect, o) {
  const { P } = plan, H = P.H, { top, hem } = o;
  const far = lod === 'far', NC = far ? 16 : 48, NRo = far ? 4 : 10;
  // the body's radius by angle at a few heights (torso + upper thighs), for the skirt to sit on
  const NA = 48, levels = [top, Math.min(top - 0.005, P.waistY - 0.01 * H), P.hipY + 0.02 * H, P.hipY - 0.02 * H, P.crotchY];
  const R = levels.map(() => new Float32Array(NA));
  for (let i = 0; i < body.n; i++) {
    const b = body.bi[i * 4]; if (!(TORSO.has(b) || LEGB.has(b))) continue;
    const x = body.pos[i * 3], y = body.pos[i * 3 + 1], z = body.pos[i * 3 + 2], a = Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * NA) % NA, r = Math.hypot(x, z);
    levels.forEach((ly, k) => { if (Math.abs(y - ly) < 0.018 * H) R[k][a] = Math.max(R[k][a], r); });
  }
  for (const r of R) for (let it = 0; it < 6; it++) for (let a = 0; a < NA; a++) if (!r[a]) r[a] = Math.max(r[(a + 1) % NA], r[(a + NA - 1) % NA]);
  const rAt = (k, th) => { const f = ((th + Math.PI) / (Math.PI * 2)) * NA, a = Math.floor(f) % NA; return lerp(R[k][a], R[k][(a + 1) % NA], f - Math.floor(f)); };
  const hipK = 3, flare = o.flare, pleats = o.pleats, ly1 = levels[1];
  const radius = (th, y) => {
    let r;
    if (y > ly1) r = lerp(rAt(1, th), rAt(0, th), clamp01((y - ly1) / Math.max(0.01, top - ly1)));
    else if (y > P.hipY - 0.02 * H) r = lerp(rAt(hipK, th), rAt(1, th), clamp01((y - (P.hipY - 0.02 * H)) / Math.max(0.01, ly1 - P.hipY + 0.02 * H)));
    else { const t = clamp01((P.hipY - 0.02 * H - y) / (P.hipY - 0.02 * H - hem)); r = Math.max(rAt(hipK, th), rAt(2, th)) * (1 + flare * t ** 0.85); }
    return r + o.ease;
  };
  const vpos = [], vapx = [], vb = [], rows = [];
  const add = (p, u, v, wSk) => {
    const i = body.n + vpos.length / 3;
    vpos.push(p[0], p[1], p[2]); vapx.push(rect.x + 1 + u * (rect.w - 2), rect.y + 1 + v * (rect.h - 2));
    vb.push(wSk); return i;
  };
  // outer surface
  for (let r = 0; r <= NRo; r++) {
    const t = r / NRo, y = lerp(top, hem, t ** 0.9), ring = [];
    const wSk = sstep(P.hipY + 0.02 * H, hem, y);
    for (let c = 0; c <= NC; c++) {
      const th = o.gap ? o.gap + (c / NC) * (Math.PI * 2 - o.gap * 2) : (c / NC) * Math.PI * 2 - Math.PI;
      let rr = radius(th > Math.PI ? th - Math.PI * 2 : th, y);
      if (pleats && y < P.hipY) { const q = (c / NC) * pleats * 2; rr += 0.006 * H * (Math.abs((q % 2) - 1) - 0.5) * sstep(P.hipY, hem, y) * (far ? 0 : 1); }
      ring.push(add([Math.sin(th) * rr, y, Math.cos(th) * rr], c / NC, t, wSk));
    }
    rows.push(ring);
  }
  const tris = [], th = 0.003;
  for (let r = 0; r < NRo; r++) for (let c = 0; c < NC; c++) tris.push(rows[r][c], rows[r + 1][c], rows[r + 1][c + 1], rows[r][c], rows[r + 1][c + 1], rows[r][c + 1]);
  // the hem's thickness: an inner ring and a rim
  const inner = [];
  const last = rows[NRo], prev = rows[NRo - 1];
  for (let c = 0; c <= NC; c++) {
    const i = last[c] - body.n, x = vpos[i * 3], y = vpos[i * 3 + 1], z = vpos[i * 3 + 2], l = Math.hypot(x, z) || 1;
    inner.push(add([x - (x / l) * th, y + 0.004 * H, z - (z / l) * th], c / NC, 0.97, vb[i]));
  }
  for (let c = 0; c < NC; c++) tris.push(last[c], inner[c], inner[c + 1], last[c], inner[c + 1], last[c + 1]);
  void prev;
  // an open front (coat tails): a lining inside and the cloth's thickness along both front edges
  if (o.gap && !far) {
    const lin = rows.map((ring) => ring.map((i) => { const q = i - body.n, x = vpos[q * 3], z = vpos[q * 3 + 2], l = Math.hypot(x, z) || 1; return add([x - (x / l) * th, vpos[q * 3 + 1], z - (z / l) * th], (vapx[q * 2] - rect.x - 1) / (rect.w - 2), (vapx[q * 2 + 1] - rect.y - 1) / (rect.h - 2), vb[q]); }));
    for (let r = 0; r < NRo; r++) for (let c = 0; c < NC; c++) tris.push(lin[r][c], lin[r + 1][c + 1], lin[r + 1][c], lin[r][c], lin[r][c + 1], lin[r + 1][c + 1]);
    for (let r = 0; r < NRo; r++) {
      tris.push(rows[r][0], lin[r][0], lin[r + 1][0], rows[r][0], lin[r + 1][0], rows[r + 1][0]);
      tris.push(rows[r][NC], rows[r + 1][NC], lin[r + 1][NC], rows[r][NC], lin[r + 1][NC], lin[r][NC]);
    }
  }
  const [pu, pl, mat] = o.parts;
  appendPiece(body, vpos, vapx, vb, tris, (i, wSk) => [[SKIRT_BONE, wSk], [HIPS_BONE, 1 - wSk]], (i) => (vpos[(i - body.n) * 3 + 1] > P.hipY - 0.01 * H ? [pu, mat] : [pl, mat]));
}

/** Append a garment piece to the body arrays (positions, atlas px, bones from bonesOf(i, w), part / painter per vertex). */
function appendPiece(body, vpos, vapx, vw, tris, bonesOf, partOf) {
  const n0 = body.n, n = vpos.length / 3, N = n0 + n;
  const cat = (A, add, T, per) => { const o = new T(N * per); o.set(A.subarray(0, n0 * per)); o.set(add, n0 * per); return o; };
  const bi = new Uint8Array(n * 4), bw = new Float32Array(n * 4), wl = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const bs = bonesOf(n0 + i, vw[i]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
    bs.forEach(([b, w], k) => { bi[i * 4 + k] = b; bw[i * 4 + k] = w; });
    wl[i] = body.nWeld + i;
  }
  body.vpart = body.vpart || [];
  for (let i = 0; i < n; i++) body.vpart[n0 + i] = partOf(n0 + i);
  body.pos = cat(body.pos, vpos, Float32Array, 3); body.apx = cat(body.apx, vapx, Float32Array, 2);
  body.bi = cat(body.bi, bi, Uint8Array, 4); body.bw = cat(body.bw, bw, Float32Array, 4);
  body.flags = cat(body.flags, new Uint8Array(n), Uint8Array, 1); body.src = cat(body.src, new Uint8Array(n), Uint8Array, 1);
  body.weld = cat(body.weld, wl, Uint16Array, 1); body.nWeld += n;
  for (const i of tris) body.idx.push(i);
  body.n = N; body.n0 = N;
}

// ------------------------------------------------------------------ collars: modelled bands (and their falls / points)
const COLLAR = { // stand (x H), fall (x H, 0 = a stand collar), front gap (rad), points (rad wide, x H drop)
  shirt: [0.017, 0.022, 0.1, 0.42, 0.03], suit: [0.017, 0.022, 0.06, 0.42, 0.032], flannel: [0.017, 0.022, 0.12, 0.42, 0.028],
  workjacket: [0.02, 0.028, 0.14, 0.5, 0.03], jacket: [0.022, 0.034, 0.2, 0.55, 0.035], polo: [0.014, 0.02, 0.22, 0.4, 0.022],
  blouse: [0.01, 0.018, 0.14, 0.5, 0.014], blazer: [0.012, 0.02, 0.16, 0.45, 0.024], cardigan: [0.01, 0.016, 0.18, 0.5, 0.014],
  gakuran: [0.034, 0, 0.03, 0, 0],
};
/** The collar of the top (vertex-coloured, like the gear), as a hairMesh Mesh-like { pos, apx, bi, bw, col, gear, idx }. */
export function collarPiece(body, plan, lod, Mesh) {
  const { spec, P } = plan, H = P.H, T = spec.top, k = T.kind;
  const C = COLLAR[k];
  if (!C || (k === 'shirt' && T.open)) return null;
  const far = lod === 'far', N = far ? 10 : 28;
  const col = (k === 'suit' || k === 'blazer' || k === 'cardigan' || k === 'blouse' ? T.shirt || [244, 242, 236] : T.col).map((v) => Math.max(0, Math.min(255, v)));
  // the neck's section just above its base (centre and radius by angle)
  const y = P.neckBase, NA = 24, R = new Float32Array(NA);
  let zc = 0, nz = 0;
  for (let i = 0; i < body.n; i++) if (body.bi[i * 4] === NECKB && Math.abs(body.pos[i * 3 + 1] - (y + 0.01 * H)) < 0.012 * H) { zc += body.pos[i * 3 + 2]; nz++; }
  zc = nz ? zc / nz : -0.012 * H;
  for (let i = 0; i < body.n; i++) {
    if (body.bi[i * 4] !== NECKB || Math.abs(body.pos[i * 3 + 1] - (y + 0.01 * H)) > 0.012 * H) continue;
    const x = body.pos[i * 3], z = body.pos[i * 3 + 2] - zc, a = Math.floor(((Math.atan2(x, z) + Math.PI) / (Math.PI * 2)) * NA) % NA;
    R[a] = Math.max(R[a], Math.hypot(x, z));
  }
  for (let it = 0; it < 6; it++) for (let a = 0; a < NA; a++) if (!R[a]) R[a] = Math.max(R[(a + 1) % NA], R[(a + NA - 1) % NA]);
  const rAt = (th) => { const f = ((th + Math.PI) / (Math.PI * 2)) * NA, a = Math.floor(f) % NA; return lerp(R[a], R[(a + 1) % NA], f - Math.floor(f)) || 0.05; };
  const [stand, fall, gap, pw, pd] = C;
  const y0 = y - 0.014 * H, y1 = y + stand * H;
  // profile (dr off the neck, height) from inside the band, over its top, down the fall and back under
  const prof = (th) => {
    if (!fall) return [[0.002, y0], [0.006, y1 - 0.004 * H], [0.003, y1], [0.0, y1 - 0.006 * H]];
    const f = Math.max(0, 1 - Math.abs(th) / pw), pt = f * f * (3 - 2 * f); // the points at the front
    const yf = y1 - fall * H - pd * H * pt, rf = 0.014 + 0.012 * pt + (k === 'jacket' ? 0.01 : 0);
    return [[0.002, y0], [0.005, y1], [rf, yf], [rf - 0.003, yf + 0.003], [0.004, y1 - 0.006 * H]];
  };
  const M = new Mesh(), cols = [];
  const span = Math.PI - gap; // columns from one side of the front gap round the back to the other
  const bones = (yy) => { const w = sstep(y - 0.01 * H, y + 0.02 * H, yy); return w > 0.5 ? [[NECKB, w], [B.chest, 1 - w]] : [[B.chest, 1 - w], [NECKB, w]]; };
  for (let c = 0; c <= N; c++) {
    const th = gap + (c / N) * span * 2; // gap .. 2pi - gap
    const thw = th > Math.PI ? th - Math.PI * 2 : th;
    const r0 = rAt(thw), pr = prof(thw), ring = [];
    for (let q = 0; q < pr.length; q++) {
      const rr = r0 + pr[q][0] + 0.003, yy = pr[q][1];
      const white = k === 'gakuran' && q === 2;
      ring.push(M.v([Math.sin(thw) * rr, yy, zc + Math.cos(thw) * rr], 0, 0, bones(yy), white ? [244, 242, 236] : col));
    }
    cols.push(ring);
  }
  const np = cols[0].length;
  for (let c = 0; c < N; c++) for (let q = 0; q < np - 1; q++) M.q(cols[c][q], cols[c][q + 1], cols[c + 1][q + 1], cols[c + 1][q]);
  // close both front ends (fans over the profile)
  for (const [ring, flip] of [[cols[0], false], [cols[N], true]]) for (let q = 1; q < np - 1; q++) { if (flip) M.t(ring[0], ring[q + 1], ring[q]); else M.t(ring[0], ring[q], ring[q + 1]); }
  return M;
}
