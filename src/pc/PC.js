// The garage PC: the beige desk hardware (voxel CRT, keyboard, mouse, tower, speakers), and sitting down at it.
// Click it and you pull up to the desk: the first-person camera lowers onto the chair and eases in until the
// monitor fills most of the view. No pop-up: the Capsule 98 desktop (src/os/OS.js) is a DOM layer warped onto the
// 3D screen quad every frame (a projective matrix3d while the camera moves, a pixel-exact 2D scale once settled,
// so pixel fonts stay crisp). Esc or the taskbar's power button stands you up again.
// While you're away the screen shows a small canvas (src/pc/idle.js) and the DOM layer is hidden (costs nothing).
import * as THREE from 'three';
import { VoxelModel, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { hash2 } from '../core/util.js';
import { Game } from '../game/Game.js';
import { ShopUI } from '../ui/ShopUI.js';
import { placeOpenerTool, placeCharms } from '../game/shop.js';
import { CapsuleOS } from '../os/OS.js';
import { installApps } from '../os/apps/index.js';
import { IdleScreen, IW, IH } from './idle.js';

const BEIGE = 0xe6dcc4, BEIGE_D = 0xcfc3a6, BEIGE_Y = 0xd9c99c, DARK = 0x4a453c;
const SW = 0.32, SH = 0.24; // screen (4:3), metres
const SCREEN_Y = 0.22, SCREEN_Z = 0.1705; // in the monitor's frame
const SEAT_FOV = 50;

// ------------------------------------------------------------------ hardware models (voxel size 0.01, origin none)
function monitorModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(-11, 0, -9, 10, 1, 8, BEIGE_D); // foot
  v.box(-5, 2, -5, 4, 4, 3, BEIGE_D); // swivel
  v.box(-20, 5, 6, 19, 37, 17, BEIGE); // front shell: 40 x 33 cm
  v.box(-17, 8, -5, 16, 35, 5, BEIGE_D); // tube housing, tapering back
  v.box(-13, 12, -13, 12, 31, -6, BEIGE_D);
  v.box(-9, 16, -18, 8, 27, -14, BEIGE_D);
  v.paint(() => { for (let y = 15; y < 32; y += 3) v.box(-10, y, -13, 9, y, -13, 0x9a8f78); }); // vents
  v.box(-17, 9, 17, 16, 34, 17, DARK); // inner bezel ring
  v.box(-16, 10, 17, 15, 33, 17, null); // the screen opening (32 x 24)
  v.paint(() => { for (let x = -20; x <= 19; x++) for (let y = 5; y <= 37; y++) if (hash2(x, y) < 0.05) v.set(x, y, 17, BEIGE_Y); });
  v.box(-20, 5, 18, 19, 5, 18, BEIGE_D); // chin lip
  // badge: the four-colour capsule logo + a dark name plate
  v.set(-16, 7, 18, 0xe5383b); v.set(-15, 7, 18, 0xffd23f); v.set(-14, 7, 18, 0x58c06c); v.set(-13, 7, 18, 0x3f86e8);
  v.box(-12, 7, 18, -7, 7, 18, 0x8a8070);
  // knobs + power button
  v.box(4, 6, 18, 5, 7, 18, 0xbfb398); v.box(7, 6, 18, 8, 7, 18, 0xbfb398);
  v.box(13, 6, 18, 16, 8, 18, BEIGE_D);
  // sticky notes on the bezel + a capsule toy sitting on top
  v.box(16, 27, 18, 19, 31, 18, 0xffe866); v.box(-20, 31, 18, -17, 35, 18, 0xff9fd0);
  v.ellipsoid(10, 40, 10, 2.2, 2.2, 2.2, 0xfbf6ea); v.box(8, 37, 8, 12, 39, 12, 0xff6f91); v.box(8, 38, 8, 12, 38, 12, 0x9a9aa8);
  return v;
}

function keyboardModel() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  v.box(-36, 0, -11, 35, 2, 10, BEIGE);
  v.box(-36, 3, -11, 35, 3, -9, BEIGE_D);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 15; c++) {
      const x0 = -34 + c * 4 + (r % 2), z0 = -8 + r * 4;
      if (r === 4 && c > 3 && c < 11) continue;
      v.box(x0, 3, z0, x0 + 2, 3, z0 + 2, (c + r) % 7 === 0 ? 0xbfb398 : 0xf2ead6);
    }
  }
  v.box(-18, 3, 8, 13, 3, 10, 0xf2ead6);
  v.box(26, 3, -8, 33, 3, 10, 0xd8ccb0);
  return v;
}

function towerModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(-9, 0, -20, 9, 40, 20, BEIGE);
  v.box(-7, 30, 21, 7, 32, 21, 0x3a3630);
  v.box(-7, 25, 21, 7, 27, 21, 0x5a5448);
  v.box(-2, 12, 21, 1, 15, 21, BEIGE_D);
  v.project(['KKKK', 'K..K', 'KKKK'], { K: 0x9a8f78 }, -6, 6);
  v.paint(() => { for (let y = 2; y < 8; y += 2) v.box(-7, y, 20, 7, y, 20, 0xbfb398); });
  return v;
}

function mouseModel() {
  const v = new VoxelModel();
  v.ellipsoid(0, 2, 0, 4, 2.5, 6, BEIGE);
  v.box(-4, -1, -6, 4, -1, 6, null);
  v.box(0, 3, -6, 0, 4, -1, 0x9a8f78);
  return v;
}

function speakerModel() {
  const v = new VoxelModel();
  v.box(-6, 0, -6, 5, 18, 5, 0x3a3630);
  v.cylinder(0, 6, 6, 4, 1, 0x1a1816, 'z');
  v.cylinder(0, 14, 6, 2, 1, metal(0x888888), 'z');
  return v;
}

const crtShader = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uTime: { value: 0 }, uOn: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D map; uniform float uTime, uOn; varying vec2 vUv;
    void main(){
      vec2 c = vUv*2.0-1.0;
      vec2 uv = c * (1.0 + dot(c,c)*0.03) * 0.5 + 0.5;
      float edge = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      vec3 col = texture2D(map, uv).rgb * edge;
      col *= 0.92 + 0.08 * step(0.5, fract(uv.y * ${IH}.0));
      col *= smoothstep(1.5, 0.6, length(c * vec2(0.92, 1.0)));
      col *= 0.97 + 0.03 * sin(uv.y * 3.0 - uTime * 2.0);
      col = col * uOn + vec3(0.010, 0.012, 0.014);
      gl_FragColor = vec4(col, 1.0);
    }`,
});

// ------------------------------------------------------------------ projective maths for the DOM layer
/** 3x3 homography (row-major) taking the rect (0,0)-(w,h) to the quad [tl, tr, br, bl]. */
function rectToQuad(w, h, q) {
  const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, k = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    k = (dx1 * sy - sx * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return [a / w, b / h, x0, d / w, e / h, y0, g / w, k / h, 1];
}
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const s = 1 / det;
  return [A * s, -(b * i - c * h) * s, (b * f - c * e) * s, B * s, (a * i - c * g) * s, -(a * f - c * d) * s, C * s, -(a * h - b * g) * s, (a * e - b * d) * s];
}
const css3 = (m) => `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,${m[8]})`;

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const seg = (t, a, b) => ease((t - a) / (b - a));

export async function installPC(game) {
  const D = game.garage.pcDesk;
  const root = new THREE.Group();
  root.position.set(D.x + 0.08, D.h, D.z + 0.05);
  root.rotation.y = -Math.PI / 2;
  game.scene.add(root);
  const mats = voxelMaterials('normal');
  const mk = (model, vs, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(meshVoxels(model, { voxelSize: vs, origin: vs === 0.01 ? 'none' : undefined }), mats);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const monitor = mk(monitorModel(), 0.01, 0, 0, -0.06);
  mk(keyboardModel(), 0.006, 0, 0, 0.3);
  const mouse = mk(mouseModel(), 0.006, 0.3, 0, 0.32, 0.2);
  const mouseHome = mouse.position.clone();
  mk(towerModel(), 0.01, -0.56, 0, -0.08);
  mk(speakerModel(), 0.01, 0.36, 0, 0.0, -0.2);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.17), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.9 }));
  pad.position.set(0.3, 0.002, 0.32);
  root.add(pad);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.5 }));
  mug.position.set(-0.3, 0.045, 0.3);
  mug.castShadow = true;
  root.add(mug);
  const disk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.094), new THREE.MeshStandardMaterial({ color: 0x2a3a78, roughness: 0.6 }));
  disk.position.set(-0.2, 0.002, 0.42); disk.rotation.y = 0.3;
  root.add(disk);
  // power LED: green when on, amber on standby
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.004), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
  led.position.set(0.105, 0.075, -0.06 + 0.19);
  root.add(led);

  // ---- the CRT: a flat plane in the screen opening (the DOM layer is warped exactly onto it)
  const os = new CapsuleOS(game);
  game.os = os;
  const idle = new IdleScreen(os);
  const tex = new THREE.CanvasTexture(idle.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const screenMat = crtShader(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
  screen.position.set(0, SCREEN_Y, -0.06 + SCREEN_Z);
  screen.userData.noRim = true;
  root.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.08, depthWrite: false }));
  glass.position.copy(screen.position).add(new THREE.Vector3(0, 0, 0.002));
  glass.userData.noRim = true;
  root.add(glass);
  const screenLight = new THREE.PointLight(0xbfd8ff, 0.0, 2.2, 1.6);
  screenLight.position.set(0, 0.2, 0.45);
  root.add(screenLight);

  installApps(game, os);
  const ui = new ShopUI(game); // MIKAWA-YA's overlay (the web store itself now lives in the browser)
  game.shopUI = ui;

  // a click-to-continue catcher, in case the browser refuses to re-lock the pointer when you stand up
  const resume = document.createElement('button');
  resume.className = 'sui-resume hidden';
  resume.innerHTML = '<span>Click to continue</span>';
  resume.addEventListener('click', () => { resume.classList.add('hidden'); game.input.lock(); });
  document.body.appendChild(resume);
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) resume.classList.add('hidden'); });

  // ---- geometry of the sit-down
  const V = () => new THREE.Vector3();
  const frame = () => {
    root.updateWorldMatrix(true, true);
    const c = screen.getWorldPosition(V());
    const q = screen.getWorldQuaternion(new THREE.Quaternion());
    return { c, q, n: V().set(0, 0, 1).applyQuaternion(q), up: V().set(0, 1, 0).applyQuaternion(q) };
  };
  /** Logical resolution + zoom so the settled screen is an integer number of device pixels per OS pixel. */
  const layout = () => {
    const dpr = window.devicePixelRatio || 1;
    const targetCss = Math.min(innerHeight * 0.8, innerWidth * 0.94 * 0.75);
    const dev = targetCss * dpr;
    const k = Math.max(1, Math.round(dev / 760));
    let Lh = Math.floor(dev / k), zoom = k / dpr;
    if (Lh < 480) { Lh = 480; zoom = dev / 480 / dpr; } // a small window: scale a 640x480 desktop down
    const Lw = Math.round(Lh * 4 / 3);
    return { Lw, Lh, zoom, hCss: Lh * zoom };
  };
  const poses = () => {
    const { c, q, n } = frame();
    const L = layout();
    const d = SH * innerHeight / (2 * L.hCss * Math.tan(THREE.MathUtils.degToRad(SEAT_FOV / 2)));
    const zoomP = c.clone().addScaledVector(n, d);
    const seatP = c.clone().addScaledVector(n, 0.6); seatP.y = D.h + 0.42;
    const seatQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(seatP, c.clone().add(V().set(0, -0.02, 0)), V().set(0, 1, 0)));
    const standP = c.clone().addScaledVector(n, 0.92); standP.y = 0;
    return { L, c, n, zoomP, zoomQ: q.clone(), seatP, seatQ, standP };
  };

  const pc = {
    active: false, root, screen, os, mode: 'away', t: 0, path: null,
    /** Sit down at the PC (instant: no glide, desktop up at once). */
    enter({ instant = false } = {}) {
      if (this.active || game.cutscene?.active) return;
      this.active = true;
      const P = game.player, inp = game.input;
      game.uiOpen = true;
      P.frozen = true;
      game.held.anchor.visible = false;
      game.interaction.setHint(null);
      document.body.classList.add('pc-on');
      inp.unlock();
      if (inp.locked && !inp.free && !inp.touch && !document.pointerLockElement) inp.locked = false; // (headless tests)
      const ps = poses();
      os.setResolution(ps.L.Lw, ps.L.Lh, ps.L.zoom);
      const cam = game.camera;
      this.path = { kind: 'in', t: 0, t0: performance.now(), dur: instant ? 0 : 1.55, from: cam.position.clone(), fromQ: cam.quaternion.clone(), fromFov: cam.fov, ps };
      P.lookOverride = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fovDelta: 0 };
      P.camBlend = 1;
      os.seat(true);
      idle.away = 0;
      this.mode = 'moving';
      const at = root.getWorldPosition(V());
      if (!instant) {
        audio.play('chairScrape', { pos: at, vol: 0.8, delay: 0.05 });
        audio.play('chairCreak', { pos: at, vol: 0.7, delay: 0.55 });
      }
      if (os.power === 'off') {
        if (instant) os.powerOn({ instant: true });
        else setTimeout(() => { if (!this.active) return; audio.play('pcSwitch', { pos: at, vol: 0.7 }); audio.play('crtOn', { pos: at, vol: 0.6, delay: 0.08 }); os.powerOn(); }, 750);
      }
      game.events.emit('pc', { sitting: true });
    },
    /** Stand up again (the PC stays on unless you shut it down). */
    exit() {
      if (!this.active || this.path?.kind === 'out') return;
      const inp = game.input;
      os.closeMenus();
      // relock while we're still inside the click / key handler (browsers need a user gesture)
      if (!inp.locked) inp.lock();
      clearTimeout(this._lockT);
      this._lockT = setTimeout(() => { if (!inp.locked && !this.active && !game.uiOpen) resume.classList.remove('hidden'); }, 1700);
      const P = game.player, cam = game.camera;
      const ps = poses();
      // you end up standing just behind the chair, facing the desk
      P.pos.set(ps.standP.x, 0, ps.standP.z);
      P.vel.set(0, 0, 0);
      P.yaw = Math.atan2(ps.n.x, ps.n.z);
      P.pitch = -0.42;
      const eye = V().set(ps.standP.x, P.eye, ps.standP.z);
      const eyeQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ'));
      this.path = { kind: 'out', t: 0, t0: performance.now(), dur: 1.15, from: cam.position.clone(), fromQ: cam.quaternion.clone(), fromFov: cam.fov, ps, eye, eyeQ };
      this.mode = 'moving';
      audio.play('chairScrape', { pos: root.getWorldPosition(V()), vol: 0.7 });
      game.events.emit('pc', { sitting: false });
    },
    finishExit() {
      const P = game.player;
      this.active = false;
      this.mode = 'away';
      this.path = null;
      P.lookOverride = null;
      P.camBlend = 0;
      P.frozen = false;
      game.uiOpen = false;
      game.held.anchor.visible = true;
      document.body.classList.remove('pc-on');
      os.seat(false);
      idle.away = 0;
      game.save();
    },
  };
  game.pc = pc;
  // debug.js compatibility: dbg.pc(page) = sit down instantly and open the store on that page
  pc.site = {
    mouse: { x: 0, y: 0 },
    set booted(v) { if (v && pc.path) { pc.path.t0 = -1e9; if (os.power !== 'on') os.powerOn({ instant: true }); } },
    get booted() { return os.power === 'on'; },
    get page() { return os.browser?.storePage?.() || null; },
    set page(p) { if (os.power === 'on') os.open('browser', { url: `http://www.gacha-mart.co.jp/${p === 'top' || p === 'home' ? '' : p + '/'}` }); },
  };

  os.onPointer = (u, v) => {
    if (pc.mode !== 'seated') return;
    mouse.position.set(mouseHome.x + (u - 0.5) * 0.05, mouseHome.y, mouseHome.z + (v - 0.5) * 0.04);
  };
  window.addEventListener('resize', () => {
    if (!pc.active) return;
    const ps = poses();
    os.setResolution(ps.L.Lw, ps.L.Lh, ps.L.zoom);
    if (pc.mode === 'seated') { game.camera.position.copy(ps.zoomP); game.player.lookOverride.pos.copy(ps.zoomP); }
  });

  game.interaction.add(root, {
    hint: () => ({ key: 'LMB', text: 'Sit at the computer', sub: os.power === 'on' ? (os.pending.length ? 'Something new came in' : 'Capsule 98 is on') : 'Switch it on' }),
    use: () => { pc.enter(); return false; },
  });

  // restore persistent visuals bought earlier
  placeOpenerTool(game, false);
  placeCharms(game);

  // ---- per frame
  const tmpQ = new THREE.Quaternion(), tmpP = V(), corner = V();
  let lastCss = '', idleT = 0;
  const toClient = (lx, ly, out) => {
    corner.set(lx, ly, 0).applyMatrix4(screen.matrixWorld);
    const vz = corner.clone().applyMatrix4(game.camera.matrixWorldInverse).z;
    corner.project(game.camera);
    out[0] = (corner.x + 1) / 2 * innerWidth; out[1] = (1 - corner.y) / 2 * innerHeight;
    return vz < -0.01;
  };
  const quad = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const placeLayer = (settled) => {
    const L = os, cam = game.camera;
    cam.updateMatrixWorld();
    screen.updateWorldMatrix(true, false);
    let ok = toClient(-SW / 2, SH / 2, quad[0]) & toClient(SW / 2, SH / 2, quad[1]) & toClient(SW / 2, -SH / 2, quad[2]) & toClient(-SW / 2, -SH / 2, quad[3]);
    let M;
    if (settled) {
      // pixel-exact: a plain scale + whole-device-pixel offset centred on the projected screen
      const dpr = window.devicePixelRatio || 1, z = L.zoom;
      const cx = (quad[0][0] + quad[2][0]) / 2, cy = (quad[0][1] + quad[2][1]) / 2;
      const tx = Math.round((cx - L.W * z / 2) * dpr) / dpr, ty = Math.round((cy - L.H * z / 2) * dpr) / dpr;
      M = [z, 0, tx, 0, z, ty, 0, 0, 1];
    } else if (ok) M = rectToQuad(L.W, L.H, quad);
    if (!M) { os.layer.style.visibility = 'hidden'; return; }
    os.layer.style.visibility = '';
    const s = settled ? `matrix(${M[0]},0,0,${M[4]},${M[2]},${M[5]})` : css3(M);
    if (s !== lastCss) { lastCss = s; os.layer.style.transform = s; }
    os.inv = invert3(M);
  };

  Game.updaters.push((g, dt) => {
    screenMat.uniforms.uTime.value = g.time;
    const on = os.power === 'on' || os.power === 'boot' || os.power === 'halt';
    led.material.color.setHex(on ? 0x40ff60 : 0xffa040);
    if (!pc.active) {
      // away: a cheap little picture, only when you're close enough to see it
      screenLight.intensity = on ? 0.3 : 0;
      screenMat.uniforms.uOn.value = 1;
      const near = g.player.pos.distanceToSquared(root.position) < 49;
      idleT -= dt;
      if (near && idleT <= 0) { idle.draw(0.25 - idleT); idleT = 0.25; tex.needsUpdate = true; }
      return;
    }
    // sitting: drive the camera along the path, then pin the DOM layer to the screen
    screenLight.intensity = on ? 0.45 : 0;
    screenMat.uniforms.uOn.value = 0; // the DOM layer covers it
    const P = g.player, cam = g.camera, path = pc.path;
    if (path) {
      // real time, so a slow frame never stretches the sit-down
      path.t = path.t0 != null ? (performance.now() - path.t0) / 1000 : path.t + dt;
      const t = Math.min(path.t, path.dur), ps = path.ps;
      if (path.kind === 'in') {
        const k = path.dur ? t / path.dur : 1, a = seg(k, 0, 0.42), b = seg(k, 0.32, 1);
        tmpP.lerpVectors(path.from, ps.seatP, a);
        tmpP.y -= Math.sin(Math.min(1, a) * Math.PI) * 0.03; // the plop onto the chair
        tmpP.lerp(ps.zoomP, b);
        tmpQ.copy(path.fromQ).slerp(ps.seatQ, a).slerp(ps.zoomQ, b);
        cam.fov = THREE.MathUtils.lerp(path.fromFov, SEAT_FOV, b);
      } else {
        const k = t / path.dur, a = seg(k, 0, 0.5), b = seg(k, 0.35, 1);
        tmpP.lerpVectors(path.from, ps.seatP, a).lerp(path.eye, b);
        tmpQ.copy(path.fromQ).slerp(ps.seatQ, a).slerp(path.eyeQ, b);
        cam.fov = THREE.MathUtils.lerp(path.fromFov, P.baseFov, b);
      }
      cam.position.copy(tmpP); cam.quaternion.copy(tmpQ);
      cam.updateProjectionMatrix();
      P.lookOverride.pos.copy(tmpP); P.lookOverride.quat.copy(tmpQ);
      P.lookOverride.fovDelta = P.baseFov - cam.fov;
      if (path.t >= path.dur) {
        if (path.kind === 'out') { pc.finishExit(); return; }
        pc.path = null;
        pc.mode = 'seated';
      }
    } else {
      cam.position.copy(P.lookOverride.pos); cam.quaternion.copy(P.lookOverride.quat);
      if (Math.abs(cam.fov - SEAT_FOV) > 0.01) { cam.fov = SEAT_FOV; cam.updateProjectionMatrix(); }
    }
    placeLayer(pc.mode === 'seated');
    os.tick(dt);
  });
}
