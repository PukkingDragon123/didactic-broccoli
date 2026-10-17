// The old beige PC on the desk: voxel hardware, a curved CRT screen shader, and "PC mode"
// (camera glides to the monitor, a virtual mouse cursor drives the E-Mart website).
import * as THREE from 'three';
import { VoxelModel, glow, metal, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { Site } from './site.js';
import { W, H } from './ui.js';
import { hash2 } from '../core/util.js';
import { Game } from '../game/Game.js';
import { placeOpenerTool, placeCharms } from '../game/shop.js';

const BEIGE = 0xe6dcc4, BEIGE_D = 0xcfc3a6, BEIGE_Y = 0xd9c99c;

function monitorModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  // base + neck
  v.box(-12, 0, -12, 11, 2, 11, BEIGE_D);
  v.box(-5, 3, -6, 4, 6, 5, BEIGE_D);
  // body
  v.box(-20, 7, -4, 19, 42, 18, BEIGE);
  v.box(-16, 10, -20, 15, 38, -5, BEIGE_D); // tapered tube housing
  v.box(-12, 14, -22, 11, 34, -21, BEIGE_D);
  // vents on the back
  v.paint(() => { for (let y = 16; y < 34; y += 3) v.box(-10, y, -22, 9, y, -22, 0x9a8f78); });
  // screen recess
  v.box(-16, 13, 16, 15, 38, 18, null);
  v.box(-17, 12, 15, 16, 39, 15, 0x3a3630); // dark inner bezel
  // front details: power button, LED, badge, knobs
  v.box(13, 8, 18, 15, 10, 18, BEIGE_D);
  v.set(11, 9, 18, glow(0x40ff60));
  v.box(-15, 8, 18, -8, 10, 18, 0xbfb398);
  v.project(['K.KK.K', 'KKK.KK'], { K: 0x6a5f48 }, -15, 10);
  // yellowed patches
  v.paint(() => {
    for (let x = -20; x <= 19; x++) for (let y = 7; y <= 42; y++) if (hash2(x, y) < 0.06) v.set(x, y, 18, BEIGE_Y);
  });
  // sticky notes on the bezel
  v.box(17, 30, 18, 19, 33, 19, 0xffe866);
  v.box(-20, 36, 18, -18, 39, 19, 0xff9fd0);
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
  v.box(-18, 3, 8, 13, 3, 10, 0xf2ead6); // space bar
  v.box(26, 3, -8, 33, 3, 10, 0xd8ccb0); // numpad block
  return v;
}

function towerModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(-9, 0, -20, 9, 40, 20, BEIGE);
  v.box(-7, 30, 21, 7, 32, 21, 0x3a3630); // floppy
  v.box(-7, 25, 21, 7, 27, 21, 0x5a5448); // cd
  v.box(-2, 12, 21, 1, 15, 21, BEIGE_D); // power
  v.set(4, 10, 21, glow(0x40ff60));
  v.set(6, 10, 21, glow(0xffa040));
  v.project(['KKKK', 'K..K', 'KKKK'], { K: 0x9a8f78 }, -6, 6);
  v.paint(() => { for (let y = 2; y < 8; y += 2) v.box(-7, y, 20, 7, y, 20, 0xbfb398); });
  return v;
}

