// The shared light patch for every built-in lit material (standard, physical, lambert, phong), installed at import time
// (src/core/renderer.js imports it) before anything is compiled. Three parts:
//
// 1. No sun inside Mikawa-ya. The sun's shadow map only covers the garage (src/world/Garage.js), so anything that is not
//    shadowed by it gets the full low sun, even indoors. The shop's own surfaces use "indoor" material variants
//    (Town.indoor) that drop the sun, but everything else in there (the old man, the people who come in, the stock you
//    pick up, your own hands) kept a regular material and washed out to white in daylight. This scales the directional
//    lights by a factor of world position: 0 inside the shop, 1 everywhere else, with a short soft edge. Hemisphere
//    light, the environment probe and point lights (the shop's lamp) are untouched, so whatever is inside is lit like
//    the room around it.
// 2. Tinted shadows (the cartoon look): where the sun / moon is shadowed, a soft lilac share of it still gets through
//    (SHADOW_TINT), so cast shadows are lighter and cool instead of black. The off-map interiors and Town.indoor
//    materials switch the directional lights off entirely, so they never see it.
// 3. A soft toon ramp on direct light: N.L of every direct light (sun, moon, lamps, the light pool) is pulled toward
//    three soft steps (dark / half / full), mixed with the smooth term so voxel faces keep their form. Flat faces under
//    the sun just get flatter shading; round things (people, capsules, figures) show two soft cel bands.
//
// Not used for the off-map interiors' own fake lamp (src/places: bedroom, Ramen Yamada; src/growth): their rooms are lit
// by a term in their own materials (places.mat), which people and hands don't have, so without the sun they would go dark.
import * as THREE from 'three';

let installed = false;

// lilac light that still reaches into the sun's shadow (fraction of the sun's colour, per channel)
export const SHADOW_TINT = [0.34, 0.33, 0.47];
// how strongly N.L is pulled toward the steps (0 = smooth Lambert, 1 = hard cel)
export const TOON = 0.6;
const f = (v) => v.toFixed(3);

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
// soft cel ramp: unlit / half / full, with soft edges, mixed with the smooth term
float toonNL( float x ) {
  float s = 0.5 * smoothstep( 0.0, 0.07, x ) + 0.5 * smoothstep( 0.36, 0.5, x );
  return mix( x, s, ${f(TOON)} );
}
`;
  let begin = C.lights_fragment_begin.replace(LINE, `${LINE}\n\t\tdirectLight.color *= indoorSunK;`);
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
}

installSunMask();
