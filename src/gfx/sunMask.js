// The shared cel-shading patch for every built-in lit material (standard, physical, lambert, phong), installed at import
// time (src/core/renderer.js imports it) before anything is compiled. The renderer contract in docs/ART.md describes it
// for people making models. Five parts:
//
// 1. No sun inside Mikawa-ya. The sun's shadow map only covers the garage (src/world/Garage.js), so anything that is not
//    shadowed by it gets the full low sun, even indoors. The shop's own surfaces use "indoor" material variants
//    (Town.indoor) that drop the sun, but everything else in there (the old man, the people who come in, the stock you
//    pick up, your own hands) kept a regular material and washed out to white in daylight. This scales the directional
//    lights by a factor of world position: 0 inside the shop, 1 everywhere else, with a short soft edge. Hemisphere
//    light, the environment probe and point lights (the shop's lamp) are untouched, so whatever is inside is lit like
//    the room around it.
// 2. Tinted shadows: where the sun / moon is shadowed, a lilac share of it still gets through (SHADOW_TINT), so cast
//    shadows are light and cool, never black; their edge is tightened to a crisp cel line (SHADOW_EDGE). The off-map
//    interiors and Town.indoor materials switch the directional lights off entirely, so they never see it.
// 3. The cel ramp: N.L of the sun / moon becomes three flat bands (shade / half / full) with a narrow soft edge on each
//    step (BANDS); lamps (point and spot lights, the light pool) get two (LAMP_BAND), so a face under several lamps
//    doesn't break up into a dozen edges. Flat low-poly faces each take one tone; round things (people, capsules) show
//    clean band lines.
// 4. Toon highlights: the smooth GGX lobe is gone. Glossy surfaces only (roughness under about 0.3: capsule plastic,
//    glass, chrome, lenses) get one hard-edged highlight per light, tinted by the light and sized by the roughness;
//    it fades out between roughness 0.3 and 0.46, and everything rougher has no direct highlight at all. Glossy metal
//    (chrome) swaps the blurred environment probe for a cartoon reflection: a band of sky, a dark horizon line and the
//    ground, in the hemisphere light's colours (so it follows the time of day and the room).
// 5. Ink opt-out: an opaque material with the NO_INK define (noInk(material)) writes alpha 0, which the outline pass
//    (src/core/renderer.js) reads as "no ink on this surface".
//
// Not used for the off-map interiors' own fake lamp (src/places: bedroom, Ramen Yamada; src/growth): their rooms are lit
// by a term in their own materials (places.mat), which people and hands don't have, so without the sun they would go dark.
import * as THREE from 'three';

let installed = false;

