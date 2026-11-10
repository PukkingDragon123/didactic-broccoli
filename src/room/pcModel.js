// Your own home PC (a putty-grey "CAPSULE-PC 98"): CRT monitor, keyboard, mouse, tower and speaker modelled in
// src/props/things/pc.js, plus the curved CRT screen (canvas texture through a scanline shader) and its glass.
import * as THREE from 'three';
import { pcDeskMesh, pcMouseMesh } from '../props/things/pc.js';

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
  const desk = pcDeskMesh('room');
  desk.castShadow = false;
  root.add(desk);
  const mouse = pcMouseMesh('room');
  mouse.position.set(0.3, 0, 0.29); mouse.rotation.y = 0.2; mouse.castShadow = false;
  root.add(mouse);
  const monitor = desk;

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
