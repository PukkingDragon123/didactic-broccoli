// The ghost alley (an affectionate nod to a certain bizarre adventure): alley A1 beside Mikawa-ya, the one with the
// little Jizō shrine at its end. A translucent girl and her ghost cat stand at the mouth. Walk her to the shrine
// without ever looking back (the camera facing the street) and the shrine gives you something; look back and
// "something" drags you out to the mouth again.
//   new GhostAlley(game)  ->  update(dt) each frame
import * as THREE from 'three';
import { createHuman } from '../people/index.js';
import { talk } from '../people/voice.js';
import { CatRig } from './CatRig.js';
import { menace } from '../ui/menacing.js';
import { audio } from '../core/audio.js';
import { draw5 } from '../gfx/font5x7.js';
import { SERIES, SERIES_BY_ID } from '../data/series/index.js';
import { rollCapsule } from '../game/economy.js';
import { formatYen } from '../core/util.js';

const X0 = -9.3, X1 = -7.5, MOUTH = 14.9, SHRINE = 20.15; // the walkable alley; reaching SHRINE wins
const HOME = new THREE.Vector3(-8.5, 0, 16.4), END = new THREE.Vector3(-8.5, 0, 19.75);
const REWARD = 3000;
const _v = new THREE.Vector3(), _d = new THREE.Vector3();
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const LINES = {
  idle: ['...', 'Don\'t look back. That\'s the only rule.', 'Have you heard? This alley is haunted.', 'My cat says hello.'],
  after: ['You came back!', 'The shrine likes you now.', 'Still not looking back? Good.', 'Mikan and my cat would get along.'],
  leave: ['Leaving already?', 'Come back when you\'re brave.'],
};

/** Ghostly look for every mesh under root: see-through, pale blue, faintly glowing, no shadows. */
function ghostify(root, op = 0.55) {
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.transparent = true; m.opacity = op; m.depthWrite = true; m.userData.op = op; mats.push(m);
      m.color?.set?.(0x8cc4ff);
      if (m.emissive) { m.emissive.set(0x2a5a92); m.emissiveIntensity = 0.55; if (m.map && !m.emissiveMap) m.emissiveMap = m.map; }
      m.needsUpdate = true;
    }
    o.castShadow = false; o.receiveShadow = false;
    o.renderOrder = 2;
    o.userData.ghost = true;
  });
  return mats;
}

