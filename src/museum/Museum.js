// The collectible museum behind the garage, built like an old Shōwa-era Japanese shop (駄菓子屋 / toy shop):
// fixed wooden architecture, enamel signs and pendant lamps. You customise it with display furniture,
// display sheets (themed mats) and decorations; visitors pay for tickets and the star rating follows your exhibits.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { GARAGE } from '../world/Garage.js';
import { pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { shopMat } from '../gfx/shopTextures.js';
import { audio } from '../core/audio.js';
import { ease, formatYen, hash2 } from '../core/util.js';
import { DisplaySlots } from '../game/Display.js';
import { buildDisplay } from './displays.js';
import { DISPLAYS, decorList, decorPrice, THEME_NAMES } from './catalog.js';
import { DISPLAY_STYLES, STYLE_ORDER, sheetMesh, styleTile } from './styles.js';
import { PROPS, propMesh, hasProp } from '../world/props.js';
import { MUSEUM_PRICE, MUSEUM_REQ_COMPLETE, MUSEUM_EXPANSIONS, itemValue } from '../game/economy.js';
import { getItem, SERIES_BY_ID, MINI_SERIES } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import { Visitors } from './Visitors.js';
import { makeBoxMesh } from '../game/Delivery.js';
import { COL, yen } from '../pc/ui.js';

// optional pixel-art signage (src/gfx/shopArt.js)
const artMods = import.meta.glob('../gfx/shopArt.js', { eager: true });
const SHOP_ART = Object.values(artMods)[0]?.SHOP_ART || {};
export const SHOP_TEXT = Object.values(artMods)[0]?.SHOP_TEXT || '';

const ZN = GARAGE.minZ - 0.2; // museum north wall (back of the garage wall)
const WALL_H = 3.6;
const CELL = 0.5;
const ENTRANCE = { x0: -1.0, x1: 1.0, h: 2.35 };
const DOOR = { x0: -GARAGE.doorHalf, x1: GARAGE.doorHalf, h: GARAGE.doorH };
const KOSHI = 0.95; // wainscot height
const NAGESHI = 2.55; // upper rail height

let uidN = 1;

const artTexCache = new Map();
function artTexture(id) {
  if (artTexCache.has(id)) return artTexCache.get(id);
  const a = SHOP_ART[id];
  if (!a) return null;
  const p = new Pix(a.w, a.h, 4);
  try { a.paint(p); } catch (e) { console.warn('shop art', id, e); }
  const t = p.texture();
  artTexCache.set(id, t);
  return t;
}

export class Museum {
  constructor(game) {
    this.game = game;
    this.data = game.state.museum;
    if (!this.data.styles) this.data.styles = ['plain', 'felt'];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.placed = [];
    this.score = { total: 0, stars: 0, beauty: 0, exhibits: 0, themes: 0, sets: 0, rate: 0, ticket: 0 };
    this.scoreT = 0;
    this.inside = 0;
    this.ghostCache = new Map();
    this.ghost = null;
    if (this.data.owned) this.build();
  }

  get dims() { return MUSEUM_EXPANSIONS[this.data.level || 0]; }
  get x0() { return -this.dims.w / 2; }
  get x1() { return this.dims.w / 2; }
  get zS() { return ZN - this.dims.d; }

  // ------------------------------------------------------------------ build
  build() {
    this.clearShell();
    this.shell = new THREE.Group();
    this.group.add(this.shell);
    this.buildFloor();
    this.buildWalls();
    this.buildWallShell();
    this.buildCeilingAndLights();
    this.buildEntrance();
    this.buildCounter();
    this.buildWallDecor();
    this.buildObstacles();
    if (!this.placedBuilt) {
      for (const p of this.data.placed) this.spawnPlaced(p, false);
      this.placedBuilt = true;
    }
    this.openGarageDoor();
    this.game.goods?.refresh();
    if (!this.visitors) this.visitors = new Visitors(this);
    else this.visitors.rebuildGrid();
    this.recompute();
  }

  clearShell() {
    if (this.shell) { this.group.remove(this.shell); this.shell.traverse((o) => o.geometry?.dispose?.()); }
    for (const o of this.obstacles || []) this.game.player.removeObstacle(o);
    this.obstacles = [];
    for (const c of this.colliders || []) this.game.physics.removeCollider(c);
    this.colliders = [];
    if (this.floorMeshes) for (const m of this.floorMeshes) { const i = this.game.placement.surfaces.indexOf(m); if (i >= 0) this.game.placement.surfaces.splice(i, 1); }
  }

  /** One quad list → mesh with UVs in metres (u along the wall / x, v up / z). */
  quadMesh(quads, mat) {
    const pos = [], uv = [], idx = [];
    quads.forEach((q, k) => {
      let P = q.p, U = q.uv;
      if (q.n) {
        const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
        const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        if (c[0] * q.n[0] + c[1] * q.n[1] + c[2] * q.n[2] < 0) { P = [P[0], P[3], P[2], P[1]]; U = [U[0], U[1], U[6], U[7], U[4], U[5], U[2], U[3]]; }
      }
      pos.push(...P[0], ...P[1], ...P[2], ...P[3]);
      uv.push(...U);
      const B = k * 4;
      idx.push(B, B + 1, B + 2, B, B + 2, B + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    return m;
  }

  buildFloor() {
    const { x0, x1, zS } = this;
    const q = { p: [[x0, 0, zS], [x0, 0, ZN], [x1, 0, ZN], [x1, 0, zS]], uv: [x0, -zS, x0, -ZN, x1, -ZN, x1, -zS] };
    const m = this.quadMesh([q], shopMat('shopFloor', { roughness: 0.55, bump: 0.6 }));
    m.userData.museumFloor = true;
    this.shell.add(m);
    this.floorMeshes = [m];
    this.game.placement.addSurface(m);
  }

  /** Horizontal spans of a wall band, cut around an opening. */
  wallSpans(a, b, y0, y1, open) {
    const out = [];
    if (!open || open.x1 <= a || open.x0 >= b || y0 >= open.h) { out.push([a, b, y0, y1]); return out; }
    if (open.x0 > a) out.push([a, open.x0, y0, y1]);
    if (open.x1 < b) out.push([open.x1, b, y0, y1]);
    if (y1 > open.h) out.push([Math.max(a, open.x0), Math.min(b, open.x1), Math.max(y0, open.h), y1]);
    return out;
  }

  buildWalls() {
    const { x0, x1, zS } = this;
    const sides = [
      { a: x0, b: x1, open: DOOR, at: (u, y) => [u, y, ZN - 0.012], n: [0, 0, -1] },
      { a: x0, b: x1, open: ENTRANCE, at: (u, y) => [u, y, zS], n: [0, 0, 1] },
      { a: zS, b: ZN, open: null, at: (u, y) => [x0, y, u], n: [1, 0, 0] },
      { a: zS, b: ZN, open: null, at: (u, y) => [x1, y, u], n: [-1, 0, 0] },
    ];
    const bands = [['koshiita', 0, KOSHI], ['shikkui', KOSHI, WALL_H]];
    for (const [key, y0, y1] of bands) {
      const quads = [];
      for (const s of sides) {
        for (const [a, b, ya, yb] of this.wallSpans(s.a, s.b, y0, y1, s.open)) {
          if (b - a < 0.001 || yb - ya < 0.001) continue;
          quads.push({ p: [s.at(a, ya), s.at(b, ya), s.at(b, yb), s.at(a, yb)], uv: [a, ya, b, ya, b, yb, a, yb], n: s.n });
        }
      }
      const m = this.quadMesh(quads, shopMat(key, { roughness: key === 'shikkui' ? 0.92 : 0.6, bump: key === 'shikkui' ? 0.4 : 0.9, color: key === 'shikkui' ? 0xe4e0d8 : 0xffffff }));
      this.shell.add(m);
    }
    // wooden trim: chair rail on the wainscot, nageshi rail, skirting, and posts (柱)
    const wood = pixMat('woodDark', { roughness: 0.55 });
    const W = x1 - x0, D = ZN - zS;
    const trim = (w, h, d, x, y, z) => { const m = boxMesh(w, h, d, wood, { cast: false }); m.position.set(x, y, z); this.shell.add(m); return m; };
    for (const [y, h, t] of [[KOSHI, 0.05, 0.035], [NAGESHI, 0.1, 0.04], [0.05, 0.1, 0.025]]) {
      // N/S walls are cut around the openings
      for (const [a, b] of this.wallSpans(x0, x1, y - h / 2, y + h / 2, DOOR).map((s) => [s[0], s[1]])) trim(b - a, h, t, (a + b) / 2, y, ZN - 0.012 - t / 2);
      for (const [a, b] of this.wallSpans(x0, x1, y - h / 2, y + h / 2, ENTRANCE).map((s) => [s[0], s[1]])) trim(b - a, h, t, (a + b) / 2, y, zS + t / 2);
      trim(t, h, D, x0 + t / 2, y, (ZN + zS) / 2);
      trim(t, h, D, x1 - t / 2, y, (ZN + zS) / 2);
    }
    const post = (x, z) => trim(0.12, WALL_H, 0.12, x, WALL_H / 2, z);
    for (const x of [x0 + 0.06, x1 - 0.06]) { post(x, ZN - 0.06); post(x, zS + 0.06); }
    const nz = Math.max(1, Math.round(D / 2.2));
    for (let i = 1; i < nz; i++) { const z = ZN - (D / nz) * i; post(x0 + 0.03, z); post(x1 - 0.03, z); }
    const nx = Math.max(1, Math.round(W / 2.4));
    for (let i = 1; i < nx; i++) {
      const x = x0 + (W / nx) * i;
      if (Math.abs(x) > 1.25) { post(x, ZN - 0.04); post(x, zS + 0.04); }
    }
    this.postSpacing = { nz, nx };
  }

  buildWallShell() {
    const { x0, x1, zS } = this;
    this.colliders.push(this.game.physics.addBox({ center: new THREE.Vector3(0, -0.1, (ZN + zS) / 2), half: new THREE.Vector3((x1 - x0) / 2, 0.1, (ZN - zS) / 2), material: 'wood' }));
    // outer shell: weathered clapboard (seen through the front doors)
    const outer = shopMat('siding', { roughness: 0.9 });
    const T = 0.2;
    const W = x1 - x0;
    const D = ZN - zS;
    const ob = (w, h, d, x, y, z) => {
      const g = new THREE.BoxGeometry(w, h, d);
      // metre UVs on the big faces
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d), uv.getY(i) * h);
      const m = new THREE.Mesh(g, outer); m.castShadow = true; m.position.set(x, y + h / 2, z); this.shell.add(m); return m;
    };
    const eL = ENTRANCE.x0 - (x0 - T), eR = (x1 + T) - ENTRANCE.x1;
    ob(eL, WALL_H, T, x0 - T + eL / 2, 0, zS - T / 2 - 0.001);
    ob(eR, WALL_H, T, ENTRANCE.x1 + eR / 2, 0, zS - T / 2 - 0.001);
    ob(ENTRANCE.x1 - ENTRANCE.x0, WALL_H - ENTRANCE.h, T, 0, ENTRANCE.h, zS - T / 2 - 0.001);
    ob(T, WALL_H, D + T, x0 - T / 2 - 0.001, 0, (ZN + zS) / 2);
    ob(T, WALL_H, D + T, x1 + T / 2 + 0.001, 0, (ZN + zS) / 2);
    const gW = 4.2;
    if (x0 < -gW) { ob(-gW - x0, WALL_H, T, (x0 - gW) / 2, 0, ZN + T / 2); ob(x1 - gW, WALL_H, T, (x1 + gW) / 2, 0, ZN + T / 2); }
    const pw = (cx, cz, hx, hz) => this.colliders.push(this.game.physics.addBox({ center: new THREE.Vector3(cx, WALL_H / 2, cz), half: new THREE.Vector3(hx, WALL_H / 2, hz), material: 'wood' }));
    pw(0, zS - 0.1, W / 2, 0.1); pw(x0 - 0.1, (ZN + zS) / 2, 0.1, D / 2); pw(x1 + 0.1, (ZN + zS) / 2, 0.1, D / 2);
  }

  buildCeilingAndLights() {
    const { x0, x1, zS } = this;
    const W = x1 - x0, D = ZN - zS;
    const ceilMat = shopMat('shopCeiling', { roughness: 0.85, emissive: 0x2a1c10, emissiveIntensity: 1 });
    const ceil = this.quadMesh([{ p: [[x0, WALL_H, ZN], [x0, WALL_H, zS], [x1, WALL_H, zS], [x1, WALL_H, ZN]], uv: [x0, ZN, x0, zS, x1, zS, x1, ZN] }], ceilMat);
    this.shell.add(ceil);
    // exposed beams (梁) across the room, lamps hang from them
    const beamM = pixMat('woodDark', { roughness: 0.6 });
    const nb = Math.max(2, Math.round(D / 2.6));
    const beamZ = [];
    for (let i = 0; i < nb; i++) {
      const z = ZN - (D / nb) * (i + 0.5);
      beamZ.push(z);
      const b = boxMesh(W, 0.22, 0.16, beamM, { cast: false });
      b.position.set(0, WALL_H - 0.11, z);
      this.shell.add(b);
    }
    // enamel-shade pendant lamps
    this.lights = [];
    const nl = Math.max(2, Math.round(W / 3));
    const lampY = 2.55;
    let k = 0;
    for (const z of beamZ) for (let a = 0; a < nl; a++) {
      const x = x0 + (W / nl) * (a + 0.5);
      const lamp = this.makeLamp();
      lamp.position.set(x, lampY, z);
      this.shell.add(lamp);
      const cordY = lampY + (hasProp('shop_lamp') ? 0.68 : 0.2);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, WALL_H - 0.22 - cordY, 4), colMat(0x1a1a1a));
      cord.position.set(x, (WALL_H - 0.22 + cordY) / 2, z);
      this.shell.add(cord);
      if (this.lights.length < 6 && (k++ % Math.max(1, Math.ceil((beamZ.length * nl) / 6)) === 0)) {
        const l = new THREE.PointLight(0xffe2c4, 5.2, 8.5, 1.4);
        l.position.set(x, lampY - 0.15, z);
        this.shell.add(l);
        this.lights.push(l);
      }
    }
    // sun through the skylight (shadows) — only active while the player is inside
    if (!this.sun) {
      this.sun = new THREE.DirectionalLight(0xffe8cc, 0);
      this.sun.castShadow = true;
      this.sun.shadow.bias = -0.0005;
      this.sun.shadow.normalBias = 0.02;
      this.game.scene.add(this.sun, this.sun.target);
      this.game.renderer.registerShadowLight(this.sun, 1);
    }
    const sc = this.sun.shadow.camera;
    const R = Math.max(W, D) / 2 + 1;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.5; sc.far = 30;
    sc.updateProjectionMatrix();
    this.sun.position.set(3, 12, (ZN + zS) / 2 + 4);
    this.sun.target.position.set(0, 0, (ZN + zS) / 2);
  }

  makeLamp() {
    if (hasProp('shop_lamp')) { const m = propMesh('shop_lamp'); m.castShadow = false; const g = new THREE.Group(); g.add(m); return g; }
    const g = new THREE.Group();
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.35, side: THREE.DoubleSide }));
    shade.position.y = 0.07;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0b0).multiplyScalar(2.2) }));
    bulb.position.y = 0.02;
    g.add(bulb);
    return g;
  }

  buildEntrance() {
    const zS = this.zS;
    const g = new THREE.Group();
    this.shell.add(g);
    const wood = pixMat('woodDark', { roughness: 0.55 });
    const fb = (w, h, d, x, y, z, parent = g) => { const m = boxMesh(w, h, d, wood); m.position.set(x, y + h / 2, z); parent.add(m); return m; };
    // door frame + threshold
    fb(0.1, ENTRANCE.h, 0.16, ENTRANCE.x0 - 0.05, 0, zS);
    fb(0.1, ENTRANCE.h, 0.16, ENTRANCE.x1 + 0.05, 0, zS);
    fb(ENTRANCE.x1 - ENTRANCE.x0 + 0.2, 0.12, 0.18, 0, ENTRANCE.h, zS);
    fb(ENTRANCE.x1 - ENTRANCE.x0, 0.03, 0.16, 0, 0, zS);
    // wooden lattice glass sliding doors (格子戸)
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xeaf2f0, transparent: true, opacity: 0.2, roughness: 0.06, clearcoat: 1, depthWrite: false, envMapIntensity: 2, side: THREE.DoubleSide });
    this.doors = [];
    const PW = 1.0, PH = ENTRANCE.h - 0.04;
    for (const s of [-1, 1]) {
      const panel = new THREE.Group();
      fb(0.045, PH, 0.04, -PW / 2 + 0.0225, 0, 0, panel);
      fb(0.045, PH, 0.04, PW / 2 - 0.0225, 0, 0, panel);
      fb(PW, 0.05, 0.04, 0, PH - 0.05, 0, panel);
      fb(PW, 0.42, 0.035, 0, 0, 0, panel); // wooden kick panel (腰板)
      fb(PW, 0.035, 0.04, 0, 0.42, 0, panel);
      // kumiko lattice over the glass
      for (let i = 1; i < 3; i++) fb(0.018, PH - 0.47, 0.03, -PW / 2 + (PW / 3) * i, 0.45, 0.004, panel);
      for (let j = 1; j < 5; j++) fb(PW, 0.018, 0.03, 0, 0.45 + ((PH - 0.5) / 5) * j, 0.004, panel);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.08, PH - 0.5), gm);
      gl.position.set(0, 0.45 + (PH - 0.5) / 2, 0);
      gl.renderOrder = 3;
      gl.userData.noRim = true;
      panel.add(gl);
      panel.position.set(s * 0.5, 0.03, zS + (s > 0 ? 0.025 : -0.025));
      g.add(panel);
      this.doors.push({ panel, s, open: 0 });
    }
    // outside: noren curtain, signboard, awning, street
    const out = zS - 0.2;
    const norenTex = artTexture('noren');
    const nm = new THREE.MeshStandardMaterial({ map: norenTex, color: norenTex ? 0xffffff : 0x22305a, roughness: 0.95, side: THREE.DoubleSide });
    this.noren = [];
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.1, 8), colMat(0x8a6a3a, { roughness: 0.6 }));
    rod.rotation.z = Math.PI / 2; rod.position.set(0, ENTRANCE.h + 0.04, out);
    g.add(rod);
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.98, 0.75, 1, 6);
      geo.translate(0, -0.375, 0);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
      const pn = new THREE.Mesh(geo, nm);
      pn.position.set(s * 0.5, ENTRANCE.h + 0.03, out);
      pn.rotation.y = Math.PI; // printed side faces the street
      g.add(pn);
      this.noren.push(pn);
    }
    const signTex = artTexture('shop_sign');
    if (signTex) {
      const a = SHOP_ART.shop_sign;
      const sw = 2.6, shH = sw * a.h / a.w;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, shH), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.1 }));
      sign.position.set(0, ENTRANCE.h + 0.62, zS - 0.215);
      sign.rotation.y = Math.PI;
      g.add(sign);
    }
    // striped awning (日除けテント)
    const awn = new Pix(32, 8, 3);
    for (let x = 0; x < 32; x++) for (let y = 0; y < 8; y++) awn.px(x, y, Math.floor(x / 4) % 2 ? 0xffffff : 0xc8282e);
    for (let x = 0; x < 32; x++) awn.px(x, 7, 0x8a1a1e);
    const at = awn.texture(); at.wrapS = THREE.RepeatWrapping; at.repeat.set(3, 1);
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), new THREE.MeshStandardMaterial({ map: at, roughness: 0.9, side: THREE.DoubleSide }));
    awning.position.set(0, ENTRANCE.h + 1.05, zS - 0.55);
    awning.rotation.x = -Math.PI / 2 + 0.55;
    g.add(awning);
    // stone step + street outside
    const step = boxMesh(2.4, 0.08, 0.5, colMat(0x8a8680, { roughness: 0.95 }));
    step.position.set(0, -0.03, zS - 0.45);
    g.add(step);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), pixMat('asphalt', { roughness: 0.95, color: 0xb0aaa0 }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, -0.012, zS - 4.4);
    street.receiveShadow = true;
    g.add(street);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshBasicMaterial({ color: 0xffb88a, fog: false }));
    sky.position.set(0, 6, zS - 12);
    g.add(sky);
    // houses across the street + trees
    for (let i = 0; i < 5; i++) {
      const h = hasProp('house_front') ? propMesh('house_front') : null;
      if (h) { h.position.set(-8 + i * 4, 0, zS - 8.5); g.add(h); }
    }
    for (let i = 0; i < 4; i++) {
      const tr = propMesh(i % 2 ? 'sakura_tree' : 'pine_tree', { fallbackSize: [1.6, 3, 1.6], fallbackColor: 0x4a8a4a });
      tr.position.set(-7 + i * 4.6 + hash2(i, 1), 0, zS - 5.5 - hash2(i, 2));
      tr.scale.setScalar(0.8 + hash2(i, 3) * 0.3);
      g.add(tr);
    }
    if (hasProp('utility_pole')) { const pole = propMesh('utility_pole'); pole.position.set(3.2, 0, zS - 3.2); g.add(pole); }
    const sunOut = new THREE.PointLight(0xffc890, 3, 10, 1.5);
    sunOut.position.set(0, 3, zS - 3);
    g.add(sunOut);
    // inside: wooden name board + star rating above the doors
    const p = new Pix(160, 40, 2);
    p.fill(0x3a2a1c);
    for (let y = 0; y < 40; y += 3) for (let x = 0; x < 160; x++) if (hash2(x >> 3, y) < 0.3) p.px(x, y, 0x46321f);
    p.frame(1, 1, 158, 38, 0xd4a83a);
    p.text('ガチャ博物館', 80, 3, { size: 18, color: 0xf3e9d2, align: 'center', outline: 0x1a120a });
    p.text('GACHA MUSEUM', 80, 25, { size: 9, color: 0xd4a83a, align: 'center', font: FONT_EN });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.6 }));
    board.position.set(0, ENTRANCE.h + 0.42, zS + 0.03);
    g.add(board);
    this.starMeshes = [];
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.035 : 0.08; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y); }
    const sg = new THREE.ExtrudeGeometry(starShape, { depth: 0.015, bevelEnabled: false });
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0x5a4a3a, metalness: 0.6, roughness: 0.4 }));
      st.position.set(-0.44 + i * 0.22, ENTRANCE.h + 0.82, zS + 0.03);
      g.add(st);
      this.starMeshes.push(st);
    }
    // visitor counter (old flip-digit style)
    this.counterCanvas = new Pix(64, 16, 3);
    this.counterTex = this.counterCanvas.texture();
    const cnt = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.12), new THREE.MeshBasicMaterial({ map: this.counterTex }));
    cnt.position.set(-1.7, 2.0, zS + 0.03);
    g.add(cnt);
    this.updateCounterTex();
  }

  updateCounterTex() {
    if (!this.counterCanvas) return;
    const p = this.counterCanvas;
    p.fill(0x1a1612);
    for (let i = 0; i < 6; i++) p.rect(3 + i * 10, 2, 8, 12, 0x2a2420);
    p.text(String(this.data.visitors || 0).padStart(6, '0').split('').join(' '), 32, 1, { size: 12, color: 0xf2e6c8, align: 'center', font: FONT_EN });
    p.rect(0, 7, 64, 1, 0x0a0806);
    this.counterTex.needsUpdate = true;
  }

  buildCounter() {
    const zS = this.zS;
    const g = new THREE.Group();
    // long axis along z, customer side faces west (toward the ticket queue)
    g.position.set(1.85, 0, zS + 1.3);
    g.rotation.y = -Math.PI / 2;
    this.shell.add(g);
    if (hasProp('shop_counter')) {
      const c = propMesh('shop_counter');
      g.add(c);
    } else {
      const wood = pixMat('woodLight', { roughness: 0.55 });
      const top = boxMesh(1.6, 0.05, 0.6, wood); top.position.set(0, 0.97, 0); g.add(top);
      const front = boxMesh(1.6, 0.95, 0.04, pixMat('woodDark')); front.position.set(0, 0.475, 0.28); g.add(front);
    }
    const H = 0.96;
    const reg = propMesh('cash_register', { fallbackSize: [0.3, 0.25, 0.28], fallbackColor: 0x8a7a5a });
    reg.position.set(0.45, H, -0.08); reg.rotation.y = Math.PI; g.add(reg);
    if (hasProp('abacus')) { const ab = propMesh('abacus'); ab.position.set(-0.1, H, -0.12); ab.rotation.y = Math.PI + 0.2; g.add(ab); }
    if (hasProp('manekineko')) { const mn = propMesh('manekineko'); mn.position.set(-0.62, H, 0.05); g.add(mn); }
    // 受付 sign + ticket price card (facing the customers)
    const p = new Pix(80, 40, 4); p.fill(0xfff8e8); p.frame(0, 0, 80, 40, 0x8a2a1e); p.frame(2, 2, 76, 36, 0x8a2a1e);
    p.text('受付', 40, 3, { size: 16, color: 0x8a2a1e, align: 'center' });
    p.text('RECEPTION', 40, 23, { size: 9, color: 0x333333, align: 'center', font: FONT_EN });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshStandardMaterial({ map: p.texture(), side: THREE.DoubleSide }));
    sign.position.set(-0.3, H + 0.2, 0.05); g.add(sign);
    this.ticketPix = new Pix(64, 32, 5);
    this.ticketTex = this.ticketPix.texture();
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ map: this.ticketTex, side: THREE.DoubleSide }));
    tk.position.set(0.05, H + 0.05, 0.22); tk.rotation.set(-0.5, 0, 0); g.add(tk);
    // donation box
    const don = boxMesh(0.2, 0.22, 0.16, pixMat('woodLight', { roughness: 0.5 }));
    don.position.set(-0.62, H + 0.11, -0.15); g.add(don);
    const dp = new Pix(32, 16, 6); dp.fill(0xfff8e8); dp.text('募金', 16, 1, { size: 12, color: 0x8a2a1e, align: 'center' });
    const dl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: dp.texture() }));
    dl.position.set(-0.62, H + 0.12, -0.069); g.add(dl);
    // shopkeeper's raised tatami nook behind the counter (上がり框)
    const tat = pixMat('tatami', { roughness: 0.9 });
    const nook = boxMesh(1.6, 0.36, 1.0, tat);
    nook.position.set(0, 0.18, -0.95);
    g.add(nook);
    const edge = boxMesh(1.62, 0.06, 0.06, pixMat('woodDark'));
    edge.position.set(0, 0.36, -0.45);
    g.add(edge);
    if (hasProp('garage_cat')) { const cat = propMesh('garage_cat'); cat.position.set(0.3, 0.36, -1.0); cat.rotation.y = 2.4; g.add(cat); }
    this.counter = g;
    this.ticketPoint = new THREE.Vector3(1.15, 0, zS + 1.3);
    this.donationPoint = new THREE.Vector3(1.2, 0, zS + 1.75);
    this.updateTicketTex();
    this.obstacles.push(this.game.player.addObstacle(1.55, 3.5, zS + 0.45, zS + 2.15));
  }

  updateTicketTex() {
    if (!this.ticketPix) return;
    const p = this.ticketPix;
    p.fill(0xfff6d8); p.frame(0, 0, 64, 32, 0x8a2a1e);
    p.text('入館料', 32, 1, { size: 11, color: 0x333333, align: 'center' });
    p.text(`${this.score.ticket || 40}円`, 32, 15, { size: 13, color: 0xd8282a, align: 'center' });
    this.ticketTex.needsUpdate = true;
  }

  /** Enamel signs, clock, calendar, menu tags and jar shelves on the fixed walls. */
  buildWallDecor() {
    const { x0, x1, zS } = this;
    const D = ZN - zS;
    const g = new THREE.Group();
    this.shell.add(g);
    const plate = (id, x, y, z, rotY, scale = 0.0045) => {
      const t = artTexture(id);
      if (!t) return null;
      const a = SHOP_ART[id];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(a.w * scale, a.h * scale), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.1 }));
      m.position.set(x, y, z); m.rotation.y = rotY;
      m.userData.noRim = true;
      g.add(m);
      return m;
    };
    const signs = Object.keys(SHOP_ART).filter((k) => !['noren', 'shop_sign', 'calendar', 'menu_tags', 'poster_showa'].includes(k));
    let si = 0;
    const nextSign = () => signs.length ? signs[si++ % signs.length] : null;
    // west & east walls: a sign between every pair of posts, high up
    const nz = this.postSpacing?.nz || 3;
    for (let i = 0; i < nz; i++) {
      const z = ZN - (D / nz) * (i + 0.5);
      const idW = nextSign(), idE = nextSign();
      if (idW) { const a = SHOP_ART[idW]; plate(idW, x0 + 0.012, 1.5 + (a.h * 0.006) / 2, z, Math.PI / 2, 0.006); }
      if (idE) { const a = SHOP_ART[idE]; plate(idE, x1 - 0.012, 1.5 + (a.h * 0.006) / 2, z, -Math.PI / 2, 0.006); }
    }
    // south wall beside the entrance
    plate('poster_showa', -2.2, 1.75, zS + 0.012, 0, 0.006);
    plate('calendar', 2.9, 1.85, zS + 0.012, 0, 0.0055);
    // north wall (garage side) either side of the door
    const n1 = nextSign(), n2 = nextSign();
    if (n1) plate(n1, -2.4, 1.9, ZN - 0.024, Math.PI, 0.006);
    if (n2) plate(n2, 2.4, 1.9, ZN - 0.024, Math.PI, 0.006);
    // menu tags over the counter (on the east side of the reception)
    plate('menu_tags', x1 - 0.012, 2.25, zS + 1.3, -Math.PI / 2, 0.006);
    // pendulum clock + jar shelves
    if (hasProp('pendulum_clock')) { const c = propMesh('pendulum_clock'); c.position.set(x1 - 0.07, 1.75, zS + 2.35); c.rotation.y = -Math.PI / 2; g.add(c); }
    if (hasProp('wall_shelf_jars')) {
      const s1 = propMesh('wall_shelf_jars'); s1.position.set(-2.6, 1.15, zS + 0.13); g.add(s1);
      const s2 = propMesh('wall_shelf_jars'); s2.position.set(x0 + 0.13, 1.15, zS + 1.6); s2.rotation.y = Math.PI / 2; g.add(s2);
    }
  }

  buildObstacles() {
    const P = this.game.player;
    const { x0, x1, zS } = this;
    const o = (a, b, c, d) => this.obstacles.push(P.addObstacle(a, b, c, d));
    o(x0 - 0.3, x0 + 0.06, zS - 0.3, ZN + 0.1);
    o(x1 - 0.06, x1 + 0.3, zS - 0.3, ZN + 0.1);
    o(x0 - 0.3, x1 + 0.3, zS - 0.3, zS + 0.05);
    if (x0 < -4) { o(x0, -4.2, ZN - 0.05, ZN + 0.2); o(4.2, x1, ZN - 0.05, ZN + 0.2); }
  }

  openGarageDoor() {
    const G = this.game.garage;
    G.door.wantOpen = true;
    G.door.sign.visible = false;
    if (G.doorObstacle) G.doorObstacle.enabled = false;
  }

  // ------------------------------------------------------------------ placement grid
  cellOf(x, z) { return [Math.floor((x - this.x0) / CELL), Math.floor((ZN - z) / CELL)]; }

  footprintCells(def, x, z, rot) {
    let [w, d] = def.footprint;
    if (rot % 2) [w, d] = [d, w];
    const cx0 = Math.round((x - w / 2 - this.x0) / CELL), cz0 = Math.round((ZN - (z + d / 2)) / CELL);
    const cells = [];
    for (let i = 0; i < w / CELL; i++) for (let j = 0; j < d / CELL; j++) cells.push([cx0 + i, cz0 + j]);
    return cells;
  }

  /** Snap an aim point to the grid for a footprint. Returns {x,z} centre. */
  snap(def, p, rot) {
    let [w, d] = def.footprint;
    if (rot % 2) [w, d] = [d, w];
    const minX = Math.round((p.x - w / 2 - this.x0) / CELL) * CELL + this.x0;
    const maxZ = ZN - Math.round((ZN - (p.z + d / 2)) / CELL) * CELL;
    return { x: minX + w / 2, z: maxZ - d / 2 };
  }

  reservedCell(i, j) {
    const x = this.x0 + (i + 0.5) * CELL, z = ZN - (j + 0.5) * CELL;
    if (Math.abs(x) < 1.1 && z < this.zS + 2.2) return true; // entrance corridor
    if (Math.abs(x) < 0.9 && z > ZN - 1.6) return true; // garage door
    if (x > 1.0 && x < 3.6 && z < this.zS + 2.3) return true; // reception counter + tatami nook
    return false;
  }

  occupied(ignoreUid = null) {
    const occ = new Set();
    // the counter and the shopkeeper's nook behind it
    for (let i = 0; i < this.dims.w / CELL; i++) for (let j = 0; j < this.dims.d / CELL; j++) {
      const x = this.x0 + (i + 0.5) * CELL, z = ZN - (j + 0.5) * CELL;
      if (x > 1.5 && x < 3.6 && z > this.zS + 0.4 && z < this.zS + 2.2) occ.add(i + ',' + j);
    }
    for (const p of this.placed) {
      if (p.data.uid === ignoreUid) continue;
      for (const [i, j] of this.footprintCells(p.def, p.data.x, p.data.z, p.data.rot)) occ.add(i + ',' + j);
    }
    return occ;
  }

  canPlace(def, x, z, rot, ignoreUid = null) {
    const occ = this.occupied(ignoreUid);
    const gw = this.dims.w / CELL, gd = this.dims.d / CELL;
    for (const [i, j] of this.footprintCells(def, x, z, rot)) {
      if (i < 0 || j < 0 || i >= gw || j >= gd) return false;
      if (occ.has(i + ',' + j) || this.reservedCell(i, j)) return false;
    }
    return true;
  }

  defOf(kind, id) {
    if (kind === 'display') return DISPLAYS[id];
    const p = PROPS[id];
    return p ? { ...p, footprint: p.footprint || [1, 1] } : null;
  }

  /** Build the 3D object for a placed entry. */
  makeObject(kind, id, opts = {}) {
    if (kind === 'display') {
      const lit = this.placed.filter((p) => p.data.id === 'pedestal').length < 4;
      return buildDisplay(id, { light: lit });
    }
    const m = propMesh(id, { fallbackSize: [0.8, 1, 0.8] });
    const g = new THREE.Group(); g.add(m);
    const p = PROPS[id];
    let light = null;
    const lit = this.placed.filter((e) => e.obj.light).length;
    if (p?.light && !opts.preview && lit < 5) {
      light = new THREE.PointLight(p.light, 1.6, 3.5, 1.6);
      const h = m.geometry?.userData?.size?.y || 1;
      light.position.y = h * 0.7;
      g.add(light);
    }
    return { group: g, slots: [], light };
  }

  spawnPlaced(data, animate) {
    const def = this.defOf(data.kind, data.id);
    if (!def) return null;
    const obj = this.makeObject(data.kind, data.id);
    obj.group.position.set(data.x, 0, data.z);
    obj.group.rotation.y = data.rot * Math.PI / 2;
    this.group.add(obj.group);
    obj.group.updateMatrixWorld(true);
    const entry = { data, def, obj, display: null, sheets: [] };
    if (data.kind === 'display') this.applyStyle(entry);
    if (obj.slots.length) {
      if (!data.items || data.items.length !== obj.slots.length) data.items = Array(obj.slots.length).fill(null);
      entry.display = new DisplaySlots(this.game, obj.owner || obj.group, obj.slots, data.items, { glass: true, shadows: false, prices: true });
    }
    // furniture root is interactable for "move" (F) hints
    obj.group.userData.museumEntry = entry;
    this.game.interaction.add(obj.group, {
      hint: (held) => {
        if (held) return null;
        if (entry.display) {
          const st = DISPLAY_STYLES[data.style || 'plain'];
          return { key: 'R', text: `展示シート · Sheet: ${st.jp}`, sub: `F で移動 · F to move — ${entry.display.keys().length}/${obj.slots.length} on display` };
        }
        return { key: 'F', text: `${def.jp || def.name} · Move`, sub: (def.themes || []).map((t) => THEME_NAMES[t]?.[1]).join(' · ') };
      },
      use: () => false,
    });
    // blocks the player + capsules
    let [w, d] = def.footprint;
    if (data.rot % 2) [w, d] = [d, w];
    entry.obstacle = this.game.player.addObstacle(data.x - w / 2 + 0.05, data.x + w / 2 - 0.05, data.z - d / 2 + 0.05, data.z + d / 2 - 0.05);
    this.placed.push(entry);
    if (animate) {
      const g = obj.group;
      g.scale.setScalar(0.01);
      this.game.tweens.add({ dur: 0.55, ease: ease.outBack, update: (k) => g.scale.setScalar(Math.max(0.01, k)) });
      const c = new THREE.Vector3(data.x, 0.3, data.z);
      this.game.effects.sparks({ pos: c, count: 40, colors: [0xffffff, 0xffe9a0], speed: 1, size: 0.02, radius: 0.6 });
      this.game.effects.ring({ pos: new THREE.Vector3(data.x, 0.02, data.z), size: Math.max(w, d) * 2, color: 0xffe9a0 });
      audio.play('thud', { pos: c, v: 0.6 });
      audio.play('upgrade', { pos: c, vol: 0.6 });
    }
    this.visitors?.rebuildGrid();
    return entry;
  }

  /** Lay the display's sheet (themed mat) on every shelf surface. */
  applyStyle(entry) {
    for (const m of entry.sheets) m.parent?.remove(m);
    entry.sheets = [];
    const id = entry.data.style || 'plain';
    if (id === 'plain' || !DISPLAY_STYLES[id]) return;
    for (const mat of entry.obj.mats || []) {
      const m = sheetMesh(id, mat);
      (mat.onOwner && entry.obj.owner ? entry.obj.owner : entry.obj.group).add(m);
      entry.sheets.push(m);
    }
  }

  /** Cycle through the sheets you own (R while looking at a display). */
  cycleStyle(entry, dir = 1) {
    const owned = STYLE_ORDER.filter((id) => this.data.styles.includes(id));
    const cur = Math.max(0, owned.indexOf(entry.data.style || 'plain'));
    entry.data.style = owned[(cur + dir + owned.length) % owned.length];
    this.applyStyle(entry);
    const c = new THREE.Vector3(entry.data.x, 0.9, entry.data.z);
    audio.play('paper', { pos: c, vol: 0.8 });
    this.game.effects.sparks({ pos: c, count: 16, colors: [0xffffff, 0xfff0c0], speed: 0.4, size: 0.012, radius: 0.4 });
    if (owned.length <= 2) this.game.tip('sheets', 'E-Martで展示シートを買うと選べる柄が増えるよ', 'Buy more display sheets on E-Mart to theme your displays');
    this.recompute();
    this.game.save();
  }

  removePlaced(entry) {
    const g = this.game;
    g.interaction.remove(entry.obj.group);
    entry.display?.dispose();
    g.player.removeObstacle(entry.obstacle);
    this.group.remove(entry.obj.group);
    this.placed.splice(this.placed.indexOf(entry), 1);
    this.visitors?.rebuildGrid();
  }

  displays() { return this.placed.filter((p) => p.display).map((p) => p.display); }

  // ------------------------------------------------------------------ held decor box behaviour
  boxHint(it) {
    const d = it.data;
    if (d.type !== 'decor') return null;
    if (!this.data.owned) return { key: 'Q', text: '博物館がまだありません · You need a museum first' };
    const pl = this.placementTarget(it);
    if (!pl) return { key: 'Q', text: '博物館へ運ぶ · Carry it into the museum', sub: d.label };
    return pl.ok ? { key: 'L', text: `設置 · Place ${d.label || ''}`, sub: 'R / right-click to rotate' } : { key: '×', text: 'ここには置けません · Blocked', sub: 'R to rotate' };
  }

  boxSecondary(it) {
    if (it.data.type === 'decor') { it.data.rot = ((it.data.rot || 0) + 1) % 4; audio.play('rotate', { vol: 0.6 }); }
  }

  primary(it) {
    const d = it.data;
    if (d.type !== 'decor') return;
    const pl = this.placementTarget(it);
    if (!pl || !pl.ok) { if (pl) audio.play('error', { vol: 0.4 }); return; }
    const g = this.game;
    const target = new THREE.Vector3(pl.x, 0, pl.z);
    g.held.putTo(target, new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      audio.play('boxOpen', { pos: target, vol: 0.8 });
      const data = d.moving || { uid: 'p' + Date.now().toString(36) + (uidN++), kind: d.kind, id: d.id, items: null };
      data.x = pl.x; data.z = pl.z; data.rot = d.rot || 0;
      if (!this.data.placed.includes(data)) this.data.placed.push(data);
      this.spawnPlaced(data, true);
      this.hideGhost();
      this.recompute();
      g.save();
    }, { dur: 0.35, arc: 0.1, scale: 0.5 });
  }

  placementTarget(it) {
    if (!this.data.owned) return null;
    const hit = this.game.interaction.castAgainst(this.floorMeshes, 6)[0];
    if (!hit) return null;
    const d = it.data;
    const def = this.defOf(d.kind, d.id);
    if (!def) return null;
    const s = this.snap(def, hit.point, d.rot || 0);
    return { ...s, ok: this.canPlace(def, s.x, s.z, d.rot || 0, d.moving?.uid), def };
  }

  showGhost(it, pl) {
    const key = it.data.kind + ':' + it.data.id;
    if (!this.ghost || this.ghost.userData.key !== key) {
      this.hideGhost();
      let g = this.ghostCache.get(key);
      if (!g) {
        const o = it.data.kind === 'display' ? buildDisplay(it.data.id, { light: false }) : this.makeObject(it.data.kind, it.data.id, { preview: true });
        g = o.group;
        g.traverse((m) => {
          if (m.isLight) m.visible = false;
          if (m.isMesh) { m.material = new THREE.MeshBasicMaterial({ color: 0x9fffb0, transparent: true, opacity: 0.32, depthWrite: false }); m.castShadow = false; m.raycast = () => {}; }
        });
        g.userData.key = key;
        this.ghostCache.set(key, g);
      }
      this.ghost = g;
      this.group.add(g);
    }
    this.ghost.position.set(pl.x, 0.002, pl.z);
    this.ghost.rotation.y = (it.data.rot || 0) * Math.PI / 2;
    const col = pl.ok ? 0x9fffb0 : 0xff8080;
    this.ghost.traverse((m) => { if (m.isMesh) m.material.color.setHex(col); });
    this.ghost.visible = true;
  }

  hideGhost() { if (this.ghost) { this.group.remove(this.ghost); this.ghost = null; } }

  pickUpPlaced(entry) {
    const g = this.game;
    if (g.held.item) return;
    const data = entry.data;
    this.removePlaced(entry);
    this.data.placed.splice(this.data.placed.indexOf(data), 1);
    const def = entry.def;
    const box = { type: 'decor', kind: data.kind, id: data.id, label: def.jp || def.name, rot: data.rot, moving: data, boxSize: [0.5, 0.35, 0.45] };
    const mesh = makeBoxMesh('decor', box, box.boxSize);
    mesh.position.set(data.x, 0.2, data.z);
    g.scene.add(mesh);
    g.held.take('box', box, mesh);
    audio.play('pickup');
    this.recompute();
  }

  // ------------------------------------------------------------------ scoring
  recompute() {
    if (!this.data.owned) return;
    let exhibits = 0, themes = 0, beauty = 0, sets = 0;
    const themeSources = [];
    for (const p of this.placed) {
      const ts = p.def.themes || [];
      themeSources.push({ x: p.data.x, z: p.data.z, themes: ts, w: p.data.kind === 'decor' ? 1 : 0.5 });
      if (p.data.kind === 'decor') beauty += p.def.beauty || 1;
      else beauty += (p.def.beauty || 1) * 0.5;
    }
    // display sheets: a strong theme source on the display itself, plus a little beauty
    const sheetKinds = new Set();
    for (const p of this.placed) {
      const st = DISPLAY_STYLES[p.data.style];
      if (!st || st.id === 'plain') continue;
      sheetKinds.add(st.id);
      themeSources.push({ x: p.data.x, z: p.data.z, themes: st.themes, w: 1.6 });
      beauty += 0.8;
    }
    beauty += sheetKinds.size * 1.5;
    if (this.game.state.goods?.furin) beauty += 3;
    // mini decos theme the display they stand in and add a little beauty
    for (const p of this.placed) for (const it of p.display?.items || []) {
      const item = it && getItem(it.k);
      if (!item?.mini) continue;
      themeSources.push({ x: p.data.x, z: p.data.z, themes: item.themes || [], w: 0.6 });
      beauty += 0.6;
    }
    const museumKeys = new Set();
    for (const p of this.placed) {
      if (!p.display) continue;
      const mult = p.def.spotlight ? 2 : 1;
      for (const it of p.display.items) {
        if (!it) continue;
        const item = getItem(it.k);
        if (!item) continue;
        museumKeys.add(it.k);
        if (item.mini) continue;
        const series = SERIES_BY_ID[item.series];
        const appeal = 10 * Math.pow(RARITIES[item.rarity].value, 0.8) * Math.sqrt(FINISHES[it.f]?.mult || 1) * mult;
        // theme match from nearby sources
        let match = 0;
        for (const src of themeSources) {
          const dd = Math.hypot(src.x - p.data.x, src.z - p.data.z);
          if (dd > 3) continue;
          for (const t of series.themes) if (src.themes.includes(t)) match += src.w * (1 - dd / 3);
        }
        const bonus = Math.min(0.8, match * 0.18);
        themes += appeal * bonus;
        exhibits += appeal;
      }
    }
    for (const se of Object.values(SERIES_BY_ID).filter((x) => !x.hidden)) if (se.items.every((it) => museumKeys.has(it.key))) sets += 250 + se.price;
    const beautyScore = 30 * Math.sqrt(beauty);
    const total = Math.round(exhibits + themes + beautyScore + sets);
    const TH = [0, 250, 800, 2000, 4500, 9000];
    let stars = 0; for (let i = 0; i < TH.length; i++) if (total >= TH[i]) stars = i;
    const gs = this.game.state.goods || {};
    const rate = Math.min(24, 0.6 + total / 220) * (gs.neon_open ? 1.15 : 1); // visitors per minute
    const ticket = Math.round((40 + stars * 40) * (gs.ticket_machine ? 1.2 : 1) / 10) * 10;
    this.score = { total, stars, beauty: Math.round(beautyScore), exhibits: Math.round(exhibits), themes: Math.round(themes), sets, rate, ticket, nextAt: TH[stars + 1] || null, museumKeys: museumKeys.size };
    this.data.ticket = ticket;
    // diegetic star plaque
    this.starMeshes?.forEach((m, i) => {
      const on = i < stars;
      m.material.color.setHex(on ? 0xffc83a : 0x5a4a3a);
      m.material.emissive = new THREE.Color(on ? 0x6a4a00 : 0x000000);
    });
    this.updateTicketTex();
  }

  // ------------------------------------------------------------------ site (E-Mart museum page)
  sitePage(site, x, y, w) {
    const ui = site.ui, g = this.game, s = g.state;
    let yy = y;
    if (!this.data.owned) {
      yy += site.heading(x, yy, w, '博物館オーナー募集！', 'OPEN YOUR OWN MUSEUM', '#6a2a9a');
      ui.rect(x, yy, w, 150, '#f6eefc');
      ui.frame(x, yy, w, 150, '#c8a8e8');
      ui.text('ガレージ裏の空き倉庫を', x + 16, yy + 12, { size: 16 });
      ui.text('あなただけのガチャ博物館に！', x + 16, yy + 34, { size: 20, color: '#6a2a9a', outline: '#fff' });
      ui.text('★ 来館者が入館料を払ってくれます（不労所得！）', x + 16, yy + 64, { size: 11 });
      ui.text('★ 昭和レトロなお店で展示台・シート・装飾をカスタマイズ', x + 16, yy + 80, { size: 11 });
      ui.text('★ テーマが合う展示は評価アップ', x + 16, yy + 96, { size: 11 });
      const comp = Object.keys(s.completed).length;
      const ok = comp >= MUSEUM_REQ_COMPLETE;
      ui.text(`条件：シリーズコンプ ${MUSEUM_REQ_COMPLETE}個以上（現在 ${comp}）`, x + 16, yy + 118, { size: 11, color: ok ? COL.green : COL.red });
      ui.text(yen(MUSEUM_PRICE), x + w - 16, yy + 60, { size: 22, color: COL.red, align: 'right', bold: true });
      ui.button('改装を依頼する', x + w - 170, yy + 100, 154, 30, () => site.notify(this.buyMuseum()), { disabled: !ok || s.money < MUSEUM_PRICE, color: COL.orange, size: 13 });
      yy += 160;
      ui.text('※完成した展示（シリーズを全部並べる）はコンプボーナスの対象です。', x + 4, yy, { size: 10, color: COL.soft });
      return yy + 20 - y;
    }
    const tabs = [['displays', '展示台'], ['minis', 'ミニデコ'], ['decor', '装飾'], ['sheets', '展示シート'], ['expand', '拡張'], ['stats', '評価']];
    let tx = x;
    const tw = Math.floor((w - (tabs.length - 1) * 3) / tabs.length);
    for (const [id, jp] of tabs) {
      const on = site.sub.museum === id;
      const hov = ui.hit(tx, yy, tw, 22, () => { site.sub.museum = id; site.scroll.museum = 0; audio.play('uiClick', { vol: 0.5 }); });
      ui.rect(tx, yy, tw, 22, on ? '#6a2a9a' : hov ? '#e8d8f8' : '#f0e8f8');
      ui.text(jp, tx + tw / 2, yy + 5, { size: 10, color: on ? '#fff' : COL.ink, align: 'center' });
      tx += tw + 3;
    }
    yy += 28;
    const sub = site.sub.museum;
    if (sub === 'displays') {
      for (const d of Object.values(DISPLAYS)) {
        site.panel(x, yy, w, 70);
        const th = site.displayThumb(d.id);
        if (th) ui.image(th, x + 4, yy + 3, 64, 64);
        ui.text(d.jp, x + 74, yy + 6, { size: 13 });
        ui.text(d.name, x + 74, yy + 24, { size: 9, color: COL.soft });
        ui.text(d.desc, x + 74, yy + 38, { size: 9, color: COL.ink, max: 250 });
        ui.text(`${d.footprint[0]}×${d.footprint[1]}m  ${d.themes.map((t) => THEME_NAMES[t][0]).join('・')}`, x + 74, yy + 52, { size: 9, color: COL.blue });
        ui.text(yen(d.price), x + w - 12, yy + 10, { size: 14, color: COL.red, bold: true, align: 'right' });
        ui.button('注文', x + w - 92, yy + 36, 80, 24, () => site.notify(this.buyFurniture('display', d.id)), { disabled: s.money < d.price, size: 12 });
        yy += 76;
      }
    } else if (sub === 'decor') {
      const list = decorList();
      const cw = Math.floor((w - 12) / 4);
      list.forEach((p, i) => {
        const cx = x + (i % 4) * (cw + 4), cy = yy + Math.floor(i / 4) * 136;
        site.panel(cx, cy, cw, 130);
        ui.image(site.propThumb(p.id), cx + (cw - 64) / 2, cy + 3, 64, 64);
        ui.text(p.jp || p.name, cx + cw / 2, cy + 70, { size: 10, align: 'center', max: cw - 6 });
        ui.text((p.themes || []).map((t) => THEME_NAMES[t]?.[0]).join('・'), cx + cw / 2, cy + 84, { size: 8, color: COL.blue, align: 'center', max: cw - 6 });
        ui.stars(Math.min(5, Math.ceil(p.beauty / 2)), cx + cw / 2 - 17, cy + 96, '#ff8fb2');
        ui.button(yen(p.price), cx + 6, cy + 106, cw - 12, 19, () => site.notify(this.buyFurniture('decor', p.id)), { size: 11, disabled: s.money < p.price, color: '#d8f0d8' });
      });
      yy += Math.ceil(list.length / 4) * 136;
    } else if (sub === 'minis') {
      ui.text('ちいさなジオラマ小物。展示台のスロットにフィギュアと並べて飾れます。', x + 4, yy, { size: 10, color: COL.soft });
      yy += 18;
      const list = MINI_SERIES.items;
      const cw = Math.floor((w - 15) / 5);
      list.forEach((it, i) => {
        const cx = x + (i % 5) * (cw + 3), cy = yy + Math.floor(i / 5) * 96;
        site.panel(cx, cy, cw, 90);
        ui.image(site.itemThumb(it.key, 48), cx + (cw - 48) / 2, cy + 3, 48, 48);
        ui.text(it.jp, cx + cw / 2, cy + 52, { size: 10, align: 'center', max: cw - 4 });
        ui.button(yen(it.price), cx + 4, cy + 68, cw - 8, 17, () => site.notify(this.buyMini(it.key)), { size: 10, disabled: s.money < it.price, color: '#d8f0e8' });
      });
      yy += Math.ceil(list.length / 5) * 96;
    } else if (sub === 'sheets') {
      ui.text('展示台の棚に敷くジオラマシート。展示台を見ながら R キーで切り替え！', x + 4, yy, { size: 10, color: COL.soft });
      yy += 14;
      ui.text('シリーズのテーマと合うシートに飾ると評価UP。お店の壁や床は昭和のまま変わりません。', x + 4, yy, { size: 10, color: COL.soft, max: w - 8 });
      yy += 18;
      const list = STYLE_ORDER.filter((id) => id !== 'plain').map((id) => DISPLAY_STYLES[id]);
      const cw = Math.floor((w - 12) / 4);
      list.forEach((m, i) => {
        const cx = x + (i % 4) * (cw + 4), cy = yy + Math.floor(i / 4) * 98;
        site.panel(cx, cy, cw, 92);
        // swatch: the sheet tile at 1:1 pixels, framed like a sample card
        const tile = styleTile(m.id).canvas;
        ui.rect(cx + 5, cy + 4, cw - 10, 40, '#3a2a1c');
        ui.image(tile, cx + 7, cy + 6, cw - 14, 36);
        ui.text(m.jp, cx + cw / 2, cy + 47, { size: 11, align: 'center' });
        ui.text(m.themes.map((t) => THEME_NAMES[t][0]).join('・'), cx + cw / 2, cy + 61, { size: 8, color: COL.blue, align: 'center', max: cw - 6 });
        const own = this.data.styles.includes(m.id);
        if (own) ui.text('購入済み ✓', cx + cw / 2, cy + 74, { size: 10, color: COL.green, align: 'center' });
        else ui.button(yen(m.price), cx + 6, cy + 72, cw - 12, 17, () => site.notify(this.buyStyle(m.id)), { size: 10, disabled: s.money < m.price });
      });
      yy += Math.ceil(list.length / 4) * 98 + 6;
    } else if (sub === 'expand') {
      const lvl = this.data.level || 0;
      MUSEUM_EXPANSIONS.forEach((e, i) => {
        site.panel(x, yy, w, 50, i <= lvl ? '#eef8ee' : '#fff');
        ui.text(`${i === 0 ? '基本' : '拡張' + i}：${e.w}m × ${e.d}m`, x + 10, yy + 8, { size: 14 });
        ui.text(`床面積 ${e.w * e.d}㎡`, x + 10, yy + 28, { size: 10, color: COL.soft });
        if (i <= lvl) ui.text('完了 ✓', x + w - 12, yy + 16, { size: 13, color: COL.green, align: 'right' });
        else if (i === lvl + 1) {
          ui.text(yen(e.price), x + w - 120, yy + 16, { size: 14, color: COL.red, bold: true, align: 'right' });
          ui.button('工事する', x + w - 104, yy + 12, 92, 26, () => site.notify(this.expand()), { disabled: s.money < e.price, color: COL.orange });
        }
        yy += 56;
      });
    } else {
      const sc = this.score;
      site.panel(x, yy, w, 130, '#fffaf0');
      ui.text('来館者レビュー', x + 10, yy + 8, { size: 13 });
      for (let i = 0; i < 5; i++) ui.sprite(['....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XX...XX.', 'XX.....XX'], { X: i < sc.stars ? '#ffb000' : '#d8d0c0' }, x + 10 + i * 22, yy + 28, 2);
      const quotes = ['まだ何もない…', 'ちょっとかわいい', 'なかなか楽しい！', 'また来たい！', '感動しました！！', '伝説のガチャ博物館…！'];
      ui.text(`「${quotes[sc.stars]}」`, x + 130, yy + 32, { size: 13, color: '#6a2a9a' });
      ui.text(`総合スコア ${sc.total}${sc.nextAt ? `（次の★まで ${sc.nextAt - sc.total}）` : ''}`, x + 10, yy + 56, { size: 11 });
      ui.text(`展示 ${sc.exhibits}　テーマ一致 +${sc.themes}　美しさ +${sc.beauty}　セット展示 +${sc.sets}`, x + 10, yy + 74, { size: 10, color: COL.soft });
      ui.text(`来館ペース 約${sc.rate.toFixed(1)}人/分　入館料 ${yen(sc.ticket)}　展示中 ${sc.museumKeys}種`, x + 10, yy + 90, { size: 10, color: COL.blue });
      ui.text(`累計来館者 ${this.data.visitors || 0}人　累計収入 ${yen(this.data.income || 0)}`, x + 10, yy + 106, { size: 10, color: COL.green });
      yy += 138;
      ui.text('ヒント：シリーズのテーマ（かわいい・食べ物・宇宙…）と同じ雰囲気のシートや装飾の近くに飾ると評価UP！', x + 4, yy, { size: 10, color: COL.soft, max: w - 8 });
      yy += 16;
      ui.text('スポットライト台はレア物の魅力が2倍。シリーズを博物館に全種並べるとセットボーナス。', x + 4, yy, { size: 10, color: COL.soft, max: w - 8 });
      yy += 20;
    }
    return yy - y;
  }

  displayPreview(id) { return buildDisplay(id, { light: false }).group; }

  // ------------------------------------------------------------------ purchases
  buyMuseum() {
    const g = this.game;
    if (this.data.owned) return { ok: false, msg: '購入済み' };
    if (Object.keys(g.state.completed).length < MUSEUM_REQ_COMPLETE) return { ok: false, msg: 'シリーズをコンプリートしてね' };
    if (!g.spend(MUSEUM_PRICE)) return { ok: false, msg: 'お金が足りません' };
    this.data.owned = true;
    this.data.level = 0;
    // a few starter pieces so opening day isn't an empty room
    const starter = [['display', 'case_glass', -2.5, -7.25, 1], ['display', 'case_glass', 2.5, -7.25, 3], ['display', 'shelf_open', -4.25, -10.5, 1], ['decor', 'plant_monstera', 4.25, -5.75, 0], ['decor', 'bonsai', 0, -12.75, 0]];
    for (const [kind, id, x, z, rot] of starter) {
      const def = this.defOf(kind, id);
      if (!def) continue;
      const sn = this.snap(def, new THREE.Vector3(x, 0, z), rot);
      this.data.placed.push({ uid: 'st' + id + x, kind, id, x: sn.x, z: sn.z, rot, items: null });
    }
    this.build();
    audio.play('thud', { pos: new THREE.Vector3(0, 1, -5), v: 1 });
    audio.play('complete', { vol: 0.8 });
    g.news('🏮 ガチャ博物館オープン！', 'Your museum is open — the back door is unlocked!', 6000);
    g.save();
    return { ok: true, msg: '裏のドアが開きました！ The back door is open!' };
  }

  buyFurniture(kind, id) {
    const g = this.game;
    const def = this.defOf(kind, id);
    const price = kind === 'display' ? def.price : decorPrice(def);
    if (!g.spend(price)) return { ok: false, msg: 'お金が足りません' };
    const [w, d] = def.footprint;
    const boxSize = [Math.min(0.7, 0.3 + w * 0.2), Math.min(0.6, 0.25 + 0.15 * Math.max(w, d)), Math.min(0.6, 0.3 + d * 0.15)];
    g.delivery.order({ type: 'decor', kind, id, label: def.jp || def.name, name: def.name, jp: def.jp, rot: 0, boxSize });
    g.save();
    return { ok: true, msg: 'シャッター前に届きます · Delivered to the garage' };
  }

  buyMini(key) {
    const g = this.game;
    const it = getItem(key);
    if (!it || !g.spend(it.price)) return { ok: false, msg: 'お金が足りません' };
    g.delivery.order({ type: 'single', key, finish: 'normal', label: it.jp });
    g.save();
    return { ok: true, msg: 'シャッター前に届きます' };
  }

  buyStyle(id) {
    const g = this.game;
    const def = DISPLAY_STYLES[id];
    if (!def) return { ok: false, msg: '?' };
    if (this.data.styles.includes(id)) return { ok: false, msg: '購入済み' };
    if (!g.spend(def.price)) return { ok: false, msg: 'お金が足りません' };
    this.data.styles.push(id);
    g.save();
    return { ok: true, msg: `${def.jp} — 展示台を見て R で敷けます` };
  }

  expand() {
    const g = this.game;
    const next = MUSEUM_EXPANSIONS[(this.data.level || 0) + 1];
    if (!next) return { ok: false, msg: '最大です' };
    if (!g.spend(next.price)) return { ok: false, msg: 'お金が足りません' };
    this.data.level++;
    this.build();
    g.player.shake = 0.5;
    audio.play('thud', { v: 1 });
    audio.play('upgrade');
    g.save();
    return { ok: true, msg: `${next.w}m × ${next.d}m に拡張！` };
  }

  surfaceAt() { return 'wood'; }

  groundAt() { return 0; }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    const g = this.game;
    if (!this.data.owned) return;
    const inside = g.player.pos.z < ZN + 0.1 ? 1 : 0;
    this.inside += (inside - this.inside) * Math.min(1, dt * 3);
    this.sun.intensity = 1.4 * this.inside * (1 - g.lighting.dimLevel * 0.8);
    this.sun.castShadow = this.inside > 0.5;
    g.garage.lights.sun.castShadow = this.inside < 0.5;
    g.lighting.museumBlend = this.inside;
    if (audio.ready) audio.setRoom(inside ? 'museum' : 'garage');
    for (const p of this.placed) { p.obj.update?.(dt); p.display?.update(); }
    // held box ghost
    const held = g.held.item;
    if (held?.kind === 'box' && held.data.type === 'decor' && !g.held.busy) {
      const pl = this.placementTarget(held);
      if (pl) this.showGhost(held, pl); else this.hideGhost();
      if (g.input.keyPressed('KeyR')) this.boxSecondary(held);
    } else this.hideGhost();
    // R = change the sheet of the display you're looking at
    if (!held && g.input.keyPressed('KeyR') && g.input.locked && !g.pc?.active) {
      const hits = g.interaction.castAgainst(this.placed.filter((p) => p.display).map((p) => p.obj.group), 3);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.museumEntry) o = o.parent;
        if (o) { this.cycleStyle(o.userData.museumEntry); break; }
      }
    }
    for (const [i, n] of (this.noren || []).entries()) n.rotation.x = Math.sin(g.time * 1.3 + i * 1.7) * 0.05 + (this.doors?.[0]?.open || 0) * 0.25;
    // F = move furniture
    if (!held && g.input.keyPressed('KeyF') && g.input.locked && !g.pc?.active) {
      const hits = g.interaction.castAgainst(this.placed.map((p) => p.obj.group), 3);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.museumEntry) o = o.parent;
        if (o) { this.pickUpPlaced(o.userData.museumEntry); break; }
      }
    }
    // automatic doors
    for (const d of this.doors || []) {
      const want = this.visitors?.nearDoor() || Math.hypot(g.player.pos.x, g.player.pos.z - this.zS) < 2 ? 1 : 0;
      const prev = d.open;
      d.open += (want - d.open) * Math.min(1, dt * 4);
      d.panel.position.x = d.s * (0.5 + d.open * 0.9);
      if (prev < 0.05 && d.open >= 0.05 && d.s > 0) { audio.play('slideDoor', { pos: new THREE.Vector3(0, 1.2, this.zS), vol: 0.8 }); audio.play('furin', { pos: new THREE.Vector3(0, 2.3, this.zS), vol: 0.5 }); }
    }
    this.scoreT -= dt;
    if (this.scoreT <= 0) { this.scoreT = 2; this.recompute(); }
    this.visitors?.update(dt);
  }
}

export async function installMuseum(game) {
  const m = new Museum(game);
  game.museum = m;
  Game.updaters.push((g, dt) => m.update(dt));
  // routes held-box actions to the museum
  const pl = game.placement;
  const prevHint = pl.boxHint.bind(pl);
  pl.boxHint = (it) => (it.data.type === 'decor' ? m.boxHint(it) : prevHint(it));
  const prevSec = pl.boxSecondary.bind(pl);
  pl.boxSecondary = (it) => (it.data.type === 'decor' ? m.boxSecondary(it) : prevSec(it));
  pl.primary = (it) => m.primary(it);
}

export { ZN, WALL_H, CELL };
