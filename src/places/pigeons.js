// What the lane's pigeons leave behind: now and then one lets go (a white pixel drop falls), leaving a splat on the
// ground, on the roof of your van, or on the shop's front step, until you scrub it off with the broom (hold LMB). Once
// in a while a pigeon flies right over you, and... a splat in the corner of your view for a moment ("they say it's good
// luck"). Splats near the shop front make it a little dirtier. The pigeons themselves are src/world/Street.js, which
// calls drop(x, y, z).
//   game.places.pigeons = { drop(x, y, z), splats, flyover() }      save: game.state.pigeons (ground splats)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ensureState } from '../game/stateExt.js';
import { propMesh } from '../world/props.js';
import { GARAGE } from '../world/Garage.js';
import { pixCanvas, hitBox } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const MAX = 14;

/** A splat, hand-pixelled: an irregular white blot with grey-green specks (seeded). */
function splatArt(seed) {
  let x0 = seed * 9301 + 49297;
  const r = () => { x0 = (x0 * 9301 + 49297) % 233280; return x0 / 233280; };
  return pixCanvas(16, 16, (c) => {
    const blobs = [[8, 8, 3.2]];
    for (let i = 0; i < 5; i++) blobs.push([8 + (r() - 0.5) * 9, 8 + (r() - 0.5) * 9, 0.8 + r() * 1.6]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let inside = false, core = false;
      for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, y - by); if (d < br) inside = true; if (d < br * 0.45) core = true; }
      if (!inside) continue;
      c.fillStyle = core && r() < 0.5 ? '#8a9a6a' : r() < 0.15 ? '#c8c8bc' : '#f4f4ee';
      c.fillRect(x, y, 1, 1);
    }
  });
}

