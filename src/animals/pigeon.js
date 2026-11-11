// The lane's pigeons: a feral rock dove (32 cm beak to tail) modelled from reference: a plump lofted body, an
// iridescent neck, a small head with the white cere and orange eyes, folded wings with the two black bars, a fanned tail
// with its dark band, coral legs and toes. One geometry with four morph targets (peck, head-bob, wings up, wings down:
// the wings morph from folded along the flank to spread in flight, the legs tuck up), so a whole flock is ONE instanced
// draw call with per-bird morph weights (InstancedMesh.setMorphAt).
//   const F = new PigeonFlock(n);  scene.add(F.mesh);  F.set(i, matrix, { peck, bob, fly, flap });  F.commit(count)
//   const m = makePigeon();  m.userData.anim({ peck, bob, fly, flap })    (one bird: the flyover, the props)
//   pigeonGeometry(perched | flying) -> a static geometry (the town's perched birds)
import * as THREE from 'three';
import { Loft, Builder, egg, fringe, shade, mixc, clamp } from './loft.js';

const sec = (p, r, up) => ({ p, r, up });
const C = {
  grey: 0x949cab, back: 0x8a92a2, belly: 0xa2a9b6, head: 0x7a8292, rump: 0xaeb4c0, wing: 0x8e96a6, bar: 0x2c2e36, prim: 0x50566a,
  green: 0x4e8a6e, purple: 0x8c5e94, tail: 0x8e95a4, band: 0x34363e, leg: 0xd6706c, beak: 0x3a3a40, cere: 0xece8e0, iris: 0xe2662c,
};
const tri = (x) => { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : 2 - f * 2; };

// pivots for the poses
const NECK = new THREE.Vector3(0, 0.12, 0.04), HIPP = new THREE.Vector3(0, 0.04, 0.0), MID = new THREE.Vector3(0, 0.1, 0);
function rotAbout(p, pivot, ax, ang) { return new THREE.Vector3(...p).sub(pivot).applyAxisAngle(ax, ang).add(pivot).toArray(); }
const X = new THREE.Vector3(1, 0, 0);

