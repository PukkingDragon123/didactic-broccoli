// Side job: wash Mr. Tanaka's little red kei wagon, parked across the lane by the side road. A bucket of soapy water
// with a sponge and a hishaku ladle waits by the front bumper. Dip the sponge, scrub each grimy panel (the road grime
// breaks up pixel by pixel and the suds build up; the sponge runs dry, dip it again), then scoop water with the ladle
// and sluice each panel clean. When every panel shines, his envelope is yours.
import * as THREE from 'three';
import { propMesh, propGeometry } from '../../world/props.js';
import { voxelMaterials } from '../../voxel/materials.js';
import { audio } from '../../core/audio.js';
import { carDirt, dissolvePix, dissolveMat } from '../art.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CAR = { x: -5.5, z: 12.55, rot: Math.PI / 2 };
const BUCKET = V(-3.35, 0, 11.45);
// panels in the car's own frame (front +z): ray origin, direction, size (w, h), texture px
const PANELS = [
  { id: 'l1', o: [1.5, 0.52, 0.72], d: [-1, 0, 0], w: 1.25, h: 0.55, px: [32, 14] },
  { id: 'l2', o: [1.5, 0.52, -0.72], d: [-1, 0, 0], w: 1.25, h: 0.55, px: [32, 14] },
  { id: 'r1', o: [-1.5, 0.52, 0.72], d: [1, 0, 0], w: 1.25, h: 0.55, px: [32, 14] },
  { id: 'r2', o: [-1.5, 0.52, -0.72], d: [1, 0, 0], w: 1.25, h: 0.55, px: [32, 14] },
  { id: 'f', o: [0, 0.5, 2.6], d: [0, 0, -1], w: 1.15, h: 0.5, px: [32, 14] },
  { id: 'b', o: [0, 0.85, -2.6], d: [0, 0, 1], w: 1.15, h: 0.95, px: [32, 26] },
  { id: 't', o: [0, 3, -0.25], d: [0, -1, 0], w: 1.05, h: 1.9, px: [22, 40] },
];

/** The kei wagon in Mr. Tanaka's colour: the mint paint of the town's one, recoloured cherry red. */
let carGeo = null;
function redCar() {
  if (carGeo) return carGeo;
  const src = propGeometry('kei_car');
  if (!src) return null;
  carGeo = src.clone();
  const c = carGeo.attributes.color;
  for (let i = 0; i < c.count; i++) {
    const r = c.getX(i), g = c.getY(i), b = c.getZ(i);
    if (g > r * 1.12 && b > r * 0.95 && g > 0.2) c.setXYZ(i, g * 1.05, r * 0.22, r * 0.2);
  }
  c.needsUpdate = true;
  return carGeo;
}

function sudsPix(seed, w, h) {
  return dissolvePix(w, h, seed, (p, r) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (r() < 0.55) p.px(x, y, r() < 0.7 ? 0xf8fafc : 0xdfeaf2);
  });
}

export class CarWash {
  constructor(game, jobs, def) {
    this.game = game;
    this.jobs = jobs;
    this.def = def;
    this.panels = [];
    this.stage = 'go';
  }

