// No sun inside Mikawa-ya. The sun's shadow map only covers the garage (src/world/Garage.js), so anything that is not
// shadowed by it gets the full low sun, even indoors. The shop's own surfaces use "indoor" material variants
// (Town.indoor) that drop the sun, but everything else in there (the old man, the people who come in, the stock you
// pick up, your own hands) kept a regular material and washed out to white in daylight. This patch scales the
// directional lights by a factor of world position for *every* built-in lit material (standard, physical, lambert,
// phong, toon): 0 inside the shop, 1 everywhere else, with a short soft edge. Hemisphere light, the environment probe
// and point lights (the shop's lamp) are untouched, so whatever is inside is lit like the room around it.
// Installed at import time (src/core/renderer.js imports it), before anything is compiled.
//
// Not used for the off-map interiors (src/places: bedroom, Ramen Yamada; src/growth): their rooms are lit by a fake lamp
// in their own materials (places.mat), which people and hands don't have, so without the sun they would go dark.
import * as THREE from 'three';

let installed = false;

export function installSunMask() {
  if (installed) return;
  const C = THREE.ShaderChunk;
  const LINE = 'getDirectionalLightInfo( directionalLight, directLight );';
  if (!C.lights_pars_begin || !C.lights_fragment_begin?.includes(LINE)) return;
  installed = true;
  C.lights_pars_begin += `
float indoorSun( vec3 p ) {
  // Mikawa-ya's shop floor (src/world/CornerShop.js MK: inside the walls, up to the ceiling)
  vec3 a = smoothstep( vec3( -15.2, -1.0, 15.18 ), vec3( -15.0, -0.8, 15.38 ), p ) * ( 1.0 - smoothstep( vec3( -9.85, 2.9, 19.5 ), vec3( -9.65, 3.1, 19.7 ), p ) );
  return 1.0 - a.x * a.y * a.z;
}
`;
  C.lights_fragment_begin = `float indoorSunK = 1.0;
#if NUM_DIR_LIGHTS > 0
indoorSunK = indoorSun( cameraPosition - vViewPosition * mat3( viewMatrix ) );
#endif
${C.lights_fragment_begin.replace(LINE, `${LINE}\n\t\tdirectLight.color *= indoorSunK;`)}`;
}

installSunMask();
