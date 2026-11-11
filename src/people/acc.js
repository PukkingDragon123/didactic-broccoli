// Garment and accessory geometry: skirts, aprons, wide trousers, loose socks, bags, backpacks, props.
// Painted by paint.js (mat 'acc' + part name). Props that only appear in gestures sit on their own bones
// (prop / box) and are hidden by scaling those bones to zero.
import { seg } from './body.js';

export function accSegments(spec, P, J) {
  const S = [], H = P.H, hu = P.hu;
  const add = (part, bone, y0, y1, b, t, o) => { const x = seg(part, bone, 'acc', y0, y1, b, t, o); S.push(x); return x; };
  const lx = P.hipX, tw = P.thighX;
  // --- skirts (on the skirt bone, which follows the thighs)
  const sk = spec.bottom.kind === 'skirt' ? spec.bottom.cut : null;
  if (sk) {
    const hem = { pleated: P.kneeY + 0.075 * H, pencil: P.kneeY - 0.02 * H, long: P.kneeY - 0.13 * H, mini: P.hipY - 0.085 * H }[sk];
    const flare = { pleated: 1.3, pencil: 0.98, long: 1.3, mini: 1.22 }[sk];
    const yh = P.hipY - 0.01 * H, top = [0, -0.001 * H, P.waistX * 1.08, P.waistZ * 1.1], hip = [0, -0.003 * H, P.hipsX * 1.07, P.hipsZ * 1.12];
    add('skirtUp', 'skirt', yh, P.pelvisY + 0.016 * H, hip, top, { ch: 0.4, caps: 'top' });
    add('skirt', 'skirt', hem, yh, [0, -0.005 * H, P.hipsX * flare, P.hipsZ * (flare + 0.12)], hip, { ch: 0.4, caps: 'bot', dens: 0.9 });
  }
  if (spec.legs === 'loosesocks') add('loosesock', 'shinL', P.ankleY - 0.004 * H, P.ankleY + 0.11 * H, [lx, 0.002 * H, tw * 0.62, tw * 0.68], [lx, -0.002 * H, tw * 0.58, tw * 0.62], { ch: 0.4, mirror: true, caps: 'top' });
  if (spec.bottom.kind === 'tobi') {
    add('tobiThigh', 'thighL', P.kneeY - 0.02 * H, P.hipY + 0.02 * H, [lx + 0.006 * H, 0.004 * H, tw * 1.32, tw * 1.36], [lx + 0.004 * H, -0.002 * H, tw * 1.08, tw * 1.1], { ch: 0.4, mirror: true, caps: 'none' });
    add('tobiShin', 'shinL', P.ankleY + 0.075 * H, P.kneeY + 0.03 * H, [lx, 0.002 * H, tw * 0.62, tw * 0.66], [lx + 0.005 * H, 0.003 * H, tw * 1.3, tw * 1.34], { ch: 0.4, mirror: true, caps: 'none' });
  }
  if (spec.bottom.wide) add('wideShin', 'shinL', P.ankleY + 0.01 * H, P.kneeY + 0.02 * H, [lx, 0.002 * H, tw * 0.86, tw * 0.9], [lx, 0, tw * 0.74, tw * 0.78], { ch: 0.38, mirror: true, caps: 'bot' });
  for (const a of spec.acc) {
    const k = a.kind;
    if (k === 'apron') add('apron', 'skirt', P.kneeY + 0.02 * H, P.pelvisY + 0.004 * H, [0, P.hipsZ + 0.012 * H, P.hipsX * 1.02, 0.004 * H], [0, P.waistZ + 0.012 * H, P.waistX * 1.1, 0.004 * H], { caps: 'bot' });
    else if (k === 'briefcase' || k === 'handbag' || k === 'ecobag') {
      const [w, h, d] = k === 'briefcase' ? [0.21, 0.29, 0.045] : k === 'handbag' ? [0.13, 0.2, 0.05] : [0.17, 0.34, 0.06];
      const x = P.shX + 0.01 * H, top = P.tipY + 0.02;
      add(k, 'handL', top - h - 0.04, top - 0.04, [x, 0.01, d, w], [x, 0.01, d * 0.92, w * (k === 'ecobag' ? 1.05 : 0.98)], { ch: k === 'briefcase' ? 0.2 : 0.3 });
      add(k + 'Handle', 'handL', top - 0.045, top + 0.005, [x, 0.01, 0.006, w * 0.35], null, { dens: 2 });
      if (a.leek) add('leek', 'handL', top - 0.1, top + 0.24, [x, -w * 0.4, 0.012, 0.012], [x, -w * 0.55, 0.018, 0.02], { ch: 0.4, rot: { p: [x, top - 0.1, -w * 0.4], e: [-0.3, 0, 0] } });
    } else if (k === 'shoulderbag' || k === 'tote') {
      const sd = a.side || 1, big = k === 'tote' || a.school;
      const [w, h, d] = big ? [0.17, 0.3, 0.06] : [0.12, 0.17, 0.045];
      const x = sd * (P.hipsX + d + 0.008), y1 = P.hipY + (big ? 0.12 : 0.08) * H;
      J.bag = [sd * P.chestTopX * 0.75, P.neckBase, 0];
      add(k, 'bag', y1 - h, y1, [x, -0.01, d, w], [x, -0.01, d * 0.9, w * 0.96], { ch: 0.25, dens: 1.2 });
    } else if (k === 'camera') {
      J.bag = [0, P.neckBase + 0.01 * H, 0.02];
      const z = P.chestZ + P.bust + 0.045, y = P.bustY - 0.01 * H;
      add('camera', 'bag', y - 0.04, y + 0.045, [0, z, 0.065, 0.035], null, { ch: 0.2, dens: 1.6 });
      add('lens', 'bag', y - 0.032, y + 0.028, [0, z + 0.05, 0.028, 0.03], null, { ch: 0.45, dens: 1.6, rot: { p: [0, y, z + 0.05], e: [Math.PI / 2, 0, 0] } });
    } else if (k === 'backpack' || k === 'randoseru') {
      const rs = k === 'randoseru';
      const y0 = rs ? P.waistY - 0.03 * H : P.waistY - 0.05 * H, y1 = rs ? P.shoulderY + 0.015 * H : P.shoulderY - 0.01 * H;
      const zb = -P.chestZ - (P.belly ? 0 : 0), d = rs ? 0.1 : 0.085, w = rs ? 0.12 : 0.15;
      add(k, 'chest', y0, y1, [0, zb - d, w, d], [0, zb - d + 0.01, w * 0.95, d * 0.9], { ch: rs ? 0.25 : 0.35 });
      if (!rs) add('packPocket', 'chest', y0 + 0.01, y0 + (y1 - y0) * 0.5, [0, zb - 2 * d - 0.02, w * 0.7, 0.03], [0, zb - 2 * d - 0.01, w * 0.68, 0.025], { ch: 0.4 });
      if (a.poster) add('poster', 'chest', y1 - 0.05, y1 + 0.22, [w * 0.55, zb - d * 0.8, 0.022, 0.022], null, { ch: 0.5, rot: { p: [w * 0.55, y1, zb - d], e: [-0.2, 0, -0.25] } });
    } else if (k === 'cane') {
      const x = P.shX + 0.012 * H, z = 0.035;
      add('cane', 'handL', 0.012, P.tipY + 0.03, [x, z, 0.011, 0.011], null, { ch: 0.4, dens: 1.5 });
      add('caneTop', 'handL', P.tipY + 0.02, P.tipY + 0.05, [x, z + 0.04, 0.012, 0.055], null, { ch: 0.4, dens: 1.5 });
    } else if (k === 'towel') {
      const nx = hu * 0.225, nz = hu * 0.22;
      add('towel', 'chest', P.neckBase - 0.02 * H, P.neckBase + 0.016 * H, [0, -0.014 * H, nx * 1.75, nz * 1.75], [0, -0.012 * H, nx * 1.55, nz * 1.6], { ch: 0.45 });
      for (const sx of [-1, 1]) add('towelEnd', 'chest', P.bustY + 0.02 * H, P.neckBase - 0.01 * H, [sx * 0.045, P.chestZ + 0.012 * H, 0.03, 0.01], [sx * 0.06, P.chestZ * 0.75 + 0.012 * H, 0.032, 0.01], { ch: 0.3 });
    } else if (k === 'pouch') add('pouch', 'hips', P.hipY - 0.01 * H, P.pelvisY - 0.005 * H, [P.hipsX * 0.62, P.hipsZ + 0.022, 0.05, 0.025], null, { ch: 0.35, dens: 1.3 });
  }
  // gesture props: phone / camera in the right hand, a parcel for 'carry'
  const cam = spec.acc.some((a) => a.kind === 'camera');
  const p = J.prop;
  if (cam) add('propCam', 'prop', p[1] - 0.04, p[1] + 0.04, [p[0], p[2], 0.06, 0.033], null, { ch: 0.2, dens: 1.6 });
  else add('phone', 'prop', p[1] - 0.07, p[1] + 0.07, [p[0], p[2], 0.035, 0.0045], null, { dens: 1.8 });
  const b = J.box;
  add('parcel', 'box', b[1] - 0.11, b[1] + 0.11, [0, b[2], 0.18, 0.14], null, { ch: 0.06, dens: 0.4 });
  return S;
}