  start() {
    const g = this.game;
    const geo = redCar();
    const car = geo ? new THREE.Mesh(geo, voxelMaterials('normal')) : propMesh('kei_car');
    car.castShadow = true; car.receiveShadow = true;
    car.position.set(CAR.x, 0, CAR.z);
    car.rotation.y = CAR.rot;
    g.scene.add(car);
    car.updateMatrixWorld(true);
    this.car = car;
    const bb = new THREE.Box3().setFromObject(car);
    this.ob = g.player.addObstacle(bb.min.x, bb.max.x, bb.min.z, bb.max.z);
    // the bucket, the sponge on its rim, the ladle in it
    const bucket = propMesh('wash_bucket', { fallbackSize: [0.26, 0.28, 0.26], fallbackColor: 0x3f86e8 });
    bucket.position.copy(BUCKET);
    g.scene.add(bucket);
    this.bucket = bucket;
    this.bucketOb = g.player.addObstacle(BUCKET.x - 0.15, BUCKET.x + 0.15, BUCKET.z - 0.15, BUCKET.z + 0.15);
    this.sponge = propMesh('sponge'); this.sponge.position.set(BUCKET.x + 0.05, 0.3, BUCKET.z); this.sponge.rotation.z = 0.3; g.scene.add(this.sponge);
    this.ladle = propMesh('ladle'); this.ladle.position.set(BUCKET.x - 0.04, 0.2, BUCKET.z + 0.02); this.ladle.rotation.set(-0.9, 0.4, 0); g.scene.add(this.ladle);
    g.interaction.add(bucket, { reach: 2.4, hint: () => this.bucketHint(), use: () => { this.useBucket(); return false; } });
    // the grime: a dissolve plane on each panel, the suds on top of it
    const ray = new THREE.Raycaster();
    for (const P of PANELS) {
      const o = car.localToWorld(V(...P.o)), d = V(...P.d).transformDirection(car.matrixWorld);
      ray.set(o, d); ray.far = 4;
      const hit = ray.intersectObject(car, false)[0];
      if (!hit) continue;
      const n = d.clone().negate();
      const dirt = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.h), dissolveMat(carDirt(P.id.charCodeAt(0) * 7 + P.id.length, ...P.px).texture()));
      const suds = new THREE.Mesh(new THREE.PlaneGeometry(P.w * 0.94, P.h * 0.9), dissolveMat(sudsPix(P.id.charCodeAt(0), P.px[0], P.px[1]).texture()));
      for (const [m, off] of [[dirt, 0.01], [suds, 0.016]]) {
        m.position.copy(hit.point).addScaledVector(n, off);
        if (P.id === 't') m.rotation.set(-Math.PI / 2, 0, CAR.rot);
        else m.lookAt(m.position.clone().add(n));
        g.scene.add(m);
      }
      suds.material.opacity = 0.48;
      const pn = { P, dirt, suds, scrub: 0, soap: 0, clean: false };
      this.panels.push(pn);
      const handler = {
        reach: 2.4,
        hint: () => this.panelHint(pn),
        use: () => this.usePanel(pn),
        hold: {
          canStart: () => this.game.held.holding('sponge') && !pn.clean,
          start: () => { pn.next = 0; },
          update: (dt) => this.scrub(pn, dt),
          done: () => pn.scrub >= 1 || !(this.game.held.item?.data?.soap > 0),
        },
      };
      g.interaction.add(dirt, handler);
    }
    this.stage = 'wash';
  }

  left() { return this.panels.filter((p) => !p.clean).length; }

  bucketHint() {
    const H = this.game.held;
    if (H.holding('sponge')) return { key: 'LMB', text: 'Dip the sponge', sub: 'Warm soapy water' };
    if (H.holding('ladle')) return { key: 'LMB', text: H.item.data.water ? 'Already full' : 'Scoop some water', sub: 'For rinsing' };
    if (!H.canTake()) return { key: '', text: 'Bucket of soapy water', sub: 'Your hands are full' };
    if (this.sponge.visible) return { key: 'LMB', text: 'Take the sponge', sub: 'Then dip it' };
    if (this.ladle.visible) return { key: 'LMB', text: 'Take the ladle', sub: 'For rinsing' };
    return { key: '', text: 'Bucket of soapy water' };
  }

  useBucket() {
    const g = this.game, H = g.held;
    const p = BUCKET.clone().setY(0.3);
    if (H.holding('sponge')) {
      H.item.data.soap = 6;
      audio.play('splash', { pos: p, v: 0.7 });
      g.effects.splash({ pos: p, color: 0xf0f6fa, size: 0.05, count: 6 });
      g.effects.puff({ pos: p.clone().setY(0.34), count: 4, color: 0xffffff, size: 0.035, speed: 0.15, up: 0.1, gravity: 0 });
      H.swing = 0.6;
      return;
    }
    if (H.holding('ladle')) {
      if (H.item.data.water) return;
      H.item.data.water = true;
      audio.play('splash', { pos: p, v: 0.5 });
      g.effects.splash({ pos: p, color: 0xd8ecff, size: 0.05, count: 4 });
      return;
    }
    if (!H.canTake()) return;
    if (this.sponge.visible) { this.sponge.visible = false; H.giveTool('sponge', { job: 'car', soap: 0 }); audio.play('pickup', { vol: 0.8 }); return; }
    if (this.ladle.visible) { this.ladle.visible = false; H.giveTool('ladle', { job: 'car', water: false }); audio.play('pickup', { vol: 0.8 }); }
  }

  panelHint(pn) {
    const H = this.game.held;
    if (pn.clean) return null;
    if (H.holding('sponge')) {
      if (pn.scrub >= 1) return { key: '', text: 'Soapy panel', sub: 'Rinse it: water from the bucket with the ladle' };
      return H.item.data.soap > 0 ? { key: 'Hold LMB', text: 'Scrub', sub: `${Math.round(pn.scrub * 100)}%` } : { key: '', text: 'The sponge is dry', sub: 'Dip it in the bucket' };
    }
    if (H.holding('ladle')) {
      if (pn.scrub < 1) return { key: '', text: 'Still grimy', sub: 'Scrub it with the sponge first' };
      return H.item.data.water ? { key: 'LMB', text: 'Rinse it off', sub: 'Splash!' } : { key: '', text: 'Soapy panel', sub: 'Scoop water from the bucket first' };
    }
    return { key: '', text: pn.scrub >= 1 ? 'Soapy panel' : 'Road grime', sub: pn.scrub >= 1 ? 'Rinse with the ladle' : 'The sponge is in the bucket' };
  }

  usePanel(pn) {
    const g = this.game, H = g.held;
    if (pn.clean) return false;
    if (H.holding('sponge')) return H.item.data.soap > 0 && pn.scrub < 1 ? undefined : false;
    if (H.holding('ladle') && H.item.data.water && pn.scrub >= 1) {
      H.item.data.water = false;
      H.swing = 1;
      const p = pn.dirt.position.clone();
      audio.play('splash', { pos: p, v: 1 });
      g.effects.splash({ pos: p, color: 0xd8ecff, size: 0.07, count: 9, speed: 1.2 });
      // the water takes the suds (and the last grime) with it; a neighbouring soapy panel gets a share
      this.rinse(pn);
      const near = this.panels.find((q) => q !== pn && !q.clean && q.scrub >= 1 && q.dirt.position.distanceTo(p) < 1.6);
      if (near) this.rinse(near);
      return false;
    }
    return false;
  }

  scrub(pn, dt) {
    const g = this.game, it = g.held.item;
    if (!(it?.data?.soap > 0)) return;
    it.data.soap -= dt;
    pn.scrub = Math.min(1, pn.scrub + dt / 2.2);
    pn.dirt.material.opacity = 1 - 0.52 * 0.7 * pn.scrub;
    pn.suds.material.opacity = 0.48 + 0.52 * pn.scrub;
    pn.next -= dt;
    if (pn.next <= 0) {
      pn.next = 0.28;
      g.held.swing = 0.7;
      audio.play('scrub', { pos: pn.dirt.position, vol: 0.9 });
      g.effects.puff({ pos: pn.dirt.position.clone().add(V((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, 0)), count: 2, color: 0xffffff, size: 0.03, speed: 0.12, up: 0.1, gravity: 0, life: 0.9 });
    }
    if (it.data.soap <= 0) g.tip('spongeDry', 'The sponge is dry', 'Dip it in the bucket again');
  }

  rinse(pn) {
    const g = this.game;
    pn.clean = true;
    pn.dirt.material.opacity = 0.48; pn.dirt.visible = false;
    pn.suds.material.opacity = 0.48; pn.suds.visible = false;
    g.interaction.remove(pn.dirt);
    g.effects.sparks({ pos: pn.dirt.position, count: 10, colors: [0xffffff, 0xd8ecff], speed: 0.4, size: 0.012, star: 1, life: 0.8 });
    if (!this.left()) {
      this.stage = 'done';
      g.tweens.wait(0.8, () => this.jobs.finish(this.def.pay, this.car.position.clone().setY(1.3)));
    }
  }

  goal() {
    const g = this.game, H = g.held;
    const car = () => this.car.position.clone().setY(1.2);
    if (this.stage !== 'wash') return null;
    const scrubbed = this.panels.filter((p) => p.scrub >= 1 && !p.clean).length, left = this.left();
    const dirty = this.panels.find((p) => p.scrub < 1);
    if (!H.has('sponge') && dirty) return { id: 'car:sponge', icon: 'sponge', text: "Wash Mr. Tanaka's car", sub: 'The sponge is in the bucket by the car', at: () => BUCKET.clone().setY(0.5) };
    if (dirty) {
      const soap = H.holding('sponge') ? H.item.data.soap : 0;
      return { id: 'car:scrub', icon: 'sponge', text: `Scrub the grime (${this.panels.filter((p) => p.scrub < 1).length} panels)`, sub: !H.holding('sponge') ? 'Hold the sponge' : soap > 0 ? 'Hold click on the dirt' : 'Dip the sponge in the bucket', at: car };
    }
    if (scrubbed) return { id: 'car:rinse', icon: 'ladle', text: `Rinse the suds off (${left} left)`, sub: H.has('ladle') ? 'Scoop water, click a soapy panel' : 'The ladle is in the bucket', at: car };
    return { id: 'car:done', icon: 'car', text: 'Spotless!', sub: '' };
  }

  toolHint(it) {
    const id = it.data.id;
    if (id === 'sponge') return { key: '', text: it.data.soap > 0 ? 'Soapy sponge' : 'Dry sponge', sub: it.data.soap > 0 ? 'Hold click on the grime' : 'Dip it in the bucket' };
    if (id === 'ladle') return { key: '', text: it.data.water ? 'Ladle of water' : 'Empty ladle', sub: it.data.water ? 'Click a soapy panel' : 'Scoop from the bucket' };
    return null;
  }

  update() {}

  dispose() {
    const g = this.game;
    for (let i = 0; i < g.held.slots.length; i++) { const s = g.held.slots[i]; if (s?.kind === 'tool' && s.data.job === 'car') g.held.consume(i); }
    for (const pn of this.panels) { g.interaction.remove(pn.dirt); pn.dirt.parent?.remove(pn.dirt); pn.suds.parent?.remove(pn.suds); pn.dirt.material.map?.dispose(); pn.suds.material.map?.dispose(); }
    g.interaction.remove(this.bucket);
    for (const o of [this.bucket, this.sponge, this.ladle]) o.parent?.remove(o);
    g.player.removeObstacle(this.bucketOb);
    // Mr. Tanaka drives off a little later
    const car = this.car, ob = this.ob;
    g.tweens.wait(this.stage === 'done' ? 25 : 0.1, () => { car.parent?.remove(car); g.player.removeObstacle(ob); });
  }
}
