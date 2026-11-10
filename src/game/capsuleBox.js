// The sealed wholesale carton capsule refills arrive in: a printed corrugated box (src/gachakit/carton.js: a series
// panel, a shipping label with a barcode, handling marks), paper tape over the seam, four flaps and the capsules packed
// inside. Restocking happens in small steps (see GachaMachine): cut the tape, fold the flaps open, then take the
// capsules out one by one. data: { type: 'refill', series, count, stage: 0 sealed | 1 tape cut | 2 open }
import * as THREE from 'three';
import { capsuleColor, capsuleSize, capsuleStyle, pileGeometries, pileTopColor, CAPSULE_R } from './Capsule.js';
import { cartonParts, CARTON } from '../gachakit/carton.js';
import { audio } from '../core/audio.js';
import './gachaSfx.js';

const SIZE = CARTON; // w, h, d (a small inner carton)
const T = 0.004;

/**
 * Build the carton for a refill delivery. Returns a Group with userData.capBox: the controller
 * { data, setStage(n, animate), setCount(n), mouth(out) -> world point above the open top, layer }.
 */
export function makeCapsuleBox(data) {
  data.stage = data.stage ?? 0;
  const P = cartonParts(data.series);
  const group = new THREE.Group();
  const shell = new THREE.Mesh(P.geo.body, P.mat);
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  // flaps: long ones front / back (they lie on top of the short ones), short ones left / right
  const flaps = [];
  const mk = (long, sign) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(long ? P.geo.flapL : P.geo.flapS, P.mat);
    m.castShadow = true; m.receiveShadow = true;
    if (long) { piv.position.set(0, SIZE[1], sign * SIZE[2] / 2); m.position.y = T; } else piv.position.set(sign * SIZE[0] / 2, SIZE[1], 0);
    if (sign > 0) m.rotation.y = Math.PI;
    piv.add(m);
    group.add(piv);
    flaps.push({ piv, long, sign, k: data.stage >= 2 ? 1 : 0 });
  };
  mk(false, -1); mk(false, 1); mk(true, -1); mk(true, 1);
  // paper tape over the seam and down both ends
  const tape = new THREE.Mesh(P.geo.tape, P.mat);
  tape.userData.noRim = true;
  tape.visible = data.stage < 1;
  group.add(tape);
  // the capsules packed inside (instanced, a layer you can see once the flaps are open)
  const size = capsuleSize(data.series), kind = capsuleStyle(data.series);
  const pg = pileGeometries(size, kind, data.series);
  const r = CAPSULE_R[size];
  const nx = Math.max(1, Math.floor((SIZE[0] - 0.03) / (2 * r))), nz = Math.max(1, Math.floor((SIZE[2] - 0.03) / (2 * r)));
  const layer = nx * nz;
  const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, layer), top = new THREE.InstancedMesh(pg.top, pg.topMat, layer);
  const coat = pg.coat ? new THREE.InstancedMesh(pg.coat, pg.coatMat, layer) : null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < layer; i++) {
    const ix = i % nx, iz = Math.floor(i / nx);
    // packed as they come off the line: mostly upright, turned any way round, a few on their sides
    q.setFromEuler(e.set((rnd() - 0.5) * (i % 5 === 3 ? 2.6 : 0.5), rnd() * 6, (rnd() - 0.5) * (i % 4 === 1 ? 2.2 : 0.5)));
    m4.compose(new THREE.Vector3((ix - (nx - 1) / 2) * 2 * r, SIZE[1] - r - 0.008 - (ix + iz) % 2 * 0.006, (iz - (nz - 1) / 2) * 2 * r), q, new THREE.Vector3(1, 1, 1));
    bot.setMatrixAt(i, m4); top.setMatrixAt(i, m4);
    const c = capsuleColor(data.series, rnd);
    bot.setColorAt(i, col.set(c));
    if (pg.tintTop) top.setColorAt(i, col.set(pileTopColor(c, kind)));
  }
  if (coat) { coat.instanceMatrix = top.instanceMatrix; coat.renderOrder = 2.5; }
  const ims = [bot, top, coat].filter(Boolean);
  for (const im of ims) { im.userData.noRim = true; im.frustumCulled = false; im.raycast = () => {}; }
  top.renderOrder = 2; if (pg.bottomMat.transparent) bot.renderOrder = 2;
  group.add(...ims);
  const ctl = {
    data, group, layer,
    setCount(n) {
      data.count = n;
      for (const im of ims) { im.count = Math.min(layer, n); im.visible = data.stage >= 2 && n > 0; }
    },
    /** 1: tear the tape off, 2: fold the flaps open. */
    setStage(n, animate = true) {
      data.stage = n;
      tape.visible = n < 1;
      if (n >= 2) for (const f of flaps) f.target = 1;
      if (!animate) for (const f of flaps) { f.k = f.target ?? f.k; }
      ctl.setCount(data.count);
    },
    update(dt) {
      for (const f of flaps) {
        const want = f.target ?? (data.stage >= 2 ? 1 : 0);
        if (f.k !== want) f.k += Math.sign(want - f.k) * Math.min(Math.abs(want - f.k), dt * (f.long ? 3.2 : 4.5));
        // closed: flat over the opening; open: swung over the edge and hanging a little down the outside
        const a = f.k * (Math.PI + 0.35);
        if (f.long) f.piv.rotation.x = f.sign * a;
        else f.piv.rotation.z = -f.sign * a;
      }
    },
    /** World point just above the open top (where the hand takes a capsule from). */
    mouth(out = new THREE.Vector3()) { return group.localToWorld(out.set(0, SIZE[1] - r, 0)); },
    radius: r,
  };
  ctl.setCount(data.count);
  ctl.update(0);
  group.userData.capBox = ctl;
  group.userData.size = SIZE;
  // flaps animate on their own while the box is drawn
  let last = performance.now();
  shell.onBeforeRender = () => { const now = performance.now(); ctl.update(Math.min(0.05, (now - last) / 1000)); last = now; };
  return group;
}

/** The capsule-box controller of a held / loose box object (or null). */
export function capBoxOf(obj) { return obj?.userData?.capBox || null; }

/** Open a sealed box one step (cut the tape, then fold the flaps). Returns the new stage. */
export function openBoxStep(box, pos = null) {
  const ctl = capBoxOf(box.obj || box);
  const data = box.data || ctl?.data;
  if (!ctl || !data) return 0;
  const st = data.stage ?? 0;
  if (st >= 2) return st;
  ctl.setStage(st + 1);
  audio.play(st === 0 ? 'tapeRip' : 'flapFold', { pos: pos || undefined, vol: 0.9 });
  return st + 1;
}
