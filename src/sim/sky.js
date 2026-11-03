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
const KEYS = [
  { alt: -18, zen: 0x05081a, up: 0x0a1230, mid: 0x111c3e, hor: 0x1c2848, glow: 0x24304e, sun: 0x000000, si: 0, hs: 0x3a4c7c, hg: 0x14141e, hi: 0.5, fog: 0x0e1426, cloud: [0.16, 0.19, 0.28], env: 0.16, exp: 1.12, warm: 0 },
  { alt: -9, zen: 0x0c1438, up: 0x1a2656, mid: 0x2c3a70, hor: 0x51558a, glow: 0x7a5a78, sun: 0x000000, si: 0, hs: 0x46588a, hg: 0x1c1a24, hi: 0.52, fog: 0x1e2440, cloud: [0.24, 0.24, 0.36], env: 0.2, exp: 1.08, warm: 0 },
  { alt: -3, zen: 0x22346e, up: 0x3e5290, mid: 0x7a74a4, hor: 0xd08a78, glow: 0xf08a5a, sun: 0xff7040, si: 0, hs: 0x6a70a0, hg: 0x2c2228, hi: 0.62, fog: 0x4a4460, cloud: [0.55, 0.42, 0.5], env: 0.38, exp: 1.02, warm: 0.006 },
  { alt: 2, zen: 0x34589a, up: 0x5c7cb4, mid: 0xb4a4b0, hor: 0xf4b07a, glow: 0xff9448, sun: 0xff9a58, si: 1.2, hs: 0x9aa4c8, hg: 0x5a4438, hi: 0.62, fog: 0xb09888, cloud: [0.95, 0.72, 0.66], env: 0.55, exp: 1.0, warm: 0.014 },
  { alt: 10, zen: 0x3f6fae, up: 0x6f9acb, mid: 0xa9c4dd, hor: 0xe9dcc4, glow: 0xf6d0a0, sun: 0xffc890, si: 2.6, hs: 0xb4c8e4, hg: 0x6b5a4a, hi: 0.72, fog: 0xd6c8b4, cloud: [1, 0.94, 0.86], env: 0.8, exp: 1.0, warm: 0.012 },
  { alt: 19, zen: 0x3f6fae, up: 0x6f9acb, mid: 0xa9c4dd, hor: 0xe9dcc4, glow: 0xf6d9a8, sun: 0xffd8a8, si: 3.0, hs: 0xb9cfe8, hg: 0x6b5a4a, hi: 0.75, fog: 0xd9cdb8, cloud: [1, 1, 1], env: 0.85, exp: 1.0, warm: 0.012 },
  { alt: 35, zen: 0x3a74c4, up: 0x67a0dc, mid: 0x9ec6e6, hor: 0xd4e0e8, glow: 0xeef0e4, sun: 0xfff0dc, si: 3.2, hs: 0xc4d8f0, hg: 0x76665a, hi: 0.8, fog: 0xc8d2d8, cloud: [1, 1, 1], env: 0.9, exp: 0.97, warm: 0.006 },
  { alt: 70, zen: 0x3a76c8, up: 0x64a2e0, mid: 0x98c6ea, hor: 0xcadcea, glow: 0xf0f2ea, sun: 0xfff6ec, si: 3.3, hs: 0xc8dcf2, hg: 0x7a6a5c, hi: 0.82, fog: 0xc4d0d8, cloud: [1, 1, 1], env: 0.9, exp: 0.95, warm: 0.004 },
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
