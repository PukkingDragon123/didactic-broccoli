// Side job: clean Mikawa-ya's shop windows. The old man has left a bucket with a spray bottle and a squeegee by his
// door. Spray a pane (soap foam spatters over the grime), then hold click and sweep the squeegee across it: every
// stroke wipes a clean band through the wet grime, pixel by pixel. Four panes; he pays (and throws in a ramune).
import * as THREE from 'three';
import { propMesh } from '../../world/props.js';
import { audio } from '../../core/audio.js';
import { Pix } from '../../gfx/pix.js';
import { rng } from '../../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PANES = [
  { x0: -15.1, x1: -14.2, z: 14.985 },
  { x0: -14.12, x1: -13.36, z: 14.843 },
  { x0: -11.51, x1: -10.73, z: 14.843 },
  { x0: -10.66, x1: -9.75, z: 14.985 },
];
const Y0 = 0.75, Y1 = 2.1, PW = 16, PH = 26;
const BUCKET = V(-13.05, 0, 14.6);
const GRIME = [0xc8bca4, 0xb4a890, 0xd8ccb2, 0xa89c86];

export class WindowWash {
  constructor(game, jobs, def) {
    this.game = game;
    this.jobs = jobs;
    this.def = def;
    this.panes = [];
    this.stage = 'go';
  }

