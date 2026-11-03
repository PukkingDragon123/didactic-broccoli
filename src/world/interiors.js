// Rooms behind the neighbours' windows (interior mapping): every window pane is one quad whose shader ray-casts a
// small box room behind the glass (floor, walls, ceiling, a pendant lamp, furniture painted on the back wall,
// curtains or blinds just behind the pane, the aluminium sash in front). You see real depth and parallax as you walk
// past, rooms go dim by day and light up after dark (some stay dark: nobody home), all in pixel-art steps (surfaces
// are snapped to a 3 cm grid and the colours are posterized with an ordered dither, like the rest of the town).
// One shared material: all the windows of the lane are a single draw call.
//
//   interiorMaterial()                     the shared ShaderMaterial (cached)
//   interiorQuad(batch, mat, x, y, z, ry, o)  adds one window to a Batch (Town.js) in the batch's current frame;
//        o: { w, h, sill (window bottom above the room floor), depth, kind (ROOM.*), lit (0 dark .. 1 lit),
//             curtain (0 none, 1 side curtains, 2 lace, 3 blind, 4 closed curtains), cc (curtain colour 0..7), seed }
//   setInteriorSky({ night, sky, time })   called from Town.applySky (uniforms only)
import * as THREE from 'three';

export const ROOM = { living: 0, kitchen: 1, kid: 2, washitsu: 3, stair: 4, tv: 5, studio: 6, empty: 7 };

const U = { uNight: { value: 0 }, uSky: { value: new THREE.Color(0x9ab4cc) }, uTime: { value: 0 } };
let MAT = null;

export function setInteriorSky({ night = 0, sky = null, time = 0 } = {}) {
  U.uNight.value = night;
  if (sky) U.uSky.value.copy(sky);
  U.uTime.value = time;
}

