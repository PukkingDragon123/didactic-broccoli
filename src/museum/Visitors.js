// Museum visitors: low-poly people who buy a ticket, walk (A* on a 0.5 m grid) to the exhibits that
// interest them, look closely, react (faces, hearts, camera flashes, a word or two), donate if happy, and leave.
import * as THREE from 'three';
import VISITORS from '../data/visitors.js';
import { createHuman } from '../people/index.js';
import { audio } from '../core/audio.js';
import { Pix } from '../gfx/pix.js';
import { getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';

const CELL = 0.5;
const DEF_IDS = Object.keys(VISITORS);
for (const id of DEF_IDS) VISITORS[id].id = id;

// ---------------------------------------------------------------- emote sprites
const emoteTex = {};
function emote(kind) {
  if (emoteTex[kind]) return emoteTex[kind];
  const p = new Pix(16, 16, 1);
  const L = { R: 0xff5a7a, r: 0xffb0c0, Y: 0xffd23f, y: 0xfff0a0, K: 0x2a2220, W: 0xffffff, B: 0x5cc4ff };
  const S = {
    heart: ['................', '...RR.....RR....', '..RrrR...RrrR...', '.RrWrrR.RrrrrR..', '.RrrrrrRrrrrrR..', '.RrrrrrrrrrrrR..', '..RrrrrrrrrrR...', '...RrrrrrrrR....', '....RrrrrrR.....', '.....RrrrR......', '......RrR.......', '.......R........'],
    star: ['.......Y........', '.......Y........', '......YyY.......', 'YYYYYYyyyYYYYYY.', '.YyyyyyyyyyyyY..', '...YyyyyyyyyY...', '....YyyyyyyY....', '....YyyY.YyyY...', '...YyY.....YyY..', '...Y.........Y..'],
    wow: ['..KK......KK....', '..KYK....KYK....', '..KYK....KYK....', '..KYK....KYK....', '..KYK....KYK....', '..KYK....KYK....', '..KK......KK....', '................', '..KK......KK....', '..KYK....KYK....', '..KK......KK....'],
    note: ['......KKKKKK....', '......KBBBBK....', '......K....K....', '......K....K....', '......K....K....', '..KKK.K..KKK....', '.KBBBKK.KBBBK...', '.KBBBK..KBBBK...', '..KKK....KKK....'],
  };
  p.sprite(S[kind], L, 0, 2);
  const t = p.texture();
  emoteTex[kind] = t;
  return t;
}

// visitor archetypes -> human presets
const PRESET = { mom_baby: 'mom', cosplayer: 'gyaru' };
const LINES = {
  look: ['So many figures!', 'Look how tiny this is.', 'I had this one as a kid!', 'The paint detail...', 'Is that a secret one?'],
  wow: ['No way, a secret!', 'Wow, the gold one!', 'I have never seen this one!'],
  happy: ['Cute!', 'What a nice little museum.', 'Worth the ticket.'],
  buy: ['I will take it!', 'Sold! It is coming home with me.'],
  sad: ['Hm. Not much to see yet.'],
};
let seedN = 1;

class Visitor {
  constructor(sys, def, variant) {
    this.sys = sys;
    this.def = def;
    const h = createHuman({ preset: PRESET[def.id] || def.id, seed: (seedN++ * 7919 + variant * 31) % 100000 });
    this.h = h;
    this.root = h.root;
    this.talkT = 0;
    this.chatT = 4 + Math.random() * 10;
    sys.museum.group.add(this.root);
    this.speed = (def.id === 'kid' ? 1.25 : def.id === 'grandma' || def.id === 'grandpa' ? 0.65 : 0.95) * (0.9 + Math.random() * 0.2);
    this.phase = Math.random() * 6;
    this.path = [];
    this.state = 'arrive';
    this.timer = 0;
    this.visited = new Set();
    this.goal = 2 + Math.floor(Math.random() * 4);
    this.happy = 0;
    this.facing = Math.PI;
    this.lookAt = null;
    this.camera = /tourist|otaku|gyaru|cosplayer/.test(def.id) || Math.random() < 0.2;
    this.paid = false;
  }

  get pos() { return this.root.position; }

  walkTo(target) {
    this.path = this.sys.findPath(this.pos, target);
    if (!this.path.length) this.path = [target.clone()];
  }

  /** Show a feeling on the face for a while (happy / wow / love / sad / talk). */
  emote2d(expr, hold = 2) {
    if (expr === 'talk') { this.talkT = hold; return; }
    this.h.setExpression({ wow: 'surprised', love: 'happy' }[expr] || expr, hold);
  }

  say(kind, chance = 1) {
    if (Math.random() > chance) return;
    const lines = LINES[kind];
    const b = this.sys.game.bubbles;
    if (!lines || !b) return;
    b.say(this.h, lines[Math.floor(Math.random() * lines.length)], { dur: 2.6, onChar: (ch) => { if (/[a-z]/i.test(ch) && Math.random() < 0.4) audio.play('blip', { f: 360 + this.h.height * 140, vol: 0.3 }); } });
    this.talkT = 1.4;
  }

  update(dt, t) {
    this.talkT = Math.max(0, this.talkT - dt);
    this.chatT -= dt;
    if (this.chatT <= 0) { this.chatT = 8 + Math.random() * 14; this.talkT = 1 + Math.random(); }
    const m = this.sys.museum;
    let moving = false;
    let lookAt = null;
    if (this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) this.path.shift();
      else {
        const sp = this.speed * dt;
        this.pos.x += (dx / d) * Math.min(sp, d);
        this.pos.z += (dz / d) * Math.min(sp, d);
        this.facing = turn(this.facing, Math.atan2(dx, dz), dt * 6);
        moving = true;
      }
    }
    this.root.rotation.y = this.facing;

    switch (this.state) {
      case 'arrive': // walk in from the plaza to the ticket counter
        if (!this.path.length) { this.walkTo(m.ticketPoint); this.state = 'toTicket'; }
        break;
      case 'toTicket':
        if (!this.path.length) { this.state = 'ticket'; this.timer = 1.2; this.facing = Math.PI / 2; }
        break;
      case 'ticket':
        this.facing = turn(this.facing, Math.PI / 2, dt * 6);
        this.timer -= dt;
        if (this.timer <= 0 && !this.paid) {
          this.paid = true;
          const fee = m.score.ticket || 40;
          this.sys.game.addMoney(fee, true);
          m.data.visitors = (m.data.visitors || 0) + 1;
          m.data.income = (m.data.income || 0) + fee;
          m.updateCounterTex();
          audio.play('coinDrop', { pos: m.ticketPoint.clone().setY(1), vol: 0.6, ref: 1.5 });
          this.emote2d('happy', 1.5);
          this.state = 'choose';
        }
        break;
      case 'choose': {
        const next = this.visited.size < this.goal ? this.sys.pickTarget(this) : null;
        if (!next) { this.state = 'leaving'; this.walkTo(this.happy > 60 ? m.donationPoint : this.sys.exitInside()); break; }
        this.target = next;
        this.visited.add(next.entry.data.uid);
        this.walkTo(next.stand);
        this.state = 'toExhibit';
        break;
      }
      case 'toExhibit':
        if (!this.path.length) { this.state = 'look'; this.timer = 3 + Math.random() * 4; this.reacted = false; this.photo = false; }
        break;
      case 'look': {
        const c = this.target.center;
        this.facing = turn(this.facing, Math.atan2(c.x - this.pos.x, c.z - this.pos.z), dt * 5);
        // lean in and look over the exhibit
        if (!this.browsing) { this.browsing = true; this.h.gesture('browse'); }
        lookAt = this._look || (this._look = new THREE.Vector3());
        this.sys.museum.group.localToWorld(lookAt.set(c.x + Math.sin(t * 0.9 + this.phase) * 0.3, this.target.low ? 0.7 : 1.1, c.z));
        this.timer -= dt;
        if (!this.reacted && this.timer < 2) {
          this.reacted = true;
          this.react();
        }
        if (this.timer <= 0) { this.browsing = false; this.photo = false; this.h.clearGesture(); this.state = 'choose'; }
        break;
      }
      case 'leaving':
        if (!this.path.length) {
          if (this.happy > 60 && !this.donated) {
            this.donated = true;
            const tip = Math.round(10 * Math.ceil(this.happy / 120) * (this.sys.game.state.goods?.tip_jar ? 1.5 : 1));
            this.sys.game.addMoney(tip, true);
            m.data.income = (m.data.income || 0) + tip;
            audio.play('coinClink', { pos: m.donationPoint.clone().setY(1.1), v: 0.7 });
            this.sys.emote(this, 'note');
            this.emote2d('happy', 2);
          } else if (this.happy < 15) { this.emote2d('sad', 3); this.say('sad', 0.5); }
          this.path = [new THREE.Vector3(0, 0, m.zS + 0.3), new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, m.zS - 4.5)];
          this.state = 'exit';
        }
        break;
      case 'exit':
        if (!this.path.length) this.dead = true;
        break;
      default: break;
    }
    this.h.update(dt, { speed: moving ? this.speed : 0, lookAt, talking: this.talkT > 0 });
  }

  react() {
    const sys = this.sys;
    const tg = this.target;
    let best = 0, bestR = 'common';
    if (tg.entry.display) {
      for (const it of tg.entry.display.items) {
        if (!it) continue;
        const r = getItem(it.k)?.rarity || 'common';
        const v = RARITIES[r].value;
        if (v > best) { best = v; bestR = r; }
      }
    }
    const appeal = tg.appeal;
    this.happy += appeal;
    // price-tagged items: a fair price sells often, a greedy one rarely
    const d = tg.entry.display;
    if (d && !this.bought) {
      const stars = sys.museum.score.stars || 0;
      for (let i = 0; i < d.items.length; i++) {
        const it = d.items[i];
        if (!it?.pm) continue;
        const chance = ({ 1.5: 0.5, 2: 0.32, 3: 0.14, 5: 0.05 }[it.pm] || 0) * (1 + stars * 0.12);
        if (Math.random() > chance) continue;
        const name = getItem(it.k)?.name || '';
        const price = d.sell(i);
        if (!price) break;
        this.bought = true;
        const g = sys.game;
        g.addMoney(price, true);
        sys.museum.data.income = (sys.museum.data.income || 0) + price;
        sys.museum.data.sold = (sys.museum.data.sold || 0) + 1;
        audio.play('register', { pos: this.pos.clone().setY(1.2), vol: 0.9 });
        g.effects.coinBurst({ pos: this.pos.clone().setY(1.6), count: 10 });
        sys.emote(this, 'wow');
        this.emote2d('love', 3);
        g.news(`Sold: ${name} for ¥${price.toLocaleString()}`, 'A museum visitor bought it', 4500);
        this.say('buy');
        g.save();
        break;
      }
    }
    const kind = bestR === 'secret' || bestR === 'ultra' ? 'wow' : bestR === 'rare' ? 'star' : appeal > 5 ? 'heart' : 'note';
    sys.emote(this, kind);
    this.emote2d(kind === 'wow' ? 'wow' : kind === 'heart' ? 'love' : 'happy', 2.5);
    if (bestR === 'secret' || bestR === 'ultra') { this.h.gesture('cheer'); this.say('wow', 0.8); }
    else this.say(appeal > 5 ? 'happy' : 'look', 0.35);
    audio.play('visitorHappy', { pos: this.pos.clone().setY(1.5), vol: 0.5, ref: 1.5 });
    if (this.camera && tg.entry.display && Math.random() < 0.7) {
      this.photo = true;
      this.h.gesture('photo');
      sys.game.tweens.wait(0.5, () => {
        const p = this.pos.clone().setY(1.35);
        audio.play('shutter', { pos: p, vol: 0.6, ref: 1.5 });
        sys.game.effects.flash({ pos: p.add(new THREE.Vector3(Math.sin(this.facing) * 0.3, 0, Math.cos(this.facing) * 0.3)), color: 0xffffff, intensity: 5, distance: 3, dur: 0.18 });
      });
    }
  }

  dispose() { this.sys.game.bubbles?.clear?.(this.h); this.h.dispose(); }
}

