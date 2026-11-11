// The sealed wholesale carton capsule refills arrive in: cardboard, packing tape over the seam, four flaps and the
// capsules packed inside. Restocking happens in small steps (see GachaMachine): cut the tape, fold the flaps open,
// then take the capsules out one by one. data: { type: 'refill', series, count, stage: 0 sealed | 1 tape cut | 2 open }
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { capsuleColor, capsuleSize, capsuleStyle, pileGeometries, CAPSULE_R } from './Capsule.js';
import { audio } from '../core/audio.js';
import './gachaSfx.js';

const VS = 0.01;
const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const SIZE = [0.27, 0.15, 0.2]; // w, h, d (a small inner carton)

const geoCache = new Map();
function g(key, build) { if (!geoCache.has(key)) geoCache.set(key, meshVoxels(build(), { voxelSize: VS, origin: 'none' })); return geoCache.get(key); }

const W = Math.round(SIZE[0] / VS), H = Math.round(SIZE[1] / VS), D = Math.round(SIZE[2] / VS);
const CB = 0xc89a5f, CB2 = 0xb68850, CB3 = 0xd8b07a;

function shellModel() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  v.hollowBox(-W / 2, 0, -D / 2, W / 2 - 1, H - 1, D / 2 - 1, CB, 1, ['top']);
  // corrugated edge lines
  v.recolor((x, y, z, c) => ((x === -W / 2 || x === W / 2 - 1) && (z === -D / 2 || z === D / 2 - 1) ? CB2 : undefined));
  return v;
}
/** One flap (front / back: along x; left / right: along z), hinged at y = 0, lying flat when closed. */
function flapModel(long) {
  const v = new VoxelModel();
  v.jitter = 0.03;
  if (long) v.box(-W / 2, 0, 0, W / 2 - 1, 0, Math.floor(D / 2) - 1, CB3);
  else v.box(0, 0, -D / 2, Math.floor(W / 2) - 1, 0, D / 2 - 1, CB);
  return v;
}

const labelCache = new Map();
function labelTexture(series, count) {
  const k = series + ':' + count;
  if (labelCache.has(k)) return labelCache.get(k);
  const s = SERIES_BY_ID[series];
  const p = new Pix(96, 56, 6);
  p.fill(0xf7f0de);
  p.rect(0, 0, 96, 12, hex(s?.card?.accent || '#e5383b'));
  p.tinyText('CAPSULE TOYS', 48, 3, { color: 0xffffff, align: 'center' });
  const name = (s?.name || series).toUpperCase();
  const lines = name.length > 16 ? [name.slice(0, name.lastIndexOf(' ', 16) > 0 ? name.lastIndexOf(' ', 16) : 16).trim(), name.slice(name.lastIndexOf(' ', 16) > 0 ? name.lastIndexOf(' ', 16) : 16).trim()] : [name];
  lines.slice(0, 2).forEach((l, i) => p.tinyText(l, 48, 16 + i * 9, { color: 0x2a2220, align: 'center' }));
  p.text(`x${count}`, 48, 34, { size: 16, color: 0xd8282a, align: 'center', font: FONT_EN });
  p.rect(4, 50, 88, 2, 0xd8c8a0);
  const t = p.texture();
  labelCache.set(k, t);
  return t;
}

/**
 * Build the carton for a refill delivery. Returns a Group with userData.capBox: the controller
 * { data, setStage(n, animate), setCount(n), mouth(out) -> world point above the open top, layer }.
 */
export function makeCapsuleBox(data) {
  data.stage = data.stage ?? 0;
  const mats = voxelMaterials('normal');
  const group = new THREE.Group();
  const shell = new THREE.Mesh(g('shell', shellModel), mats);
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  // label on the long sides
  const lm = new THREE.MeshStandardMaterial({ map: labelTexture(data.series, data.count), roughness: 0.85 });
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(SIZE[0] * 0.62, SIZE[0] * 0.62 * 56 / 96), lm);
    l.position.set(0, SIZE[1] * 0.48, s * (SIZE[2] / 2 + 0.0008));
    if (s < 0) l.rotation.y = Math.PI;
    l.userData.noRim = true;
    group.add(l);
  }
  // flaps: long ones front / back (they sit on top of the short ones), short ones left / right
  const flaps = [];
  const mk = (long, sign) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(g(long ? 'flapL' : 'flapS', () => flapModel(long)), mats);
    m.castShadow = true;
    // each flap mesh extends from its hinge toward the centre; long (front / back) flaps lie over the short ones
    if (long) { piv.position.set(0, H * VS, sign * (D / 2) * VS); m.position.y = VS; }
    else piv.position.set(sign * (W / 2) * VS, H * VS, 0);
    if (sign > 0) m.rotation.y = Math.PI;
    piv.add(m);
    group.add(piv);
    flaps.push({ piv, long, sign, k: data.stage >= 2 ? 1 : 0 });
  };
  mk(false, -1); mk(false, 1); mk(true, -1); mk(true, 1);
  // packing tape along the seam and down both ends
  const tapeM = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.35, transparent: true, opacity: 0.88 });
  const tape = new THREE.Group();
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(SIZE[0] + 0.004, 0.002, 0.05), tapeM);
  t1.position.y = SIZE[1] + 2 * VS + 0.001;
  tape.add(t1);
  for (const s2 of [-1, 1]) { const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.07, 0.05), tapeM); t2.position.set(s2 * (SIZE[0] / 2 + 0.002), SIZE[1] - 0.03, 0); tape.add(t2); }
  tape.visible = data.stage < 1;
  group.add(tape);
  // the capsules packed inside (instanced, a layer you can see once the flaps are open)
  const size = capsuleSize(data.series), kind = capsuleStyle(data.series);
  const pg = pileGeometries(size, kind, data.series);
  const r = CAPSULE_R[size];
  const nx = Math.max(1, Math.floor((SIZE[0] - 0.03) / (2 * r))), nz = Math.max(1, Math.floor((SIZE[2] - 0.03) / (2 * r)));
  const layer = nx * nz;
  const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, layer), top = new THREE.InstancedMesh(pg.top, pg.topMat, layer);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < layer; i++) {
    const ix = i % nx, iz = Math.floor(i / nx);
    q.setFromEuler(e.set(rnd() * 6, rnd() * 6, rnd() * 6));
    m4.compose(new THREE.Vector3((ix - (nx - 1) / 2) * 2 * r, SIZE[1] - r - 0.006 - (ix + iz) % 2 * 0.006, (iz - (nz - 1) / 2) * 2 * r), q, new THREE.Vector3(1, 1, 1));
    bot.setMatrixAt(i, m4); top.setMatrixAt(i, m4);
    bot.setColorAt(i, col.set(capsuleColor(data.series, rnd)));
  }
  for (const im of [bot, top]) { im.userData.noRim = true; im.frustumCulled = false; }
  top.renderOrder = 2;
  group.add(bot, top);
  const ctl = {
    data, group, layer,
    setCount(n) {
      data.count = n;
      bot.count = top.count = Math.min(layer, n);
      bot.visible = top.visible = data.stage >= 2 && n > 0;
      if (lm.map !== labelTexture(data.series, Math.max(0, n))) { lm.map = labelTexture(data.series, Math.max(0, n)); lm.needsUpdate = true; }
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