/** The lofts in a pose: s = { peck 0..1, bob 0..1, wing: 'fold' | 'up' | 'down' (flying: the body levels out, legs tuck) }. */
function parts(s) {
  const peck = s.peck || 0, bob = s.bob || 0, flying = s.wing && s.wing !== 'fold';
  // the whole bird tips forward to peck (and levels out in flight); the neck and head bend further
  const G = (p) => { let q = rotAbout(p, HIPP, X, peck * 0.42); if (flying) q = rotAbout(q, MID, X, 0.32); return q; };
  const Gu = (u) => { const v = new THREE.Vector3(...u).applyAxisAngle(X, peck * 0.42 + (flying ? 0.32 : 0)); return v.toArray(); };
  const body = new Loft([
    sec(G([0, 0.1, -0.09]), egg(0.026, 0.02, 0.022), Gu([0, 1, 0])),
    sec(G([0, 0.097, -0.06]), egg(0.042, 0.035, 0.04), Gu([0, 1, 0])),
    sec(G([0, 0.096, -0.02]), egg(0.05, 0.045, 0.058), Gu([0, 1, 0])),
    sec(G([0, 0.1, 0.02]), egg(0.05, 0.048, 0.063), Gu([0, 1, 0])),
    sec(G([0, 0.112, 0.05]), egg(0.042, 0.045, 0.05), Gu([0, 1, 0])),
    sec(G([0, 0.128, 0.068]), egg(0.03, 0.034, 0.034), Gu([0, 1, 0])),
  ], { cap: [0.02, 0.01], capSteps: 4 });
  const hk = (p, k) => { let q = rotAbout(p, NECK, X, peck * 0.95 * k + (flying ? -0.25 * k : 0)); q = [q[0], q[1] - bob * 0.003 * k, q[2] + bob * 0.018 * k]; return G(q); };
  const hu = (u, k) => Gu(new THREE.Vector3(...u).applyAxisAngle(X, peck * 0.95 * k + (flying ? -0.25 * k : 0)).toArray());
  const neckS = [
    [[0, 0.122, 0.042], egg(0.035, 0.032, 0.037), [0, 0.5, -1], 0.0],
    [[0, 0.146, 0.06], egg(0.03, 0.028, 0.031), [0, 0.5, -1], 0.4],
    [[0, 0.166, 0.07], egg(0.025, 0.024, 0.025), [0, 0.3, -1], 0.75],
    [[0, 0.18, 0.074], egg(0.021, 0.021, 0.02), [0, 0, -1], 0.95],
  ];
  const neck = new Loft(neckS.map(([p, r, u, k]) => sec(hk(p, k), r, hu(u, k))), { cap: [0, 0.01], capSteps: 3 });
  const headS = [
    [[0, 0.186, 0.061], egg(0.016, 0.016, 0.015)],
    [[0, 0.188, 0.075], egg(0.0175, 0.0185, 0.017)],
    [[0, 0.186, 0.089], egg(0.0145, 0.0145, 0.013)],
    [[0, 0.181, 0.098], egg(0.0085, 0.008, 0.007)],
  ];
  const head = new Loft(headS.map(([p, r]) => sec(hk(p, 1), r, hu([0, 1, 0], 1))), { cap: [0.008, 0.003], capSteps: 3 });
  const beak = new Loft([sec(hk([0, 0.18, 0.096], 1), egg(0.0046, 0.0044, 0.0034), hu([0, 1, 0], 1)), sec(hk([0, 0.1778, 0.109], 1), egg(0.0027, 0.0023, 0.0019), hu([0, 1, 0], 1)), sec(hk([0, 0.175, 0.117], 1), egg(0.0012, 0.001, 0.0009), hu([0, 1, 0], 1))], { cap: [0, 0.002], capSteps: 2 });
  const cere = new Loft([sec(hk([0, 0.1828, 0.0955], 1), egg(0.0042, 0.0032, 0.0018), hu([0, 1, 0], 1)), sec(hk([0, 0.1822, 0.1015], 1), egg(0.0038, 0.003, 0.0016), hu([0, 1, 0], 1))], { cap: [0.002, 0.002], capSteps: 2 });
  // tail: a flat fan sloping down from the rump, the feather ends notched
  const tail = new Loft([
    sec(G([0, 0.104, -0.075]), egg(0.008, 0.026, 0.026), Gu([1, 0, 0])),
    sec(G([0, 0.096, -0.11]), egg(0.0062, 0.032, 0.032), Gu([1, 0, 0])),
    sec(G([0, 0.086, -0.145]), egg(0.005, 0.036, 0.036), Gu([1, 0, 0])),
    sec(G([0, 0.078, -0.172]), fringe(egg(0.004, 0.038, 0.038), Math.PI * 0.1, Math.PI * 0.9, 6, 0.004), Gu([1, 0, 0])),
  ], { cap: [0, 0.006], capSteps: 2 });
  // wings: folded along the upper flank (narrow, the feathers stacked), or spread wide in flight (up / down stroke)
  const wings = [-1, 1].map((sd) => {
    const W = s.wing || 'fold', F = (x) => sd * x;
    const prim = (r) => fringe(r, Math.PI * 0.75, Math.PI * 1.15, 5, 0.006);
    let P, U, R;
    if (W === 'fold') {
      P = [[F(0.031), 0.128, 0.045], [F(0.037), 0.121, 0.015], [F(0.037), 0.115, -0.025], [F(0.032), 0.109, -0.065], [F(0.024), 0.103, -0.105], [F(0.015), 0.099, -0.135]].map(G);
      U = P.map(() => Gu([F(-0.25), 1, 0]));
      R = [egg(0.006, 0.011, 0.02), egg(0.005, 0.011, 0.024), egg(0.0042, 0.0095, 0.024), prim(egg(0.0036, 0.008, 0.02)), prim(egg(0.003, 0.006, 0.014)), egg(0.002, 0.003, 0.006)];
    } else {
      const up = W === 'up' ? 1 : -1;
      P = [0, 1, 2, 3, 4, 5].map((k) => { const t = k / 5; return [F(0.035 + 0.25 * t), 0.13 + up * (0.05 * t + 0.07 * t * t), 0.035 - 0.025 * t - 0.035 * t * t]; });
      U = P.map(() => [0, -0.3 * up, 1]);
      R = [egg(0.006, 0.024, 0.07), egg(0.005, 0.024, 0.075), egg(0.0045, 0.021, 0.072), prim(egg(0.0035, 0.016, 0.062)), prim(egg(0.003, 0.012, 0.046)), egg(0.002, 0.005, 0.018)];
    }
    return new Loft(P.map((p, k) => sec(p, R[k], U[k])), { cap: [0.004, 0.006], capSteps: 2 });
  });
  // legs and feet: short coral legs under the belly feathers, three toes forward and one back; tucked up in flight
  const legs = [-1, 1].map((sd) => {
    const tk = flying ? 1 : 0, base = new THREE.Vector3(sd * 0.018, 0.05, 0.004);
    const L = (p) => rotAbout(G(p), base, X, -tk * 1.5);
    const leg = new Loft([sec(L([sd * 0.018, 0.05, 0.004]), egg(0.0075, 0.009, 0.009), [0, 0, 1]), sec(L([sd * 0.02, 0.028, 0.008]), egg(0.0042, 0.0042, 0.0042), [0, 0, 1]), sec(L([sd * 0.021, 0.009, 0.011]), egg(0.0028, 0.0028, 0.0028), [0, 0, 1])], { cap: [0, 0.002], capSteps: 2 });
    const toes = [[0.35, 0.028], [0, 0.032], [-0.35, 0.028], [Math.PI, 0.017]].map(([a, len]) => {
      const o = L([sd * 0.021, 0.0045, 0.011]), d = [Math.sin(a) * sd, 0, Math.cos(a)];
      const e = L([sd * 0.021 + d[0] * len, 0.0022, 0.011 + d[2] * len]);
      return new Loft([sec(o, egg(0.0024, 0.0022, 0.0022), [0, 1, 0]), sec(e, egg(0.0014, 0.0013, 0.0013), [0, 1, 0])], { cap: [0.002, 0.003], capSteps: 2 });
    });
    return { leg, toes };
  });
  return { body, neck, head, beak, cere, tail, wings, legs };
}

