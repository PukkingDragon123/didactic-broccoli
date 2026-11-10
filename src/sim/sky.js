// The sun's path and what the sky looks like for it: pure functions of the date and time (no Three.js scene access).
//
// The lane sits at Tokyo's latitude. World axes: up = +y; the lane runs roughly east-west, turned LANE_TURN degrees so
// the late-afternoon sun hangs low over the street end of the lane (shining into the garage), like the original
// golden-hour shot. sunDir() points from the ground toward the sun.
import * as THREE from 'three';

const LAT = 35.7 * Math.PI / 180;
const SOLAR_NOON = 11.75; // JST, Tokyo is east of the 135°E meridian
const LANE_TURN = 26 * Math.PI / 180;
const D2R = Math.PI / 180;

/** Solar declination (radians) for a day of the year. */
export function declination(yday) { return 23.44 * D2R * Math.sin((2 * Math.PI * (284 + yday)) / 365); }

/** Sun altitude / azimuth (radians, azimuth from north, clockwise) at an hour of the day. */
export function sunPosition(yday, hour) {
  const dec = declination(yday);
  const H = (hour - SOLAR_NOON) * 15 * D2R;
  const sinAlt = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT)) + Math.PI;
  return { alt, az };
}

/** Unit vector toward the sun in world space. */
export function sunDir(yday, hour, out = new THREE.Vector3()) {
  const { alt, az } = sunPosition(yday, hour);
  const a = az + LANE_TURN;
  const c = Math.cos(alt);
  // north = -x, east = -z
  return out.set(-Math.cos(a) * c, Math.sin(alt), -Math.sin(a) * c);
}

/** Sunrise and sunset hours for a day of the year. */
export function sunTimes(yday) {
  const dec = declination(yday);
  const cosH = (Math.sin(-0.83 * D2R) - Math.sin(LAT) * Math.sin(dec)) / (Math.cos(LAT) * Math.cos(dec));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / D2R / 15;
  return { rise: SOLAR_NOON - H, set: SOLAR_NOON + H };
}

