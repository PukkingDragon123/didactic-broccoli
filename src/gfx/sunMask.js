// The shared light patch for every built-in lit material (standard, physical, lambert, phong), installed at import
// time (src/core/renderer.js imports it) before anything is compiled. The renderer contract in docs/ART.md describes it
// for people making models. The look is realistic lighting with a light cel accent, not a hard toon shader:
//
// 1. No sun inside Mikawa-ya. The sun's shadow map only covers the garage (src/world/Garage.js), so anything that is not
//    shadowed by it gets the full low sun, even indoors. The shop's own surfaces use "indoor" material variants
//    (Town.indoor) that drop the sun, but everything else in there (the old man, the people who come in, the stock you
//    pick up, your own hands) kept a regular material and washed out to white in daylight. This scales the directional
//    lights by a factor of world position: 0 inside the shop, 1 everywhere else, with a short soft edge. Hemisphere
//    light, the environment probe and point lights (the shop's lamp) are untouched, so whatever is inside is lit like
//    the room around it.
// 2. Tinted shadows: where the sun / moon is shadowed, a lilac share of it still gets through (SHADOW_TINT), so cast
//    shadows are light and cool, never black. Their edge is the shadow map's own soft one.
// 3. A soft cel ramp on the key light only: N.L of the sun / moon is pulled part of the way (TOON) toward three wide,
//    soft-edged steps (shade / half / full), so round things show a gentle band and flat faces keep their natural
//    shading. Local lights (lamps, tubes, lanterns, the light pool) are plain smooth Lambert with their natural
//    falloff: no steps, so no rings or discs on walls, floors and ceilings.
// 4. Speculars are the physical ones (GGX by roughness): soft highlights that read as the material. Nothing is drawn
//    as a hard disc.
// 5. Ink opt-out: an opaque material with the NO_INK define (noInk(material)) writes alpha 0, which the outline pass
//    (src/core/renderer.js) reads as "no ink on this surface".
//
// Not used for the off-map interiors' own fake lamp (src/places: bedroom, Ramen Yamada; src/growth): their rooms are lit
// by a term in their own materials (places.mat), which people and hands don't have, so without the sun they would go dark.
import * as THREE from 'three';

let installed = false;

// lilac light that still reaches into the sun's shadow (fraction of the sun's colour, per channel)
export const SHADOW_TINT = [0.34, 0.33, 0.47];
// how far the key light's N.L is pulled toward the steps (0 = smooth Lambert, 1 = hard cel)
export const TOON = 0.5;
// the steps: [N.L where the half band starts, where it is reached, where the full band starts, where it is reached]
export const BANDS = [0.0, 0.14, 0.34, 0.58];
const f = (v) => v.toFixed(3);

/** Flag a material so the ink outline pass leaves its surfaces alone (foliage cards, chain-link, fine cut-outs). */
export function noInk(material) {
  material.defines = { ...(material.defines || {}), NO_INK: '' };
  material.needsUpdate = true;
  return material;
}

export function installSunMask() {
  if (installed) return;
  const C = THREE.ShaderChunk;
  const LINE = 'getDirectionalLightInfo( directionalLight, directLight );';
  const DOTNL = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
  const SHADOW = /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? (getShadow\( directionalShadowMap\[ i \][^;]*\)) : 1\.0;/;
  if (!C.lights_pars_begin || !C.lights_fragment_begin?.includes(LINE)) return;
  installed = true;
  C.lights_pars_begin += `
float indoorSun( vec3 p ) {
  // Mikawa-ya's shop floor (src/world/CornerShop.js MK: inside the walls, up to the ceiling)
  vec3 a = smoothstep( vec3( -15.2, -1.0, 15.18 ), vec3( -15.0, -0.8, 15.38 ), p ) * ( 1.0 - smoothstep( vec3( -9.85, 2.9, 19.5 ), vec3( -9.65, 3.1, 19.7 ), p ) );
  return 1.0 - a.x * a.y * a.z;
}
// the soft cel ramp, for the key light only (celKey is set per light loop): local lights stay smooth
float celKey = 0.0;
float toonNL( float x ) {
  float s = 0.5 * smoothstep( ${f(BANDS[0])}, ${f(BANDS[1])}, x ) + 0.5 * smoothstep( ${f(BANDS[2])}, ${f(BANDS[3])}, x );
  return mix( x, s, ${f(TOON)} * celKey );
}
`;
  let begin = C.lights_fragment_begin.replace(LINE, `${LINE}\n\t\tdirectLight.color *= indoorSunK;`);
  for (const [decl, v] of [['PointLight pointLight;', 0], ['SpotLight spotLight;', 0], ['DirectionalLight directionalLight;', 1]]) {
    if (begin.includes(decl)) begin = begin.replace(decl, `${decl}\n\tcelKey = ${v}.0;`);
  }
  if (SHADOW.test(begin)) begin = begin.replace(SHADOW, `directLight.color *= mix( vec3( ${SHADOW_TINT.map(f).join(', ')} ), vec3( 1.0 ), ( directLight.visible && receiveShadow ) ? $1 : 1.0 );`);
  C.lights_fragment_begin = `float indoorSunK = 1.0;
#if NUM_DIR_LIGHTS > 0
indoorSunK = indoorSun( cameraPosition - vViewPosition * mat3( viewMatrix ) );
#endif
${begin}`;
  const TOONED = 'float dotNL = toonNL( saturate( dot( geometryNormal, directLight.direction ) ) );';
  for (const k of ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment', 'lights_phong_pars_fragment']) {
    if (C[k]?.includes(DOTNL)) C[k] = C[k].replace(DOTNL, TOONED);
  }
  // ink opt-out (opaque materials only: a blended material needs its alpha)
  if (C.opaque_fragment) C.opaque_fragment += `
#if defined( NO_INK ) && defined( OPAQUE )
gl_FragColor.a = 0.0;
#endif
`;
}

installSunMask();
