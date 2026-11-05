// The magic circle under your feet: a pixel glyph painted texel by texel into a small texture lying on the dais (no
// glow: it is gold ink, lit like the dais). Two rings with a band of bitmap-font runes bent round between them, a
// hexagram inside and a small crest in the middle. It turns in stepped frames (the rune band one way, the star the
// other) and flares in a rarity colour with a ring wave rolling out when you put something on.
//   const mc = new MagicCircle(96);  mc.mesh (a flat plane, 1 m across: scale it);  mc.update(dt);  mc.flare(hex)
import * as THREE from 'three';
import { mask5, textW5 } from '../gfx/font5x7.js';

const GOLD = [236, 194, 96], GOLD_D = [168, 118, 46], FAINT = [120, 84, 52];
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const RUNES = ' KIRA KIRA * KISEKAE * HOSHI * DRESS UP *';

export class MagicCircle {
  constructor(N = 96) {
    this.N = N;
    this.data = new Uint8Array(N * N * 4);
    this.tex = new THREE.DataTexture(this.data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    // the rune strip: one line of the 5x7 font, as a lookup of lit pixels
    const w = textW5(RUNES);
    this.strip = { w, set: new Set(mask5(RUNES).map(([x, y]) => y * 4096 + x)) };
    const mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'magic-circle';
    this.t = 0; this.step = -1; this.flareT = 0; this.flareCol = GOLD;
    this.paint(0);
  }

  /** Flare in a colour (rarity): the lines take the colour and a ring rolls out from the middle. */
  flare(color = 0xffd23f, big = false) { this.flareT = big ? 1.6 : 0.9; this.flareDur = this.flareT; this.flareCol = hex(color); this.step = -1; }

  update(dt) {
    this.t += dt;
    if (this.flareT > 0) this.flareT = Math.max(0, this.flareT - dt);
    const fps = this.flareT > 0 ? 12 : 5;
    const s = Math.floor(this.t * fps);
    if (s !== this.step) { this.step = s; this.paint(this.t); }
  }

  paint(t) {
    const N = this.N, c = N / 2, d = this.data;
    d.fill(0);
    const fl = this.flareT > 0, k = fl ? 1 - this.flareT / this.flareDur : 0;
    const ink = fl && Math.floor(this.t * 12) % 3 !== 2 ? this.flareCol : GOLD, inkD = fl ? this.flareCol.map((v) => v * 0.7) : GOLD_D;
    const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    const a1 = (Math.floor(t * 5) / 5) * 0.12; // the rune band turns one way in steps...
    const a2 = -(Math.floor(t * 5) / 5) * 0.2; // ...the star the other
    const R0 = N / 2 - 1.5, R1 = R0 - 9, R2 = R1 - 2;
    const S = this.strip, sw = S.w + 6;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
      if (r > R0 + 0.5) continue;
      if (r > R0 - 1.2) { set(x, y, (x + y) % 5 ? ink : inkD); continue; } // outer ring (2 texels)
      if (Math.abs(r - R1) < 0.6) { set(x, y, ink); continue; } // inner ring
      if (r > R1 + 0.6 && r < R0 - 1.2) {
        // runes along the band, read clockwise; sx along the circle, sy across the band (7 rows)
        const ang = (Math.atan2(dy, dx) + a1 + Math.PI * 4) % (Math.PI * 2);
        const sx = Math.floor((ang / (Math.PI * 2)) * sw), sy = Math.floor(((R0 - 1.2 - r) / (R0 - 1.2 - R1 - 0.6)) * 7);
        if (S.set.has(sy * 4096 + sx)) set(x, y, ink);
        continue;
      }
      // ticks just inside the inner ring
      if (r < R1 - 0.6 && r > R2 - 0.6) { const ang = Math.atan2(dy, dx) - a2; if (Math.abs(((ang / (Math.PI * 2)) * 48 + 480) % 1 - 0.5) > 0.42) set(x, y, inkD); }
      if (Math.abs(r - 9.5) < 0.55) set(x, y, inkD); // the crest's ring
    }
    // hexagram: two triangles, 1-texel lines
    const line = (x0, y0, x1, y1, col) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let i = 0; i <= n; i++) set(x0 + ((x1 - x0) * i) / n - 0.5, y0 + ((y1 - y0) * i) / n - 0.5, col); };
    const Rh = R2 - 1;
    for (const off of [0, Math.PI / 3]) {
      const p = [0, 1, 2].map((i) => [c + Math.cos(a2 + off + (i * Math.PI * 2) / 3) * Rh, c + Math.sin(a2 + off + (i * Math.PI * 2) / 3) * Rh]);
      for (let i = 0; i < 3; i++) line(...p[i], ...p[(i + 1) % 3], ink);
      for (const [px, py] of p) for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) set(px - 0.5 + ox, py - 0.5 + oy, inkD); // studs at the points
    }
    // a small four-point crest in the middle (mostly under your feet)
    for (let i = -6; i <= 6; i++) { set(c - 0.5 + i, c - 0.5, ink); set(c - 0.5, c - 0.5 + i, ink); }
    // the flare's ring wave rolling outward, broken up as it goes
    if (fl) {
      const rw = 6 + k * (R0 + 4);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const r = Math.hypot(x + 0.5 - c, y + 0.5 - c);
        if (Math.abs(r - rw) < 1.1 && r < R0 + 0.5 && ((x * 3 + y * 5) % 4 || k < 0.5)) set(x, y, this.flareCol);
        else if (Math.abs(r - rw + 3) < 0.6 && r < R0 && (x + y) % 2 === 0) set(x, y, FAINT);
      }
    }
    this.tex.needsUpdate = true;
  }

  dispose() { this.tex.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