// lilac light that still reaches into the sun's shadow (fraction of the sun's colour, per channel)
export const SHADOW_TINT = [0.34, 0.33, 0.47];
// the shadow map's soft PCF edge is squeezed between these two values of the shadow term
export const SHADOW_EDGE = [0.3, 0.7];
// the cel ramp: [N.L where the half band starts, its soft edge, N.L where the full band starts, its soft edge, the half
// band's level]
export const BANDS = [0.02, 0.05, 0.46, 0.06, 0.52];
// lamps: one step, [N.L where it starts, its soft edge]
export const LAMP_BAND = [0.1, 0.12];
// toon highlight: full under GLOSS[0] roughness, none over GLOSS[1]; strength on plastics and on metals (x F0)
export const GLOSS = [0.3, 0.46];
export const SPEC = [0.16, 0.25];
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
  const [b0, e0, b1, e1, half] = BANDS;
  C.lights_pars_begin += `
float indoorSun( vec3 p ) {
  // Mikawa-ya's shop floor (src/world/CornerShop.js MK: inside the walls, up to the ceiling)
  vec3 a = smoothstep( vec3( -15.2, -1.0, 15.18 ), vec3( -15.0, -0.8, 15.38 ), p ) * ( 1.0 - smoothstep( vec3( -9.85, 2.9, 19.5 ), vec3( -9.65, 3.1, 19.7 ), p ) );
  return 1.0 - a.x * a.y * a.z;
}
// the cel ramp: shade / half / full under the sun or the moon, shade / full under a lamp (celLamp is set per light loop)
float celLamp = 0.0;
float toonNL( float x ) {
  float sun = ${f(half)} * smoothstep( ${f(b0)}, ${f(b0 + e0)}, x ) + ${f(1 - half)} * smoothstep( ${f(b1)}, ${f(b1 + e1)}, x );
  return mix( sun, smoothstep( ${f(LAMP_BAND[0])}, ${f(LAMP_BAND[0] + LAMP_BAND[1])}, x ), celLamp );
}
// cartoon chrome: what a glossy metal reflects instead of the blurred probe (sky / horizon line / ground)
vec3 toonChrome( vec3 env, vec3 V, vec3 N, float rough, vec3 f0 ) {
  #if NUM_HEMI_LIGHTS > 0
    float k = ( 1.0 - smoothstep( ${f(GLOSS[0])}, ${f(GLOSS[1])}, rough ) ) * smoothstep( 0.25, 0.5, max( f0.r, max( f0.g, f0.b ) ) );
    if ( k <= 0.0 ) return env;
    float y = normalize( reflect( - V, N ) * mat3( viewMatrix ) ).y;
    vec3 sky = hemisphereLights[ 0 ].skyColor * 0.72, ground = hemisphereLights[ 0 ].groundColor;
    vec3 c = mix( ground * 0.75, ground * 0.22, smoothstep( -0.24, -0.2, y ) );
    c = mix( c, sky, smoothstep( 0.02, 0.06, y ) );
    return mix( env, c, k );
  #else
    return env;
  #endif
}
// the toon highlight: one hard-edged shape per light on glossy surfaces, sized by the roughness
vec3 toonSpec( vec3 L, vec3 V, vec3 N, float rough, vec3 f0 ) {
  float gloss = 1.0 - smoothstep( ${f(GLOSS[0])}, ${f(GLOSS[1])}, rough );
  if ( gloss <= 0.0 ) return vec3( 0.0 );
  float nh = saturate( dot( N, normalize( L + V ) ) );
  float edge = mix( 0.9935, 0.955, saturate( rough / ${f(GLOSS[1])} ) );
  return ( ${f(SPEC[0])} + ${f(SPEC[1])} * f0 ) * ( gloss * smoothstep( edge, edge + 0.005, nh ) );
}
`;
  let begin = C.lights_fragment_begin.replace(LINE, `${LINE}\n\t\tdirectLight.color *= indoorSunK;`);
  for (const [decl, v] of [['PointLight pointLight;', 1], ['SpotLight spotLight;', 1], ['DirectionalLight directionalLight;', 0]]) {
    if (begin.includes(decl)) begin = begin.replace(decl, `${decl}\n\tcelLamp = ${v}.0;`);
  }
  if (SHADOW.test(begin)) begin = begin.replace(SHADOW, `directLight.color *= mix( vec3( ${SHADOW_TINT.map(f).join(', ')} ), vec3( 1.0 ), ( directLight.visible && receiveShadow ) ? smoothstep( ${f(SHADOW_EDGE[0])}, ${f(SHADOW_EDGE[1])}, $1 ) : 1.0 );`);
  C.lights_fragment_begin = `float indoorSunK = 1.0;
#if NUM_DIR_LIGHTS > 0
indoorSunK = indoorSun( cameraPosition - vViewPosition * mat3( viewMatrix ) );
#endif
${begin}`;
  const TOONED = 'float dotNL = toonNL( saturate( dot( geometryNormal, directLight.direction ) ) );';
  for (const k of ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment', 'lights_phong_pars_fragment']) {
    if (C[k]?.includes(DOTNL)) C[k] = C[k].replace(DOTNL, TOONED);
  }
  // direct speculars: the toon highlight instead of the GGX lobe (and of the clearcoat's)
  let P = C.lights_physical_pars_fragment;
  const GGX = 'vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );';
  const CC = 'clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );';
  const CCNL = 'float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );';
  if (P?.includes(GGX)) P = P.replace(GGX, 'vec3 specularBRDF = toonSpec( directLight.direction, geometryViewDir, geometryNormal, material.roughness, material.specularColor );');
  if (P?.includes(CC)) P = P.replace(CC, 'clearcoatSpecularDirect += ccIrradiance * toonSpec( directLight.direction, geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness, vec3( 0.04 ) );');
  if (P?.includes(CCNL)) P = P.replace(CCNL, 'float dotNLcc = toonNL( saturate( dot( geometryClearcoatNormal, directLight.direction ) ) );');
  if (P) C.lights_physical_pars_fragment = P;
  const PH = C.lights_phong_pars_fragment, BP = 'BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess )';
  if (PH?.includes(BP)) C.lights_phong_pars_fragment = PH.replace(BP, 'toonSpec( directLight.direction, geometryViewDir, geometryNormal, 1.0 - 0.01 * material.specularShininess, material.specularColor )');
  const IBL = 'vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );';
  if (C.lights_fragment_maps?.includes(IBL)) C.lights_fragment_maps = C.lights_fragment_maps.replace(IBL, 'vec3 iblRadiance = toonChrome( getIBLRadiance( geometryViewDir, geometryNormal, material.roughness ), geometryViewDir, geometryNormal, material.roughness, material.specularColor );');
  // ink opt-out (opaque materials only: a blended material needs its alpha)
  if (C.opaque_fragment) C.opaque_fragment += `
#if defined( NO_INK ) && defined( OPAQUE )
gl_FragColor.a = 0.0;
#endif
`;
}

installSunMask();
