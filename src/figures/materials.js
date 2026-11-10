// Materials for sculpted figures: one pair per series atlas and finish, [0] the painted plastic, [1] clear parts.
// They are ordinary standard / physical materials, so the renderer's cel ramp, lilac shadows and ink outlines apply.
// The special finishes are cel materials too: instead of a smooth environment reflection, the surface colour is
// replaced by a few hard bands read from the view-space reflection (chrome and gold: ground, horizon line, sky, hot
// white), from the angle to the eye (clear plastic thickens towards its edges; aurora steps through four pearl
// colours) or from the facet itself (diamond: cut faces that flash).
import * as THREE from 'three';
import { glowUniform, timeUniform } from '../voxel/materials.js';

const HEAD = /* glsl */`
  vec3 fV = normalize( vViewPosition );
  vec3 fN = normalize( normal );
  float fNV = clamp( dot( fN, fV ), 0.0, 1.0 );
  float fUp = reflect( -fV, fN ).y * 0.5 + 0.5;
  float fLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float fDet = smoothstep( 0.02, 0.5, fLum );`;
// a hard step with one pixel of softness
const STEP = 'float fstep( float e, float x ) { float w = max( fwidth( x ), 1e-4 ); return smoothstep( e - w, e + w, x ); }';

// bands from the bottom of the reflection to the top: [edge, colour] pairs (colour above the edge)
function bands(name, list) {
  let s = `vec3 ${name} = vec3( ${list[0][1].join(', ')} );\n`;
  for (let i = 1; i < list.length; i++) s += `  ${name} = mix( ${name}, vec3( ${list[i][1].join(', ')} ), fstep( ${list[i][0].toFixed(3)}, fUp ) );\n`;
  return s;
}
const f3 = (a) => a.map((v) => v.toFixed(3));