function paint(part) {
  return (P, N, u, v) => {
    const th = u * Math.PI * 2 + Math.PI;
    let c = C.grey;
    if (part === 'beak') return v > 0.75 ? 0x24242a : C.beak;
    if (part === 'cere') return C.cere;
    if (part === 'leg' && P.y > 0.034) return C.belly; // feathered to the knee
    if (part === 'leg' || part === 'toe') return v > 0.9 && part === 'toe' ? 0x3a2a2a : shade(C.leg, N.y < -0.3 ? -0.1 : 0);
    if (part === 'head') {
      // the eye: orange iris ring round a black pupil, a pale lid ring, a catchlight
      const ex = Math.abs(P.x) - 0.0135, ey = P.y - 0.1905, ez = P.z - 0.081, d = Math.hypot(ey, ez);
      if (ex > -0.006 && d < 0.0052) return d < 0.0018 ? (Math.hypot(ey - 0.0009, ez - 0.0006) < 0.0007 ? 0xfdfaf2 : 0x0e0c0c) : d < 0.0042 ? C.iris : 0xb8b0b4;
      c = C.head;
    } else if (part === 'neck') {
      // the iridescent neck: green above, purple toward the breast, catching the light on the sides
      const k = (P.y - 0.12) / 0.065, side = Math.abs(N.x);
      c = k > 0.5 ? C.head : C.grey;
      if (side > 0.35 && k > 0.15 && k < 0.95) c = mixc(c, k > 0.55 ? C.green : C.purple, 0.32 + 0.25 * (side - 0.35));
      if (side > 0.75 && k > 0.2 && k < 0.85) c = shade(c, 0.08);
    } else if (part === 'body') {
      c = P.y < 0.07 ? C.belly : P.z < -0.06 && N.y > 0.4 ? C.rump : P.z > 0.035 && N.z > 0.4 ? mixc(C.grey, C.purple, 0.22) : C.back;
    } else if (part === 'tail') {
      c = P.z < -0.148 ? C.band : C.tail;
      if (P.z > -0.148 && tri((P.x * Math.sign(N.y || 1) + Math.abs(P.y)) * 120) < 0.12) c = shade(c, -0.08);
    } else if (part === 'wing') {
      // secondaries with the two black bars near the body, primaries darker toward the tip; feather edges
      const chord = Math.cos(th); // +1 leading edge, -1 trailing
      if (v > 0.62) c = mixc(C.wing, C.prim, (v - 0.62) / 0.38 * 1.4);
      else c = C.wing;
      if (v < 0.6 && v > 0.12) { if (Math.abs(chord + 0.15) < 0.12 || Math.abs(chord + 0.62) < 0.12) c = C.bar; }
      if (v > 0.55 && tri(chord * 3 + v * 9) < 0.08) c = shade(c, -0.15);
      if (chord > 0.7 && v < 0.5) c = shade(c, 0.06);
    }
    if (N.y < -0.5) c = shade(c, -0.08); else if (N.y > 0.85) c = shade(c, 0.05);
    return c;
  };
}

