// Shared materials for voxel meshes, including the special collectible finishes.
import * as THREE from 'three';

/** Global uniform driving glow-in-the-dark intensity (animated by the game; boosted when lights dim). */
export const glowUniform = { value: 1.0 };
/** Global time uniform for shimmer effects. */
export const timeUniform = { value: 0 };

function remap(material, key, glsl, emissiveGlsl = '') {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = glowUniform;
    shader.uniforms.uTime = timeUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uGlow;\nuniform float uTime;\nvoid main() {\n  vec3 gcol = vec3(0.0);')
      .replace('#include <color_fragment>', `#include <color_fragment>\n${glsl}`);
    if (emissiveGlsl) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissiveGlsl}`);
    }
  };
  material.customProgramCacheKey = () => 'voxfinish-' + key;
  return material;
}

const LUM = 'float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));';
// view-dependent rainbow sheen (used by aurora / diamond)
const RAINBOW = `
  float fres = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
  vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (fres * 1.3 + vViewPosition.y * 0.8 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));`;

// ------------------------------------------------------------------ face detail
// Painted detail on voxel faces: the mesher writes a per-vertex 'vdet' (u, v in atlas tiles on the voxel grid, surface
// kind); the shader multiplies the face colour by the kind's tile of public/img/tex/voxdetail.png (CC0 scans, high-
// passed and posterised by tools/bake-voxdetail.py). Nearest up close (crisp texels), mipmapped and faded with distance
// so nothing shimmers. Kind 0 (people, collectibles, anything without a kind) is untouched.
const DETAIL_STRENGTH = [0.1, 0.15, 0.2, 0.2, 0.07, 0.1, 0.13, 0.08, 0.2, 0.2, 0.2, 0.24, 0.12, 0.2, 0.05];
let detailTex = null;
export function voxelDetailTexture() {
  if (detailTex) return detailTex;
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 1, 1);
  detailTex = new THREE.Texture(c);
  detailTex.magFilter = THREE.NearestFilter;
  detailTex.minFilter = THREE.LinearMipmapLinearFilter;
  detailTex.colorSpace = THREE.NoColorSpace;
  detailTex.anisotropy = 1;
  detailTex.needsUpdate = true;
  const img = new Image();
  img.onload = () => { detailTex.image = img; detailTex.needsUpdate = true; };
  img.src = `${import.meta.env?.BASE_URL ?? '/'}img/tex/voxdetail.png`;
  return detailTex;
}
export const voxelDetailUniform = { value: null };
const ST_DECL = `uniform sampler2D uVoxDetail;\nconst float VOX_ST[15] = float[15](${DETAIL_STRENGTH.map((v) => v.toFixed(3)).join(', ')});\n`;
// the detail term: uv in atlas tiles, kind 1..15, k = strength scale
const detailTerm = (uv, kind, k) => `
  if (${kind} > 0.5) {
    float vk = floor(${kind} + 0.5) - 1.0;
    vec2 duv = ${uv};
    vec2 tdx = dFdx(duv) * 128.0, tdy = dFdy(duv) * 128.0;
    float vlod = 0.5 * log2(max(max(dot(tdx, tdx), dot(tdy, tdy)), 1e-8));
    float vfade = 1.0 - smoothstep(1.2, 3.2, vlod);
    if (vfade > 0.0) {
      vec2 vcell = vec2(mod(vk, 4.0), 3.0 - floor(vk / 4.0));
      vec2 vuv = (vcell + clamp(fract(duv), 0.004, 0.996)) * 0.25;
      float vd = textureLod(uVoxDetail, vuv, clamp(vlod, 0.0, 3.0)).r;
      diffuseColor.rgb *= 1.0 + (vd - 0.5) * 2.0 * VOX_ST[int(vk)] * vfade * ${k};
    }
  }`;
/** Add the face-detail term to a voxel material's shader (call from onBeforeCompile; composes with other patches). */
export function patchVoxelDetail(shader) {
  voxelDetailUniform.value ||= voxelDetailTexture();
  shader.uniforms.uVoxDetail = voxelDetailUniform;
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', 'attribute vec3 vdet;\nvarying vec3 vVdet;\nvoid main() {\n  vVdet = vdet;');
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', `${ST_DECL}varying vec3 vVdet;\nvoid main() {`)
    .replace('#include <color_fragment>', `#include <color_fragment>${detailTerm('vVdet.xy', 'vVdet.z', '1.0')}`);
}
/**
 * The same detail on a pixel-art texture material (src/gfx/geo.js pixMat): `sub` detail texels per texture pixel, laid
 * on the texture's own pixel grid (so the grain sits inside the big pixels), kind = SURF id, k = strength scale.
 */