function turn(a, b, k) {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * Math.min(1, k);
}

export class Visitors {
  constructor(museum) {
    this.museum = museum;
    this.game = museum.game;
    this.list = [];
    this.spawnT = 3;
    this.emotes = [];
    this.rebuildGrid();
  }

  rebuildGrid() {
    const m = this.museum;
    this.gw = m.dims.w / CELL;
    this.gd = m.dims.d / CELL;
    this.occ = m.occupied();
  }

  walkable(i, j) {
    if (i < 0 || j < 0 || i >= this.gw || j >= this.gd) return false;
    return !this.occ.has(i + ',' + j);
  }

  cellCenter(i, j) { const m = this.museum; return new THREE.Vector3(m.x0 + (i + 0.5) * CELL, 0, m.zS + this.gd * CELL - (j + 0.5) * CELL); }
  cellOf(p) { const m = this.museum; return [Math.floor((p.x - m.x0) / CELL), Math.floor((m.zS + this.gd * CELL - p.z) / CELL)]; }

  nearestWalkable(p) {
    const [ci, cj] = this.cellOf(p);
    for (let r = 0; r < 6; r++) {
      let best = null, bd = Infinity;
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
        if (!this.walkable(i, j)) continue;
        const c = this.cellCenter(i, j);
        const d = c.distanceToSquared(p);
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return best;
    }
    return null;
  }