function mouseModel() {
  const v = new VoxelModel();
  v.ellipsoid(0, 2, 0, 4, 2.5, 6, BEIGE);
  v.box(-4, -1, -6, 4, -1, 6, null);
  v.box(0, 3, 1, 0, 4, 6, 0x9a8f78);
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
  uniforms: { map: { value: map }, uTime: { value: 0 }, uPower: { value: 1 }, uBright: { value: 0.92 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D map; uniform float uTime, uPower, uBright; varying vec2 vUv;
    void main(){
      vec2 c = vUv*2.0-1.0;
      vec2 uv = c * (1.0 + dot(c,c)*0.022);
      uv = uv*0.5+0.5;
      if (uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) { gl_FragColor = vec4(0.012,0.012,0.014,1.0); return; }
      vec2 px = vec2(0.5/${W}.0, 0.0);
      vec3 col = texture2D(map, uv).rgb * 0.8 + texture2D(map, uv+px).rgb*0.1 + texture2D(map, uv-px).rgb*0.1;
      float scan = 0.93 + 0.07*sin(uv.y*${H}.0*6.28318);
      float mask = 0.93 + 0.07*sin(gl_FragCoord.x*2.094);
      col *= scan * mask;
      float vig = smoothstep(1.45, 0.55, length(c*vec2(0.9,1.0)));
      col *= vig;
      float roll = 0.97 + 0.03*sin(uv.y*3.0 - uTime*2.0);
      col *= roll * uPower * uBright;
      col += vec3(0.012,0.018,0.02) * uPower; // phosphor glow floor
      gl_FragColor = vec4(col, 1.0);
    }`,
});

export async function installPC(game) {
  const D = game.garage.pcDesk;
  const root = new THREE.Group();
  root.position.set(D.x + 0.08, D.h, D.z + 0.05);
  root.rotation.y = -Math.PI / 2;
  game.scene.add(root);
  const mats = voxelMaterials('normal');
  const mk = (model, vs, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(meshVoxels(model, { voxelSize: vs }), mats);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const monitor = mk(monitorModel(), 0.01, 0, 0, -0.02);
  mk(keyboardModel(), 0.006, 0, 0, 0.3);
  mk(mouseModel(), 0.006, 0.3, 0, 0.32, 0.2);
  mk(towerModel(), 0.01, -0.56, 0, -0.08);
  mk(speakerModel(), 0.01, 0.36, 0, 0.0, -0.2);
  // mouse pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.17), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.9 }));
  pad.position.set(0.3, 0.002, 0.32);
  root.add(pad);
  // mug
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.6 }));
  mug.position.set(-0.3, 0.045, 0.3);
  mug.castShadow = true;
  root.add(mug);

  // screen
  const canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2; // drawn at 2x for crisp text, logical size stays 640x480
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const sw = 0.31, sh = 0.24;
  const sg = new THREE.PlaneGeometry(sw, sh, 16, 12);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (sw / 2), y = pos.getY(i) / (sh / 2);
    pos.setZ(i, -0.004 * (x * x + y * y));
  }
  sg.computeVertexNormals();
  const screenMat = crtShader(tex);
  const screen = new THREE.Mesh(sg, screenMat);
  screen.position.set(0, 0.255, 0.172 - 0.02 + 0.012);
  screen.userData.noRim = true;
  root.add(screen);
  // glass reflection layer
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, clearcoat: 1, depthWrite: false, envMapIntensity: 1.5 });
  const glassS = new THREE.Mesh(sg, glassM);
  glassS.position.copy(screen.position).add(new THREE.Vector3(0, 0, 0.002));
  glassS.userData.noRim = true;
  root.add(glassS);
  const screenLight = new THREE.PointLight(0xbfd8ff, 0.5, 2.2, 1.6);
  screenLight.position.set(0, 0.08, 0.45);
  root.add(screenLight);

  const site = new Site(game, canvas);
  const pc = {
    active: false, site, screen, root, tex, light: screenLight, redrawT: 0, cursor: site.mouse,
    enter() {
      if (this.active) return;
      this.active = true;
      game.player.frozen = true;
      root.updateMatrixWorld(true);
      const c = screen.getWorldPosition(new THREE.Vector3());
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()));
      const p = c.clone().addScaledVector(n, 0.275);
      const m = new THREE.Matrix4().lookAt(p, c, new THREE.Vector3(0, 1, 0));
      game.player.lookOverride = { pos: p, quat: new THREE.Quaternion().setFromRotationMatrix(m), fovDelta: 18 };
      document.getElementById('crosshair').classList.add('hidden-ch');
      glassS.visible = false;
      game.interaction.setHint(null);
      audio.play('uiClick', { vol: 0.8 });
      if (!site.booted) { audio.play('crtOn', { vol: 0.7 }); setTimeout(() => audio.play('modem', { vol: 0.6 }), 250); }
      site.mouse.x = W / 2; site.mouse.y = H / 2;
      this.enteredFrame = game.frame;
    },
    exit() {
      if (!this.active) return;
      this.active = false;
      game.player.frozen = false;
      game.player.lookOverride = null;
      document.getElementById('crosshair').classList.remove('hidden-ch');
      glassS.visible = true;
      audio.play('uiClick', { vol: 0.6 });
      game.save();
    },
  };
  site.onExit = () => pc.exit();
  game.pc = pc;

  game.interaction.add(root, {
    highlight: monitor,
    hint: (held) => (held ? null : { key: 'L', text: 'パソコン · Use the PC', sub: 'ガチャマート E-Mart: order, upgrade, sell' }),
    use: (held) => { if (!held) pc.enter(); return false; },
  });

  // restore persistent visuals bought earlier
  placeOpenerTool(game, false);
  placeCharms(game);

  Game.updaters.push((g, dt) => {
    const inp = g.input;
    screenMat.uniforms.uTime.value = g.time;
    if (pc.active) {
      if (inp.locked) {
        const s = 0.85 * inp.sensitivity;
        site.mouse.x = Math.max(0, Math.min(W - 1, site.mouse.x + inp.mouse.dx * s));
        site.mouse.y = Math.max(0, Math.min(H - 1, site.mouse.y + inp.mouse.dy * s));
        if (inp.buttonDown(0) && g.frame > pc.enteredFrame) site.click();
        if (inp.mouse.wheel) site.wheel(inp.mouse.wheel);
        if (inp.buttonDown(2) || inp.keyPressed('KeyE') || inp.keyPressed('Backspace') || inp.keyPressed('KeyQ') || inp.keyPressed('Tab')) pc.exit();
      }
      pc.redrawT -= dt; pc.acc = (pc.acc || 0) + dt;
      if (pc.redrawT <= 0) { pc.redrawT = 1 / 40; site.draw(pc.acc, true); pc.acc = 0; tex.needsUpdate = true; }
      screenLight.intensity = 0.7;
    } else {
      pc.redrawT -= dt; pc.acc = (pc.acc || 0) + dt;
      if (pc.redrawT <= 0) {
        pc.redrawT = 0.12;
        site.draw(pc.acc, false); pc.acc = 0;
        tex.needsUpdate = true;
      }
      screenLight.intensity = 0.35;
    }
  });
}
