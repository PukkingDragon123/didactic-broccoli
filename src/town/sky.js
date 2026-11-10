// The sky and the skyline. The dome: zenith-to-horizon bands, a glow toward the sun, flat cartoon cumulus, stars and a
// moon at night (every colour is a uniform driven by the time of day). The skyline has no trees at all: a ring of
// roofs painted as flat cartoon shapes (hips, gables, flat roofs with water tanks on stands, TV antennas, danchi slabs
// with stair towers, a bath-house chimney, pylons and their wires), a hazier ring of low terraced hills behind it, and
// two modelled danchi blocks close by. After dark the shapes sink into blue and their windows switch on one by one.
//   buildSky(t)   buildBackdrop(t)   applySkyLook(t, look)   midrise(t, x, z, w, h)
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { interiorQuad, ROOM } from '../world/interiors.js';

const _c = new THREE.Color(), _c2 = new THREE.Color();

// six cumulus clouds, each drawn puff by puff: [x (0..1024 round the horizon), base y, [dx, radius]...]
const CLOUDS = [
  [70, 96, [[-34, 12], [-14, 20], [10, 26], [34, 17], [52, 10]]],
  [250, 70, [[-22, 9], [-6, 15], [14, 12], [28, 7]]],
  [420, 104, [[-46, 13], [-24, 22], [2, 30], [30, 24], [54, 15], [70, 8]]],
  [600, 60, [[-16, 8], [0, 13], [18, 9]]],
  [760, 90, [[-30, 11], [-10, 19], [12, 23], [36, 14]]],
  [930, 76, [[-20, 10], [-2, 16], [18, 13], [34, 8]]],
];
function cloudTexture() {
  const w = 1024, h = 128, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (const [cx, base, puffs] of CLOUDS) for (const dx of [-w, 0, w]) for (const [col, dy, k] of [['rgba(150,162,180,0.9)', 5, 1], ['rgba(246,242,234,0.96)', 0, 1], ['rgba(255,236,204,0.96)', -3, 0.6]]) {
    x.fillStyle = col; x.beginPath();
    for (const [px, r] of puffs) { x.moveTo(cx + dx + px + r * k, base + dy - r * 0.4); x.ellipse(cx + dx + px, base + dy - r * (k < 1 ? 0.75 : 0.4), r * k, r * 0.66 * k, 0, 0, 7); }
    x.fill();
    if (k === 1) x.fillRect(cx + dx + puffs[0][0], base + dy - 5, puffs[puffs.length - 1][0] - puffs[0][0], 7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

export function buildSky(t) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSun: { value: new THREE.Vector3(-6, 3.2, 14).normalize() },
      uZen: { value: new THREE.Color(0x3f6fae) }, uUp: { value: new THREE.Color(0x6f9acb) },
      uMid: { value: new THREE.Color(0xa9c4dd) }, uHor: { value: new THREE.Color(0xe9dcc4) },
      uGlow: { value: new THREE.Color(0xf6d9a8) },
      uSunCol: { value: new THREE.Color(1.0, 0.86, 0.62) }, uSunK: { value: 1 },
      uCloud: { value: new THREE.Vector3(1, 1, 1) },
      uMoon: { value: new THREE.Vector3(0.5, 0.6, -0.6).normalize() }, uMoonK: { value: 0 },
      uNight: { value: 0 }, uTwinkle: { value: 0 },
      uClouds: { value: cloudTexture() },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uSun, uZen, uUp, uMid, uHor, uGlow, uSunCol, uCloud, uMoon; uniform float uSunK, uMoonK, uNight, uTwinkle;
      uniform sampler2D uClouds; varying vec3 vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vD);
        float h = d.y, hl = max(length(d.xz), 1e-4);
        float az = atan(d.z, d.x + 1e-5);
        float sunK = max(0.0, dot(d.xz / hl, normalize(uSun.xz)));
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.14, h));
        col = mix(col, uUp, smoothstep(0.12, 0.4, h));
        col = mix(col, uZen, smoothstep(0.35, 0.95, h));
        // warm glow hugging the horizon toward the sun, the sun's disc and a halo
        col = mix(col, uGlow, pow(sunK, 4.0) * (1.0 - smoothstep(0.0, 0.3, h)) * 0.9);
        float sd = max(0.0, dot(d, uSun));
        col += uSunCol * (pow(sd, 24.0) * 0.3 + smoothstep(0.9992, 0.9995, sd) * 1.5) * uSunK;
        // stars: small hard points that twinkle in steps, fading toward the hazy horizon
        if (uNight > 0.01 && h > 0.05) {
          vec2 cell = vec2(floor(az * 220.0), floor(h * 320.0));
          float r = hash(cell);
          vec2 f = fract(vec2(az * 220.0, h * 320.0)) - 0.5;
          if (r > 0.9955 && dot(f, f) < 0.12) {
            float tw = step(0.45, fract(r * 91.7 + uTwinkle * 0.37));
            col += vec3(0.78, 0.82, 0.96) * uNight * (0.35 + 0.45 * tw) * smoothstep(0.05, 0.25, h) * (r > 0.9993 ? 1.6 : 1.0);
          }
        }
        // flat cartoon clouds: off-white tops with a warm lit edge and a blue-grey underside
        vec2 uv = vec2(az / 6.2832 + 0.5, (h - 0.03) * 2.4);
        if (uv.y > 0.0 && uv.y < 1.0) {
          vec4 c = texture2D(uClouds, uv);
          vec3 cc = mix(c.rgb, c.rgb * vec3(1.05, 0.96, 0.86), pow(sunK, 2.0) * 0.7) * uCloud * mix(vec3(1.0), vec3(0.34, 0.38, 0.55), uNight);
          col = mix(col, cc, c.a * smoothstep(0.03, 0.1, h) * 0.92);
        }
        // the moon: a flat disc with two darker seas
        float md = dot(d, uMoon);
        if (uMoonK > 0.01 && md > 0.99) {
          vec3 mx = normalize(cross(vec3(0.0, 1.0, 0.0), uMoon)), my = cross(uMoon, mx);
          vec2 mp = vec2(dot(d, mx), dot(d, my)) / 0.024;
          float r2 = dot(mp, mp);
          if (r2 < 1.0) {
            vec3 moon = vec3(0.95, 0.93, 0.84);
            if (length(mp - vec2(-0.25, 0.2)) < 0.3 || length(mp - vec2(0.3, -0.25)) < 0.22) moon = vec3(0.78, 0.78, 0.74);
            moon *= 1.0 - 0.14 * step(0.72, r2);
            col = mix(col, moon * 1.1, uMoonK);
          }
        }
        if (h < 0.0) col = mix(uHor, uHor * 0.85, smoothstep(0.0, -0.2, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  t.skyMat = mat;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.name = 'town:sky';
  t.add(dome);
}

// The skyline strip, building by building: [kind, width, height (px of 256), extras]. g gable, h hip, f flat roof,
// d danchi slab; extras: a yagi antenna, t water tank on legs, s stair tower, c the bath-house chimney.
const ROW = [
  ['g', 62, 44, 'a'], ['f', 54, 52, 't'], ['h', 70, 40, ''], ['d', 168, 150, 'st'], ['g', 58, 50, 'a'], ['g', 74, 38, ''], ['f', 66, 62, 'ta'], ['h', 80, 46, 'a'],
  ['g', 52, 54, ''], ['d', 132, 118, 's'], ['f', 60, 44, 'c'], ['g', 78, 48, 'a'], ['h', 64, 42, ''], ['f', 84, 70, 't'], ['g', 56, 46, 'a'], ['d', 190, 172, 'st'],
  ['h', 72, 44, ''], ['g', 66, 52, 'a'], ['f', 58, 40, ''], ['g', 82, 46, 'a'], ['f', 70, 58, 't'], ['h', 60, 50, ''], ['d', 150, 134, 's'], ['g', 64, 42, 'a'], ['f', 56, 48, 'ta'], ['g', 62, 40, ''],
];
// which windows are lit, row by row (read across each building, repeating): hand-set so no two blocks blink alike
const LIT = ['1001011000101', '0100100110010', '0010010001101', '1010001100100', '0001100101010'];
/** The painted skyline (colour) and its windows (rgb = the lit colour, alpha = when that window switches on). */
function skylineTextures() {
  const W = 2048, H = 256, c = document.createElement('canvas'), wc = document.createElement('canvas');
  c.width = wc.width = W; c.height = wc.height = H;
  const x = c.getContext('2d'), w = wc.getContext('2d');
  const tones = ['#8d9bb0', '#9aa7ba', '#a7b3c3', '#7f8ea6'], roofs = ['#74839b', '#6b7a94', '#8291a8'], warm = ['255,214,150', '255,228,176', '250,196,128', '226,236,255'];
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  let px = 0;
  ROW.forEach(([kind, bw, bh, ex], i) => {
    const col = tones[i % 4], rc = roofs[i % 3], y0 = H - bh;
    let nw = 0;
    const win = (ax, ay, aw, ah, row) => { R(ax, ay, aw, ah, 'rgba(60,70,95,0.42)'); const p = LIT[(i + row) % 5]; if (p[nw++ % p.length] === '1') { w.fillStyle = `rgba(${warm[(i + nw) % 4]},${(0.08 + ((i * 5 + nw * 3) % 11) / 11 * 0.86).toFixed(3)})`; w.fillRect(ax, ay, aw, ah); } };
    R(px, y0, bw, bh, col); R(px + bw - 5, y0, 5, bh, 'rgba(60,70,95,0.25)');
    if (kind === 'd') {
      R(px, y0 - 5, bw, 5, rc);
      if (ex.includes('s')) { R(px + bw * 0.42, y0 - 20, 22, 20, col); R(px + bw * 0.42, y0 - 23, 22, 3, rc); }
      if (ex.includes('t')) { R(px + 12, y0 - 20, 20, 12, '#b9c2cd'); R(px + 14, y0 - 8, 2, 8, rc); R(px + 28, y0 - 8, 2, 8, rc); }
      for (let yy = y0 + 10, row = 0; yy < H - 8; yy += 14, row++) { R(px + 4, yy + 9, bw - 8, 2, 'rgba(60,70,95,0.3)'); for (let xx = px + 8; xx < px + bw - 10; xx += 12) win(xx, yy, 7, 8, row); }
    } else {
      x.fillStyle = rc; x.beginPath();
      if (kind === 'g') { x.moveTo(px - 4, y0); x.lineTo(px + bw / 2, y0 - bw * 0.2); x.lineTo(px + bw + 4, y0); }
      else if (kind === 'h') { x.moveTo(px - 4, y0); x.lineTo(px + bw * 0.25, y0 - 14); x.lineTo(px + bw * 0.75, y0 - 14); x.lineTo(px + bw + 4, y0); }
      else x.rect(px - 2, y0 - 4, bw + 4, 4);
      x.fill();
      if (ex.includes('t')) { R(px + bw * 0.55, y0 - 18, 16, 10, '#b9c2cd'); R(px + bw * 0.55 + 2, y0 - 8, 2, 5, rc); R(px + bw * 0.55 + 12, y0 - 8, 2, 5, rc); }
      for (let yy = y0 + 8, row = 0; yy < H - 10; yy += 16, row++) for (let xx = px + 7; xx < px + bw - 12; xx += 16) win(xx, yy, 9, 7, row);
      if (ex.includes('a')) { const ax = px + bw * 0.34, ay = y0 - (kind === 'g' ? bw * 0.12 : 10); R(ax, ay - 24, 1.5, 24, '#5d6c86'); for (let e = 0; e < 5; e++) R(ax - 8 + e, ay - 24 + e * 2.4, 16 - e * 2, 1.2, '#5d6c86'); }
      if (ex.includes('c')) { R(px + bw * 0.5, y0 - 100, 8, 100, '#8b93a3'); R(px + bw * 0.5 - 1, y0 - 100, 10, 4, '#6b7a94'); R(px + bw * 0.5, y0 - 80, 8, 6, '#c7848a'); }
    }
    px += bw;
  });
  R(px, H - 40, W - px, 40, tones[1]);
  const mk = (cv) => { const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4; return tx; };
  return [mk(c), mk(wc)];
}

// the two ridgelines of the low hills (heights in px every 128 px round the horizon), and the terraces of roofs on the nearer one
const RIDGE_FAR = [150, 166, 158, 140, 132, 146, 168, 172, 156, 138, 130, 142, 160, 170, 162, 148, 150];
const RIDGE_NEAR = [96, 88, 100, 112, 104, 90, 84, 98, 110, 106, 92, 86, 94, 108, 102, 92, 96];
const TERRACE = [[40, 60], [120, 52], [210, 70], [300, 58], [380, 48], [470, 66], [560, 54], [650, 74], [730, 60], [820, 50], [900, 68], [990, 56], [1080, 46], [1160, 64], [1250, 72], [1340, 54], [1420, 62], [1510, 48], [1600, 70], [1690, 58], [1780, 50], [1860, 66], [1950, 56]];
/** The low hills behind the roofs: two flat ridgelines, the nearer one terraced with tiny houses. */
function hillTexture() {
  const W = 2048, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const ridge = (pts, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); pts.forEach((hh, k) => { if (!k) x.lineTo(0, H - hh); else x.quadraticCurveTo((k - 0.5) * 128, H - (pts[k - 1] + hh) / 2 - 6, k * 128, H - hh); }); x.lineTo(W, H); x.fill(); };
  ridge(RIDGE_FAR, '#a9b7c9'); ridge(RIDGE_NEAR, '#97a7bc');
  TERRACE.forEach(([px, up], i) => { for (const [dx, dy] of [[0, 0], [16, -9], [-12, 10]]) { x.fillStyle = (i + dx) % 3 ? '#b7c2d0' : '#8494ab'; x.fillRect(px + dx, H - up + dy, 11, 5); x.fillStyle = '#7b8aa2'; x.fillRect(px + dx - 1, H - up + dy - 2, 13, 2); } });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4;
  return tx;
}