  findPath(from, to) {
    const m = this.museum;
    // outside the building: walk straight to the doorway first
    const pre = [];
    let start = from;
    if (from.z < m.zS + 0.1) { const door = new THREE.Vector3(0, 0, m.zS + 0.5); pre.push(door); start = door; }
    const s = this.nearestWalkable(start), g = this.nearestWalkable(to);
    if (!s || !g) return [...pre, to.clone()];
    const key = (i, j) => i * 1000 + j;
    const open = [[s[0], s[1]]];
    const gScore = new Map([[key(...s), 0]]);
    const came = new Map();
    const fScore = new Map([[key(...s), 0]]);
    const h = (i, j) => { const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    let found = false, iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if ((fScore.get(key(...open[k])) ?? 1e9) < (fScore.get(key(...open[bi])) ?? 1e9)) bi = k;
      const [ci, cj] = open.splice(bi, 1)[0];
      if (ci === g[0] && cj === g[1]) { found = true; break; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.walkable(ni, nj)) continue;
        if (di && dj && (!this.walkable(ci + di, cj) || !this.walkable(ci, cj + dj))) continue;
        const ng = gScore.get(key(ci, cj)) + (di && dj ? 1.414 : 1);
        const nk = key(ni, nj);
        if (ng < (gScore.get(nk) ?? 1e9)) {
          came.set(nk, [ci, cj]);
          gScore.set(nk, ng);
          fScore.set(nk, ng + h(ni, nj));
          if (!open.some(([a, b]) => a === ni && b === nj)) open.push([ni, nj]);
        }
      }
    }
    if (!found) return [...pre, to.clone()];
    const cells = [];
    let cur = [g[0], g[1]];
    while (cur) { cells.unshift(cur); cur = came.get(key(...cur)); }
    // line-of-sight smoothing
    const pts = [];
    let anchor = 0;
    for (let k = 1; k < cells.length; k++) {
      if (!this.los(cells[anchor], cells[k])) { pts.push(this.cellCenter(...cells[k - 1])); anchor = k - 1; }
    }
    pts.push(to.clone());
    return [...pre, ...pts];
  }

  los(a, b) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2;
    for (let k = 0; k <= n; k++) {
      const i = Math.round(a[0] + (b[0] - a[0]) * (k / n)), j = Math.round(a[1] + (b[1] - a[1]) * (k / n));
      if (!this.walkable(i, j)) return false;
    }
    return true;
  }

  /** Weighted choice of an exhibit to look at next. */
  pickTarget(v) {
    const m = this.museum;
    const opts = [];
    for (const e of m.placed) {
      if (v.visited.has(e.data.uid)) continue;
      let appeal = 0;
      if (e.display) for (const it of e.display.items) { if (it) appeal += RARITIES[getItem(it.k)?.rarity || 'common'].value * 4; }
      else appeal = (e.def.beauty || 1) * 1.5;
      if (e.display && appeal === 0) appeal = 1;
      let [w, d] = e.def.footprint;
      if (e.data.rot % 2) [w, d] = [d, w];
      const a = e.data.rot * Math.PI / 2;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const depth = e.data.rot % 2 ? e.def.footprint[0] : e.def.footprint[1];
      const stand = new THREE.Vector3(e.data.x, 0, e.data.z).addScaledVector(dir, depth / 2 + 0.55);
      stand.x += (Math.random() - 0.5) * Math.min(0.6, w * 0.5);
      const c = this.nearestWalkable(stand);
      if (!c) continue;
      opts.push({ entry: e, appeal, stand: this.cellCenter(...c), center: new THREE.Vector3(e.data.x, 0, e.data.z), low: e.def.id === 'case_glass' || e.def.id === 'candy_jar', w: appeal + 1 });
    }
    if (!opts.length) return null;
    let tot = opts.reduce((a, o) => a + o.w, 0), r = Math.random() * tot;
    for (const o of opts) { if (r < o.w) return o; r -= o.w; }
    return opts[0];
  }

  exitInside() { return new THREE.Vector3(0, 0, this.museum.zS + 0.6); }

  nearDoor() {
    const zS = this.museum.zS;
    return this.list.some((v) => Math.abs(v.pos.x) < 1.6 && Math.abs(v.pos.z - zS) < 1.6);
  }

  spawn() {
    const id = DEF_IDS[Math.floor(Math.random() * DEF_IDS.length)];
    const def = VISITORS[id];
    const variant = Math.floor(Math.random() * (def.variants || 1));
    const v = new Visitor(this, def, variant);
    const m = this.museum;
    v.pos.set((Math.random() - 0.5) * 3, 0, m.zS - 4.5);
    v.facing = 0;
    v.path = [new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, m.zS + 0.6)];
    this.list.push(v);
  }

  emote(v, kind) {
    const mat = new THREE.SpriteMaterial({ map: emote(kind), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(0.22);
    s.position.copy(v.pos).add(new THREE.Vector3(0, v.h.height + 0.3, 0));
    this.museum.group.add(s);
    this.emotes.push({ s, t: 0 });
  }

  update(dt) {
    const m = this.museum;
    const t = this.game.time;
    const sc = m.score;
    const maxN = Math.min(24, 4 + sc.stars * 4);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = (60 / Math.max(0.5, sc.rate)) * (0.6 + Math.random() * 0.8);
      if (this.list.length < maxN && m.placed.length) this.spawn();
    }
    for (const v of this.list) v.update(dt, t);
    // soft separation (and from the player)
    const pp = this.game.player.pos;
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      for (let j = i + 1; j < this.list.length; j++) {
        const b = this.list[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.45) { const push = (0.45 - d) * 0.5; a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push; }
      }
      const dx = a.pos.x - pp.x, dz = a.pos.z - pp.z, d = Math.hypot(dx, dz);
      if (d > 0.001 && d < 0.55) { a.pos.x += dx / d * (0.55 - d) * 0.5; a.pos.z += dz / d * (0.55 - d) * 0.5; }
    }
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) { this.list[i].dispose(); this.list.splice(i, 1); }
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i];
      e.t += dt;
      e.s.position.y += dt * 0.25;
      e.s.material.opacity = e.t < 0.2 ? e.t / 0.2 : Math.max(0, 1 - (e.t - 1.2) / 0.6);
      e.s.scale.setScalar(0.22 * (e.t < 0.15 ? 0.6 + e.t * 2.6 : 1));
      if (e.t > 1.8) { m.group.remove(e.s); e.s.material.dispose(); this.emotes.splice(i, 1); }
    }
  }
}
