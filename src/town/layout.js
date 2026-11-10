// The lane's layout in metres (shared by every town module). The garage is x∈[-4,4], z∈[-5,5]; the lane runs along x.
//   near building line ZB, near gutter ZG0..ZG1, asphalt ZG1..ZR1, far gutter ZR1..ZG3, far paved strip to ZF.
//   underpass mouths at x=±XT (opening TZ0..TZ1, clearance TH), the walkable lane ends at ±XW, the decks run to ±XE.
export const ZB = 5.3, ZG0 = 5.75, ZG1 = 6.1, ZR1 = 13.35, ZG3 = 13.7, ZF = 14.9;
export const XT = 26, XE = 36, XW = 28.5;
export const TZ0 = 6.6, TZ1 = 12.6, TH = 3.4, WALK = 11.65;
export const YE = 4.25, YR = 4.72; // embankment top, rail top
export const TRACKS = [30, 33];
export const LANE_Z = [7.3, 11.2];
// the painted lane: white edge lines set in from the gutters (a roadside strip each side), so the lane reads ~4 m wide
export const LINE_N = 7.6, LINE_F = 11.6;
// utility poles along the far strip
export const ZP = 14.32, POLE_X = [-22.4, -16.3, -6.3, 2.6, 10.0, 17.6, 24.6];
// heights on a pole (metres above the road)
export const POLE = { top: 10.2, hv: 9.55, arm: 1.8, tr: 7.45, lv: [7.95, 7.7, 7.45], lamp: 5.2, tel: 5.55, catv: 5.2, drop: 7.3 };
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Baked shade under the bridge decks (the real darkness inside is per-pixel, see src/world/tunnelDark.js). */
export function shadeAt(x, y, z) {
  const u = Math.abs(x);
  if (u < XT - 0.4 || u > XE + 0.3 || y > YE + 0.05 || z < TZ0 - 1.1 || z > TZ1 + 1.1) return 1;
  return 1 - 0.45 * sstep(XT - 0.4, XT + 1.4, u);
}
