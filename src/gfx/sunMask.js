// The shared light patch for every built-in lit material (standard, physical, lambert, phong), installed at import
// time (src/core/renderer.js imports it) before anything is compiled. The renderer contract in docs/ART.md describes it
// for people making models. The look is realistic lighting with a light cel touch on the sun only, not a toon shader:
//
// 1. No sun inside Mikawa-ya. The sun's shadow map only covers the garage (src/world/Garage.js), so anything that is not
//    shadowed by it gets the full low sun, even indoors. The shop's own surfaces use "indoor" material variants
//    (Town.indoor) that drop the sun, but everything else in there (the old man, the people who come in, the stock you
//    pick up, your own hands) kept a regular material and washed out to white in daylight. This scales the directional
//    lights by a factor of world position: 0 inside the shop, 1 everywhere else, with a short soft edge. Hemisphere
//    light, the environment probe and point lights (the shop's lamp) are untouched, so whatever is inside is lit like
//    the room around it.
// 2. Cast shadows: where the sun / moon is shadowed, a small cool share of it still gets through (SHADOW_TINT), the
//    light a real shadow gets back from the bright ground and walls around it. Shadows stay readable and a little lilac,
//    never black, with the shadow map's own soft edge.
// 3. A soft cel accent on the key light only: the sun / moon's N.L is mixed a little (TOON) with a soft two-step ramp
//    (shade / lit), which firms up the terminator on round things; flat faces keep their natural tone.
// 4. Local lights (lamps, tubes, lanterns, the light pool, spots) are plain physical light: smooth Lambert, a smooth
//    falloff that is softened near the source as if the lamp had a size (SOFT_R: no hot disc on the wall or ceiling a
//    lamp hangs by) and spot cones whose edge always fades out over most of the cone (no hard ring on the floor).
// 5. Speculars are physical (GGX by roughness) but direct light never makes a pin-point: its highlight is computed at a
//    roughness of at least SPEC_MIN (reflections of the environment keep the true roughness, so glass and chrome still
//    mirror the sky). Phong materials get the same cap on shininess. No toon dots.
// 6. Ink opt-out: an opaque material with the NO_INK define (noInk(material)) writes alpha 0, which the outline pass
//    (src/core/renderer.js) reads as "no ink on this surface".
//
// Not used for the off-map interiors' own fake lamp (src/places: bedroom, Ramen Yamada; src/growth): their rooms are lit
// by a term in their own materials (places.mat), which people and hands don't have, so without the sun they would go dark.
import * as THREE from 'three';

let installed = false;

// cool light that still reaches into the sun's shadow (fraction of the sun's colour, per channel)
export const SHADOW_TINT = [0.2, 0.2, 0.29];
// how much of the key light's N.L is the two-step ramp (0 = plain Lambert, 1 = hard cel)
export const TOON = 0.3;
// the ramp's soft step from shade to lit: [N.L where it starts, where it is fully lit]
export const BANDS = [0.0, 0.3];
// the size given to local lights (m): their falloff is 1 / (d^2 + SOFT_R^2)^(decay / 2), not 1 / d^decay
export const SOFT_R = 0.45;
// the sharpest a direct-light highlight may be (GGX roughness)
export const SPEC_MIN = 0.3;
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
  let pars = C.lights_pars_begin;
  // local lights: a lamp has a size, so the falloff never spikes into a hot disc right beside it
  const FALL = 'float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );';
  if (pars.includes(FALL)) pars = pars.replace(FALL, `float distanceFalloff = 1.0 / pow( lightDistance * lightDistance + ${f(SOFT_R * SOFT_R)}, 0.5 * decayExponent );`);
  // spot cones: the edge fades over at least 80% of the cone, whatever the light's penumbra
  const SPOT = 'return smoothstep( coneCosine, penumbraCosine, angleCosine );';
  if (pars.includes(SPOT)) pars = pars.replace(SPOT, 'return smoothstep( coneCosine, max( penumbraCosine, mix( coneCosine, 1.0, 0.8 ) ), angleCosine );');
  C.lights_pars_begin = pars + `
float indoorSun( vec3 p ) {
  // Mikawa-ya's shop floor (src/world/CornerShop.js MK: inside the walls, up to the ceiling)
  vec3 a = smoothstep( vec3( -15.2, -1.0, 15.18 ), vec3( -15.0, -0.8, 15.38 ), p ) * ( 1.0 - smoothstep( vec3( -9.85, 2.9, 19.5 ), vec3( -9.65, 3.1, 19.7 ), p ) );
  return 1.0 - a.x * a.y * a.z;
}
// the soft two-step accent, for the key light only (celKey is set per light loop): local lights stay smooth
float celKey = 0.0;
float toonNL( float x ) {
  return mix( x, smoothstep( ${f(BANDS[0])}, ${f(BANDS[1])}, x ), ${f(TOON)} * celKey );
}
`;
  let begin = C.lights_fragment_begin.replace(LINE, `${LINE}\n\t\tdirectLight.color *= indoorSunK;`);
  for (const [decl, v] of [['PointLight pointLight;', 0], ['SpotLight spotLight;', 0], ['RectAreaLight rectAreaLight;', 0], ['DirectionalLight directionalLight;', 1]]) {
    if (begin.includes(decl)) begin = begin.replace(decl, `${decl}\n\tcelKey = ${v}.0;`);
  }
  if (SHADOW.test(begin)) begin = begin.replace(SHADOW, `directLight.color *= mix( vec3( ${SHADOW_TINT.map(f).join(', ')} ), vec3( 1.0 ), ( directLight.visible && receiveShadow ) ? $1 : 1.0 );`);
  // (the hemisphere light, the probe and the light maps come after the loops: no accent on them)
  C.lights_fragment_begin = `float indoorSunK = 1.0;
#if NUM_DIR_LIGHTS > 0
indoorSunK = indoorSun( cameraPosition - vViewPosition * mat3( viewMatrix ) );
#endif
${begin}`;
  const TOONED = 'float dotNL = toonNL( saturate( dot( geometryNormal, directLight.direction ) ) );';
  for (const k of ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment', 'lights_phong_pars_fragment']) {
    if (C[k]?.includes(DOTNL)) C[k] = C[k].replace(DOTNL, TOONED);
  }
  // soft direct highlights (GGX at SPEC_MIN roughness or rougher; environment reflections untouched)
  const GGX = 'vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );';
  if (C.lights_physical_pars_fragment?.includes(GGX)) {
    C.lights_physical_pars_fragment = C.lights_physical_pars_fragment.replace(GGX,
      `PhysicalMaterial softSpec = material;\n\tsoftSpec.roughness = max( softSpec.roughness, ${f(SPEC_MIN)} );\n\tvec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, softSpec );`);
  }
  const BLINN = 'material.specularColor, material.specularShininess )';
  if (C.lights_phong_pars_fragment?.includes(BLINN)) C.lights_phong_pars_fragment = C.lights_phong_pars_fragment.replace(BLINN, 'material.specularColor, min( material.specularShininess, 40.0 ) )');
  // ink opt-out (opaque materials only: a blended material needs its alpha)
  if (C.opaque_fragment) C.opaque_fragment += `
#if defined( NO_INK ) && defined( OPAQUE )
gl_FragColor.a = 0.0;
#endif
`;
}

installSunMask();