export function buildBackdrop(t) {
  const [sky, win] = skylineTextures();
  t.skyline = { dim: { value: new THREE.Color(1, 1, 1) }, win: { value: 0 } };
  const ring = (tex, r, y0, h, rep, winMap, key) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, alphaTest: 0.5, side: THREE.BackSide });
    tex.repeat.set(rep, 1);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDim = t.skyline.dim; sh.uniforms.uWin = t.skyline.win; sh.uniforms.uWinMap = { value: winMap || tex };
      sh.fragmentShader = 'uniform vec3 uDim; uniform float uWin; uniform sampler2D uWinMap;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
        (winMap ? 'vec4 wN = texture2D( uWinMap, vMapUv ); outgoingLight = outgoingLight * uDim + wN.rgb * step( 0.02, wN.a ) * step( wN.a, uWin ) * 1.2;' : 'outgoingLight *= mix( vec3( 1.0 ), uDim, 0.85 );') + '\n#include <opaque_fragment>');
    };
    mat.customProgramCacheKey = () => 'skyline-' + key;
    const g = new THREE.CylinderGeometry(r, r, h, 48, 1, true);
    g.translate(0, y0 + h / 2, 9.6);
    const m = new THREE.Mesh(g, mat);
    m.name = 'town:' + key; m.matrixAutoUpdate = false; m.userData.noRim = true; m.renderOrder = -5;
    t.add(m);
  };
  ring(hillTexture(), 79, -1, 30, 2, null, 'hills');
  ring(sky, 74, -0.5, 26, 3, win, 'skyline');
}

