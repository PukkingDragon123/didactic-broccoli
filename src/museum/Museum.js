// The collectible museum behind the garage: a decoratable hall with display furniture, decorations,
// paintable floors/walls, visitors who pay for tickets, and a star rating driven by what you exhibit.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { GARAGE } from '../world/Garage.js';
import { tex } from '../gfx/textures.js';
import { pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { audio } from '../core/audio.js';
import { ease, formatYen, hash2 } from '../core/util.js';
import { DisplaySlots } from '../game/Display.js';
import { buildDisplay } from './displays.js';
import { DISPLAYS, FLOORS, WALLS, decorList, decorPrice, THEME_NAMES } from './catalog.js';
import { PROPS, propMesh } from '../world/props.js';
import { MUSEUM_PRICE, MUSEUM_REQ_COMPLETE, MUSEUM_EXPANSIONS, itemValue } from '../game/economy.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import { Visitors } from './Visitors.js';
import { makeBoxMesh } from '../game/Delivery.js';
import { COL, yen } from '../pc/ui.js';

const FLOOR_TEX = { wood: 'woodFloor', concrete: 'concrete', tatami: 'tatami', grass: 'grassFloor', gravel: 'gravel', brick: 'brick', marble: 'marble', carpet: 'carpet', candy: 'candyFloor', water: 'waterFloor', space: 'spaceFloor', night: 'nightFloor' };
const WALL_TEX = { plaster: 'plaster', woodpanel: 'woodPanel', brickwall: 'brick', shoji: 'shoji', bamboo: 'bambooWall', sakura: 'sakuraWall', candystripe: 'candyStripe', sea: 'seaWall', cosmos: 'cosmosWall', neon: 'neonWall', ghostly: 'ghostWall' };
const GLOWY = { space: 0.35, cosmos: 0.4, neon: 0.55, sea: 0.15 };
const SURFACE_SOUND = { grass: 'grass', tatami: 'tatami', wood: 'wood', carpet: 'tatami', night: 'wood', candy: 'wood' };

const ZN = GARAGE.minZ - 0.2; // museum north wall (back of the garage wall)
const WALL_H = 3.6;
const CELL = 0.5;
const ENTRANCE = { x0: -1.0, x1: 1.0, h: 2.4 };
const DOOR = { x0: -GARAGE.doorHalf, x1: GARAGE.doorHalf, h: GARAGE.doorH };

const matCache = new Map();
function surfMat(kind, id) {
  const key = kind + id;
  if (matCache.has(key)) return matCache.get(key);
  const recipe = (kind === 'f' ? FLOOR_TEX : WALL_TEX)[id] || (kind === 'f' ? 'woodFloor' : 'plaster');
  const t = tex(recipe);
  const map = t.map.clone(); map.needsUpdate = true;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / t.size[0], 1 / t.size[1]);
  const bump = t.bump.clone(); bump.needsUpdate = true; bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.copy(map.repeat);
  const m = new THREE.MeshStandardMaterial({
    map, bumpMap: bump, bumpScale: 1.2,
    roughness: id === 'marble' || id === 'water' ? 0.25 : id === 'candy' ? 0.4 : 0.85,
    metalness: 0,
  });
  if (GLOWY[id]) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = map; m.emissiveIntensity = GLOWY[id]; }
  matCache.set(key, m);
  return m;
}

let uidN = 1;