export function patchTextureDetail(shader, { kind, texPx, sub = 4, k = 0.7 }) {
  voxelDetailUniform.value ||= voxelDetailTexture();
  shader.uniforms.uVoxDetail = voxelDetailUniform;
  shader.uniforms.uDetK = { value: kind };
  shader.uniforms.uDetS = { value: [texPx[0] * sub / 128, texPx[1] * sub / 128] };
  shader.uniforms.uDetA = { value: k };
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', `${ST_DECL}uniform float uDetK;\nuniform vec2 uDetS;\nuniform float uDetA;\nvoid main() {`)
    .replace('#include <map_fragment>', `#include <map_fragment>${detailTerm('vMapUv * uDetS', 'uDetK', 'uDetA')}`);
}
function withDetail(m, key) {
  m.onBeforeCompile = (sh) => patchVoxelDetail(sh);
  m.customProgramCacheKey = () => 'voxdetail-' + key;
  m.userData.voxDetail = true;
  return m;
}

function makeNormalSet() {
  const matte = withDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.0 }), 'matte');
  const gloss = withDetail(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.15 }), 'gloss');
  const metalM = withDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 1.0 }), 'metal');
  const glowM = new THREE.MeshBasicMaterial({ vertexColors: true });
  glowM.color.setScalar(1.8);
  const glassM = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.42,
    clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false,
  });
  return [matte, gloss, metalM, glowM, glassM];
}

function single(m) { return [m, m, m, m, m]; }

const builders = {
  normal: makeNormalSet,
  metallic: () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.9, envMapIntensity: 2.6 });
    remap(m, 'metallic', `${LUM} diffuseColor.rgb = clamp(mix(vec3(lum), diffuseColor.rgb, 1.25) * 1.45 + 0.06, 0.0, 1.0);`);
    return single(m);
  },
  gold: () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.88, envMapIntensity: 2.8 });
    remap(m, 'gold', `${LUM}
      float g = pow(clamp(lum * 1.8, 0.0, 1.0), 0.5);
      diffuseColor.rgb = mix(vec3(0.55, 0.30, 0.05), vec3(1.0, 0.86, 0.42), g);`,
    'totalEmissiveRadiance += diffuseColor.rgb * vec3(0.16, 0.12, 0.05);');
    return single(m);
  },
  glow: () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 });
    remap(m, 'glow', `${LUM}
      float g = pow(clamp(lum * 1.4, 0.0, 1.0), 0.6);
      diffuseColor.rgb = mix(vec3(0.18, 0.32, 0.20), vec3(0.78, 1.0, 0.72), g);
      gcol = mix(vec3(0.05, 0.35, 0.12), vec3(0.45, 1.0, 0.55), g);`,
    'totalEmissiveRadiance += gcol * uGlow;');
    return single(m);
  },
  clear: () => {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.62,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5,
    });
    remap(m, 'clear', `${LUM} diffuseColor.rgb = clamp(mix(vec3(lum), diffuseColor.rgb, 1.6) * 1.35, 0.0, 1.0);`);
    return single(m);
  },
  aurora: () => {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.15, metalness: 0.5, iridescence: 1, iridescenceIOR: 1.8,
      iridescenceThicknessRange: [200, 900], clearcoat: 1, envMapIntensity: 2.2,
    });
    remap(m, 'aurora', `${LUM}
      float g = pow(clamp(lum * 1.5, 0.0, 1.0), 0.6);
      vec3 pearl = vec3(0.92, 0.88, 0.98);
      diffuseColor.rgb = mix(diffuseColor.rgb * 0.6 + 0.25, pearl, 0.5) * (0.55 + 0.5 * g);`,
    `${RAINBOW}\n  totalEmissiveRadiance += rainbow * (0.12 + 0.35 * fres * fres);`);
    return single(m);
  },
  diamond: () => {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.0, metalness: 0.05, transparent: true, opacity: 0.72,
      ior: 2.4, iridescence: 0.8, iridescenceIOR: 2.0, specularIntensity: 1, clearcoat: 1,
      envMapIntensity: 3.0,
    });
    remap(m, 'diamond', `${LUM}
      float g = pow(clamp(lum * 1.5, 0.0, 1.0), 0.5);
      diffuseColor.rgb = mix(vec3(0.55, 0.75, 0.95), vec3(0.97, 1.0, 1.0), g);`,
    `${RAINBOW}\n  totalEmissiveRadiance += diffuseColor.rgb * (0.06 + 0.04 * sin(uTime * 3.0)) + rainbow * 0.45 * pow(fres, 3.0);`);
    return single(m);
  },
};

const cache = new Map();
/** Material array (indexed by voxel material id) for a finish. Shared & cached. */
export function voxelMaterials(finish = 'normal') {
  let m = cache.get(finish);
  if (!m) {
    m = (builders[finish] || builders.normal)();
    cache.set(finish, m);
  }
  return m;
}