/** A small wooden plaque in pixels: 振り返るな / DON'T LOOK BACK. */
function plaque() {
  const W = 96, H = 48, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const draw = () => {
    g.fillStyle = '#4a3020'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5c3c26'; for (let y = 3; y < H; y += 6) g.fillRect(0, y, W, 2);
    g.fillStyle = '#2a1a10'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H);
    g.fillStyle = '#c8b8a0'; g.fillRect(4, 4, 2, 2); g.fillRect(W - 6, 4, 2, 2);
    g.fillStyle = '#efe4cc'; g.font = '16px "DotGothic16", monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText('振り返るな', W / 2, 7);
    draw5(g, 'DON\'T LOOK BACK', W / 2, 31, { col: '#e04a3a', align: 'center' });
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load('16px "DotGothic16"', '振り返るな').then(draw).catch(() => {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  return m;
}

export class GhostAlley {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'ghostAlley';
    game.scene.add(this.group);
    // the girl
    const h = this.h = createHuman({ preset: 'schoolgirl', seed: 4404, height: 1.5 });
    h.finishPaint?.();
    this.mats = ghostify(h.root);
    // a depth-only copy drawn first, so only her outer surface shows through (no arms seen through the body)
    const pre = new THREE.SkinnedMesh(h.mesh.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, map: h.tex, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    pre.bind(h.mesh.skeleton, h.mesh.bindMatrix);
    pre.renderOrder = 1; pre.boundingSphere = h.mesh.boundingSphere;
    h.mesh.add(pre);
    this.pre = pre;
    h.root.position.copy(HOME);
    h.root.rotation.y = Math.PI; // facing the street
    this.group.add(h.root);
    this.voice = talk(null, { base: 520, duty: 0.125, vol: 0.75 });
    // her cat
    const cat = this.cat = new CatRig();
    this.mats.push(...ghostify(cat.root, 0.5));
    cat.root.position.set(HOME.x + 0.42, 0, HOME.z + 0.15);
    cat.root.rotation.y = Math.PI + 0.3;
    cat.setPose('sit');
    this.group.add(cat.root);
    // the plaque on the block wall at the mouth
    const pl = plaque();
    pl.position.set(-7.462, 1.42, 15.35);
    pl.rotation.y = -Math.PI / 2;
    this.group.add(pl);
    this.state = 'wait'; // wait -> lead (walking her to the shrine) -> done
    this.t = 0; this.chatT = 4; this.grace = 0; this.speed = 0; this.alpha = 1;
    game.interaction.add(h.root, {
      hint: () => ({ key: 'LMB', text: 'The girl in the alley', sub: this.flags.ghostAlley ? 'She looks happy to see you' : 'She is a little see-through...' }),
      use: () => { this.say(this.flags.ghostAlley ? pick(LINES.after) : pick(LINES.idle)); return false; },
    });
  }

  get flags() { return this.game.state.flags || (this.game.state.flags = {}); }
  get inAlley() { const p = this.game.player.pos; return p.x > X0 - 0.1 && p.x < X1 + 0.1 && p.z > MOUTH + 0.25 && p.z < 22.3; }

  say(text, dur = 3.4) { this.game.pedestrians?.bubbles.say(this.h, text, { dur, onChar: this.voice }); }

  update(dt) {
    const g = this.game, h = this.h, P = g.player;
    this.t += dt;
    const dPl = P.pos.distanceTo(h.root.position), near = dPl < 7;
    h.root.visible = this.cat.root.visible = dPl < 30;
    if (!h.root.visible) return;
    // she floats a hand's width off the ground and flickers a little
    h.root.position.y = 0.05 + Math.sin(this.t * 1.7) * 0.025;
    const flick = (1 + Math.sin(this.t * 7.3) * 0.05 + (Math.random() < 0.01 ? -0.35 : 0)) * this.alpha;
    for (const m of this.mats) m.opacity = m.userData.op * flick;
    this.pre.visible = this.alpha > 0.3;
    if (!g.cutscene.active) this.logic(dt);
    // walk toward the target (lead) or stand
    const tgt = this.state === 'lead' ? END : HOME;
    _d.subVectors(tgt, h.root.position).setY(0);
    const dist = _d.length();
    const want = dist > 0.08 ? Math.min(0.95, dist * 1.6) : 0;
    this.speed += (want - this.speed) * Math.min(1, dt * 4);
    if (this.speed > 0.02) {
      h.root.position.addScaledVector(_d.normalize(), this.speed * dt);
      const yaw = Math.atan2(_d.x, _d.z);
      h.root.rotation.y += Math.atan2(Math.sin(yaw - h.root.rotation.y), Math.cos(yaw - h.root.rotation.y)) * Math.min(1, dt * 6);
    } else {
      // stand facing the player when they're near, else the street
      const look = near ? Math.atan2(P.pos.x - h.root.position.x, P.pos.z - h.root.position.z) : Math.PI;
      h.root.rotation.y += Math.atan2(Math.sin(look - h.root.rotation.y), Math.cos(look - h.root.rotation.y)) * Math.min(1, dt * 3);
    }
    h.update(dt, { speed: this.speed, lookAt: near ? g.camera.position : null, talking: g.pedestrians?.bubbles.isTalking(h) });
    // the cat trots at her heel
    const c = this.cat, side = _v.set(0.42, 0, 0.1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, h.root.rotation.y).add(h.root.position).setY(0);
    _d.subVectors(side, c.root.position).setY(0);
    const cd = _d.length(), cs = cd > 0.12 ? Math.min(1.1, cd * 2.2) : 0;
    if (cs > 0.05) {
      c.setPose('walk');
      c.root.position.addScaledVector(_d.normalize(), cs * dt);
      c.root.rotation.y = Math.atan2(_d.x, _d.z);
    } else c.setPose('sit');
    c.lookAt = near ? g.camera.position : null;
    c.update(dt, cs);
  }

  logic(dt) {
    const g = this.game, P = g.player, f = this.flags;
    this.grace = Math.max(0, this.grace - dt);
    if (this.state === 'wait') {
      if ((this.chatT -= dt) < 0 && P.pos.distanceTo(this.h.root.position) < 4.5 && !this.inAlley) {
        this.chatT = 14 + Math.random() * 10;
        this.say(f.ghostAlley ? pick(LINES.after) : pick(LINES.idle));
      }
      if (this.inAlley && !f.ghostAlley) g.cutscene.play((c) => this.introScene(c));
      return;
    }
    if (this.state !== 'lead') return;
    if (!this.inAlley) { this.state = 'wait'; this.say(pick(LINES.leave)); return; }
    if (P.pos.z > SHRINE) { g.cutscene.play((c) => this.winScene(c)); return; }
    // looking back toward the street?
    g.camera.getWorldDirection(_v);
    if (this.grace <= 0 && P.pos.z > MOUTH + 0.7 && _v.z < -0.35) g.cutscene.play((c) => this.caughtScene(c), { skippable: false, letterbox: false });
  }

  // ---------------------------------------------------------------- scenes
  *introScene(c) {
    const g = this.game, h = this.h;
    const hp = h.root.position, eye = new THREE.Vector3(-8.35, g.player.eye, Math.min(g.player.pos.z, hp.z - 1.6));
    yield c.cam({ pos: eye, look: new THREE.Vector3(hp.x, 1.25, hp.z), dur: 0.8 });
    menace({ kind: 'go', dur: 3.2 });
    h.gesture?.('wave');
    yield c.say('Oh! A visitor. You can see me?', 1.4, 'Girl in the alley', this.voice);
    yield c.say('Walk me to the little shrine at the end. Just one rule...', 1.2, 'Girl in the alley', this.voice);
    yield c.say('Whatever you hear behind you: DON\'T. LOOK. BACK.', 1.6, 'Girl in the alley', this.voice);
    c.hideSay();
    this.state = 'lead'; this.grace = 1.5; this.flags.ghostMet = true;
    yield c.toPlayer(0.6);
  }

  *caughtScene(c) {
    const g = this.game, P = g.player;
    document.body.classList.add('lookback');
    audio.play('menace', { kind: 'don' });
    yield c.wait(0.35);
    yield c.fade(1, 0.25);
    document.body.classList.remove('lookback');
    // dragged back out to the street, facing the alley again
    P.pos.set(-8.4, 0, MOUTH - 0.9); P.vel?.set(0, 0, 0); P.yaw = Math.PI; P.pitch = -0.05;
    this.h.root.position.copy(HOME); this.cat.root.position.set(HOME.x + 0.42, 0, HOME.z + 0.15);
    this.state = 'wait'; this.speed = 0;
    this.flags.ghostFails = (this.flags.ghostFails || 0) + 1;
    yield c.wait(0.4);
    yield c.fade(0, 0.6);
    yield c.say('You looked back... Something pulled you out of the alley.', 1.2);
    yield c.say('Eyes forward this time.', 1.4, 'Girl in the alley', this.voice);
    c.hideSay();
  }

  *winScene(c) {
    const g = this.game, h = this.h, f = this.flags;
    const shrine = new THREE.Vector3(-8.42, 0.55, 21.0);
    yield c.cam({ pos: new THREE.Vector3(-8.0, 1.5, 18.6), look: shrine, dur: 0.9 });
    menace({ kind: 'don', at: [innerWidth * 0.5 - 140, innerHeight * 0.16], dur: 2.2 });
    // the shrine's gift: a capsule (from the pose club if it's in stock) and some coins
    const sid = SERIES_BY_ID.bizarre ? 'bizarre' : pick(SERIES.filter((s) => !s.hidden)).id;
    let roll = rollCapsule(sid, Math.random, { rareLuck: 1.5 });
    for (let i = 0; i < 6 && (roll.rarity === 'common' || roll.rarity === 'uncommon'); i++) roll = rollCapsule(sid, Math.random, { rareLuck: 1.5 });
    g.items.spawnCapsule({ series: sid, ...roll }, shrine.clone().setY(0.9), new THREE.Vector3(0, 0.6, -1.2));
    g.addMoney(REWARD);
    f.ghostAlley = true;
    yield c.say('You made it without looking back!', 1.2, 'Girl in the alley', this.voice);
    yield c.say('The shrine left you something. Thank you for walking with me.', 1.4, 'Girl in the alley', this.voice);
    c.hideSay();
    g.news('The ghost alley\'s blessing', `A rare capsule + ${formatYen(REWARD)}`);
    // she fades out, then back at the mouth where she always waits
    yield c.until((dt) => { this.alpha = Math.max(0, this.alpha - dt * 0.8); return this.alpha <= 0; });
    h.root.position.copy(HOME); this.cat.root.position.set(HOME.x + 0.42, 0, HOME.z + 0.15);
    this.state = 'wait'; this.speed = 0;
    yield c.toPlayer(0.7);
    this.alpha = 1;
  }
}
