// The room light patch for every built-in lit material (standard, physical, lambert, phong), installed at import time
// (src/main.js imports it first, src/core/renderer.js again for other pages) before anything is compiled. It gives the
// interiors real bounce light and room reflections, driven by src/gfx/roomGI.js through the shared uniforms GI:
//
// 1. Indirect light from an irradiance volume: inside the active room's box, the flat sky / hemisphere fill and the
//    environment's diffuse term are replaced by the light the room itself bounces around, baked into a grid of probes
//    (L1 spherical harmonics in a 3D texture, trilinear). Corners, the floor under a counter and the back of a shelf go
//    dark, a red wall tints what is near it, a sunlit floor lights the ceiling above it. The box edge fades over 15 cm
//    so nothing outside the room ever reads it (the lane seen through the shutter keeps its sky light).
// 2. Box-projected reflections: the environment (the room's own reflection probe, baked by roomGI) is looked up
//    where the reflected ray meets the room's walls instead of at infinity, so a waxed floor or a lacquered counter
//    mirrors the room in the right place.
//
// Uniform plumbing: the GLSL sits in the shared chunks (one program per material as before), behind `#define GG_GI`,
// which a hook on Material.prototype.onBeforeCompile adds (with the shared uniform objects) to every built-in lit
// material when its program is built. Materials that set their own onBeforeCompile keep it (the hook wraps it, and the
// wrapper's toString keeps the program cache keys apart). ShaderMaterials never get the define, so a custom shader
// that includes the light chunks compiles exactly as before.
import * as THREE from 'three';

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** The shared uniforms (roomGI writes them once per frame; every lit material reads them). */
export const GI = {
  ggPVTex: { value: null },
  ggPVOn: { value: 0 }, ggPVK: { value: 1 },
  ggPVMin: { value: v3() }, ggPVStep: { value: v3(1, 1, 1) }, ggPVRes: { value: v3(2, 2, 2) }, ggPVBias: { value: 0.25 },
  ggBoxMin: { value: v3(1e9, 1e9, 1e9) }, ggBoxMax: { value: v3(-1e9, -1e9, -1e9) },
  ggEnvBox: { value: 0 }, ggEnvPos: { value: v3() }, ggEnvMin: { value: v3() }, ggEnvMax: { value: v3() },
};

const PARS = /* glsl */`
#ifdef GG_GI
uniform highp sampler3D ggPVTex;
uniform float ggPVOn, ggPVK, ggPVBias, ggEnvBox;
uniform vec3 ggPVMin, ggPVStep, ggPVRes, ggBoxMin, ggBoxMax, ggEnvPos, ggEnvMin, ggEnvMax;
// 1 inside the room's box, 0 past its walls (a short soft edge)
float ggBoxW( vec3 p ) {
	vec3 d = min( p - ggBoxMin, ggBoxMax - p );
	return smoothstep( -0.15, 0.05, min( min( d.x, d.y ), d.z ) );
}
// irradiance from one volume: three blocks of slices, one per colour channel, each (L00, L1y, L1z, L1x)
// (one sampler only: lit materials are already close to the texture-unit and varying limits of some GPUs)
vec3 ggSH( vec3 uvw, vec4 b ) {
	vec4 r = texture( ggPVTex, vec3( uvw.xy, uvw.z * ( 1.0 / 3.0 ) ) );
	vec4 g = texture( ggPVTex, vec3( uvw.xy, ( uvw.z + 1.0 ) * ( 1.0 / 3.0 ) ) );
	vec4 c = texture( ggPVTex, vec3( uvw.xy, ( uvw.z + 2.0 ) * ( 1.0 / 3.0 ) ) );
	return max( vec3( dot( r, b ), dot( g, b ), dot( c, b ) ), vec3( 0.0 ) );
}
vec3 ggIrradiance( vec3 p, vec3 n ) {
	// (clamped to the probe grid: a texel centre in its own block, so the channels never blend into each other)
	vec3 uvw = ( clamp( ( p - ggPVMin ) / ggPVStep, vec3( 0.0 ), ggPVRes - 1.0 ) + 0.5 ) / ggPVRes;
	vec4 b = vec4( 0.886227, 1.023328 * n.y, 1.023328 * n.z, 1.023328 * n.x );
	return ggSH( uvw, b ) * ggPVK;
}
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
// the environment seen along a reflected ray that ends on the room's walls (box projection)
vec3 ggIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 wp ) {
	vec3 r = reflect( - viewDir, normal );
	r = normalize( mix( r, normal, pow4( roughness ) ) );
	r = transformDirectionByInverseViewMatrix( r, viewMatrix );
	vec3 rr = r + vec3( 1e-5 );
	vec3 f = max( ( ggEnvMax - wp ) / rr, ( ggEnvMin - wp ) / rr );
	float t = min( min( f.x, f.y ), f.z );
	// (rough surfaces blur toward the plain lookup: the projection is only exact for a mirror)
	vec3 pr = normalize( mix( wp + r * t - ggEnvPos, r, roughness * roughness ) );
	return textureCubeUV( envMap, envMapRotation * pr, roughness ).rgb * envMapIntensity;
}
#endif
#endif
`;

