// Darkness inside the two railway underpasses (ガード下) at the ends of the lane.
//
// The underpasses are pitch black a few metres past the mouth. Rather than painting every surface dark (which would
// leave pedestrians, the cat, thrown capsules... lit by the low sun, since the sun's shadow map only covers the
// garage), the final colour of *every* built-in material is multiplied by a darkness factor that depends on the
// fragment's world position: 1 everywhere except inside the two underpass volumes, where it falls off exponentially
// with the depth past the portal and reaches exactly 0 a few metres in. Fog is weakened inside as well, so the far
// end reads as a black hole instead of a hazy grey card.
//
// Implementation: a small patch of the shared fog chunks (fog_pars_vertex / fog_vertex / fog_pars_fragment /
// fog_fragment). Every built-in lit/unlit material includes them (basic, lambert, phong, standard, physical, toon,
// matcap, points, sprites, lines, shadow); depth / normal passes do not. The patch is installed when this module is
// imported (before anything is compiled) and is a no-op outside the volumes. Custom ShaderMaterials (sky, light pools)
// are untouched.
import * as THREE from 'three';

let installed = false;

/**
 * Install the darkness patch once. v: { x0 (|x| where the dark starts), x1 (|x| where the volume ends), z0, z1, y1
 * (volume top), k (falloff per metre), d0, d1 (fade to exact black between these depths), fog (fog strength left in
 * total darkness, 0..1) }.
 */
export function installTunnelDarkness(v) {
  if (installed) return;
  const C = THREE.ShaderChunk;
  if (!C.fog_vertex || !C.fog_fragment || !C.fog_pars_vertex || !C.fog_pars_fragment) return;
  if (!C.fog_fragment.includes('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );')) return;
  installed = true;
  const f = (n) => n.toFixed(4);
  C.fog_pars_vertex = `varying vec3 vTunW;\n${C.fog_pars_vertex}`;
  // world position from the view-space position (works for meshes, instances, skinning, sprites and points alike;
  // the view matrix is rigid)
  C.fog_vertex = `vTunW = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );\n${C.fog_vertex}`;
  C.fog_pars_fragment = `varying vec3 vTunW;
float tunnelDark( vec3 p ) {
  float ax = abs( p.x );
  if ( ax < ${f(v.x0)} || ax > ${f(v.x1)} || p.y > ${f(v.y1)} || p.z < ${f(v.z0)} || p.z > ${f(v.z1)} ) return 1.0;
  float d = ax - ${f(v.x0)};
  return exp( - ${f(v.k)} * d ) * ( 1.0 - smoothstep( ${f(v.d0)}, ${f(v.d1)}, d ) );
}
${C.fog_pars_fragment}`;
  C.fog_fragment = `float tunK = tunnelDark( vTunW );
gl_FragColor.rgb *= tunK;
${C.fog_fragment.replace('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );', `gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor * mix( ${f(v.fog)}, 1.0, tunK ) );`)}`;
}