export class Droppings {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.s = ensureState(game, 'pigeons', { v: 1, splats: [], hits: 0 });
    this.splats = [];
    this.arts = [0, 1, 2, 3].map((i) => splatArt(i + 3));
    this.mats = this.arts.map((a) => new THREE.MeshStandardMaterial({ map: a.tex, transparent: true, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    this.geo = new THREE.PlaneGeometry(0.22, 0.22).rotateX(-Math.PI / 2);
    for (const [x, y, z, r, s] of this.s.splats) this.place(x, y, z, { rot: r, s, quiet: true });
    this.flyT = rnd(120, 220);
    this.fly = null;
    this.buildOverlay();
  }

  /** A dropping lets go at (x, y, z): it falls; where it lands it stays (or it lands on you). */
  drop(x, y, z) {
    const g = this.game, P = g.player.pos;
    const outside = P.z > GARAGE.maxZ - 0.2 && !this.places.where;
    const onYou = outside && Math.hypot(P.x - x, P.z - z) < 0.42 && y > 1.6;
    g.effects.emit({
      sprite: 'drop', x, y, z, vy: -0.2, gravity: 9.8, color: 0xf4f4ee, life: Math.sqrt(2 * Math.max(0.1, y) / 9.8) + 0.3, size: 0.03, fade: 0.05,
      update: (p, dt) => {
        p.vy -= 9.8 * dt; p.y += p.vy * dt;
        const floor = onYou ? 1.55 : this.surfaceY(p.x, p.z);
        if (p.y <= floor && !p.data?.landed) {
          p.data = { landed: true };
          p.age = p.life;
          if (onYou && Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < 0.5) this.hitYou();
          else this.place(p.x, floor, p.z);
        }
      },
    });
  }

  /** The van's roof if it's under you, else the ground. */
  surfaceY(x, z) {
    const van = this.game.life?.van?.root;
    if (van) {
      if (!this.vanBox || this.game.time - this.vanT > 5) { this.vanBox = new THREE.Box3().setFromObject(van); this.vanT = this.game.time; }
      const b = this.vanBox;
      if (x > b.min.x + 0.1 && x < b.max.x - 0.1 && z > b.min.z + 0.1 && z < b.max.z - 0.1) return b.max.y + 0.002;
    }
    return 0.004;
  }

  place(x, y, z, { rot = Math.random() * 6.28, s = rnd(0.8, 1.3), quiet = false } = {}) {
    const g = this.game;
    const m = new THREE.Mesh(this.geo, this.mats[Math.floor(Math.random() * this.mats.length)]);
    m.position.set(x, y, z); m.rotation.y = rot; m.scale.setScalar(s);
    m.renderOrder = 2;
    const van = this.game.life?.van?.root;
    let parent = g.scene;
    if (y > 0.5 && van) { parent = van; van.worldToLocal(m.position); m.rotation.y -= van.rotation.y; }
    parent.add(m);
    const hb = hitBox(0.24, 0.06, 0.24, 0, 0.02, 0);
    m.add(hb);
    const sp = { m, hb, x, y, z, rot, s, ground: parent === g.scene, t: 0 };
    g.interaction.add(hb, {
      reach: 2.2,
      hint: () => (g.held.holding('broom') ? { key: 'Hold LMB', text: 'Scrub off the pigeon mess', sub: 'Ew.' } : { key: '', text: 'Pigeon droppings', sub: 'A broom would get it off' }),
      use: () => g.held.holding('broom'),
      hold: {
        canStart: () => g.held.holding('broom'),
        start: () => { sp.t = 0; },
        update: (dt) => { sp.t += dt; if (g.held.swing !== undefined && g.held.swing < 0.2) { g.held.swing = 1; audio.play('sweep', { vol: 0.5 }); } if (sp.t > 0.9) this.clean(sp); },
        done: () => !this.splats.includes(sp),
      },
    });
    this.splats.push(sp);
    if (!quiet) {
      if (g.player.pos.distanceTo(m.getWorldPosition(new THREE.Vector3())) < 10) audio.play('splat', { pos: m.getWorldPosition(new THREE.Vector3()), vol: 0.5 });
      if (sp.ground && Math.abs(x) < 5 && z > GARAGE.maxZ - 0.5 && z < GARAGE.maxZ + 2.5 && g.sim?.s) g.sim.s.dirt = Math.min(1, g.sim.s.dirt + 0.012);
    }
    while (this.splats.length > MAX) this.clean(this.splats[0], true);
    this.persist();
    return sp;
  }

  clean(sp, quiet = false) {
    const g = this.game, i = this.splats.indexOf(sp);
    if (i < 0) return;
    this.splats.splice(i, 1);
    g.interaction.remove(sp.hb);
    const at = sp.m.getWorldPosition(new THREE.Vector3());
    sp.m.parent?.remove(sp.m);
    if (!quiet) { g.effects.puff({ pos: at.add(V(0, 0.04, 0)), count: 4, colors: [0xd8d8cc, 0xb8b8a8], size: 0.04, up: 0.08 }); audio.play('scrub', { vol: 0.5 }); g.events.emit('cleaned', { what: 'pigeon' }); }
    this.persist();
  }

  persist() { this.s.splats = this.splats.filter((s) => s.ground).map((s) => [+s.x.toFixed(2), +s.y.toFixed(3), +s.z.toFixed(2), +s.rot.toFixed(2), +s.s.toFixed(2)]); }

  // ------------------------------------------------------------------ direct hits
  buildOverlay() {
    const el = document.createElement('img');
    el.id = 'nd-splat';
    const big = pixCanvas(48, 48, (c) => {
      const blobs = [[24, 22, 12], [12, 30, 5], [36, 34, 6], [30, 12, 5], [16, 14, 4], [40, 22, 3], [22, 40, 4]];
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        let a = false, core = false;
        for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, y - by); if (d < br) a = true; if (d < br * 0.4) core = true; }
        if (!a) continue;
        c.fillStyle = core && (x * 7 + y * 3) % 5 < 2 ? '#9aa87a' : (x + y * 3) % 11 === 0 ? '#d4d4c8' : '#f6f6f0';
        c.fillRect(x, y, 1, 1);
      }
      // drips running down
      for (const [dx, len] of [[18, 9], [27, 13], [33, 7]]) for (let i = 0; i < len; i++) { c.fillStyle = '#f0f0ea'; c.fillRect(dx, 34 + i, 2, 1); }
    });
    el.src = big.canvas.toDataURL();
    document.body.appendChild(el);
    this.overlay = el;
  }
  hitYou() {
    const g = this.game, el = this.overlay;
    this.s.hits++;
    audio.play('splat', { vol: 0.9, v: 1.2 });
    g.player.shake = Math.max(g.player.shake, 0.35);
    const right = Math.random() < 0.5;
    el.style.left = right ? 'auto' : `${rnd(20, 120)}px`;
    el.style.right = right ? `${rnd(20, 120)}px` : 'auto';
    el.style.top = `${rnd(10, 90)}px`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    g.tweens.wait(0.6, () => g.monologue?.say(pick(['...Seriously?', 'On my HEAD?!', 'They say it\'s good luck. They\'re lying.', 'Unko ga tsuita... "luck has come". Great.']), { force: true }));
    g.events.emit('pooped', { hits: this.s.hits });
  }

  // ------------------------------------------------------------------ a pigeon flying right over you now and then
  flyover() {
    const g = this.game, P = g.player.pos;
    const m = propMesh('pigeon_fly', { castShadow: true });
    const side = Math.random() < 0.5 ? -1 : 1;
    const from = V(P.x + side * 9, 4.2, P.z + rnd(-1.5, 1.5)), to = V(P.x - side * 9, 4.8, P.z + rnd(-1.5, 1.5));
    m.position.copy(from);
    m.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    g.scene.add(m);
    audio.play('flutter', { pos: from, vol: 0.6 });
    this.fly = { m, from, to, t: 0, dur: 3.2, dropped: false, will: Math.random() < 0.45 };
  }

  update(dt) {
    const g = this.game, P = g.player.pos;
    const outside = !this.places.where && P.z > GARAGE.maxZ + 0.5 && P.z < 14.5 && Math.abs(P.x) < 24;
    if (!this.fly && outside && !g.cutscene?.active) {
      this.flyT -= dt;
      if (this.flyT <= 0) { this.flyT = rnd(150, 300); this.flyover(); }
    }
    const f = this.fly;
    if (f) {
      f.t += dt;
      const k = f.t / f.dur;
      f.m.position.lerpVectors(f.from, f.to, k);
      f.m.position.y += Math.sin(k * Math.PI) * 0.4;
      f.m.children[0] && (f.m.scale.y = 0.85 + Math.abs(Math.sin(f.t * 22)) * 0.3);
      if (f.will && !f.dropped && k > 0.47) {
        f.dropped = true;
        // aimed at where you are (the drop takes ~0.9 s; most people keep walking)
        const p = f.m.position;
        this.drop(P.x + (p.x - P.x) * 0.3, p.y, P.z + (p.z - P.z) * 0.3);
      }
      if (k >= 1) { f.m.parent?.remove(f.m); this.fly = null; }
    }
  }
}
