// The mirror in your room (#102): a tall standing mirror leaning on the partition wall. Use it and you step into the
// Dressing Room (src/dressing/, game.dressing.open({ from: 'mirror' })) to try things on, buy and wear them; Back
// returns you to the room.
//   installWardrobe(game) -> { open(), close(), active }      (game.wardrobe)
import * as THREE from 'three';
import { ROOM } from '../room/build.js';

const MIRROR = { x: -0.89, z: ROOM.zPart - 0.12 }; // room-local, facing -z into the tatami room

function mirrorMesh() {
  const g = new THREE.Group();
  g.name = 'room-mirror';
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 });
  const W = 0.38, H = 1.32, T = 0.035;
  const box = (w, h, d, x, y, z, m = wood) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  // the frame, leaning back a little against the wall
  const f = new THREE.Group();
  f.rotation.x = -0.08;
  g.add(f);
  const add = (b) => { g.remove(b); f.add(b); return b; };
  add(box(W, T, T, 0, H, 0)); add(box(W, T, T, 0, 0.06, 0));
  add(box(T, H, T, -W / 2, H / 2 + 0.03, 0)); add(box(T, H, T, W / 2, H / 2 + 0.03, 0));
  // the glass: a cool grey-blue with stepped pixel streaks (no smooth reflections)
  const c = document.createElement('canvas'); c.width = 16; c.height = 48;
  const x = c.getContext('2d');
  x.fillStyle = '#7d93a6'; x.fillRect(0, 0, 16, 48);
  x.fillStyle = '#93a9bb'; for (let i = 0; i < 48; i++) { x.fillRect((i * 0.5 + 2) | 0, 47 - i, 2, 1); x.fillRect((i * 0.5 + 7) | 0, 47 - i, 1, 1); }
  x.fillStyle = '#6a7f92'; x.fillRect(0, 44, 16, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - T, H - T), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.3 }));
  glass.position.set(0, H / 2 + 0.04, T / 2 + 0.002);
  f.add(glass);
  // a little foot to stand on, and a tie hanging off the corner
  box(W + 0.06, 0.04, 0.16, 0, 0.02, 0.02);
  const tie = box(0.035, 0.32, 0.01, W / 2 + 0.01, H - 0.2, 0.03, new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.8 }));
  g.remove(tie); f.add(tie); tie.rotation.z = 0.1;
  return g;
}

export function installWardrobe(game) {
  const g = game, room = g.places?.room;
  if (!room?.group) return null;
  const mesh = mirrorMesh();
  mesh.position.set(MIRROR.x, 0, MIRROR.z);
  mesh.rotation.y = Math.PI;
  room.group.add(mesh);
  const api = {
    open() {
      if (g.visiting) { g.news?.('This is not your mirror'); return; }
      if (g.uiOpen || g.cutscene?.active || !g.dressing) return;
      g.dressing.open({ from: 'mirror' });
    },
    close() { g.dressing?.close(); },
    get active() { return !!g.dressing?.isOpen; },
  };
  g.interaction.add(mesh, {
    reach: 2.4,
    hint: () => ({ key: 'LMB', text: 'Look in the mirror', sub: 'Change clothes, try things on' }),
    use: () => { api.open(); return false; },
  });
  g.wardrobe = api;
  return api;
}
