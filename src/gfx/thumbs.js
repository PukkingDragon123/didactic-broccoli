// Offscreen "product photos" of collectibles & props, rendered once and cached as canvases.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeItemMesh } from '../game/collectibles.js';

export class Thumbs {
  constructor(renderer) {
    this.renderer = renderer;
    this.cache = new Map();
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.add(new THREE.HemisphereLight(0xfff4e8, 0x504030, 1.1));
    const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
    key.position.set(1.5, 3, 2.5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8e0ff, 1.0);
    rim.position.set(-2, 1.5, -2);
    this.scene.add(rim);
    this.cam = new THREE.PerspectiveCamera(28, 1, 0.001, 10);
    this.rt = new THREE.WebGLRenderTarget(128, 128, { samples: 4 });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
  }

  /** Canvas thumbnail of a collectible. opts: size, finish, silhouette (black shape), bg */
  item(key, opts = {}) {
    const size = opts.size || 96;
    const finish = opts.finish || 'normal';
    const ck = `${key}|${finish}|${size}|${opts.silhouette ? 1 : 0}`;
    if (this.cache.has(ck)) return this.cache.get(ck);
    let canvas;
    if (opts.silhouette) {
      // derived from the coloured render: no second GPU pass
      const base = this.item(key, { size, finish });
      canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(base, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#3a2e36';
      ctx.fillRect(0, 0, size, size);
    } else {
      const mesh = makeItemMesh(key, finish);
      canvas = this.renderObject(mesh, size, opts);
    }
    this.cache.set(ck, canvas);
    return canvas;
  }

  /** Render a few queued thumbnails per frame so shop pages never hitch. */
  prewarm(keys, sizes = [32, 48]) {
    this.queue = this.queue || [];
    for (const s of sizes) for (const k of keys) this.queue.push([k, s]);
  }

  tick(n = 2) {
    if (!this.queue?.length) return;
    for (let i = 0; i < n && this.queue.length; i++) { const [k, s] = this.queue.shift(); this.item(k, { size: s }); }
  }

  /** Render any Object3D framed from a 3/4 front view into a transparent canvas. */
  renderObject(obj, size, opts = {}) {
    const r = this.renderer;
    if (this.rt.width !== size) this.rt.setSize(size, size);
    this.scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const rad = box.getSize(new THREE.Vector3()).length() * 0.5;
    const dir = new THREE.Vector3(opts.side ?? 0.5, opts.up ?? 0.35, 1).normalize();
    this.cam.position.copy(c).addScaledVector(dir, rad / Math.sin(THREE.MathUtils.degToRad(14)) * 0.98);
    this.cam.lookAt(c);
    this.cam.updateProjectionMatrix();
    const prevRT = r.getRenderTarget();
    const prevClear = r.getClearColor(new THREE.Color());
    const prevAlpha = r.getClearAlpha();
    const prevTM = r.toneMapping;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.cam);
    const px = new Uint8Array(size * size * 4);
    r.readRenderTargetPixels(this.rt, 0, 0, size, size, px);
    r.setRenderTarget(prevRT);
    r.setClearColor(prevClear, prevAlpha);
    r.toneMapping = prevTM;
    this.scene.remove(obj);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      for (let x = 0; x < size * 4; x += 4) {
        const i = y * size * 4 + x;
        let a = px[src + x + 3];
        if (opts.silhouette) {
          img.data[i] = 40; img.data[i + 1] = 30; img.data[i + 2] = 40; img.data[i + 3] = a > 40 ? 255 : 0;
        } else {
          // un-premultiply & keep crisp alpha
          const k = a > 0 ? 255 / a : 0;
          img.data[i] = Math.min(255, px[src + x] * (a < 255 ? k : 1));
          img.data[i + 1] = Math.min(255, px[src + x + 1] * (a < 255 ? k : 1));
          img.data[i + 2] = Math.min(255, px[src + x + 2] * (a < 255 ? k : 1));
          img.data[i + 3] = a > 60 ? 255 : 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // pixel-art outline
    if (opts.outline !== false) outline(ctx, size, opts.outlineColor || [42, 30, 26]);
    return canvas;
  }
}

function outline(ctx, size, col) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : d[(y * size + x) * 4 + 3]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (A(x, y)) continue;
    if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) {
      const i = (y * size + x) * 4;
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(out, size, size), 0, 0);
}