// (after the stock indirect terms: the room's volume and box projection take over inside its box)
const MAPS_GI = /* glsl */`
#if defined( GG_GI ) && defined( RE_IndirectDiffuse )
	if ( ggPVOn > 0.0 || ggEnvBox > 0.0 ) {
		vec3 ggW = cameraPosition + ( vec4( geometryPosition, 0.0 ) * viewMatrix ).xyz;
		vec3 ggN = normalize( ( vec4( geometryNormal, 0.0 ) * viewMatrix ).xyz );
		// (weighed a little off the surface, along its normal: a wall's room side is in, its outside face is not, so the
		// room's light never shows on the building's exterior)
		float ggIn = ggBoxW( ggW + ggN * ggPVBias );
		float ggK = ggPVOn * ggIn;
		if ( ggK > 0.0 ) {
			vec3 ggE = ggIrradiance( ggW + ggN * ggPVBias, ggN );
			iblIrradiance = mix( iblIrradiance, ggE, ggK );
			irradiance *= 1.0 - ggK;
		}
		#if defined( STANDARD ) && defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV ) && defined( RE_IndirectSpecular ) && ! defined( USE_ANISOTROPY )
		if ( ggEnvBox * ggIn > 0.0 ) radiance = mix( radiance, ggIBLRadiance( geometryViewDir, geometryNormal, material.roughness, ggW ), ggEnvBox * ggIn );
		#endif
	}
#endif
`;

let installed = false;
export function installGIShader() {
  if (installed) return;
  const C = THREE.ShaderChunk;
  if (!C.lights_pars_begin || !C.lights_fragment_maps || !C.envmap_physical_pars_fragment) return;
  installed = true;
  C.lights_pars_begin += PARS;
  C.lights_fragment_maps += MAPS_GI;
  hookMaterials();
}

// ------------------------------------------------------------------ the onBeforeCompile hook
const OWN = Symbol('ggOnBeforeCompile');
const WRAP = new WeakMap();
const LIT = (m) => !!m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
function inject(m, shader) {
  if (!LIT(m)) return;
  Object.assign(shader.uniforms, GI);
  if (!shader.fragmentShader.includes('#define GG_GI')) shader.fragmentShader = '#define GG_GI\n' + shader.fragmentShader;
}
function wrap(fn) {
  let w = WRAP.get(fn);
  if (!w) {
    w = function (shader, renderer) { fn.call(this, shader, renderer); if (this) inject(this, shader); }; // (called bare by a wrapping hook: the outer material injects)
    const src = 'gg-gi|' + fn.toString();
    w.toString = () => src; // (Material.customProgramCacheKey: one key per original function, as before)
    w.ggOriginal = fn;
    WRAP.set(fn, w);
  }
  return w;
}
function hookMaterials() {
  const P = THREE.Material.prototype;
  const base = Object.getOwnPropertyDescriptor(P, 'onBeforeCompile')?.value || function onBeforeCompile() {};
  Object.defineProperty(P, 'onBeforeCompile', {
    configurable: true,
    get() { return wrap(this[OWN] || base); },
    set(fn) { this[OWN] = typeof fn === 'function' ? (fn.ggOriginal || fn) : fn; },
  });
}

installGIShader();