/** A danchi slab close by: four or five storeys of balconies, a stair tower, a water tank on the roof. */
export function midrise(t, x, z, w, h) {
  const B = t.B, m = t.m, floors = Math.floor(h / 2.9);
  B.box(m.plaster, w, h, 8, x, 0, z + 4, { tint: 0xd9d4c6, uv: [x, 0], skip: 'ny' });
  B.box(m.pv, w + 0.3, 0.35, 8.3, x, h, z + 4, { tint: 0x8f8b84 });
  B.box(m.plaster, 2.4, 2.6, 3, x + w * 0.2, h + 0.35, z + 4, { tint: 0xcfcabc });
  B.cyl(m.pv, 1.0, 1.0, 1.5, x - w * 0.25, h + 1.5, z + 4.5, { tint: 0xc9cdd0, sides: 10 });
  for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) B.box(m.metal, 0.08, 1.2, 0.08, x - w * 0.25 + dx, h + 0.35, z + 4.5 + dz, { tint: 0x7a8288 });
  for (let f = 0; f < floors; f++) {
    B.box(m.concrete, w + 0.2, 0.12, 1.0, x, 0.9 + f * 2.9, z - 0.5, { tint: 0xb9b5ab });
    B.box(m.pv, w + 0.2, 0.95, 0.06, x, 1.02 + f * 2.9, z - 0.98, { tint: f % 2 ? 0xc9d2d6 : 0xd6d2c6 });
    for (let i = 0; i < Math.floor(w / 3); i++) {
      const k = hash2(x + i, f), wx = x - w / 2 + 1.5 + i * 3;
      B.push(wx, 1.05 + f * 2.9, z - 0.02, Math.PI);
      interiorQuad(B, t.interiorM, 0, 0, 0, 0, { w: 1.8, h: 1.7, sill: 0.3, depth: 3, kind: k < 0.6 ? ROOM.living : ROOM.tv, lit: k < 0.5 ? 1 : k < 0.6 ? 0.5 : 0, curtain: 1 + Math.floor(k * 10) % 3, cc: Math.floor(k * 80) % 8, seed: Math.floor(k * 997) });
      B.pop();
    }
  }
}