// ------------------------------------------------------------------ looks by sun altitude (degrees)
// Each key: alt, sky (zenith, upper, mid, horizon, glow toward the sun), sun colour + intensity, hemisphere sky/ground
// + intensity, fog colour, cloud tint, ambient env intensity, exposure, warmth of the grade.
// The look is a bright, believable day: a soft pastel sky, a creamy (not orange) sun about twice the sky fill, and a
// lilac-blue sky fill (the hemisphere light) so the shade side of everything stays readable and cool. The low sun turns
// warm and the fill drops with it, so golden hour reads as warm light against cool shade. Night is a deep readable blue.
const KEYS = [
  { alt: -18, zen: 0x0c1636, up: 0x16224a, mid: 0x223262, hor: 0x34477c, glow: 0x3a4a7c, sun: 0x000000, si: 0, hs: 0x5e70b4, hg: 0x2a2a42, hi: 0.95, fog: 0x1e2a50, cloud: [0.26, 0.3, 0.44], env: 0.28, exp: 1.0, warm: 0 },
  { alt: -9, zen: 0x15214e, up: 0x223468, mid: 0x36488a, hor: 0x5c6aa0, glow: 0x86709a, sun: 0x000000, si: 0, hs: 0x6678b8, hg: 0x302e48, hi: 1.0, fog: 0x2c3660, cloud: [0.34, 0.34, 0.5], env: 0.32, exp: 1.0, warm: 0 },
  { alt: -3, zen: 0x34487e, up: 0x50649e, mid: 0x8a86b8, hor: 0xd8a4a0, glow: 0xeea486, sun: 0xff9a78, si: 0, hs: 0x9094c8, hg: 0x4a4050, hi: 1.2, fog: 0x6a6488, cloud: [0.66, 0.54, 0.64], env: 0.5, exp: 1.0, warm: 0.003 },
  { alt: 2, zen: 0x4a6eac, up: 0x7290c4, mid: 0xbcb4c8, hor: 0xf2c4a0, glow: 0xffb684, sun: 0xffa868, si: 2.3, hs: 0xdcbcae, hg: 0x9a7458, hi: 1.6, fog: 0xc4b0a8, cloud: [0.98, 0.82, 0.8], env: 0.45, exp: 1.08, warm: 0.07 },
  { alt: 10, zen: 0x5684c4, up: 0x82a8d8, mid: 0xb4cee6, hor: 0xece2d2, glow: 0xf8dcb8, sun: 0xffc283, si: 3.2, hs: 0xd2c8d2, hg: 0x96785e, hi: 1.6, fog: 0xdcd2c6, cloud: [1, 0.96, 0.9], env: 0.65, exp: 1.05, warm: 0.05 },
  { alt: 19, zen: 0x5684c4, up: 0x82a8d8, mid: 0xb4cee6, hor: 0xece2d2, glow: 0xf8e4c4, sun: 0xffe8cc, si: 3.1, hs: 0xc0cced, hg: 0x8a7a6a, hi: 1.4, fog: 0xdfd6ca, cloud: [1, 1, 1], env: 1.0, exp: 1.0, warm: 0.005 },
  { alt: 35, zen: 0x568ad0, up: 0x80b0e2, mid: 0xaed2ee, hor: 0xdce8ee, glow: 0xf2f2ea, sun: 0xfff4e6, si: 3.2, hs: 0xc8d6f2, hg: 0x928272, hi: 1.45, fog: 0xd4dce2, cloud: [1, 1, 1], env: 1.05, exp: 0.98, warm: 0.003 },
  { alt: 70, zen: 0x568cd4, up: 0x7eb2e6, mid: 0xaad2f0, hor: 0xd6e6f0, glow: 0xf4f4ee, sun: 0xfff8f0, si: 3.3, hs: 0xccdaf4, hg: 0x968676, hi: 1.5, fog: 0xd0dae2, cloud: [1, 1, 1], env: 1.05, exp: 0.96, warm: 0.002 },
];
const COLS = ['zen', 'up', 'mid', 'hor', 'glow', 'sun', 'hs', 'hg', 'fog'];
const NUMS = ['si', 'hi', 'env', 'exp', 'warm'];
const _a = new THREE.Color(), _b = new THREE.Color();

/** Sky look for a sun altitude (degrees); morning = true tints the low-sun colours a little pinker. Fills `out`. */
export function skyLook(altDeg, morning = false, out = null) {
  out ||= { cloud: [1, 1, 1] };
  let i = 0;
  while (i < KEYS.length - 2 && altDeg > KEYS[i + 1].alt) i++;
  const A = KEYS[i], B = KEYS[i + 1];
  const k = Math.min(1, Math.max(0, (altDeg - A.alt) / (B.alt - A.alt)));
  for (const c of COLS) { out[c] ||= new THREE.Color(); out[c].copy(_a.setHex(A[c])).lerp(_b.setHex(B[c]), k); }
  for (const n of NUMS) out[n] = A[n] + (B[n] - A[n]) * k;
  for (let j = 0; j < 3; j++) out.cloud[j] = A.cloud[j] + (B.cloud[j] - A.cloud[j]) * k;
  // dawn: a cooler, rosier low sun than the evening's amber
  if (morning && altDeg < 14 && altDeg > -10) {
    const m = 1 - Math.abs(altDeg - 2) / 12;
    out.glow.lerp(_a.setHex(0xf4a0a8), 0.35 * m);
    out.hor.lerp(_a.setHex(0xf0c0b8), 0.3 * m);
    out.sun.lerp(_a.setHex(0xffc0a0), 0.3 * m);
  }
  // 0 by day .. 1 at full night (drives stars, city windows, street lamps)
  out.night = Math.min(1, Math.max(0, (2 - altDeg) / 10));
  out.day = Math.min(1, Math.max(0, (altDeg + 2) / 14));
  return out;
}