/** Build every part of a pose into one Builder (same order and sizes in every pose: the morph targets line up). */
function build(state, painted, k = 1) {
  const B = new Builder(512, 256, 3, { px: 2, grain: 0.09 }), Q = parts(state), pnt = (q) => (painted ? paint(q) : undefined), one = () => [[0, 1]];
  const R = (n) => Math.max(3, Math.round(n * k));
  B.part(Q.body, { rect: [0, 0, 200, 120], cols: R(26), rows: R(18), paint: pnt('body'), skin: one });
  B.part(Q.neck, { rect: [208, 0, 96, 80], cols: R(16), rows: R(10), paint: pnt('neck'), skin: one });
  B.part(Q.head, { rect: [312, 0, 96, 80], cols: R(16), rows: R(10), paint: pnt('head'), skin: one });
  B.part(Q.beak, { rect: [416, 0, 32, 24], grain: 0, cols: R(8), rows: R(4), paint: pnt('beak'), skin: one });
  B.part(Q.cere, { rect: [456, 0, 24, 16], grain: 0, cols: R(8), rows: R(4), paint: pnt('cere'), skin: one });
  B.part(Q.tail, { rect: [0, 128, 120, 64], cols: R(14), rows: R(8), paint: pnt('tail'), skin: one });
  Q.wings.forEach((w, i) => B.part(w, { rect: [128 + i * 128, 128, 120, 120], cols: R(14), rows: R(12), paint: pnt('wing'), skin: one }));
  Q.legs.forEach((L, i) => {
    B.part(L.leg, { rect: [416 + i * 40, 32, 32, 40], cols: R(6), rows: R(6), paint: pnt('leg'), skin: one });
    L.toes.forEach((t, j) => B.part(t, { rect: [384 + j * 30, 200 + i * 28, 24, 24], cols: R(5), rows: R(4), paint: pnt('toe'), skin: one }));
  });
  return B;
}

