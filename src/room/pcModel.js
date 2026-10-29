// Your own chunky home PC (a putty-grey "CAPSULE-PC 98"): CRT monitor, keyboard, mouse, tower and speakers as
// voxel meshes, plus the curved CRT screen (canvas texture through a scanline shader) and its glass.
import * as THREE from 'three';
import { VoxelModel, glow, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { hash2 } from '../core/util.js';

const PUTTY = 0xdcd8cc, PUTTY_D = 0xc4bfb0, PUTTY_Y = 0xd8cfae;

function monitorModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(-12, 0, -12, 11, 2, 11, PUTTY_D);
  v.box(-5, 3, -6, 4, 6, 5, PUTTY_D);
  v.box(-20, 7, -4, 19, 42, 18, PUTTY);
  v.box(-16, 10, -20, 15, 38, -5, PUTTY_D);
  v.box(-12, 14, -22, 11, 34, -21, PUTTY_D);
  v.paint(() => { for (let y = 16; y < 34; y += 3) v.box(-10, y, -22, 9, y, -22, 0x8a8678); });
  v.box(-16, 13, 16, 15, 38, 18, null);
  v.box(-17, 12, 15, 16, 39, 15, 0x34323a);
  // power button, LED, badge stripe (red-blue capsule colours), brightness knobs
  v.box(13, 8, 18, 15, 10, 18, PUTTY_D);
  v.set(11, 9, 18, glow(0x40ff60));
  v.box(-15, 8, 18, -8, 10, 18, 0xbab4a2);
  v.box(-15, 10, 18, -12, 10, 18, 0xe5383b); v.box(-11, 10, 18, -8, 10, 18, 0x2f6fd6);
  v.set(6, 9, 18, 0x6a665a); v.set(3, 9, 18, 0x6a665a);
  v.paint(() => { for (let x = -20; x <= 19; x++) for (let y = 7; y <= 42; y++) if (hash2(x, y) < 0.05) v.set(x, y, 18, PUTTY_Y); });
  // stickers: a capsule and a cat face on the bezel
  v.box(17, 30, 18, 19, 33, 19, 0xff6f91); v.box(17, 32, 19, 19, 33, 19, 0xfbf8f0);
  v.box(-20, 36, 18, -18, 39, 19, 0xffd23f); v.set(-19, 38, 19, 0x2a2a2a);
  return v;
}

function keyboardModel() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  v.box(-36, 0, -11, 35, 2, 10, PUTTY);
  v.box(-36, 3, -11, 35, 3, -9, PUTTY_D);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
    const x0 = -34 + c * 4 + (r % 2), z0 = -8 + r * 4;
    if (r === 4 && c > 3 && c < 11) continue;
    const col = (c === 0 && r === 1) ? 0xe5383b : (c + r) % 7 === 0 ? 0xb4ae9c : 0xf0ece0;
    v.box(x0, 3, z0, x0 + 2, 3, z0 + 2, col);
  }
  v.box(-18, 3, 8, 13, 3, 10, 0xf0ece0);
  v.box(26, 3, -8, 33, 3, 10, 0xd0cab8);
  for (let i = 0; i < 3; i++) v.set(28 + i * 2, 3, -10, glow(i === 1 ? 0x40ff60 : 0x205a30));
  return v;
}

function towerModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(-9, 0, -20, 9, 40, 20, PUTTY);
  v.box(-7, 30, 21, 7, 32, 21, 0x34323a);
  v.box(-7, 25, 21, 7, 27, 21, 0x5a5650);
  v.box(-2, 12, 21, 1, 15, 21, PUTTY_D);
  v.set(4, 10, 21, glow(0x40ff60));
  v.set(6, 10, 21, glow(0xffa040));
  v.paint(() => { for (let y = 2; y < 8; y += 2) v.box(-7, y, 20, 7, y, 20, 0xb4ae9c); });
  v.box(-6, 34, 21, 6, 36, 21, 0xe5383b); v.box(-6, 35, 21, -4, 35, 21, 0xfbf8f0);
  // a floppy half inserted
  v.box(-5, 31, 22, 5, 31, 25, 0x2f4a8a); v.box(-2, 31, 24, 2, 31, 25, metal(0xc8ccd2));
  return v;
}