const FINISH = {
  metallic: {
    params: { roughness: 0.34, metalness: 0.0 },
    color: `${bands('fB', [[0, f3([0.34, 0.36, 0.46])], [0.3, f3([0.62, 0.64, 0.72])], [0.455, f3([0.16, 0.17, 0.26])], [0.5, f3([0.66, 0.76, 0.92])], [0.72, f3([0.97, 0.99, 1.0])]])}
  diffuseColor.rgb = fB * mix( vec3( 1.0 ), diffuseColor.rgb / max( fLum, 0.08 ), 0.16 ) * ( 0.42 + 0.58 * fDet );`,
    emissive: 'totalEmissiveRadiance += diffuseColor.rgb * 0.1;',
  },
  gold: {
    params: { roughness: 0.36, metalness: 0.0 },
    color: `${bands('fB', [[0, f3([0.62, 0.36, 0.08])], [0.3, f3([0.9, 0.64, 0.18])], [0.455, f3([0.42, 0.22, 0.04])], [0.5, f3([1.0, 0.8, 0.3])], [0.72, f3([1.0, 0.95, 0.7])]])}
  diffuseColor.rgb = fB * ( 0.45 + 0.55 * fDet );`,
    emissive: 'totalEmissiveRadiance += diffuseColor.rgb * vec3( 0.14, 0.1, 0.04 );',
  },
  glow: {
    params: { roughness: 0.6, metalness: 0.0 },
    color: `float fG = pow( clamp( fLum * 1.4, 0.0, 1.0 ), 0.6 );
  gcol = mix( vec3( 0.05, 0.35, 0.12 ), vec3( 0.45, 1.0, 0.55 ), fG );
  diffuseColor.rgb = mix( vec3( 0.36, 0.5, 0.36 ), vec3( 0.84, 1.0, 0.78 ), fG );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.8, 0.95, 0.82 ), 1.0 - fstep( 0.4, fNV ) );`,
    emissive: 'totalEmissiveRadiance += gcol * uGlow;',
  },
  clear: {
    physical: true,
    params: { roughness: 0.08, metalness: 0.0, transparent: true, opacity: 1, clearcoat: 1, clearcoatRoughness: 0.05 },
    color: `diffuseColor.rgb = clamp( mix( vec3( fLum ), diffuseColor.rgb, 1.5 ) * 1.2, 0.0, 1.0 );
  float fT = 1.0 - fstep( 0.42, fNV );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 0.72, fT );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), 0.55 * fstep( 0.86, fUp ) );
  diffuseColor.a = mix( 0.5, 0.86, fT ) + 0.3 * fstep( 0.86, fUp ) + 0.25 * ( 1.0 - fDet );`,
  },
  aurora: {
    params: { roughness: 0.3, metalness: 0.0 },
    color: `float fH = fract( fNV * 1.25 + fN.y * 0.3 + fN.x * 0.2 + uTime * 0.04 ) * 4.0;
  vec3 fP = vec3( 1.0, 0.74, 0.88 );
  fP = mix( fP, vec3( 0.72, 1.0, 0.88 ), fstep( 1.0, fH ) );
  fP = mix( fP, vec3( 0.72, 0.86, 1.0 ), fstep( 2.0, fH ) );
  fP = mix( fP, vec3( 0.88, 0.78, 1.0 ), fstep( 3.0, fH ) );
  fP = mix( fP, vec3( 1.0, 0.74, 0.88 ), fstep( 3.97, fH ) );
  diffuseColor.rgb = mix( fP, vec3( 1.0 ), 0.25 * fstep( 0.8, fUp ) ) * ( 0.5 + 0.5 * fDet );`,
    emissive: 'totalEmissiveRadiance += diffuseColor.rgb * 0.12;',
  },
  diamond: {
    physical: true, flat: true,
    params: { roughness: 0.05, metalness: 0.0, transparent: true, opacity: 1, clearcoat: 1, clearcoatRoughness: 0.02 },
    color: `float fS = fract( dot( fN, vec3( 3.1, 5.3, 2.7 ) ) + fV.x * 1.7 + fV.y * 1.3 + uTime * 0.06 );
  vec3 fI = mix( vec3( 0.58, 0.78, 0.98 ), vec3( 0.86, 0.95, 1.0 ), fstep( 0.3, fS ) );
  fI = mix( fI, vec3( 1.0 ), fstep( 0.72, fS ) );
  vec3 fR = 0.5 + 0.5 * cos( 6.2831 * ( floor( fS * 6.0 ) / 6.0 + vec3( 0.0, 0.33, 0.67 ) ) );
  fI = mix( fI, mix( fI, fR, 0.5 ), fstep( 0.9, fS ) );
  diffuseColor.rgb = fI * ( 0.62 + 0.38 * fDet );
  diffuseColor.a = 0.7 + 0.3 * fstep( 0.72, fS );`,
    emissive: 'totalEmissiveRadiance += diffuseColor.rgb * ( 0.1 + 0.3 * fstep( 0.72, fS ) );',
  },
};

function finished(mat, key, def) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glowUniform; sh.uniforms.uTime = timeUniform;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform float uGlow;\nuniform float uTime;\n${STEP}\nvoid main() {\n  vec3 gcol = vec3( 0.0 );`)
      .replace('#include <emissivemap_fragment>', `${HEAD}\n  ${def.color}\n#include <emissivemap_fragment>\n  ${def.emissive || ''}`);
  };
  mat.customProgramCacheKey = () => 'figfinish-' + key;
  return mat;
}

const cache = new WeakMap();
/** [painted, clear] materials of an atlas for a finish (shared and cached). */
export function figureMaterials(atlas, finish = 'normal') {
  let by = cache.get(atlas);
  if (!by) cache.set(atlas, by = new Map());
  let m = by.get(finish);
  if (m) return m;
  const map = atlas.texture(), roughnessMap = atlas.roughTexture();
  const def = FINISH[finish];
  if (!def) {
    const body = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.55 });
    body.name = 'figure';
    const clear = new THREE.MeshPhysicalMaterial({ map, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 });
    clear.name = 'figure-clear';
    m = [body, clear];
  } else {
    const M = def.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const mat = finished(new M({ map, envMapIntensity: 0.5, flatShading: !!def.flat, ...def.params }), finish, def);
    mat.name = 'figure-' + finish;
    m = [mat, mat];
  }
  by.set(finish, m);
  return m;
}
