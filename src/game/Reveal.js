// Capsule opening + collectible reveal sequences. Everything is physical: halves fly off and bounce,
// the mini-book flutters to the floor, light beams, confetti, coins and petals react to rarity & finish.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { makeItemMesh } from './collectibles.js';
import { getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import { iconHTML } from '../gfx/icons.js';

const DUR = { common: 1.0, uncommon: 1.35, rare: 1.9, ultra: 2.8, secret: 4.6 };

export class Reveal {
  constructor(game) {
    this.game = game;
    this.debris = [];
    this.tool = null;
    this.captionEl = document.getElementById('caption');
  }

  // ------------------------------------------------------------------ opener tools in view
  startTool(item) {
    const tier = this.game.state.opener;
    if (tier <= 0) return;
    if (!this.tool) this.tool = this.buildTool(tier);
    else if (this.tool.userData.tier !== tier) { this.tool.parent?.remove(this.tool); this.tool = this.buildTool(tier); }
    const anchor = this.game.held.anchor;
    anchor.add(this.tool);
    const p = item.obj.position;
    this.tool.position.set(p.x + 0.06, p.y + 0.02, p.z + 0.02);
    this.tool.userData.t = 0;
    this.tool.visible = true;
  }

  stopTool() { if (this.tool) this.tool.visible = false; }

  buildTool(tier) {
    const g = new THREE.Group();
    g.userData.tier = tier;
    const col = [0, 0xff8c2e, 0xd8dde4, 0xffcc44][tier];
    const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: tier === 1 ? 0.35 : 0.2, metalness: tier === 1 ? 0 : 1, clearcoat: 0.6 });
    if (tier === 1) {
      const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), mat);
      wedge.rotation.z = Math.PI / 2;
      g.add(wedge);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.012), mat);
      grip.position.x = 0.05;
      g.add(grip);
    } else {
      for (const s of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 8, 24, Math.PI * 0.9), mat);
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = s > 0 ? 0 : Math.PI;
        ring.position.y = s * 0.012;
        g.add(ring);
      }
      if (tier === 3) {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.008), new THREE.MeshPhysicalMaterial({ color: 0xff4080, roughness: 0, iridescence: 1 }));
        gem.position.set(0.05, 0, 0);
        g.add(gem);
      }
    }
    g.traverse((m) => { m.userData.noRim = true; });
    return g;
  }

  updateTool(dt) {
    if (!this.tool?.visible) return;
    const item = this.game.held.item;
    if (!item) { this.tool.visible = false; return; }
    this.tool.userData.t += dt;
    const p = item.obj.position;
    const k = Math.min(1, this.game.held.twist);
    if (this.tool.userData.tier === 1) {
      this.tool.position.set(p.x + 0.07 - k * 0.03, p.y + 0.001, p.z);
      this.tool.rotation.z = -k * 0.5;
    } else {
      this.tool.position.set(p.x, p.y, p.z);
      this.tool.rotation.y = k * 3;
    }
  }

  // ------------------------------------------------------------------ open!
  open(item) {
    const g = this.game;
    const held = g.held;
    held.busy = true;
    const data = item.data;
    const cap = item.ent?.cap;
    g.state.stats.opened++;
    if (data.rarity === 'secret') {
      // the world goes dark, the capsule rises and trembles
      g.lighting.dim(true, 5);
      audio.play('secretDim', { vol: 1 });
      held.startTrans('reveal', 1.2);
      let t = 0;
      const shaker = g.tweens.add({
        dur: 1.7, ease: ease.linear,
        update: () => {
          t += 1 / 60;
          const s = 0.002 + t * 0.003;
          item.obj.rotation.z = (Math.random() - 0.5) * s * 10;
          if (Math.random() < 0.4) {
            const wp = item.obj.getWorldPosition(new THREE.Vector3());
            g.effects.sparks({ pos: wp, count: 2, color: 0xfff0a0, speed: 0.5, size: 0.012, life: 0.5, gravity: 0, radius: 0.05, star: 1 });
          }
        },
        done: () => this.pop(item, cap),
      });
      void shaker;
      return;
    }
    this.pop(item, cap);
  }

  pop(item, cap) {
    const g = this.game;
    const held = g.held;
    const data = item.data;
    const anchor = held.anchor;
    const capWorld = item.obj.getWorldPosition(new THREE.Vector3());
    const camQ = g.camera.getWorldQuaternion(new THREE.Quaternion());
    audio.play('pop', { vol: 1, v: data.rarity === 'secret' ? 1.3 : 1 });
    g.player.fovKick = data.rarity === 'secret' ? 0 : 1.5;
    // halves fly apart as physical debris
    if (cap) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
      const up = new THREE.Vector3(0, 1, 0);
      this.spawnDebris(cap.top, cap.r, right.clone().multiplyScalar(-0.9).add(up.clone().multiplyScalar(1.6)));
      this.spawnDebris(cap.bottom, cap.r, right.clone().multiplyScalar(0.9).add(up.clone().multiplyScalar(0.5)));
      if (cap.paper) this.spawnPaper(cap.paper);
      audio.play('paper', { vol: 0.6, delay: 0.1 });
    }
    // the capsule group itself is now empty
    held.release()?.obj.parent?.remove(item.obj);
    // the collectible
    const mesh = makeItemMesh(data.key, data.finish);
    const holder = new THREE.Group();
    holder.add(mesh);
    const size = mesh.geometry.userData.size;
    mesh.position.y = -size.y / 2;
    g.scene.add(holder);
    holder.position.copy(capWorld);
    holder.quaternion.copy(camQ);
    held.take('toy', { key: data.key, finish: data.finish }, holder, { pose: 'reveal', dur: 0.5 });
    held.busy = true;
    held.removeTag();
    mesh.position.y = -size.y * 0.5;
    holder.scale.setScalar(0.35);
    const isNew = g.discover(data.key, data.finish);
    const dur = DUR[data.rarity] || 1;
    g.tweens.add({ dur: 0.5, ease: ease.outBack, update: (k) => holder.scale.setScalar(0.35 + 0.65 * k) });
    // spin during reveal
    const spinStart = holder.rotation.y;
    g.tweens.add({
      dur, ease: ease.outCubic,
      update: (k) => { mesh.rotation.y = spinStart + k * Math.PI * 2 * (data.rarity === 'secret' ? 2 : 1); },
      done: () => {
        mesh.rotation.y = 0;
        mesh.position.y = 0;
        held.busy = false;
        held.startTrans('toy', 0.45);
        held.attachTag({ key: data.key, finish: data.finish }, isNew);
        g.lighting.dim(false, 2.5);
        g.save();
      },
    });
    this.effects(holder, data, isNew);
    this.caption(data, isNew);
  }

  spawnDebris(part, r, vel) {
    const g = this.game;
    const wp = part.getWorldPosition(new THREE.Vector3());
    g.scene.attach(part);
    part.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    const body = g.physics.addBody({
      radius: r * 0.7, position: wp, velocity: vel, object: part, restitution: 0.45, friction: 0.3, rollDamping: 2, collideBodies: false,
      onImpact: (speed, mat) => { if (speed > 0.3 && audio.canPlay('deb', 0.04)) audio.play('capsuleHit', { pos: body.pos, speed: speed * 0.7, mat, vol: 0.6 }); },
    });
    body.angVel.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
    this.debris.push({ obj: part, body, t: 14 });
  }

  spawnPaper(paper) {
    const g = this.game;
    const wp = paper.getWorldPosition(new THREE.Vector3());
    g.scene.attach(paper);
    const body = g.physics.addBody({ radius: 0.01, position: wp, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8, (Math.random() - 0.5) * 0.6), object: null, gravityScale: 0.22, linearDamping: 2.2, roll: false, collideBodies: false, restitution: 0 });
    this.debris.push({ obj: paper, body, t: 16, paper: true, seed: Math.random() * 10 });
  }

  updateDebris(dt, t) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.t -= dt;
      if (d.paper) {
        d.obj.position.copy(d.body.pos);
        if (!d.body.contact) d.obj.rotation.set(Math.sin(t * 5 + d.seed) * 0.8, t * 2 + d.seed, Math.cos(t * 4 + d.seed) * 0.6);
        else d.obj.rotation.set(0, d.seed, 0);
      }
      if (d.t < 1) d.obj.scale.setScalar(Math.max(0.001, d.t));
      if (d.t <= 0) {
        this.game.physics.removeBody(d.body);
        d.obj.parent?.remove(d.obj);
        this.debris.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ effects
  effects(holder, data, isNew) {
    const g = this.game;
    const E = g.effects;
    const camQ = g.camera.getWorldQuaternion(new THREE.Quaternion());
    const wp = () => holder.getWorldPosition(new THREE.Vector3());
    const r = data.rarity;
    const at = (sec, fn) => g.tweens.wait(sec, fn);
    if (r === 'common') {
      audio.play('revealCommon');
      E.sparks({ pos: wp(), count: 16, colors: [0xffffff, 0xfff0b0], speed: 0.5, size: 0.008, life: 0.6, star: 0.5 });
    } else if (r === 'uncommon') {
      audio.play('revealUncommon');
      E.sparks({ pos: wp(), count: 34, colors: [0x9cff9c, 0xffffff], speed: 0.65, size: 0.009, life: 0.8, star: 0.6 });
      E.ring({ pos: wp(), face: camQ, size: 0.12, color: 0x8cff9a, dur: 0.6 });
    } else if (r === 'rare') {
      audio.play('revealRare');
      E.sparks({ pos: wp(), count: 80, colors: [0x6cc8ff, 0xffffff, 0xb8e8ff], speed: 0.9, size: 0.01, life: 1.1, star: 0.8 });
      E.ring({ pos: wp(), face: camQ, size: 0.18, color: 0x6cc8ff, dur: 0.7 });
      E.flash({ pos: wp(), color: 0x80c8ff, intensity: 3, distance: 2, dur: 0.6 });
      E.beamBurst({ pos: wp(), face: camQ, count: 6, colors: [0x9fd9ff], length: 0.14, width: 0.009, dur: 1.4, strength: 0.6, follow: holder, back: 0.06 });
      g.player.fovKick = 2;
    } else if (r === 'ultra') {
      audio.play('revealUltra');
      E.beamBurst({ pos: wp(), face: camQ, count: 10, colors: [0xff8af0, 0xffd23f, 0xffffff], length: 0.2, width: 0.012, dur: 2.4, strength: 0.85, follow: holder, back: 0.07 });
      at(0.45, () => {
        E.sparks({ pos: wp(), count: 160, colors: [0xff8af0, 0xffd23f, 0xffffff], speed: 1.2, size: 0.012, life: 1.4, star: 0.9 });
        E.confetti({ pos: wp().add(new THREE.Vector3(0, 0.05, 0)), count: 90, speed: 2.4 });
        E.ring({ pos: wp(), face: camQ, size: 0.26, color: 0xff8af0, dur: 0.8 });
        E.flash({ pos: wp(), color: 0xffb0f0, intensity: 5, distance: 3, dur: 0.9 });
        g.player.shake = 0.35;
        g.player.fovKick = 4;
        g.lighting.flicker(0.35);
      });
    } else if (r === 'secret') {
      g.state.stats.secrets++;
      audio.play('secretBurst', { vol: 1 });
      const flash = g.renderer.grade.uniforms.uFlash.value;
      flash.setRGB(1.2, 1.0, 0.6);
      g.tweens.add({ dur: 0.9, update: (k) => flash.setRGB(1.2 * (1 - k), 1.0 * (1 - k), 0.6 * (1 - k)) });
      E.beamBurst({ pos: wp(), face: camQ, count: 16, colors: [0xffd23f, 0xffffff, 0xffe9a0], length: 0.32, width: 0.016, dur: 4.2, strength: 1, spin: 0.4, follow: holder, back: 0.09 });
      E.sparks({ pos: wp(), count: 320, colors: [0xffd23f, 0xffffff, 0xff8af0, 0x9fd9ff], speed: 1.6, size: 0.014, life: 1.8, star: 0.9 });
      for (let i = 0; i < 3; i++) at(i * 0.25, () => E.ring({ pos: wp(), face: camQ, size: 0.25 + i * 0.18, color: 0xffd23f, dur: 0.9 }));
      E.flash({ pos: wp(), color: 0xffe0a0, intensity: 10, distance: 5, dur: 1.6 });
      g.player.shake = 0.9;
      g.player.fovKick = 9;
      const camPos = g.camera.getWorldPosition(new THREE.Vector3());
      at(0.15, () => {
        E.confetti({ pos: camPos.clone().add(new THREE.Vector3(0, 0.5, 0)), count: 260, speed: 2.8, radius: 0.6 });
        E.confetti({ pos: camPos.clone().add(new THREE.Vector3(0, 1.0, 0)), count: 120, speed: 1.2, petal: true, radius: 1.2 });
        E.coinBurst({ pos: camPos, count: 50, rain: true, life: 6 });
      });
      at(1.4, () => { g.lighting.dim(false, 1.5); g.lighting.flicker(0.8); });
      at(1.6, () => audio.play('complete', { vol: 0.7 }));
      g.machines.forEach((m) => { m.shake = 0.6; });
    }
    // finish extras
    const f = data.finish;
    if (f !== 'normal') {
      at(r === 'secret' ? 2.0 : 0.35, () => {
        const p = wp();
        if (f === 'metallic') {
          audio.play('finishMetallic');
          E.flash({ pos: p.clone().add(new THREE.Vector3(0.2, 0.15, 0.2)), color: 0xffffff, intensity: 6, distance: 1.2, dur: 0.7 });
          E.sparks({ pos: p, count: 40, colors: [0xe8f0ff, 0xffffff], speed: 0.8, size: 0.01, star: 1 });
        } else if (f === 'gold') {
          audio.play('finishGold');
          E.coinBurst({ pos: p, count: 36, up: 2.5, spread: 1.6 });
          E.sparks({ pos: p, count: 90, colors: [0xffd23f, 0xffb000, 0xffffff], speed: 1, size: 0.012, star: 0.9 });
          E.flash({ pos: p, color: 0xffc040, intensity: 4, distance: 2.5, dur: 1 });
        } else if (f === 'glow') {
          audio.play('finishGlow');
          g.lighting.dim(true, 6);
          g.lighting.glowBoost = 2.5;
          at(2.4, () => g.lighting.dim(false, 2));
          E.sparks({ pos: p, count: 50, colors: [0x9cffa0, 0xd0ffd0], speed: 0.3, size: 0.01, gravity: -0.15, life: 2, star: 0.3 });
        } else if (f === 'clear') {
          audio.play('finishClear');
          E.sparks({ pos: p, count: 40, colors: [0xbfe8ff, 0xffffff], speed: 0.2, size: 0.014, gravity: -0.25, life: 1.8, star: 0 });
        } else if (f === 'aurora') {
          audio.play('finishAurora');
          E.sparks({ pos: p, count: 160, colors: [0xff8af0, 0x8af0ff, 0xf0ff8a, 0xb08aff], speed: 1, size: 0.012, star: 0.8, life: 1.6 });
          E.beamBurst({ pos: p, face: camQ, count: 12, colors: [0xff8af0, 0x8af0ff, 0xf0ff8a, 0xb08aff], length: 0.22, width: 0.011, dur: 2.2, follow: holder, back: 0.07 });
        } else if (f === 'diamond') {
          audio.play('finishDiamond');
          E.beamBurst({ pos: p, face: camQ, count: 18, colors: [0xff6f6f, 0xffd23f, 0x6fff8f, 0x6fd8ff, 0xb06fff], length: 0.3, width: 0.01, dur: 3, strength: 0.95, follow: holder, back: 0.08 });
          E.sparks({ pos: p, count: 220, colors: [0xffffff, 0xd8f8ff], speed: 1.4, size: 0.013, star: 1, life: 2 });
          E.flash({ pos: p, color: 0xe0f8ff, intensity: 8, distance: 3, dur: 1.4 });
          g.player.shake = Math.max(g.player.shake, 0.4);
        }
      });
    }
    if (isNew) at(r === 'secret' ? 3.0 : Math.min(0.9, (DUR[r] || 1) * 0.6), () => audio.play('newItem', { vol: 0.7 }));
  }

  caption(data, isNew) {
    const it = getItem(data.key);
    const R = RARITIES[it.rarity];
    const F = FINISHES[data.finish];
    const stars = Array.from({ length: 5 }, (_, i) => iconHTML('star', 2, i < R.stars ? '' : 'off')).join('');
    const finish = data.finish !== 'normal' ? `<span class="dot">&middot;</span><span style="color:${F.color}">${F.name}</span>` : '';
    const el = this.captionEl;
    el.innerHTML = `<div class="stars">${stars}</div><div class="name">${it.name}${isNew ? '<span class="new">NEW</span>' : ''}</div><div class="meta"><span style="color:${R.color}">${R.name}</span>${finish}</div>`;
    el.classList.add('show');
    clearTimeout(this._capT);
    this._capT = setTimeout(() => el.classList.remove('show'), (DUR[data.rarity] || 1) * 1000 + 1600);
  }

  update(dt, t) {
    this.updateTool(dt);
    this.updateDebris(dt, t);
  }
}
