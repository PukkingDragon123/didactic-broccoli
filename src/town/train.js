// The commuter train that crosses the two bridges: a three-car electric unit in a made-up provincial livery (cream
// with a moss-green waist band), an arched roof with air-conditioner housings, a pantograph on the middle car, bogies,
// lit windows after dark. One painted texture (sides, cab front) with a matching light map.
//   buildTrains(t) -> t.trains = [{ g, s, wait, z, dir, speed, played }]   runTrain(t, side, dir)   updateTrains(t, dt, audio)
import * as THREE from 'three';
import { Batch } from './batch.js';
import { YR, TRACKS } from './layout.js';

const CAR = 13.6, GAP = 0.5, N = 3, LEN = N * CAR + (N - 1) * GAP;
const W = 2.8, H = 2.7, Y0 = 0.95, PPM = 64, SW = Math.round(CAR * PPM), SH = Math.round(H * PPM), FW = Math.round(W * PPM);

function paint(lit) {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 256;
  const x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const body = '#ece4cc', band = '#5f8a62', band2 = '#3f6a48', dark = '#3a3c3e', glass = lit ? '#ffe9b0' : '#2e3a42', sky = lit ? '#fff4d0' : '#7e97a4';
  if (lit) R(0, 0, 1280, 256, '#000'); else {
    R(0, 0, SW, SH, body); R(0, 0, SW, 10, '#d4ccb4'); R(0, SH - 14, SW, 14, dark);
    R(0, 96, SW, 16, band); R(0, 116, SW, 4, band2); R(0, 92, SW, 2, '#fbf6e4');
  }
  const win = (a, b, w, h) => { if (!lit) { R(a - 3, b - 3, w + 6, h + 6, '#b9bec0'); } R(a, b, w, h, glass); R(a, b, w, Math.round(h * 0.3), sky); if (lit) for (let i = 0; i < w - 14; i += 22) { x.fillStyle = '#5a4a3a'; x.beginPath(); x.arc(a + 10 + i + (i * 7) % 9, b + h - 6, 7, 0, 7); x.fill(); R(a + 4 + i + (i * 7) % 9, b + h - 4, 13, 6, '#5a4a3a'); } else R(a, b + Math.round(h * 0.55), w, 2, '#9aa4a8'); };
  for (const dx of [150, SW - 150 - 84]) { // doors
    if (!lit) { R(dx - 4, 22, 92, SH - 40, '#d8d0b8'); R(dx + 41, 22, 2, SH - 40, dark); R(dx - 4, 96, 92, 16, band); }
    win(dx + 6, 34, 30, 50); win(dx + 48, 34, 30, 50);
  }
  for (const [a, w] of [[34, 92], [262, 104], [382, 104], [502, 104], [SW - 236 - 150, 104], [SW - 34 - 92, 92]]) win(a, 34, w, 50);
  if (!lit) { x.fillStyle = dark; x.font = 'bold 16px monospace'; x.fillText('KAMIYAMA LINE', 262, 150); R(262, 156, 120, 2, band2); }
  // the cab front
  const fx = 880;
  if (!lit) { R(fx, 0, FW, SH, body); R(fx, 96, FW, 16, band); R(fx, 116, FW, 4, band2); R(fx, SH - 14, FW, 14, dark); R(fx + FW / 2 - 16, 16, 32, SH - 34, '#d8d0b8'); R(fx + 8, 6, FW - 16, 14, '#2a2c2e'); x.fillStyle = '#f4e8a0'; x.font = 'bold 12px monospace'; x.fillText('LOCAL', fx + 66, 17); }
  win(fx + 12, 30, 58, 52); win(fx + FW - 70, 30, 58, 52); win(fx + FW / 2 - 12, 34, 24, 46);
  for (const hx of [22, FW - 44]) { R(fx + hx, 126, 22, 14, lit ? '#fff8dc' : '#f4f0dc'); if (!lit) { R(fx + hx - 2, 124, 26, 2, '#8a8e90'); R(fx + hx, 142, 22, 6, '#b8322a'); } else R(fx + hx, 142, 22, 6, '#ff5a40'); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function makeTrain(t) {
  const g = new THREE.Group();
  const M = (t._trainM ||= (() => { const m = new THREE.MeshStandardMaterial({ map: paint(false), emissive: 0xffffff, emissiveMap: paint(true), emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.2, vertexColors: true }); m.name = 'train'; t.trainMats = [m]; return m; })());
  const B = new Batch(), pv = t.P(0.6, 0.3), dk = t.P(0.85), U = (a, b) => [a / 1280, 1 - SH / 256, b / 1280, 1];
  for (let i = 0; i < N; i++) {
    B.push(0, 0, (i - (N - 1) / 2) * (CAR + GAP));
    for (const sx of [-1, 1]) B.quadUV(M, CAR, H, sx * W / 2, Y0, 0, U(0, SW), { ry: sx * Math.PI / 2 });
    for (const sz of [-1, 1]) {
      const cab = (i === 0 && sz < 0) || (i === N - 1 && sz > 0);
      if (cab) { B.quadUV(M, W, H, 0, Y0, sz * CAR / 2, U(880, 880 + FW), { ry: sz > 0 ? 0 : Math.PI }); for (const hx of [-0.95, 0.95]) B.box(t.G, 0.3, 0.16, 0.04, hx, Y0 + 0.6, sz * (CAR / 2 + 0.02), { tint: 0xfff4d0 }); }
      else B.quadUV(pv, W, H, 0, Y0, sz * CAR / 2, [0, 0, 1, 1], { ry: sz > 0 ? 0 : Math.PI, tint: 0xb8b2a0 });
    }
    // the arched roof, its housings, the floor and underframe
    B.extrude(pv, [[-1.4, 0], [1.4, 0], [1.28, 0.2], [0.85, 0.34], [0, 0.4], [-0.85, 0.34], [-1.28, 0.2]], -CAR / 2, CAR / 2, { oy: Y0 + H, tint: 0x9aa0a4 });
    for (const z of [-3.6, 3.6]) B.box(pv, 1.7, 0.3, 2.6, 0, Y0 + H + 0.34, z, { tint: 0xc0c4c6, bevel: 0.06 });
    B.box(dk, W - 0.3, 0.45, CAR - 3.4, 0, Y0 - 0.45, 0, { tint: 0x2e3032 });
    for (const z of [-CAR / 2 + 2.1, CAR / 2 - 2.1]) {
      B.box(dk, 2.2, 0.5, 2.6, 0, 0.16, z, { tint: 0x26282a, bevel: 0.04 });
      for (const wz of [-0.95, 0.95]) for (const wx of [-0.72, 0.72]) B.cyl(dk, 0.42, 0.42, 0.12, wx - 0.06, 0.42, z + wz, { rz: -Math.PI / 2, tint: 0x45484a, sides: 10 });
    }
    if (i === 1) { // pantograph
      B.box(pv, 1.0, 0.1, 1.2, 0, Y0 + H + 0.38, 0, { tint: 0x5a5e62 });
      for (const s of [-1, 1]) { B.rod(pv, [0, Y0 + H + 0.46, s * 0.5], [0, Y0 + H + 0.95, 0], 0.025, { tint: 0x3a3c3e, sides: 4 }); B.rod(pv, [0, Y0 + H + 0.95, 0], [0, Y0 + H + 1.42, s * 0.25 - 0.25], 0.02, { tint: 0x3a3c3e, sides: 4 }); }
      B.box(pv, 1.5, 0.04, 0.1, 0, Y0 + H + 1.42, -0.25, { tint: 0x2a2a2a });
    }
    if (i < N - 1) B.box(dk, 1.3, 2.3, GAP + 0.1, 0, Y0 + 0.2, CAR / 2 + GAP / 2, { tint: 0x2a2a2a });
    B.pop();
  }
  B.build(g, { receive: false, name: 'train' });
  return g;
}

export function buildTrains(t) {
  t.trains = [];
  for (const s of [-1, 1]) {
    const g = makeTrain(t);
    g.visible = false;
    t.add(g);
    t.trains.push({ g, s, wait: 10 + Math.random() * 25 + (s > 0 ? 14 : 0), z: 0, dir: 1, speed: 12.5, played: false });
  }
}

export function runTrain(t, side = null, dir = null) {
  const tr = side ? t.trains.find((k) => k.s === side) : t.trains[Math.floor(Math.random() * 2)];
  if (!tr) return;
  tr.dir = dir || (Math.random() < 0.5 ? 1 : -1);
  const track = TRACKS[Math.random() < 0.5 ? 0 : 1];
  tr.g.position.set(tr.s * track, YR, 0);
  tr.z = tr.dir > 0 ? -100 : 120;
  tr.g.rotation.y = tr.dir > 0 ? 0 : Math.PI;
  tr.g.visible = true;
  tr.played = false;
}

export function updateTrains(t, dt, audio) {
  if (!t.trains) return;
  for (const tr of t.trains) {
    if (!tr.g.visible) { tr.wait -= dt; if (tr.wait <= 0) runTrain(t, tr.s); continue; }
    tr.z += tr.dir * tr.speed * dt;
    tr.g.position.z = tr.z;
    const head = tr.z + tr.dir * LEN / 2;
    if (!tr.played && (9.6 - head) * tr.dir < 45) {
      tr.played = true;
      audio.play('train', { pos: new THREE.Vector3(tr.s * 31.5, 5.2, 9.6), dur: (LEN + 70) / tr.speed, vol: 1.0, ref: 7, bus: audio.amb });
    }
    if ((tr.dir > 0 && tr.z > 130) || (tr.dir < 0 && tr.z < -110)) { tr.g.visible = false; tr.wait = 30 + Math.random() * 50; }
  }
}