export class Museum {
  constructor(game) {
    this.game = game;
    this.data = game.state.museum;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.placed = [];
    this.score = { total: 0, stars: 0, beauty: 0, exhibits: 0, themes: 0, sets: 0, rate: 0, ticket: 0 };
    this.scoreT = 0;
    this.inside = 0;
    this.ghostCache = new Map();
    this.ghost = null;
    this.paintSel = { f: 0, w: 0 };
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
    this.buildObstacles();
    if (!this.placedBuilt) {
      for (const p of this.data.placed) this.spawnPlaced(p, false);
      this.placedBuilt = true;
    }
    this.openGarageDoor();
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

  floorKey(i, j) { return `${i},${j}`; }
  floorAt(i, j) { return this.data.floor[this.floorKey(i, j)] || 'wood'; }

  buildFloor() {
    const { w, d } = this.dims;
    const byMat = new Map();
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      const id = this.floorAt(i, j);
      if (!byMat.has(id)) byMat.set(id, []);
      byMat.get(id).push([i, j]);
    }
    this.floorMeshes = [];
    for (const [id, cells] of byMat) {
      const pos = [], uv = [], idx = [];
      cells.forEach(([i, j], k) => {
        const x = this.x0 + i, z = ZN - j - 1;
        pos.push(x, 0, z, x + 1, 0, z, x + 1, 0, z + 1, x, 0, z + 1);
        uv.push(x, -z, x + 1, -z, x + 1, -z - 1, x, -z - 1);
        const b = k * 4;
        idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, surfMat('f', id));
      m.receiveShadow = true;
      m.userData.museumFloor = true;
      this.shell.add(m);
      this.floorMeshes.push(m);
      this.game.placement.addSurface(m);
    }
  }

  wallSegments() {
    const { w, d } = this.dims;
    const segs = [];
    // N wall faces +... interior faces -z? The museum lies at z < ZN, so the N wall's interior face looks toward -z.
    for (let i = 0; i < w; i++) segs.push({ side: 'N', i, a: this.x0 + i, b: this.x0 + i + 1, open: DOOR });
    for (let i = 0; i < w; i++) segs.push({ side: 'S', i, a: this.x0 + i, b: this.x0 + i + 1, open: ENTRANCE });
    for (let j = 0; j < d; j++) segs.push({ side: 'W', i: j, a: ZN - j - 1, b: ZN - j });
    for (let j = 0; j < d; j++) segs.push({ side: 'E', i: j, a: ZN - j - 1, b: ZN - j });
    return segs;
  }

  wallAt(side, i) { return this.data.walls[`${side}:${i}`] || 'plaster'; }

  buildWalls() {
    this.wallMeshes = [];
    const byMat = new Map();
    const quad = (list, side, s, e, y0, y1) => {
      if (e - s < 0.001 || y1 - y0 < 0.001) return;
      list.push({ side, s, e, y0, y1 });
    };
    this.wallHit = [];
    for (const seg of this.wallSegments()) {
      const id = this.wallAt(seg.side, seg.i);
      if (!byMat.has(id)) byMat.set(id, []);
      const list = byMat.get(id);
      const o = seg.open;
      if (o && seg.b > o.x0 && seg.a < o.x1) {
        quad(list, seg.side, seg.a, Math.max(seg.a, o.x0), 0, WALL_H);
        quad(list, seg.side, Math.min(seg.b, o.x1), seg.b, 0, WALL_H);
        quad(list, seg.side, Math.max(seg.a, o.x0), Math.min(seg.b, o.x1), o.h, WALL_H);
      } else quad(list, seg.side, seg.a, seg.b, 0, WALL_H);
    }
    const { x0, x1, zS } = this;
    const place = (q) => {
      // returns 4 corners in interior-facing order + uv
      const { side, s, e, y0, y1 } = q;
      if (side === 'N') return [[s, y0, ZN - 0.012], [e, y0, ZN - 0.012], [e, y1, ZN - 0.012], [s, y1, ZN - 0.012], s, e];
      if (side === 'S') return [[e, y0, zS], [s, y0, zS], [s, y1, zS], [e, y1, zS], -e, -s];
      if (side === 'W') return [[x0, y0, e], [x0, y0, s], [x0, y1, s], [x0, y1, e], -e, -s];
      return [[x1, y0, s], [x1, y0, e], [x1, y1, e], [x1, y1, s], s, e];
    };
    for (const [id, list] of byMat) {
      const pos = [], uv = [], idx = [];
      list.forEach((q, k) => {
        const [a, b, c, dd, u0, u1] = place(q);
        pos.push(...a, ...b, ...c, ...dd);
        uv.push(u0, q.y0, u1, q.y0, u1, q.y1, u0, q.y1);
        const B = k * 4;
        idx.push(B, B + 1, B + 2, B, B + 2, B + 3);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, surfMat('w', id));
      m.receiveShadow = true;
      m.userData.wallSurf = true;
      this.shell.add(m);
      this.wallMeshes.push(m);
    }
  }

  buildWallShell() {
    const { x0, x1, zS } = this;
    // physics floor
    this.colliders.push(this.game.physics.addBox({ center: new THREE.Vector3(0, -0.1, (ZN + zS) / 2), half: new THREE.Vector3((x1 - x0) / 2, 0.1, (ZN - zS) / 2), material: 'wood' }));
    // outer shell & thickness (plain), baseboards and crown moulding
    const outer = colMat(0x8a8478, { roughness: 0.95 });
    const T = 0.2;
    const W = x1 - x0;
    const D = ZN - zS;
    const ob = (w, h, d, x, y, z) => { const m = boxMesh(w, h, d, outer, { cast: true, receive: false }); m.position.set(x, y + h / 2, z); this.shell.add(m); return m; };
    // south wall shell with the entrance opening
    const eL = ENTRANCE.x0 - (x0 - T), eR = (x1 + T) - ENTRANCE.x1;
    ob(eL, WALL_H, T, x0 - T + eL / 2, 0, zS - T / 2 - 0.001);
    ob(eR, WALL_H, T, ENTRANCE.x1 + eR / 2, 0, zS - T / 2 - 0.001);
    ob(ENTRANCE.x1 - ENTRANCE.x0, WALL_H - ENTRANCE.h, T, 0, ENTRANCE.h, zS - T / 2 - 0.001);
    ob(T, WALL_H, D + T, x0 - T / 2 - 0.001, 0, (ZN + zS) / 2);
    ob(T, WALL_H, D + T, x1 + T / 2 + 0.001, 0, (ZN + zS) / 2);
    // close the north wall where the museum is wider than the garage
    const gW = 4.2;
    if (x0 < -gW) { ob(-gW - x0, WALL_H, T, (x0 - gW) / 2, 0, ZN + T / 2); ob(x1 - gW, WALL_H, T, (x1 + gW) / 2, 0, ZN + T / 2); }
    // re-face the entrance gap edges: cut the S outer shell (simple: an invisible collider-only opening)
    const base = pixMat('woodDark', { roughness: 0.6 });
    const bb = (w, d, x, z) => { const m = boxMesh(w, 0.1, d, base, { cast: false }); m.position.set(x, 0.05, z); this.shell.add(m); };
    bb(W, 0.03, 0, ZN - 0.015); bb(W, 0.03, 0, zS + 0.015);
    bb(0.03, D, x0 + 0.015, (ZN + zS) / 2); bb(0.03, D, x1 - 0.015, (ZN + zS) / 2);
    const crown = colMat(0xf2ece0, { roughness: 0.6 });
    const cr = (w, d, x, z) => { const m = boxMesh(w, 0.12, d, crown, { cast: false }); m.position.set(x, WALL_H - 0.06, z); this.shell.add(m); };
    cr(W, 0.05, 0, ZN - 0.025); cr(W, 0.05, 0, zS + 0.025); cr(0.05, D, x0 + 0.025, (ZN + zS) / 2); cr(0.05, D, x1 - 0.025, (ZN + zS) / 2);
    // physics walls
    const pw = (cx, cz, hx, hz) => this.colliders.push(this.game.physics.addBox({ center: new THREE.Vector3(cx, WALL_H / 2, cz), half: new THREE.Vector3(hx, WALL_H / 2, hz), material: 'concrete' }));
    pw(0, zS - 0.1, W / 2, 0.1); pw(x0 - 0.1, (ZN + zS) / 2, 0.1, D / 2); pw(x1 + 0.1, (ZN + zS) / 2, 0.1, D / 2);
  }

  buildCeilingAndLights() {
    const { x0, x1, zS } = this;
    const W = x1 - x0, D = ZN - zS;
    const ceilMat = pixMat('plaster', { roughness: 0.95, color: 0xffffff }).clone();
    ceilMat.emissive = new THREE.Color(0x6a6258);
    ceilMat.emissiveMap = ceilMat.map;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, WALL_H, (ZN + zS) / 2);
    this.shell.add(ceil);
    // light panels + point lights
    const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e8).multiplyScalar(1.7) });
    const nx = Math.max(2, Math.round(W / 5)), nz = Math.max(2, Math.round(D / 5));
    this.lights = [];
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const x = x0 + (W / nx) * (a + 0.5), z = ZN - (D / nz) * (b + 0.5);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), panelMat);
      p.rotation.x = Math.PI / 2; p.position.set(x, WALL_H - 0.01, z);
      this.shell.add(p);
      if (this.lights.length < 6) {
        const l = new THREE.PointLight(0xfff0dc, 5.5, 9, 1.4);
        l.position.set(x, WALL_H - 0.4, z);
        this.shell.add(l);
        this.lights.push(l);
      }
    }
    // skylight sun (shadows) — only active while the player is inside
    if (!this.sun) {
      this.sun = new THREE.DirectionalLight(0xfff2e0, 0);
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

  buildEntrance() {
    const zS = this.zS;
    const g = new THREE.Group();
    this.shell.add(g);
    const frameM = colMat(0x5a6068, { metalness: 0.7, roughness: 0.35 });
    const fb = (w, h, d, x, y, z) => { const m = boxMesh(w, h, d, frameM); m.position.set(x, y + h / 2, z); g.add(m); };
    fb(0.08, ENTRANCE.h, 0.15, ENTRANCE.x0 - 0.04, 0, zS);
    fb(0.08, ENTRANCE.h, 0.15, ENTRANCE.x1 + 0.04, 0, zS);
    fb(ENTRANCE.x1 - ENTRANCE.x0 + 0.16, 0.1, 0.15, 0, ENTRANCE.h, zS);
    // sliding glass doors
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.18, roughness: 0.04, clearcoat: 1, depthWrite: false, envMapIntensity: 2, side: THREE.DoubleSide });
    this.doors = [];
    for (const s of [-1, 1]) {
      const panel = new THREE.Group();
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, ENTRANCE.h - 0.05), gm);
      gl.position.y = ENTRANCE.h / 2;
      gl.renderOrder = 3;
      panel.add(gl);
      const edge = boxMesh(0.04, ENTRANCE.h - 0.05, 0.05, frameM); edge.position.set(-s * 0.48, ENTRANCE.h / 2, 0); panel.add(edge);
      // "自動ドア" sticker
      const st = new Pix(48, 16, 1); st.fill(0x2f6fd6); st.text('自動ドア', 24, 1, { size: 12, color: 0xffffff, align: 'center' });
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.06), new THREE.MeshBasicMaterial({ map: st.texture(), side: THREE.DoubleSide }));
      sm.position.set(0, 1.2, 0.005); panel.add(sm);
      panel.position.set(s * 0.5, 0, zS);
      g.add(panel);
      this.doors.push({ panel, s, open: 0 });
    }
    // welcome mat
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), colMat(0x8a2a2a, { roughness: 1 }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.004, zS + 0.6);
    g.add(mat);
    // outside plaza
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), pixMat('brick', { roughness: 0.9, color: 0xc8b8a8 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, -0.01, zS - 4);
    plaza.receiveShadow = true;
    g.add(plaza);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshBasicMaterial({ color: 0xffb88a, fog: false }));
    sky.position.set(0, 6, zS - 12);
    g.add(sky);
    for (let i = 0; i < 9; i++) {
      const tr = propMesh(i % 3 === 0 ? 'sakura_tree' : 'pine_tree', { fallbackSize: [1.6, 3, 1.6], fallbackColor: 0x4a8a4a });
      tr.position.set(-10 + i * 2.5 + hash2(i, 1), 0, zS - 6 - hash2(i, 2) * 2);
      tr.scale.setScalar(0.8 + hash2(i, 3) * 0.4);
      g.add(tr);
    }
    const sunOut = new THREE.PointLight(0xffc890, 3, 10, 1.5);
    sunOut.position.set(0, 3, zS - 3);
    g.add(sunOut);
    // museum name board + star rating above the doors (inside)
    const p = new Pix(160, 40, 2);
    p.fill(0x3a2a1c); p.frame(1, 1, 158, 38, 0xd4a83a);
    p.text('ガチャ博物館', 80, 3, { size: 18, color: 0xf3e9d2, align: 'center' });
    p.text('GACHA MUSEUM', 80, 25, { size: 9, color: 0xd4a83a, align: 'center', font: FONT_EN });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.6 }));
    board.rotation.y = 0;
    board.position.set(0, ENTRANCE.h + 0.45, zS + 0.03);
    g.add(board);
    this.starMeshes = [];
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.035 : 0.08; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y); }
    const sg = new THREE.ExtrudeGeometry(starShape, { depth: 0.015, bevelEnabled: false });
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0x5a4a3a, metalness: 0.6, roughness: 0.4 }));
      st.position.set(-0.44 + i * 0.22, ENTRANCE.h + 0.85, zS + 0.03);
      g.add(st);
      this.starMeshes.push(st);
    }
    // visitor counter LED
    this.counterCanvas = new Pix(64, 16, 3);
    this.counterTex = this.counterCanvas.texture();
    const cnt = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.12), new THREE.MeshBasicMaterial({ map: this.counterTex }));
    cnt.position.set(1.7, 2.0, zS + 0.03);
    g.add(cnt);
    this.updateCounterTex();
  }

  updateCounterTex() {
    if (!this.counterCanvas) return;
    const p = this.counterCanvas;
    p.fill(0x111111);
    p.text(String(this.data.visitors || 0).padStart(6, '0'), 32, 1, { size: 13, color: 0xff6040, align: 'center', font: FONT_EN });
    this.counterTex.needsUpdate = true;
  }

  buildCounter() {
    const zS = this.zS;
    const g = new THREE.Group();
    g.position.set(2.1, 0, zS + 1.3);
    this.shell.add(g);
    const wood = pixMat('woodLight', { roughness: 0.55 });
    const top = boxMesh(1.6, 0.05, 0.6, wood); top.position.set(0, 1.0, 0); g.add(top);
    const front = boxMesh(1.6, 0.98, 0.04, pixMat('woodDark')); front.position.set(0, 0.49, 0.28); g.add(front);
    const sideA = boxMesh(0.04, 0.98, 0.56, pixMat('woodDark')); sideA.position.set(-0.78, 0.49, 0); g.add(sideA);
    const reg = propMesh('cash_register', { fallbackSize: [0.3, 0.2, 0.25], fallbackColor: 0x3a3a3a });
    reg.position.set(0.4, 1.025, -0.05); reg.rotation.y = Math.PI; g.add(reg);
    // 受付 sign + ticket price card
    const p = new Pix(80, 40, 4); p.fill(0xffffff); p.frame(0, 0, 80, 40, 0xe5383b);
    p.text('受付', 40, 2, { size: 16, color: 0xe5383b, align: 'center' });
    p.text('RECEPTION', 40, 22, { size: 9, color: 0x333333, align: 'center', font: FONT_EN });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ map: p.texture(), side: THREE.DoubleSide }));
    sign.position.set(-0.3, 1.2, 0.05); sign.rotation.y = Math.PI; g.add(sign);
    this.ticketPix = new Pix(64, 32, 5);
    this.ticketTex = this.ticketPix.texture();
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ map: this.ticketTex, side: THREE.DoubleSide }));
    tk.position.set(-0.3, 1.04, 0.3); tk.rotation.set(-0.3, Math.PI, 0); g.add(tk);
    // donation box
    const don = boxMesh(0.2, 0.22, 0.16, colMat(0xffffff, { roughness: 0.3 }));
    don.position.set(-0.62, 1.135, 0.1); g.add(don);
    const dp = new Pix(32, 16, 6); dp.fill(0xffffff); dp.text('募金', 16, 1, { size: 12, color: 0xe5383b, align: 'center' });
    const dl = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.09), new THREE.MeshBasicMaterial({ map: dp.texture() }));
    dl.position.set(-0.62, 1.14, 0.181); dl.rotation.y = 0; g.add(dl);
    this.counter = g;
    this.ticketPoint = new THREE.Vector3(1.2, 0, zS + 1.3);
    this.donationPoint = new THREE.Vector3(1.3, 0, zS + 1.6);
    this.updateTicketTex();
    this.obstacles.push(this.game.player.addObstacle(2.1 - 0.82, 2.1 + 0.82, zS + 1.0, zS + 1.6));
  }

  updateTicketTex() {
    if (!this.ticketPix) return;
    const p = this.ticketPix;
    p.fill(0xfff6d8); p.frame(0, 0, 64, 32, 0xd4a83a);
    p.text('入館料', 32, 1, { size: 11, color: 0x333333, align: 'center' });
    p.text(`${this.score.ticket || 40}円`, 32, 15, { size: 13, color: 0xe5383b, align: 'center' });
    this.ticketTex.needsUpdate = true;
  }

  buildObstacles() {
    const P = this.game.player;
    const { x0, x1, zS } = this;
    const o = (a, b, c, d) => this.obstacles.push(P.addObstacle(a, b, c, d));
    o(x0 - 0.3, x0, zS - 0.3, ZN + 0.1);
    o(x1, x1 + 0.3, zS - 0.3, ZN + 0.1);
    o(x0 - 0.3, x1 + 0.3, zS - 0.3, zS);
    // garage back wall outside the garage footprint (museum wider than the garage)
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
    if (x > 1.0 && x < 3.1 && z < this.zS + 2.0) return true; // reception
    return false;
  }

  occupied(ignoreUid = null) {
    const occ = new Set();
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
  makeObject(kind, id) {
    if (kind === 'display') return buildDisplay(id);
    const m = propMesh(id, { fallbackSize: [0.8, 1, 0.8] });
    const g = new THREE.Group(); g.add(m);
    const p = PROPS[id];
    let light = null;
    if (p?.light) {
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
    const entry = { data, def, obj, display: null };
    if (obj.slots.length) {
      if (!data.items || data.items.length !== obj.slots.length) data.items = Array(obj.slots.length).fill(null);
      entry.display = new DisplaySlots(this.game, obj.owner || obj.group, obj.slots, data.items, { glass: true, shadows: false });
    }
    // furniture root is interactable for "move" (F) hints
    obj.group.userData.museumEntry = entry;
    this.game.interaction.add(obj.group, {
      hint: (held) => (held ? null : { key: 'F', text: `${def.jp || def.name} · Move`, sub: entry.display ? `${entry.display.keys().length}/${obj.slots.length} on display` : (def.themes || []).map((t) => THEME_NAMES[t]?.[1]).join(' · ') }),
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

  // ------------------------------------------------------------------ held box / roller behaviour
  boxHint(it) {
    const d = it.data;
    if (d.type === 'roller') {
      const t = this.paintTarget();
      if (!t) return { key: 'L', text: 'リフォームローラー · Aim at a museum floor or wall', sub: 'Scroll to change finish · Q to put down' };
      const list = t.kind === 'f' ? this.data.materials.filter((m) => FLOORS[m]) : this.data.materials.filter((m) => WALLS[m]);
      const id = list[this.paintSel[t.kind] % list.length];
      const def = (t.kind === 'f' ? FLOORS : WALLS)[id];
      return { key: 'L', text: `塗る · Apply ${def?.jp || id}`, sub: `${def?.name || ''} — scroll to change (${list.length} owned)` };
    }
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
    if (d.type === 'roller') { this.paint(); return; }
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
        const o = this.makeObject(it.data.kind, it.data.id);
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

  // ------------------------------------------------------------------ painting
  paintTarget() {
    if (!this.data.owned) return null;
    const hits = this.game.interaction.castAgainst([...this.floorMeshes, ...this.wallMeshes], 5);
    for (const h of hits) {
      if (h.object.userData.museumFloor) {
        const i = Math.floor(h.point.x - this.x0), j = Math.floor(ZN - h.point.z);
        if (i < 0 || j < 0 || i >= this.dims.w || j >= this.dims.d) return null;
        return { kind: 'f', i, j, point: h.point };
      }
      const n = h.face?.normal.clone().transformDirection(h.object.matrixWorld);
      if (!n || Math.abs(n.y) > 0.5) continue;
      const p = h.point;
      let side, idx;
      if (Math.abs(p.z - ZN) < 0.05) { side = 'N'; idx = Math.floor(p.x - this.x0); }
      else if (Math.abs(p.z - this.zS) < 0.05) { side = 'S'; idx = Math.floor(p.x - this.x0); }
      else if (Math.abs(p.x - this.x0) < 0.05) { side = 'W'; idx = Math.floor(ZN - p.z); }
      else if (Math.abs(p.x - this.x1) < 0.05) { side = 'E'; idx = Math.floor(ZN - p.z); }
      else continue;
      return { kind: 'w', side, i: idx, point: p };
    }
    return null;
  }

  paint() {
    const t = this.paintTarget();
    if (!t) return;
    const list = t.kind === 'f' ? this.data.materials.filter((m) => FLOORS[m]) : this.data.materials.filter((m) => WALLS[m]);
    if (!list.length) return;
    const id = list[this.paintSel[t.kind] % list.length];
    if (t.kind === 'f') {
      if (this.floorAt(t.i, t.j) === id) return;
      this.data.floor[this.floorKey(t.i, t.j)] = id;
    } else {
      if (this.wallAt(t.side, t.i) === id) return;
      this.data.walls[`${t.side}:${t.i}`] = id;
    }
    audio.play('paint', { pos: t.point, vol: 0.8 });
    this.game.effects.sparks({ pos: t.point.clone().add(new THREE.Vector3(0, 0.05, 0)), count: 14, colors: [0xffffff, 0xfff0c0], speed: 0.4, size: 0.015 });
    this.rebuildSurfaces();
    this.recompute();
  }

  rebuildSurfaces() {
    for (const m of [...this.floorMeshes, ...this.wallMeshes]) {
      this.shell.remove(m); m.geometry.dispose();
      const i = this.game.placement.surfaces.indexOf(m); if (i >= 0) this.game.placement.surfaces.splice(i, 1);
    }
    this.buildFloor();
    this.buildWalls();
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
    // floors & walls add theme sources (sampled per cell) and beauty for variety
    const floorCount = {};
    for (const [k, id] of Object.entries(this.data.floor)) {
      floorCount[id] = (floorCount[id] || 0) + 1;
      const [i, j] = k.split(',').map(Number);
      themeSources.push({ x: this.x0 + i + 0.5, z: ZN - j - 0.5, themes: FLOORS[id]?.themes || [], w: 0.15 });
    }
    const variety = Object.keys(floorCount).length + new Set(Object.values(this.data.walls)).size;
    beauty += variety * 1.5;
    const museumKeys = new Set();
    for (const p of this.placed) {
      if (!p.display) continue;
      const mult = p.def.spotlight ? 2 : 1;
      for (const it of p.display.items) {
        if (!it) continue;
        const item = getItem(it.k);
        if (!item) continue;
        museumKeys.add(it.k);
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
    for (const se of Object.values(SERIES_BY_ID)) if (se.items.every((it) => museumKeys.has(it.key))) sets += 250 + se.price;
    const beautyScore = 30 * Math.sqrt(beauty);
    const total = Math.round(exhibits + themes + beautyScore + sets);
    const TH = [0, 250, 800, 2000, 4500, 9000];
    let stars = 0; for (let i = 0; i < TH.length; i++) if (total >= TH[i]) stars = i;
    const rate = Math.min(24, 0.6 + total / 220); // visitors per minute
    const ticket = 40 + stars * 40;
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
      ui.text('★ ショーケース・装飾・床や壁を自由にカスタマイズ', x + 16, yy + 80, { size: 11 });
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
    const tabs = [['displays', '展示台'], ['decor', '装飾'], ['surfaces', '床・壁'], ['expand', '拡張'], ['stats', '評価']];
    let tx = x;
    for (const [id, jp] of tabs) {
      const on = site.sub.museum === id;
      const hov = ui.hit(tx, yy, 94, 22, () => { site.sub.museum = id; site.scroll.museum = 0; audio.play('uiClick', { vol: 0.5 }); });
      ui.rect(tx, yy, 94, 22, on ? '#6a2a9a' : hov ? '#e8d8f8' : '#f0e8f8');
      ui.text(jp, tx + 47, yy + 4, { size: 12, color: on ? '#fff' : COL.ink, align: 'center' });
      tx += 98;
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
    } else if (sub === 'surfaces') {
      ui.text('購入すると「リフォームローラー」で床や壁を塗れます。ホイールで仕上げを切替。', x + 4, yy, { size: 10, color: COL.soft });
      yy += 16;
      const block = (title, lib, kind) => {
        yy += site.heading(x, yy, w, title, kind === 'f' ? 'FLOORS' : 'WALLS', kind === 'f' ? COL.green : COL.blue);
        const cw = Math.floor((w - 12) / 4);
        Object.values(lib).forEach((m, i) => {
          const cx = x + (i % 4) * (cw + 4), cy = yy + Math.floor(i / 4) * 92;
          site.panel(cx, cy, cw, 86);
          const pix = tex((kind === 'f' ? FLOOR_TEX : WALL_TEX)[m.id]).map.image;
          ui.image(pix, cx + 4, cy + 4, cw - 8, 34);
          ui.text(m.jp, cx + cw / 2, cy + 42, { size: 10, align: 'center' });
          ui.text(m.themes.map((t) => THEME_NAMES[t][0]).join('・'), cx + cw / 2, cy + 55, { size: 8, color: COL.blue, align: 'center', max: cw - 6 });
          const own = this.data.materials.includes(m.id);
          if (own) ui.text('購入済み ✓', cx + cw / 2, cy + 68, { size: 10, color: COL.green, align: 'center' });
          else ui.button(yen(m.price), cx + 6, cy + 66, cw - 12, 17, () => site.notify(this.buyMaterial(m.id)), { size: 10, disabled: s.money < m.price });
        });
        yy += Math.ceil(Object.keys(lib).length / 4) * 92 + 6;
      };
      block('床材', FLOORS, 'f');
      block('壁紙', WALLS, 'w');
      if (!this.data.roller) {
        ui.button('リフォームローラーを受け取る（無料）', x, yy, 260, 24, () => site.notify(this.giveRoller()), { color: COL.yellow });
        yy += 30;
      }
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
      ui.text('ヒント：シリーズのテーマ（かわいい・食べ物・宇宙…）と同じ雰囲気の床や装飾の近くに飾ると評価UP！', x + 4, yy, { size: 10, color: COL.soft, max: w - 8 });
      yy += 16;
      ui.text('スポットライト台はレア物の魅力が2倍。シリーズを博物館に全種並べるとセットボーナス。', x + 4, yy, { size: 10, color: COL.soft, max: w - 8 });
      yy += 20;
    }
    return yy - y;
  }

  displayPreview(id) { return buildDisplay(id).group; }

  // ------------------------------------------------------------------ purchases
  buyMuseum() {
    const g = this.game;
    if (this.data.owned) return { ok: false, msg: '購入済み' };
    if (Object.keys(g.state.completed).length < MUSEUM_REQ_COMPLETE) return { ok: false, msg: 'シリーズをコンプリートしてね' };
    if (!g.spend(MUSEUM_PRICE)) return { ok: false, msg: 'お金が足りません' };
    this.data.owned = true;
    this.data.level = 0;
    this.build();
    audio.play('thud', { pos: new THREE.Vector3(0, 1, -5), v: 1 });
    audio.play('complete', { vol: 0.8 });
    g.news('🏛 ガチャ博物館オープン！', 'Your museum is open — the back door is unlocked!', 6000);
    this.giveRoller();
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

  buyMaterial(id) {
    const g = this.game;
    const def = FLOORS[id] || WALLS[id];
    if (this.data.materials.includes(id)) return { ok: false, msg: '購入済み' };
    if (!g.spend(def.price)) return { ok: false, msg: 'お金が足りません' };
    this.data.materials.push(id);
    if (!this.data.roller) this.giveRoller();
    g.save();
    return { ok: true, msg: `${def.jp} — ローラーで塗れます` };
  }

  giveRoller() {
    if (this.data.roller) return { ok: false, msg: '受け取り済み' };
    this.data.roller = true;
    this.game.delivery.order({ type: 'roller', label: 'リフォームローラー' }, { delay: 1 });
    return { ok: true, msg: 'ローラーをお届けします' };
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

  surfaceAt(p) {
    if (!this.data.owned) return 'wood';
    const i = Math.floor(p.x - this.x0), j = Math.floor(ZN - p.z);
    return SURFACE_SOUND[this.floorAt(i, j)] || 'concrete';
  }

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
    // held box ghost / roller highlight
    const held = g.held.item;
    if (held?.kind === 'box' && held.data.type === 'decor' && !g.held.busy) {
      const pl = this.placementTarget(held);
      if (pl) this.showGhost(held, pl); else this.hideGhost();
      if (g.input.keyPressed('KeyR')) this.boxSecondary(held);
    } else this.hideGhost();
    if (held?.kind === 'box' && held.data.type === 'roller') {
      if (g.input.mouse.wheel || g.input.keyPressed('KeyR')) {
        const t = this.paintTarget();
        const k = t?.kind || 'f';
        this.paintSel[k] = (this.paintSel[k] + (g.input.mouse.wheel < 0 ? -1 : 1) + 100) % 100;
        audio.play('uiHover', { vol: 0.6 });
      }
    }
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
      d.panel.position.x = d.s * (0.5 + d.open * 0.95);
      if (prev < 0.05 && d.open >= 0.05 && d.s > 0) audio.play('chimeEntrance', { pos: new THREE.Vector3(0, 2.2, this.zS), vol: 0.5 });
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
  pl.boxHint = (it) => (it.data.type === 'decor' || it.data.type === 'roller' ? m.boxHint(it) : prevHint(it));
  const prevSec = pl.boxSecondary.bind(pl);
  pl.boxSecondary = (it) => (it.data.type === 'decor' || it.data.type === 'roller' ? m.boxSecondary(it) : prevSec(it));
  pl.primary = (it) => m.primary(it);
}

export { ZN, WALL_H, CELL };