  start() {
    const g = this.game;
    PANES.forEach((P, i) => {
      const p = new Pix(PW, PH, 70 + i);
      const r = rng(90 + i);
      // grime: an even film with streaks, fly specks and a rain line along the bottom
      let n = 0;
      // a dusty film in clumps (a coarse value noise), heavier in diagonal streaks and along the bottom where the rain
      // splashes up; clean glass shows through the gaps
      const cell = [];
      for (let k = 0; k < 7 * 9; k++) cell.push(r());
      const nz = (x, y) => { const fx = x / 3, fy = y / 3, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, c = (a, b) => cell[((b % 9) * 7 + (a % 7)) % cell.length]; return c(ix, iy) * (1 - ux) * (1 - uy) + c(ix + 1, iy) * ux * (1 - uy) + c(ix, iy + 1) * (1 - ux) * uy + c(ix + 1, iy + 1) * ux * uy; };
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const streak = Math.abs(((x + y * 0.6 + i * 3) % 9) - 4) < 1;
        if (nz(x, y) + (y > PH - 6 ? 0.3 : 0) + (streak ? 0.2 : 0) > 0.55) { p.px(x, y, GRIME[Math.floor(r() * 4)]); n++; }
      }
      for (let k = 0; k < 6; k++) p.px(Math.floor(r() * PW), Math.floor(r() * PH), 0x6a5e4e);
      p.flush();
      const tex = p.texture();
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, Y1 - Y0), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.6, transparent: false }));
      mesh.position.set((P.x0 + P.x1) / 2, (Y0 + Y1) / 2, P.z - 0.004);
      mesh.rotation.y = Math.PI;
      g.scene.add(mesh);
      const pane = { i, P, p, tex, mesh, total: n, left: n, wet: false, clean: false, last: null };
      this.panes.push(pane);
      g.interaction.add(mesh, {
        reach: 2.6,
        hint: () => this.paneHint(pane),
        use: () => this.usePane(pane),
        hold: {
          canStart: () => g.held.holding('squeegee') && pane.wet && !pane.clean,
          start: () => { pane.last = null; },
          update: (dt) => this.squeegee(pane, dt),
          done: () => pane.clean,
          end: () => { pane.last = null; },
        },
      });
    });
    const b = propMesh('bucket', { fallbackSize: [0.3, 0.3, 0.3] });
    b.position.copy(BUCKET);
    g.scene.add(b);
    this.bucket = b;
    this.tools = new THREE.Group();
    const sq = propMesh('squeegee'); sq.position.set(0.02, 0.24, 0); sq.rotation.z = 0.25; this.tools.add(sq);
    const sp = propMesh('spray_bottle'); sp.position.set(0.22, 0, 0.05); this.tools.add(sp);
    this.tools.position.copy(BUCKET);
    g.scene.add(this.tools);
    g.interaction.add(b, {
      reach: 2.4,
      hint: () => (this.tools.visible ? (g.held.slots.filter((s) => !s).length >= 2 ? { key: 'LMB', text: 'Take the squeegee and the spray', sub: 'Left out by the old man' } : { key: '', text: 'Squeegee and spray', sub: 'Free up two hands (slots)' }) : { key: '', text: 'An old bucket' }),
      use: () => {
        if (!this.tools.visible || g.held.slots.filter((s) => !s).length < 2) return false;
        this.tools.visible = false;
        g.held.giveTool('spray', { job: 'windows' });
        g.held.giveTool('squeegee', { job: 'windows' });
        audio.play('pickup', { vol: 0.8 });
        return false;
      },
    });
    this.stage = 'wash';
  }

  paneHint(pane) {
    const H = this.game.held;
    if (pane.clean) return null;
    const pct = Math.round((1 - pane.left / pane.total) * 100);
    if (H.holding('spray')) return { key: 'LMB', text: pane.wet ? 'Spray it some more' : 'Spray the window', sub: 'Soap first, then the squeegee' };
    if (H.holding('squeegee')) return pane.wet ? { key: 'Hold LMB', text: 'Squeegee it', sub: `Drag across the glass · ${pct}%` } : { key: '', text: 'Dry grime', sub: 'Spray it first' };
    return { key: '', text: 'Grimy shop window', sub: H.has('spray') ? 'Hold the spray or the squeegee' : 'The bucket by the door' };
  }

  usePane(pane) {
    const g = this.game, H = g.held;
    if (pane.clean) return false;
    if (H.holding('spray')) {
      pane.wet = true;
      const r = Math.random;
      // soap spatters over the glass
      for (let k = 0; k < PW * PH * 0.22; k++) pane.p.px(Math.floor(r() * PW), Math.floor(r() * PH * 0.9), r() < 0.8 ? 0xf4f8fa : 0xd8e8f0);
      pane.p.flush(); pane.tex.needsUpdate = true;
      pane.left = this.count(pane);
      pane.total = Math.max(pane.total, pane.left);
      audio.play('spray', { pos: pane.mesh.position, vol: 0.9 });
      g.effects.splash({ pos: pane.mesh.position.clone().add(V(0, 0.2, -0.05)), color: 0xe8f4fa, size: 0.04, count: 4, speed: 0.5 });
      H.swing = 0.5;
      return false;
    }
    if (H.holding('squeegee') && pane.wet) return undefined;
    return false;
  }

  count(pane) { let n = 0; const d = pane.p.d; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++; return n; }

  squeegee(pane, dt) {
    const g = this.game;
    const hit = g.interaction.castAgainst([pane.mesh], 3)[0];
    if (!hit?.uv) return;
    const x = hit.uv.x * PW, y = (1 - hit.uv.y) * PH;
    const last = pane.last || { x, y };
    const d = Math.hypot(x - last.x, y - last.y);
    const steps = Math.max(1, Math.ceil(d));
    const D = pane.p.d;
    for (let s = 0; s <= steps; s++) {
      const cx = last.x + (x - last.x) * s / steps, cy = last.y + (y - last.y) * s / steps;
      // the blade: a wide horizontal band (rubber edge) wiping everything under it
      for (let yy = Math.round(cy) - 1; yy <= Math.round(cy); yy++) for (let xx = Math.round(cx) - 4; xx <= Math.round(cx) + 4; xx++) {
        if (xx < 0 || yy < 0 || xx >= PW || yy >= PH) continue;
        D[(yy * PW + xx) * 4 + 3] = 0;
      }
    }
    pane.p.dirty = true;
    pane.p.flush(); pane.tex.needsUpdate = true;
    pane.last = { x, y };
    pane.moved = (pane.moved || 0) + d;
    if (pane.moved > 4) { pane.moved = 0; audio.play('squeegee', { pos: pane.mesh.position, vol: 0.8 }); g.held.swing = 0.4; }
    pane.left = this.count(pane);
    if (pane.left / pane.total < 0.07) {
      pane.clean = true;
      for (let i = 3; i < D.length; i += 4) D[i] = 0;
      pane.p.dirty = true; pane.p.flush(); pane.tex.needsUpdate = true;
      pane.mesh.visible = false;
      g.interaction.remove(pane.mesh);
      g.effects.sparks({ pos: pane.mesh.position.clone().add(V(0, 0, -0.05)), count: 14, colors: [0xffffff, 0xd8ecff], speed: 0.5, size: 0.014, star: 1, life: 0.9, radius: 0.5 });
      audio.play('task', { vol: 0.4 });
      if (this.panes.every((p) => p.clean)) this.done();
    }
    void dt;
  }

  done() {
    const g = this.game;
    this.stage = 'done';
    // a ramune from the tub on the house
    if (g.held.canTake()) g.tweens.wait(1.2, () => { if (g.held.canTake()) g.held.giveTool('ramune'); });
    g.tweens.wait(0.6, () => this.jobs.finish(this.def.pay, V(-12.4, 1.4, 14.4)));
  }

  goal() {
    const g = this.game, H = g.held;
    if (this.stage !== 'wash') return null;
    const dirty = this.panes.filter((p) => !p.clean);
    if (!H.has('squeegee')) return { id: 'win:tools', icon: 'squeegee', text: "Clean Mikawa-ya's windows", sub: 'Squeegee and spray: the bucket by his door', at: () => BUCKET.clone().setY(0.6) };
    const next = dirty.find((p) => p.wet) || dirty[0];
    const at = () => next.mesh.position.clone();
    if (!next.wet) return { id: 'win:spray', icon: 'spray', text: `Clean the windows (${dirty.length} left)`, sub: H.holding('spray') ? 'Click a grimy pane' : 'Hold the spray bottle first', at };
    return { id: 'win:squeegee', icon: 'squeegee', text: `Squeegee the glass (${dirty.length} left)`, sub: H.holding('squeegee') ? 'Hold click and drag across it' : 'Hold the squeegee', at };
  }

  toolHint(it) {
    const id = it.data.id;
    if (id === 'spray') return { key: '', text: 'Spray bottle', sub: 'Click a grimy window' };
    if (id === 'squeegee') return { key: '', text: 'Squeegee', sub: 'Hold click and drag across wet glass' };
    return null;
  }

  update() {}

  dispose() {
    const g = this.game;
    for (let i = 0; i < g.held.slots.length; i++) { const s = g.held.slots[i]; if (s?.kind === 'tool' && s.data.job === 'windows') g.held.consume(i); }
    for (const p of this.panes) { g.interaction.remove(p.mesh); p.mesh.parent?.remove(p.mesh); p.tex.dispose(); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    g.interaction.remove(this.bucket);
    this.bucket.parent?.remove(this.bucket);
    this.tools.parent?.remove(this.tools);
  }
}
