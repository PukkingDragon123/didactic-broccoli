// Expressive low-res faces for the visitors: the original voxel face design (same eye / mouth patterns),
// painted one pixel per voxel onto little quads that sit exactly on the head's front voxels, so the face can
// blink and change expression: neutral, blink, happy, wow, love, sleepy, talk, sad.
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';

const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
const mix = (a, b, t) => { const A = [(a >> 16) & 255, (a >> 8) & 255, a & 255], B = [(b >> 16) & 255, (b >> 8) & 255, b & 255]; return A.map((v, i) => Math.round(v + (B[i] - v) * t)).reduce((acc, v) => (acc << 8) | v, 0); };
const shade = (c, f) => mix(c, f < 1 ? 0x000000 : 0xffffff, f < 1 ? 1 - f : f - 1);

// expression eyes (right eye, columns inner -> outer, top row first) and mouths, in the same 1-voxel style
const EYE = {
  happy: { rows: ['.KK.', 'K..K'], oy: 0 },
  wow: { rows: ['KKK', 'KWK', 'KKK'], oy: 1 },
  love: { rows: ['X.X', 'XXX', '.X.'], oy: 1 },
  sleepy: { rows: ['KKK'], oy: -1 },
};
const MOUTH = {
  smile: ['M.M', '.M.'],
  happy: ['MMM', '.T.'],
  open: ['MMM', 'MTM'],
  o: ['.M.', 'M.M', '.M.'],
  sad: ['.M.', 'M.M'],
  tiny: ['M'],
  flat: ['MM'],
};
const CLOSED = ['happy', 'calm', 'sleepy'];

export class Face {
  /** info: from buildCharacter(...).face (recorded by face() in data/visitors.js) */
  constructor(info) {
    this.info = info;
    const { hw, y0, y1, cells, vs, neck: J } = info;
    this.W = 2 * hw + 1; this.H = y1 - y0 + 1;
    this.p = new Pix(this.W, this.H, 1);
    this.tex = this.p.texture();
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    // one quad per face cell on the front of its voxel (voxel boundary b → b*vs − J in the head's space)
    const pos = [], uv = [], nrm = [], idx = [], dz = 0.0015;
    for (let i = 0; i < cells.length; i += 3) {
      const x = cells[i], y = cells[i + 1], z = cells[i + 2] + (info.zShift || 0);
      const X0 = x * vs - J.x, X1 = (x + 1) * vs - J.x, Y0 = y * vs - J.y, Y1 = (y + 1) * vs - J.y, Z = z * vs - J.z + dz;
      const u0 = (x + hw) / this.W, u1 = (x + hw + 1) / this.W, v1 = 1 - (y1 - y) / this.H, v0 = 1 - (y1 - y + 1) / this.H;
      const n = pos.length / 3;
      pos.push(X0, Y0, Z, X1, Y0, Z, X1, Y1, Z, X0, Y1, Z);
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      nrm.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, roughness: 0.78, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    this.mesh.userData.noRim = true;
    this.mesh.raycast = () => {};
    this.expr = 'neutral';
    this.hold = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.t = 0;
    this.drawn = null;
    this.draw();
  }

  /** Show an expression for `hold` seconds (0 = until changed). */
  set(expr, hold = 0) { this.expr = expr; this.hold = hold; }

  // VoxelModel.project-style stamp: row r, column c → voxel (x0 + c, y0 − r)
  stamp(rows, legend, x0, y0) {
    const { hw, y1 } = this.info;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const col = legend[ch];
      if (ch === '.' || col === undefined) return;
      this.p.px(x0 + c + hw, y1 - (y0 - r), col);
    }));
  }

  pair(rows, legend, x0, y0) {
    this.stamp(rows, legend, x0, y0);
    this.stamp(mirror(rows), legend, -x0 - rows[0].length + 1, y0);
  }

  draw() {
    const info = this.info, L = { ...info.L, X: 0xff4f86 };
    const closed = CLOSED.includes(info.style);
    const blink = this.blinkT < 0.13 && !closed && !['happy', 'love', 'sleepy'].includes(this.expr);
    const e = blink ? 'blink' : this.expr;
    const talkFrame = e === 'talk' ? Math.floor(this.t * 7) % 2 : 0;
    const key = e + talkFrame;
    if (key === this.drawn) return;
    this.drawn = key;
    this.p.d.fill(0);
    const { ex, ey, ox, oy } = info;
    // cheeks: the character's own blush, and a rosy one for happy faces
    const bl = info.blush || (['happy', 'love'].includes(e) ? { w: 2, y: ey - 3, x: ex + 2 } : null);
    if (bl) this.pair(['B'.repeat(bl.w)], { B: info.L.B }, bl.x, bl.y);
    // eyes
    if (e === 'blink') {
      const w = Math.max(...info.eye.map((r) => r.replace(/L/g, '.').replace(/\.+$/, '').length));
      this.pair(['K'.repeat(w)], L, ex + ox, ey + oy - (info.eye.length - 2));
    } else if (EYE[e]) this.pair(EYE[e].rows, L, ex, ey + EYE[e].oy);
    else this.pair(info.eye, L, ex + ox, ey + oy);
    // brows: the character's own, lifted for surprise and slanted when sad
    const br = info.brows || (e === 'wow' || e === 'sad' ? { shape: ['BB'], y: ey + 3, c: shade(info.skin, 0.62) } : null);
    if (br) {
      const shape = e === 'sad' ? ['B.', '.B'] : br.shape;
      this.pair(shape, { B: br.c }, ex, br.y + (e === 'wow' ? 1 : e === 'sad' ? 1 : 0));
    }
    if (info.nose) this.stamp(['D'], L, 0, ey - 1);
    if (info.freckles) this.pair(['D.D'], L, ex + 2, ey - 3);
    if (e === 'sad') this.stamp(['T', 'T'], { T: 0x8ad0ff }, ex + 3, ey - 2); // a little tear
    // mouth
    let m = info.mouthRows;
    if (e === 'talk') m = talkFrame ? MOUTH.open : info.mouth === 'lips' ? m : MOUTH.smile;
    else if (e === 'happy') m = MOUTH.happy;
    else if (e === 'wow') m = MOUTH.o;
    else if (e === 'love') m = MOUTH.happy;
    else if (e === 'sad') m = MOUTH.sad;
    else if (e === 'sleepy') m = MOUTH.tiny;
    this.stamp(m, L, -Math.floor(m[0].length / 2), info.my);
    this.p.dirty = true;
    this.p.flush();
    this.tex.needsUpdate = true;
  }

  update(dt) {
    this.t += dt;
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    if (this.hold > 0) { this.hold -= dt; if (this.hold <= 0) this.expr = 'neutral'; }
    this.draw();
  }
}