function mouseModel() {
  const v = new VoxelModel();
  v.ellipsoid(0, 2, 0, 4, 2.5, 6, PUTTY);
  v.box(-4, -1, -6, 4, -1, 6, null);
  v.box(0, 3, 1, 0, 4, 6, 0x8a8678);
  return v;
}

function speakerModel() {
  const v = new VoxelModel();
  v.box(-6, 0, -6, 5, 18, 5, 0x3a3836);
  v.cylinder(0, 6, 6, 4, 1, 0x1a1816, 'z');
  v.cylinder(0, 14, 6, 2, 1, metal(0x888888), 'z');
  return v;
}

export const SCREEN_W = 640, SCREEN_H = 480;

export function crtMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uTime: { value: 0 }, uPower: { value: 1 }, uBright: { value: 0.95 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D map; uniform float uTime, uPower, uBright; varying vec2 vUv;
      void main(){
        vec2 c = vUv*2.0-1.0;
        vec2 uv = c * (1.0 + dot(c,c)*0.022);
        uv = uv*0.5+0.5;
        if (uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) { gl_FragColor = vec4(0.012,0.012,0.014,1.0); return; }
        vec2 px = vec2(0.5/${SCREEN_W}.0, 0.0);
        vec3 col = texture2D(map, uv).rgb * 0.8 + texture2D(map, uv+px).rgb*0.1 + texture2D(map, uv-px).rgb*0.1;
        float scan = 0.93 + 0.07*sin(uv.y*${SCREEN_H}.0*6.28318);
        float mask = 0.93 + 0.07*sin(gl_FragCoord.x*2.094);
        col *= scan * mask;
        col *= smoothstep(1.45, 0.55, length(c*vec2(0.9,1.0)));
        col *= (0.97 + 0.03*sin(uv.y*3.0 - uTime*2.0)) * uPower * uBright;
        col += vec3(0.012,0.018,0.02) * uPower;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/**
 * Build the PC on a desk top. Returns { root, monitor, screen, glass, canvas, tex, mat }.
 * root's origin sits on the desk surface; the monitor faces root's +z.
 */
export function buildPC() {
  const root = new THREE.Group();
  root.name = 'roomPC';
  const mats = voxelMaterials('normal');
  const mk = (model, vs, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(meshVoxels(model, { voxelSize: vs }), mats);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const monitor = mk(monitorModel(), 0.01, 0, 0, -0.02);
  mk(keyboardModel(), 0.006, 0, 0, 0.27);
  mk(mouseModel(), 0.006, 0.3, 0, 0.29, 0.2);
  mk(towerModel(), 0.01, -0.42, 0, -0.06);
  mk(speakerModel(), 0.01, 0.3, 0, -0.02, -0.25);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.17), new THREE.MeshStandardMaterial({ color: 0xe5383b, roughness: 0.9 }));
  pad.position.set(0.3, 0.002, 0.29);
  root.add(pad);

  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sw = 0.31, sh = 0.24;
  const sg = new THREE.PlaneGeometry(sw, sh, 16, 12);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (sw / 2), y = pos.getY(i) / (sh / 2); pos.setZ(i, -0.004 * (x * x + y * y)); }
  sg.computeVertexNormals();
  const mat = crtMaterial(tex);
  const screen = new THREE.Mesh(sg, mat);
  screen.position.set(0, 0.255, 0.164);
  screen.userData.noRim = true;
  root.add(screen);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, clearcoat: 1, depthWrite: false, envMapIntensity: 1.5 });
  const glass = new THREE.Mesh(sg, glassM);
  glass.position.copy(screen.position).add(new THREE.Vector3(0, 0, 0.002));
  glass.userData.noRim = true;
  root.add(glass);
  return { root, monitor, screen, glass, canvas, tex, mat };
}