/** The sky's and the skyline's part of Town.applySky. */
export function applySkyLook(t, L) {
  const u = t.skyMat?.uniforms, night = L.night;
  if (u) {
    u.uZen.value.copy(L.zen); u.uUp.value.copy(L.up); u.uMid.value.copy(L.mid); u.uHor.value.copy(L.hor); u.uGlow.value.copy(L.glow);
    u.uSun.value.copy(L.sunDir);
    u.uSunCol.value.copy(L.sun).lerp(_c.setRGB(1, 0.86, 0.62), 0.5);
    u.uSunK.value = L.sunK;
    u.uCloud.value.set(L.cloud[0], L.cloud[1], L.cloud[2]);
    u.uMoon.value.copy(L.moonDir); u.uMoonK.value = L.moonK;
    u.uNight.value = night; u.uTwinkle.value = L.twinkle || 0;
  }
  if (t.skyline) {
    // silhouettes: daylight haze -> deep dusk blue; windows switch on as it gets dark
    t.skyline.dim.value.setRGB(1, 1, 1).lerp(_c.setRGB(0.2, 0.24, 0.38), night * 0.92).multiply(_c2.setRGB(L.fog.r * 0.4 + 0.6, L.fog.g * 0.4 + 0.6, L.fog.b * 0.4 + 0.6));
    t.skyline.win.value = Math.min(1, Math.max(0, (night - 0.15) / 0.75)) * 0.98;
  }
}