const VERT = /* glsl */`
attribute vec4 aRoom; // w, h, sill, depth
attribute vec4 aMeta; // kind, lit, curtain, seed (curtain colour packed in the fraction of seed)
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec4 vRoom; varying vec4 vMeta;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  vN = normalize( mat3( modelMatrix ) * normal );
  vUv = uv; vRoom = aRoom; vMeta = aMeta;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
uniform float uNight; uniform vec3 uSky; uniform float uTime;
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec4 vRoom; varying vec4 vMeta;
#include <fog_pars_fragment>
float h1( float n ) { return fract( sin( n * 91.345 ) * 47453.5453 ); }
float h2( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
float bayer4( vec2 p ) { vec2 q = mod( floor( p ), 4.0 ); float i = q.x + q.y * 4.0;
  return mod( i * 7.0 + floor( i / 4.0 ) * 3.0, 16.0 ) / 16.0; }
bool inR( vec2 p, vec4 r ) { return p.x >= r.x && p.x <= r.z && p.y >= r.y && p.y <= r.w; }
vec3 pal( float k ) { // curtain / fabric colours
  k = mod( floor( k ), 8.0 );
  if ( k < 1.0 ) return vec3( 0.84, 0.54, 0.30 ); if ( k < 2.0 ) return vec3( 0.54, 0.69, 0.85 );
  if ( k < 3.0 ) return vec3( 0.88, 0.78, 0.56 ); if ( k < 4.0 ) return vec3( 0.66, 0.78, 0.47 );
  if ( k < 5.0 ) return vec3( 0.91, 0.69, 0.53 ); if ( k < 6.0 ) return vec3( 0.80, 0.40, 0.42 );
  if ( k < 7.0 ) return vec3( 0.42, 0.30, 0.52 ); return vec3( 0.93, 0.92, 0.86 );
}
void main() {
  float W = vRoom.x, H = vRoom.y, SILL = vRoom.z, DEP = vRoom.w;
  float kind = vMeta.x, lit = vMeta.y, cur = vMeta.z, seed = floor( vMeta.w ), cc = fract( vMeta.w ) * 8.0;
  vec3 d = normalize( vWorld - cameraPosition );
  vec3 N = normalize( vN ), T = normalize( vec3( N.z, 0.0, -N.x ) );
  vec3 r = vec3( dot( d, T ), d.y, -dot( d, N ) );
  r.z = max( r.z, 0.02 );
  vec3 p = vec3( vUv, 0.0 );
  // the room: wider and taller than the window
  float MX = 0.75, CEIL = 2.35;
  vec3 lo = vec3( -MX, -SILL, 0.0 ), hi = vec3( W + MX, CEIL - SILL, DEP );
  vec3 tA = ( lo - p ) / r, tB = ( hi - p ) / r, tF = max( tA, tB );
  float t = min( min( tF.x, tF.y ), tF.z );
  vec3 q = p + r * t;
  int face = tF.z <= t + 1e-4 ? 0 : ( tF.y <= t + 1e-4 ? ( r.y > 0.0 ? 2 : 1 ) : 3 ); // 0 back, 1 floor, 2 ceiling, 3 side
  vec3 g = floor( q * 32.0 ) / 32.0; // pixel grid
  float roomX = g.x + MX, fy = g.y + SILL; // x from the left wall, height above the floor
  float sd = h1( seed * 1.7 + 3.0 );
  vec3 wallC = mix( vec3( 0.86, 0.80, 0.68 ), vec3( 0.78, 0.82, 0.74 ), step( 0.6, sd ) );
  if ( kind > 1.5 && kind < 2.5 ) wallC = vec3( 0.80, 0.86, 0.90 );
  if ( kind > 2.5 && kind < 3.5 ) wallC = vec3( 0.90, 0.85, 0.72 );
  vec3 col;
  if ( face == 1 ) {
    // floor: tatami (washitsu / living) or wood planks
    if ( kind > 2.5 && kind < 3.5 || ( kind < 0.5 && sd < 0.45 ) ) {
      vec2 m = vec2( mod( q.x + MX, 0.9 ), mod( q.z, 1.8 ) );
      col = vec3( 0.66, 0.68, 0.44 ) * ( 0.94 + 0.06 * step( 0.5, fract( g.x * 16.0 ) ) );
      if ( m.x < 0.04 || m.y < 0.04 ) col = vec3( 0.22, 0.24, 0.18 );
    } else {
      col = vec3( 0.52, 0.36, 0.22 ) * ( 0.85 + 0.15 * h1( floor( q.x * 8.0 ) ) );
      if ( fract( q.x * 8.0 ) < 0.08 ) col *= 0.7;
    }
  } else if ( face == 2 ) {
    col = vec3( 0.84, 0.80, 0.70 );
    if ( fract( q.x * 2.0 ) < 0.03 || fract( q.z * 2.0 ) < 0.03 ) col *= 0.85;
  } else if ( face == 3 ) {
    col = wallC * 0.86;
    if ( fy < 0.12 ) col = vec3( 0.36, 0.26, 0.18 );
    // a door frame on one side wall, a shelf on the other
    if ( r.x > 0.0 && g.z > DEP * 0.35 && g.z < DEP * 0.35 + 0.8 && fy < 1.85 ) col = vec3( 0.55, 0.42, 0.30 );
    if ( r.x < 0.0 && abs( fy - 1.55 ) < 0.03 && g.z > 0.3 && g.z < 1.5 ) col = vec3( 0.40, 0.28, 0.18 );
  } else {
    // the back wall: wallpaper + furniture by room kind
    col = wallC;
    if ( kind < 0.5 && mod( floor( roomX * 10.0 ), 3.0 ) < 1.0 ) col *= 0.95;
    if ( fy < 0.1 ) col = vec3( 0.36, 0.26, 0.18 );
    vec2 b = vec2( roomX, fy );
    float x0 = 0.2 + sd * 0.8;
    if ( kind < 0.5 || ( kind > 4.5 && kind < 5.5 ) ) { // living room / TV room
      if ( inR( b, vec4( x0, 0.0, x0 + 0.9, 0.95 ) ) ) { col = vec3( 0.45, 0.30, 0.18 ); if ( fract( fy * 4.0 ) < 0.1 ) col *= 0.7; if ( abs( fract( fy * 4.0 ) - 0.55 ) < 0.08 && abs( roomX - x0 - 0.45 ) < 0.06 ) col = vec3( 0.8, 0.65, 0.3 ); }
      if ( inR( b, vec4( x0 + 1.3, 0.35, x0 + 1.95, 0.85 ) ) ) { col = vec3( 0.12, 0.12, 0.13 );
        if ( inR( b, vec4( x0 + 1.36, 0.42, x0 + 1.89, 0.8 ) ) ) col = mix( vec3( 0.12, 0.16, 0.2 ), vec3( 0.45, 0.6, 0.9 ) * ( 0.8 + 0.2 * step( 0.5, fract( uTime * 1.7 ) ) ), step( 4.5, kind ) + 0.3 * uNight ); }
      if ( inR( b, vec4( x0 + 1.25, 0.0, x0 + 2.0, 0.35 ) ) ) col = vec3( 0.38, 0.26, 0.16 );
      if ( inR( b, vec4( x0 + 0.25, 1.35, x0 + 0.6, 1.8 ) ) ) col = vec3( 0.95, 0.94, 0.9 ); // calendar
      if ( inR( b, vec4( x0 + 0.27, 1.62, x0 + 0.58, 1.76 ) ) ) col = vec3( 0.85, 0.3, 0.3 );
      if ( inR( b, vec4( x0 + 1.3, 1.3, x0 + 1.9, 1.75 ) ) ) col = vec3( 0.35, 0.25, 0.15 ); // framed picture
      if ( inR( b, vec4( x0 + 1.34, 1.34, x0 + 1.86, 1.71 ) ) ) col = mix( vec3( 0.4, 0.6, 0.75 ), vec3( 0.35, 0.55, 0.3 ), step( 1.5, fy ) );
    } else if ( kind < 1.5 ) { // kitchen: cabinets, counter, fridge, tiles, wall cupboards
      if ( fy > 0.85 && fy < 1.5 && mod( floor( roomX * 12.0 ) + floor( fy * 12.0 ), 2.0 ) < 1.0 ) col *= 0.93;
      if ( fy < 0.85 ) { col = vec3( 0.86, 0.84, 0.78 ); if ( fract( roomX * 2.2 ) < 0.04 || fy > 0.8 ) col = vec3( 0.6, 0.58, 0.52 ); }
      if ( fy > 1.5 && fy < 2.1 ) { col = vec3( 0.9, 0.88, 0.8 ); if ( fract( roomX * 2.2 ) < 0.04 ) col *= 0.75; }
      if ( inR( b, vec4( x0 + 1.4, 0.0, x0 + 2.0, 1.75 ) ) ) { col = vec3( 0.9, 0.9, 0.86 ); if ( abs( fy - 1.15 ) < 0.02 ) col *= 0.7; }
      if ( inR( b, vec4( x0 + 0.2, 0.86, x0 + 0.5, 1.02 ) ) ) col = vec3( 0.75, 0.2, 0.15 ); // a red kettle
    } else if ( kind < 2.5 ) { // a kid's room: shelf, desk, posters
      if ( inR( b, vec4( x0, 0.0, x0 + 0.8, 1.6 ) ) ) { col = vec3( 0.6, 0.45, 0.3 ); if ( fract( fy * 3.0 ) < 0.08 ) col *= 0.6;
        else if ( fract( fy * 3.0 ) < 0.6 ) col = pal( floor( roomX * 18.0 ) + seed ) * 0.9; }
      if ( inR( b, vec4( x0 + 1.1, 0.7, x0 + 1.9, 0.76 ) ) ) col = vec3( 0.5, 0.35, 0.2 );
      if ( inR( b, vec4( x0 + 1.15, 1.2, x0 + 1.55, 1.75 ) ) ) col = pal( seed + 2.0 );
      if ( inR( b, vec4( x0 + 1.6, 1.3, x0 + 1.95, 1.7 ) ) ) col = pal( seed + 5.0 );
    } else if ( kind < 3.5 ) { // washitsu: fusuma doors and a hanging scroll in the alcove
      if ( fy < 1.8 ) { col = vec3( 0.88, 0.84, 0.72 ); if ( fract( roomX * 1.1 ) < 0.03 ) col = vec3( 0.3, 0.2, 0.12 );
        if ( abs( fract( roomX * 1.1 ) - 0.85 ) < 0.04 && abs( fy - 0.9 ) < 0.05 ) col = vec3( 0.3, 0.25, 0.2 );
        if ( h2( floor( vec2( roomX, fy ) * 5.0 ) + seed ) < 0.12 ) col *= 0.92; }
      if ( fy > 1.8 && fy < 1.86 ) col = vec3( 0.35, 0.24, 0.14 );
      if ( inR( b, vec4( x0 + 0.1, 0.6, x0 + 0.4, 1.6 ) ) ) col = vec3( 0.92, 0.9, 0.82 ) * ( abs( fy - 1.1 ) < 0.25 && abs( roomX - x0 - 0.25 ) < 0.04 ? 0.3 : 1.0 );
    } else if ( kind < 4.5 ) { // stairwell
      float s = floor( ( roomX * 0.8 + fy ) * 5.0 );
      if ( fy < roomX * 0.9 - 0.2 ) col = mix( vec3( 0.48, 0.34, 0.22 ), vec3( 0.36, 0.25, 0.16 ), mod( s, 2.0 ) );
      if ( abs( fy - roomX * 0.9 - 0.75 ) < 0.03 ) col = vec3( 0.3, 0.2, 0.12 );
    } else if ( kind < 6.5 ) { // a studio: shelves of books, a drawing desk
      if ( fy > 0.2 && fy < 2.0 && roomX > x0 + 0.9 ) { col = vec3( 0.36, 0.24, 0.15 ); if ( fract( fy * 2.6 ) > 0.15 ) col = pal( floor( roomX * 22.0 ) + floor( fy * 2.6 ) * 3.0 ) * 0.85; }
    } else { // empty: bare walls, a stain
      col = vec3( 0.72, 0.70, 0.64 );
      if ( h2( floor( vec2( roomX, fy ) * 3.0 ) ) < 0.15 ) col *= 0.9;
    }
  }
  // depth falloff, then the room's light: dim daylight by day; the lamp after dark (if somebody's home)
  float back = 1.0 - 0.32 * clamp( q.z / DEP, 0.0, 1.0 );
  float day = ( 0.17 - 0.15 * uNight ) * back;
  vec3 warm = kind > 4.5 && kind < 5.5 ? vec3( 0.55, 0.7, 1.15 ) * ( 0.85 + 0.15 * step( 0.5, fract( uTime * 2.3 + seed ) ) ) : ( kind > 0.5 && kind < 1.5 ? vec3( 1.05, 1.08, 1.0 ) : vec3( 1.25, 1.0, 0.7 ) );
  vec3 light = vec3( day ) + warm * lit * ( 0.05 + 0.82 * uNight ) * back;
  col *= light;
  // the pendant lamp: a shade hanging from the ceiling in the middle of the room
  float yl = CEIL - SILL - 0.42, tl = ( yl - p.y ) / r.y;
  if ( r.y > 0.0 && tl > 0.0 && tl < t ) {
    vec3 pl = p + r * tl;
    vec2 dl = vec2( pl.x - ( W * 0.5 ), pl.z - DEP * 0.5 );
    if ( max( abs( dl.x ), abs( dl.y ) ) < 0.24 ) col = ( kind > 0.5 && kind < 1.5 ? vec3( 0.95, 0.97, 1.0 ) : vec3( 1.0, 0.86, 0.6 ) ) * ( 0.45 + lit * 1.05 * uNight + 0.1 * lit );
  }
  // curtains / blinds just behind the glass
  float u = vUv.x, v = vUv.y;
  vec3 fab = pal( cc );
  float glow = 0.24 * ( 1.0 - uNight ) + lit * ( 0.06 + 0.8 * uNight );
  if ( cur > 0.5 && cur < 1.5 ) { // side curtains with folds
    float cw = W * ( 0.16 + 0.1 * sd );
    if ( u < cw || u > W - cw ) col = fab * ( 0.82 + 0.18 * step( 0.5, fract( u * 14.0 ) ) ) * glow;
    if ( v > H - 0.1 ) col = fab * 0.8 * glow;
  } else if ( cur > 1.5 && cur < 2.5 ) { // lace over everything
    float lace = step( 0.5, fract( ( floor( u * 32.0 ) + floor( v * 32.0 ) * 2.0 ) / 5.0 ) );
    col = mix( col, vec3( 0.95, 0.93, 0.88 ) * glow, 0.45 + 0.2 * lace );
  } else if ( cur > 2.5 && cur < 3.5 ) { // venetian blind, half down
    float bl = H * ( 0.4 + 0.35 * sd );
    if ( v > H - bl ) col = vec3( 0.88, 0.86, 0.8 ) * ( fract( v * 16.0 ) < 0.3 ? 0.62 : 1.0 ) * glow;
  } else if ( cur > 3.5 ) { // drawn curtains (light shows through)
    col = fab * ( 0.82 + 0.18 * step( 0.5, fract( u * 14.0 ) ) ) * glow;
    if ( abs( u - W * 0.5 ) < 0.02 ) col *= 0.6;
  }
  // glass: sky reflection toward grazing angles and a stepped glint stripe
  float fr = pow( 1.0 - clamp( r.z, 0.0, 1.0 ), 3.0 );
  float refl = ( 0.06 + 0.45 * fr ) * ( 1.0 - 0.6 * uNight );
  float gl = fract( ( u + v * 0.8 ) * 1.6 + seed * 0.37 );
  refl += ( gl < 0.08 ? 0.12 : 0.0 ) * ( 1.0 - uNight );
  col = mix( col, uSky, clamp( refl, 0.0, 0.85 ) );
  // the aluminium sash: outer frame and the overlap bar of a two-pane sliding window
  float fw = 0.035;
  bool frame = u < fw || u > W - fw || v < fw || v > H - fw || ( W > 0.75 && abs( u - W * 0.5 ) < 0.025 );
  if ( frame ) col = vec3( 0.66, 0.68, 0.70 ) * ( 0.55 + 0.45 * ( 1.0 - uNight ) ) * ( u < fw || v > H - fw ? 0.85 : 1.0 );
  // posterize with an ordered dither (pixel-art steps)
  float bd = bayer4( gl_FragCoord.xy ) - 0.5;
  col = floor( col * 20.0 + 0.5 + bd * 0.9 ) / 20.0;
  gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** The shared window-room material (one draw call for every interior window on the lane). */
export function interiorMaterial() {
  if (MAT) return MAT;
  MAT = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: VERT, fragmentShader: FRAG, fog: true,
  });
  MAT.uniforms.uNight = U.uNight; MAT.uniforms.uSky = U.uSky; MAT.uniforms.uTime = U.uTime;
  MAT.userData.noRim = true;
  return MAT;
}

/**
 * One window pane into a Batch, in the batch's current frame: a vertical quad (centre x, bottom y, plane z, turned by
 * ry so its front faces +z at 0) with the room attributes. See the header for o.
 */
export function interiorQuad(B, mat, x, y, z, ry, o) {
  const w = o.w, h = o.h;
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  const n = g.attributes.position.count;
  const room = new Float32Array(n * 4), meta = new Float32Array(n * 4);
  const seed = Math.floor(o.seed ?? 1) + Math.min(0.99, ((o.cc ?? 0) % 8) / 8 + 0.01);
  for (let i = 0; i < n; i++) {
    room.set([w, h, o.sill ?? 0.9, o.depth ?? 3.2], i * 4);
    meta.set([o.kind ?? 0, o.lit ?? 1, o.curtain ?? 1, seed], i * 4);
  }
  g.setAttribute('aRoom', new THREE.BufferAttribute(room, 4));
  g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));
  return B.geo(mat, g, {});
}
