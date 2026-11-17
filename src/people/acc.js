// Garment and accessory geometry: skirts, aprons, wide trousers, loose socks, bags, backpacks, props.
// Painted by paint.js (mat 'acc' + part name). Props that only appear in gestures sit on their own bones
// (prop / box) and are hidden by scaling those bones to zero.
import { seg } from './body.js';
import { ptube, vtube } from './anatomy.js';

export function accSegments(spec, P, J) {
  const S = [], H = P.H, hu = P.hu;
  const add = (part, bone, y0, y1, b, t, o) => { const x = seg(part, bone, 'acc', y0, y1, b, t, o); S.push(x); return x; };
  const lx = P.hipX, tw = P.thighX;
  // --- skirts (on the skirt bone, which follows the thighs)
  const sk = spec.bottom.kind === 'skirt' ? spec.bottom.cut : null;
  if (sk && false) { // (skirts are smooth tubes now: anatomy.js)
    const hem = { pleated: P.kneeY + 0.075 * H, pencil: P.kneeY - 0.02 * H, long: P.kneeY - 0.13 * H, mini: P.hipY - 0.085 * H }[sk];
    const flare = { pleated: 1.3, pencil: 0.98, long: 1.3, mini: 1.22 }[sk];
    const yh = P.hipY - 0.01 * H, top = [0, -0.001 * H, P.waistX * 1.08, P.waistZ * 1.1], hip = [0, -0.003 * H, P.hipsX * 1.07, P.hipsZ * 1.12];
    add('skirtUp', 'skirt', yh, P.pelvisY + 0.016 * H, hip, top, { ch: 0.4, caps: 'top' });
    add('skirt', 'skirt', hem, yh, [0, -0.005 * H, P.hipsX * flare, P.hipsZ * (flare + 0.12)], hip, { ch: 0.4, caps: 'bot', dens: 0.9 });
  }
  if (spec.legs === 'loosesocks' && false) add('loosesock', 'shinL', P.ankleY - 0.004 * H, P.ankleY + 0.11 * H, [lx, 0.002 * H, tw * 0.62, tw * 0.68], [lx, -0.002 * H, tw * 0.58, tw * 0.62], { ch: 0.4, mirror: true, caps: 'top' });
  if (spec.bottom.kind === 'tobi' && false) { // (tobi and wide trousers are part of the leg tubes now: anatomy.js)
    add('tobiThigh', 'thighL', P.kneeY - 0.02 * H, P.hipY + 0.02 * H, [lx + 0.006 * H, 0.004 * H, tw * 1.32, tw * 1.36], [lx + 0.004 * H, -0.002 * H, tw * 1.08, tw * 1.1], { ch: 0.4, mirror: true, caps: 'none' });
    add('tobiShin', 'shinL', P.ankleY + 0.075 * H, P.kneeY + 0.03 * H, [lx, 0.002 * H, tw * 0.62, tw * 0.66], [lx + 0.005 * H, 0.003 * H, tw * 1.3, tw * 1.34], { ch: 0.4, mirror: true, caps: 'none' });
  }
  if (spec.bottom.wide && false) add('wideShin', 'shinL', P.ankleY + 0.01 * H, P.kneeY + 0.02 * H, [lx, 0.002 * H, tw * 0.86, tw * 0.9], [lx, 0, tw * 0.74, tw * 0.78], { ch: 0.38, mirror: true, caps: 'bot' });
  for (const a of spec.acc) {
    const k = a.kind;
    if (k === 'apron') add('apron', 'skirt', P.kneeY + 0.02 * H, P.pelvisY + 0.004 * H, [0, P.hipsZ + 0.012 * H, P.hipsX * 1.02, 0.004 * H], [0, P.waistZ + 0.012 * H, P.waistX * 1.1, 0.004 * H], { caps: 'bot' });
    else if (k === 'briefcase' || k === 'handbag' || k === 'ecobag') {
      const [w, h, d] = k === 'briefcase' ? [0.21, 0.29, 0.045] : k === 'handbag' ? [0.13, 0.2, 0.05] : [0.17, 0.34, 0.06];
      const x = P.shX + 0.01 * H, top = P.tipY + 0.02;
      add(k, 'handL', top - h - 0.04, top - 0.04, [x, 0.01, d, w], [x, 0.01, d * 0.92, w * (k === 'ecobag' ? 1.05 : 0.98)], { ch: k === 'briefcase' ? 0.2 : 0.3 });
      add(k + 'Handle', 'handL', top - 0.045, top + 0.005, [x, 0.01, 0.006, w * 0.35], null, { dens: 2 });
      if (a.leek) {
        // a leek poking out of the bag: white shaft, the green leaves fanning at the top
        const b = [x, top - 0.1, -w * 0.4], d = [0, Math.cos(0.3), -Math.sin(0.3)];
        const at = (t) => [b[0], b[1] + d[1] * t, b[2] + d[2] * t];
        S.push(ptube({ part: 'leek', mat: 'acc', N: 8, lodMinN: 9, dens: 1.3, meta: { kind: 'leek' } }, [
          { c: at(0), s: { hx: 0.012, hzF: 0.012, hzB: 0.012 }, w: [['handL', 1]] }, { c: at(0.14), s: { hx: 0.014, hzF: 0.014, hzB: 0.014 }, w: [['handL', 1]] },
          { c: at(0.22), s: { hx: 0.02, hzF: 0.012, hzB: 0.012 }, w: [['handL', 1]] }, { c: at(0.34), s: { hx: 0.032, hzF: 0.008, hzB: 0.008 }, w: [['handL', 1]] },
          { c: at(0.37), s: { hx: 0, hzF: 0, hzB: 0 }, w: [['handL', 1]] }], [0, 0, 1]));
      }
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
      // a walking stick: a round shaft from the ground up into the fist, the crook over the top of the hand
      const x = P.shX + 0.004 * H, z = 0.03, top = P.tipY + 0.04, r = 0.0105, R = 0.045;
      const path = [{ c: [x, 0.004, z], s: { hx: 0, hzF: 0, hzB: 0 } }, { c: [x, 0.012, z], s: { hx: r * 1.25, hzF: r * 1.25, hzB: r * 1.25 } }, { c: [x, 0.04, z], s: { hx: r * 1.2, hzF: r * 1.2, hzB: r * 1.2 } },
        { c: [x, 0.05, z], s: { hx: r, hzF: r, hzB: r } }, { c: [x, top * 0.5, z], s: { hx: r, hzF: r, hzB: r } }, { c: [x, top, z], s: { hx: r, hzF: r, hzB: r } }];
      for (let i = 1; i <= 6; i++) { const t = (i / 6) * Math.PI; path.push({ c: [x, top + Math.sin(t) * R * 0.8, z + R - Math.cos(t) * R], s: { hx: r, hzF: r, hzB: r } }); }
      path.push({ c: [x, top - 0.02, z + 2 * R], s: { hx: r * 0.9, hzF: r * 0.9, hzB: r * 0.9 } }, { c: [x, top - 0.026, z + 2 * R], s: { hx: 0, hzF: 0, hzB: 0 } });
      for (const p of path) { p.w = [['handL', 1]]; p.s.p = 2; }
      S.push(ptube({ part: 'cane', mat: 'acc', N: 8, lodMinN: 9, dens: 1.4, meta: { kind: 'cane', col: a.col, top } }, path, [0, 0, 1]));
    } else if (k === 'towel') {
      // a towel round the neck: a soft roll that sits on the shoulders, both ends hanging down the chest
      const nx = hu * 0.225, nz = hu * 0.22, y0 = P.neckBase - 0.022 * H, y1 = P.neckBase + 0.018 * H;
      S.push(vtube({ part: 'towel', mat: 'acc', N: 10, lodMinN: 8, dens: 1.0, meta: { kind: 'towel' } }, [y0, y0 + 0.008 * H, (y0 + y1) / 2, y1 - 0.006 * H, y1], (y) => {
        const t = (y - y0) / (y1 - y0), b = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.5;
        return { hx: nx * (1.3 + 0.55 * b), hzF: nz * (1.25 + 0.5 * b), hzB: nz * (1.3 + 0.55 * b), cz: -0.012 * H, p: 2.2, mod: (x, z, a) => { const r = Math.hypot(x, z) || 1, d = 0.002 * H * Math.sin(a * 7 + t * 4); return [x / r * d, z / r * d]; } };
      }, () => [['chest', 1]]));
      for (const sx of [-1, 1]) {
        const x = sx * 0.05, zt = P.chestZ * 0.62 + 0.014 * H, zb = P.chestZ + P.bust + 0.012 * H;
        S.push(ptube({ part: 'towelEnd', mat: 'acc', N: 4, lodMinN: 9, dens: 1.0, meta: { kind: 'towel' } }, [
          { c: [x, P.neckBase - 0.004 * H, zt - 0.01 * H], s: { hx: 0.032, hzF: 0.006, hzB: 0.006, p: 6 }, w: [['chest', 1]] },
          { c: [x * 1.05, (P.neckBase + P.bustY) / 2, (zt + zb) / 2], s: { hx: 0.033, hzF: 0.006, hzB: 0.006, p: 6 }, w: [['chest', 1]] },
          { c: [x * 1.12, P.bustY + 0.02 * H, zb], s: { hx: 0.034, hzF: 0.006, hzB: 0.006, p: 6 }, w: [['chest', 1]] }], [0, 0, 1]));
      }
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