let ASSETS = null;
function assets() {
  if (ASSETS) return ASSETS;
  const B = build({ wing: 'fold' }, true);
  const geo = B.geometry();
  geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight');
  const targets = [build({ peck: 1, wing: 'fold' }), build({ bob: 1, wing: 'fold' }), build({ wing: 'up', tuck: 1 }), build({ wing: 'down', tuck: 1 })];
  geo.morphAttributes.position = targets.map((T) => new THREE.Float32BufferAttribute(T.pos, 3));
  geo.morphAttributes.normal = targets.map((T) => new THREE.Float32BufferAttribute(T.nrm, 3));
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 0.3; // (spread wings)
  const map = B.texture();
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0 });
  // static versions for the town's perched birds (no morphs, a lighter build on the same atlas) and a gliding one
  const LO = 0.55, lo = build({ wing: 'fold' }, false, LO), loUp = build({ wing: 'up' }, false, LO), loDn = build({ wing: 'down' }, false, LO);
  const still = (k) => {
    const g = new THREE.BufferGeometry();
    const pos = k === null ? lo.pos : loUp.pos.map((v, i) => (v + loDn.pos[i]) / 2), nrm = k === null ? lo.nrm : loUp.nrm;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(lo.uv, 2));
    g.setIndex(lo.idx); g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.size = new THREE.Vector3(k === null ? 0.11 : 0.62, 0.2, 0.3);
    return g;
  };
  ASSETS = { geo, mat, perched: still(null), flying: still(1) };
  return ASSETS;
}

export function pigeonGeometry(kind = 'perched') { return assets()[kind === 'flying' ? 'flying' : 'perched']; }
export function pigeonMaterial() { return assets().mat; }

const W4 = [0, 0, 0, 0];
/** Morph weights for a pose: peck, bob (0..1), fly (0..1: wings out, legs up), flap (phase, radians). */
export function weights(o, out = W4) {
  const fly = clamp(o.fly || 0, 0, 1), f = Math.sin(o.flap || 0);
  out[0] = (o.peck || 0) * (1 - fly); out[1] = (o.bob || 0) * (1 - fly);
  out[2] = fly * (0.5 + 0.5 * f); out[3] = fly * (0.5 - 0.5 * f);
  return out;
}

/** One animated pigeon (a Mesh with the morph targets): m.userData.anim({ peck, bob, fly, flap }). */
export function makePigeon(o = {}) {
  const A = assets();
  const m = new THREE.Mesh(A.geo, A.mat);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  m.morphTargetInfluences = [0, 0, 0, 0];
  m.userData.anim = (a) => { weights(a, m.morphTargetInfluences); };
  return m;
}

