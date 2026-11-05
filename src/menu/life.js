// Small life in the title shot, as 2D pixel sprites (hand-pixelled frames, nearest filtering, stepped animation, each
// art pixel a whole number of screen pixels): pigeons perched along a ledge or wire (the garage's coping; they bob, preen,
// shuffle, and now and then one flaps off and comes back), and a moth batting round the lamp over the shop front.
// Also nudges the next commuter train over the west bridge so one goes by soon after the menu opens.
//   const life = new MenuLife(game, { wires: [{ a, b, sag, at: [t...] }], moth: Vector3 });  life.update(dt, cam)
import * as THREE from 'three';

const K = '#2a2430';
const PAL = { K, g: '#8e96a6', G: '#666c7c', l: '#b8c0cc', n: '#4a8a78', p: '#76549a', e: '#f08a2a', b: '#d8c8b4', f: '#d07a7a', t: '#3c3c4a', m: '#ece0c4', M: '#b8a888', d: '#5a4a3a' };
// a pigeon side-on facing right (16 x 12): perched, bobbing forward, looking back; flying (wings up / down)
const FRAMES = {
  perch: [
    '...........KK...',
    '..........KllK..',
    '..........KleKbb',
    '..........KnlK..',
    '......KKKKnnpK..',
    '...KKKgggggnpK..',
    '.KKtGGGgggggggK.',
    'KttGGGGGgggggK..',
    '.KKKGGGGgggggK..',
    '....KKKKKKKKK...',
    '........f.f.....',
    '........f.f.....',
  ],
  bob: [
    '................',
    '...........KK...',
    '..........KllK..',
    '......KKKKKleKbb',
    '...KKKgggnnlK...',
    '.KKtGGGgggnpK...',
    'KttGGGGGgggggK..',
    '.KKKGGGGgggggK..',
    '....KKKKKKKKK...',
    '................',
    '........f.f.....',
    '........f.f.....',
  ],
  back: [
    '.........KK.....',
    '........KllK....',
    '......bbKelK....',
    '........KlnK....',
    '......KKKnnpK...',
    '...KKKgggggnpK..',
    '.KKtGGGgggggggK.',
    'KttGGGGGgggggK..',
    '.KKKGGGGgggggK..',
    '....KKKKKKKKK...',
    '........f.f.....',
    '........f.f.....',
  ],
  up: [
    '....K......K....',
    '...KGK....KGK...',
    '...KGGK..KGGK...',
    '....KGGKKGGK.KK.',
    '.KKKKgggggggKleb',
    'KttgggggggggKK..',
    '.KKKKKKKKKKKK...',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  down: [
    '................',
    '................',
    '.............KK.',
    '.KKKKKKKKKKKKleb',
    'KttgggggggggKK..',
    '.KKKGGGGGGGKK...',
    '....KGGKKGGK....',
    '....KGK..KGK....',
    '.....K....K.....',
    '................',
    '................',
    '................',
  ],
  mothA: ['dd...dd', 'dmm.mmd', '.dmMmd.', 'dmm.mmd', 'dd...dd'],
  mothB: ['...d...', '..dmd..', '.dmMmd.', '..dmd..', '...d...'],
};

/** One canvas atlas with every frame in a row; returns { tex, uv: { name: [u0, v0, u1, v1, w, h] } }. */
function atlas() {
  const names = Object.keys(FRAMES), W = names.reduce((s, n) => s + FRAMES[n][0].length + 1, 0), H = 12;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const uv = {};
  let x0 = 0;
  for (const n of names) {
    const rows = FRAMES[n], w = rows[0].length, h = rows.length;
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x0 + x, y, 1, 1); } }));
    uv[n] = [x0 / W, 1 - h / H, (x0 + w) / W, 1, w, h];
    x0 += w + 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return { tex, uv };
}

const rnd = (a, b) => a + Math.random() * (b - a);