/** A whole flock in one instanced draw call. */
export class PigeonFlock {
  constructor(max = 16, o = {}) {
    const A = assets();
    this.mesh = new THREE.InstancedMesh(A.geo, A.mat, max);
    this.mesh.name = 'pigeons';
    this.mesh.castShadow = o.cast ?? true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.dummy = { morphTargetInfluences: [0, 0, 0, 0] };
    this.tint = new THREE.Color(1, 1, 1);
    // allocate the morph texture and the colours for every slot (sized by count), then draw none
    for (let i = 0; i < max; i++) { this.mesh.setMorphAt(i, this.dummy); this.mesh.setColorAt(i, this.tint); }
    this.mesh.count = 0;
  }
  /** Bird i: its world matrix, pose, and a coat tint (1 = the usual blue-bar grey). */
  set(i, matrix, pose, tint = 1) {
    this.mesh.setMatrixAt(i, matrix);
    weights(pose, this.dummy.morphTargetInfluences);
    this.mesh.setMorphAt(i, this.dummy);
    this.mesh.setColorAt(i, this.tint.setScalar(tint));
  }
  commit(count) {
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.morphTexture) this.mesh.morphTexture.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ a pecking flock (the pigeon man's birds, Poppo)
// Drop-in for src/npc/props.js's voxel Flock: same API (group, birds[i].b, setVisible, feed(p), scatter(), update(dt),
// dispose()), drawn as one instanced PigeonFlock.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export class GroundFlock {
  constructor(game, n = 5, center = new THREE.Vector3(), o = {}) {
    this.game = game;
    this.center = center.clone();
    this.group = new THREE.Group();
    this.group.name = 'pigeons';
    game.scene.add(this.group);
    this.flock = new PigeonFlock(n, o);
    this.group.add(this.flock.mesh);
    this.birds = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      b.position.set(center.x + (Math.random() - 0.5) * 2, 0, center.z + (Math.random() - 0.5) * 1.6);
      b.rotation.y = Math.random() * 6.28;
      this.birds.push({ b, t: Math.random() * 5, peck: 0, hop: 0, fly: 0, vy: 0, target: null, wait: Math.random() * 2, tint: o.tints?.[i] ?? (Math.random() < 0.3 ? 0.68 + Math.random() * 0.12 : 0.9 + Math.random() * 0.1), pose: { peck: 0, bob: 0, fly: 0, flap: 0 } });
    }
    this.visible = true;
    this.draw();
  }
  setVisible(on) { this.group.visible = on; this.visible = on; }
  /** Throw crumbs: they all come running to point p. */
  feed(p) { for (const B of this.birds) { B.target = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9)); B.wait = Math.random() * 0.4; } }
  scatter() {
    let any = false;
    for (const B of this.birds) if (!B.fly) { B.fly = 1; B.vy = 2.4 + Math.random(); B.dir = Math.random() * 6.28; any = true; }
    if (any) import('../core/audio.js').then(({ audio }) => { try { audio.play('flutter', { pos: this.birds[0].b.position, vol: 0.7 }); } catch { /* audio not ready */ } });
    return any;
  }
  update(dt) {
    if (!this.visible) return;
    const pl = this.game.player;
    if (Math.hypot(pl.pos.x - this.center.x, pl.pos.z - this.center.z) > 40) return;
    const fast = Math.hypot(pl.vel.x, pl.vel.z) > 3;
    for (const B of this.birds) {
      const b = B.b, A = B.pose;
      B.t += dt;
      if (B.fly) {
        B.fly += dt;
        b.position.y += B.vy * dt; B.vy -= dt * 0.6;
        b.position.x += Math.sin(B.dir) * 2.2 * dt; b.position.z += Math.cos(B.dir) * 2.2 * dt;
        b.rotation.y = B.dir; b.rotation.x = -0.3;
        A.fly = 1; A.flap = B.t * 26;
        if (B.fly > 6) { B.fly = 0; A.fly = 0; b.rotation.x = 0; b.position.set(this.center.x + (Math.random() - 0.5) * 2, 0, this.center.z + (Math.random() - 0.5) * 1.6); }
        continue;
      }
      if (fast && Math.hypot(pl.pos.x - b.position.x, pl.pos.z - b.position.z) < 1.4) { this.scatter(); break; }
      // peck, hop toward crumbs, little turns
      B.wait -= dt;
      let moving = false;
      if (B.target) {
        const dx = B.target.x - b.position.x, dz = B.target.z - b.position.z, dd = Math.hypot(dx, dz);
        if (dd < 0.08) B.target = null;
        else if (B.wait <= 0) { b.rotation.y = Math.atan2(dx, dz); const s = Math.min(dd, 0.9 * dt); b.position.x += dx / dd * s; b.position.z += dz / dd * s; B.hop += dt * 14; moving = true; }
      } else if (B.wait <= 0) {
        B.wait = 0.6 + Math.random() * 2.2;
        if (Math.random() < 0.5) B.peck = 1; else b.rotation.y += (Math.random() - 0.5) * 1.6;
      }
      B.peck = Math.max(0, B.peck - dt * 3);
      b.position.y = Math.abs(Math.sin(B.hop)) * 0.015 * (moving ? 1 : 0);
      A.fly = 0; A.peck = Math.sin(B.peck * Math.PI); A.bob = moving ? 0.5 + 0.5 * Math.sin(B.hop * 2) : 0;
    }
    this.draw();
  }
  draw() {
    let n = 0;
    for (const B of this.birds) {
      const b = B.b;
      _q.setFromEuler(_e.set(b.rotation.x, b.rotation.y, 0, 'YXZ'));
      this.flock.set(n++, _m.compose(b.position, _q, b.scale), B.pose, B.tint);
    }
    this.flock.commit(n);
  }
  dispose() { this.group.removeFromParent(); }
}