export class MenuLife {
  constructor(game, { wires = [], moth = null } = {}) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'menu-life';
    game.scene.add(this.group);
    const A = this.A = atlas();
    this.sprites = [];
    const mk = (frame, tint) => {
      const t = A.tex.clone();
      t.needsUpdate = true;
      const m = new THREE.SpriteMaterial({ map: t, alphaTest: 0.5, transparent: false, color: tint, fog: true, depthWrite: true });
      const s = new THREE.Sprite(m);
      s.center.set(0.5, 0);
      s.raycast = () => {};
      this.group.add(s);
      const o = { s, tex: t, frame: null, px: 2 };
      this.setFrame(o, frame);
      this.sprites.push(o);
      return o;
    };
    // pigeons on the wires: dusk-dimmed (they read as soft silhouettes against the sky)
    this.pigeons = [];
    for (const w of wires) {
      for (const t of w.at) {
        const p = mk('perch', 0x9a96b0);
        p.wire = w; p.u = t; p.flip = Math.random() < 0.4;
        p.t = rnd(0, 4); p.next = rnd(1, 5); p.state = 'perch';
        p.base = this.wirePoint(w, t);
        this.pigeons.push(p);
      }
    }
    if (moth) { this.moth = mk('mothA', 0xfff2d8); this.moth.center = moth.clone(); this.moth.px = 2; this.moth.t = 0; }
    // a train over the west bridge soon after the menu opens (then they come on their own timetable)
    const tr = game.garage?.town?.trains?.find?.((x) => x.s === -1);
    if (tr && !tr.g.visible) tr.wait = Math.min(tr.wait ?? 99, 5);
  }

  wirePoint(w, t, out = new THREE.Vector3()) { out.copy(w.a).lerp(w.b, t); out.y -= Math.sin(t * Math.PI) * w.sag; return out; }

  setFrame(o, name) {
    if (o.frame === name) return;
    o.frame = name;
    const [u0, v0, u1, v1, w, h] = this.A.uv[name];
    o.tex.offset.set(o.flip ? u1 : u0, v0);
    o.tex.repeat.set(o.flip ? u0 - u1 : u1 - u0, v1 - v0);
    o.w = w; o.h = h;
  }

  /** Size each sprite so one art pixel is `px` screen pixels at its distance (crisp squares, like src/gfx/pixfx.js). */
  fit(o, cam, pos) {
    const d = Math.max(0.1, pos.distanceTo(cam.position));
    const wpp = (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / innerHeight;
    const k = Math.max(1, Math.round(innerHeight / 380)) * (o.px / 2);
    o.s.scale.set(o.w * wpp * k, o.h * wpp * k, 1);
  }

  update(dt, cam) {
    for (const p of this.pigeons) {
      p.t += dt; p.next -= dt;
      if (p.state === 'perch') {
        if (p.next <= 0) {
          const r = Math.random();
          if (r < 0.08) { p.state = 'fly'; p.vel = new THREE.Vector3(rnd(-1.2, 1.2), rnd(1.2, 1.8), rnd(-0.8, 0.8)); p.fly = 0; p.flip = p.vel.x < 0; p.pos = p.base.clone(); }
          else if (r < 0.45) { p.bob = 0.5; p.next = rnd(0.8, 3); }
          else if (r < 0.62) { p.look = rnd(1.2, 2.4); p.next = p.look + rnd(0.5, 2); }
          else if (r < 0.75) { p.flip = !p.flip; p.frame = null; p.next = rnd(2, 5); }
          else if (r < 0.88) { p.u = Math.max(0.05, Math.min(0.95, p.u + rnd(-0.025, 0.025))); p.base = this.wirePoint(p.wire, p.u); p.next = rnd(1, 4); }
          else p.next = rnd(1, 4);
        }
        p.bob = Math.max(0, (p.bob || 0) - dt);
        p.look = Math.max(0, (p.look || 0) - dt);
        const fr = p.bob > 0 ? (Math.floor(p.bob * 8) % 2 ? 'bob' : 'perch') : p.look > 0 ? 'back' : 'perch';
        this.setFrame(p, fr);
        p.s.position.copy(p.base);
      } else if (p.state === 'fly') {
        // up and away in a loop, then back down onto the wire
        p.fly += dt;
        const k = p.fly;
        if (k < 2.2) { p.pos.addScaledVector(p.vel, dt); p.vel.y -= dt * 0.4; }
        else { const goal = this.wirePoint(p.wire, p.u); p.pos.lerp(goal, Math.min(1, dt * 2.4)); if (p.pos.distanceTo(goal) < 0.03) { p.state = 'perch'; p.next = rnd(2, 5); p.flip = Math.random() < 0.5; p.frame = null; } }
        if (k > 2.2) p.flip = this.wirePoint(p.wire, p.u).x < p.pos.x;
        this.setFrame(p, Math.floor(p.t * 12) % 2 ? 'up' : 'down');
        p.s.position.copy(p.pos);
      }
      this.fit(p, cam, p.s.position);
    }
    const m = this.moth;
    if (m) {
      m.t += dt;
      const t = m.t;
      // erratic loops round the lamp, with sudden darts
      m.s.position.set(
        m.center.x + Math.sin(t * 2.1) * 0.24 + Math.sin(t * 7.3) * 0.05,
        m.center.y + Math.sin(t * 2.9) * 0.13 + Math.sin(t * 11.0) * 0.03,
        m.center.z + Math.cos(t * 1.7) * 0.1 + Math.cos(t * 6.1) * 0.03);
      this.setFrame(m, Math.floor(t * 14) % 2 ? 'mothA' : 'mothB');
      this.fit(m, cam, m.s.position);
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const o of this.sprites) { o.tex.dispose(); o.s.material.dispose(); }
    this.A.tex.dispose();
  }
}
