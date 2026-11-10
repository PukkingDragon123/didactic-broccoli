// The two railway underpasses (ガード下) at the ends of the lane: steel plate-girder deck bridges (riveted webs with
// stiffeners, flange plates, bearing shoes on bed blocks) on brick abutments with stone quoins, kenchi-stone
// retaining walls with a coping, a yellow-and-black clearance beam, the 桁下 3.4 m plates and the bridge's name, soot
// and rust down the piers, cable conduits, a drain grate across the dip; on top the ballast, sleepers, rails, a low
// fence, catenary masts with their beams and droppers. Inside it is pitch black (src/world/tunnelDark.js).
import { XT, XE, TZ0, TZ1, TH, WALK, YE, YR, TRACKS } from './layout.js';

const STEEL = 0x7f8a84, RUSTY = 0x8a6a56;

export function buildUnderpasses(t) {
  const B = t.B, m = t.m, I = (k) => t.indoor(k);
  for (const s of [-1, 1]) {
    B.push(0, 0, 0, 0, s < 0); // mirrored for the west end: everything below is written for x > 0
    // retaining walls (間知石) either side of the portal, a concrete coping and weep holes
    for (const [za, zb] of [[-48, TZ0 - 1.4], [TZ1 + 1.4, 68]]) {
      B.box(m.stone, 1.0, YE - 0.25, zb - za, XT + 0.5, 0, (za + zb) / 2, { uv: [za * 0.37, 0], ao: 0.18, skip: 'ny py px' });
      B.box(m.concrete, 1.12, 0.25, zb - za, XT + 0.5, YE - 0.25, (za + zb) / 2, { uv: [za, 0], tint: 0xb9b5ab });
      for (let z = Math.max(za, -10) + 1.2; z < Math.min(zb, 30); z += 2.4) { B.cyl(m.pv, 0.04, 0.04, 0.03, XT - 0.01, 0.7, z, { rz: Math.PI / 2, tint: 0x3a3836, sides: 6 }); }
    }
    // brick abutments framing the opening: a stone plinth, quoins up the corner, a bed block under the girder
    for (const [za, zb] of [[TZ0 - 1.45, TZ0], [TZ1, TZ1 + 1.45]]) {
      const zc = (za + zb) / 2, inner = za < TZ0 ? zb : za, sgn = za < TZ0 ? -1 : 1;
      B.box(m.brick, 0.5, YE - 0.3, zb - za, XT - 0.15, 0.3, zc, { uv: [za, 0.3], ao: 0.2, skip: 'ny' });
      B.box(m.concrete, 0.6, 0.34, zb - za + 0.1, XT - 0.15, 0, zc, { tint: 0xbfb8aa, bevel: 0.02 });
      for (let y = 0.34, k = 0; y < TH - 0.1; y += 0.3, k++) B.box(m.concrete, 0.54, 0.28, k % 2 ? 0.3 : 0.48, XT - 0.15, y, inner + sgn * (k % 2 ? 0.15 : 0.24), { tint: k % 3 ? 0xc6bfb0 : 0xb4ad9f, bevel: 0.012 });
      B.box(m.concrete, 0.66, 0.26, zb - za + 0.14, XT - 0.15, TH + 0.2, zc, { tint: 0xc4bdae, bevel: 0.02 });
      // hazard guards on the inner corner
      B.box(m.hazard, 0.05, 1.5, 0.36, XT - 0.43, 0.34, inner + sgn * 0.18, { skip: 'ny py' });
      B.box(m.hazard, 0.36, 1.5, 0.05, XT - 0.22, 0.34, inner - sgn * 0.025, { skip: 'ny py' });
    }
    // inside: brick side walls with a rendered dado, the walkway's kerb and rail, a gutter grate
    B.plane(I(m.asphalt), XE - XT, TZ1 - TZ0 + 0.4, (XT + XE) / 2, 0, (TZ0 + TZ1) / 2, { sx: 10, sz: 2, uv: [1.3, 0.2], tint: 0x868482 });
    for (let x = XT + 0.05; x < XE - 0.01; x += 2) {
      const w = Math.min(2, XE - x);
      B.box(I(m.brick), w, TH, 0.6, x + w / 2, 0, TZ0 - 0.3, { uv: [x, 0], ao: 0.25, skip: 'ny py nz' });
      B.box(I(m.brick), w, TH, 0.6, x + w / 2, 0, TZ1 + 0.3, { uv: [x + 0.3, 0], ao: 0.25, skip: 'ny py pz' });
      B.box(I(m.concrete), w, 1.1, 0.02, x + w / 2, 0.2, TZ0 + 0.005, { uv: [x, 0], tint: 0xa9a59b, skip: 'ny nz' });
      B.box(I(m.concrete), w, 0.2, TZ1 - WALK, x + w / 2, 0, (WALK + TZ1) / 2, { uv: [x, 0], skip: 'ny' });
      B.box(I(m.grate), w, 0.012, 0.26, x + w / 2, 0, TZ0 + 0.13, { uv: [x, 0], skip: 'ny' });
    }
    // the girder bridge: plate girders spanning the opening (stiffeners and flange plates), bearing shoes, the deck
    const span0 = TZ0 - 1.45, span1 = TZ1 + 1.45, L = span1 - span0, zc0 = (span0 + span1) / 2;
    for (const gx of [XT - 0.05, XE + 0.15]) {
      const out = gx < XE ? -1 : 1;
      B.box(m.girder, 0.06, YE - TH - 0.06, L, gx, TH + 0.06, zc0, { tint: STEEL, skip: 'ny py' });
      B.box(m.girder, 0.44, 0.07, L, gx, TH - 0.01, zc0, { tint: 0x6f7a74 });
      B.box(m.girder, 0.4, 0.06, L, gx, YE - 0.03, zc0, { tint: 0x8a958f });
      for (let z = span0 + 0.35; z < span1 - 0.2; z += 0.62) B.box(m.girder, 0.03, YE - TH - 0.1, 0.09, gx + out * 0.1, TH + 0.06, z, { tint: 0x8a958f, skip: 'ny py' });
      for (const z of [span0 + 0.5, span1 - 0.5]) B.box(m.girder, 0.4, 0.14, 0.5, gx, TH - 0.15, z, { tint: 0x5a5e5c, bevel: 0.02 });
      // rust weeping from the bottom flange
      if (out < 0) for (let z = span0 + 1; z < span1 - 0.5; z += 1.7) { B.push(gx - 0.035, 0, z, -Math.PI / 2); t.decalQ('rust', 0, TH + 0.08, 0, { w: 0.5, h: 0.62, flip: (z * 10) % 2 > 1 }); B.pop(); }
      B.box(m.hazard, 0.03, 0.2, TZ1 - TZ0, gx + out * 0.235, TH - 0.01, (TZ0 + TZ1) / 2, { skip: 'ny py' });
    }
    for (const gx of [27.6, 29.3, 31.6, 33.7, 35.2]) {
      B.box(I(m.girder), 0.06, 0.82, TZ1 - TZ0 + 1.2, gx, TH + 0.08, (TZ0 + TZ1) / 2, { tint: 0x6a726e, skip: 'py' });
      B.box(I(m.girder), 0.34, 0.06, TZ1 - TZ0 + 1.2, gx, TH + 0.04, (TZ0 + TZ1) / 2, { tint: 0x6a726e });
    }
    B.box(I(m.girder), XE - XT, 0.08, TZ1 - TZ0 + 1.2, (XT + XE) / 2, TH + 0.9, (TZ0 + TZ1) / 2, { tint: 0x4a504e, skip: 'py' });
    // cable runs on the wall, the walkway's guard rail
    for (const [y, r] of [[2.95, 0.03], [2.85, 0.02]]) B.rod(I(m.pv), [XT + 0.2, y, TZ0 + 0.05], [XE - 0.2, y, TZ0 + 0.05], r, { tint: 0x2a2a2a, sides: 5 });
    for (let x = XT + 0.5; x < XE; x += 1.2) B.box(I(m.metal), 0.04, 0.2, 0.08, x, 2.8, TZ0 + 0.04, { tint: 0x4a4a48 });
    for (let x = XT + 0.6; x < XE - 0.2; x += 1.5) B.cyl(I(m.metal), 0.03, 0.03, 0.95, x, 0.2, WALK + 0.06, { tint: 0xe4e2d8, sides: 6 });
    for (const y of [0.62, 1.12]) B.rod(I(m.metal), [XT + 0.6, y, WALK + 0.06], [XE - 0.1, y, WALK + 0.06], 0.025, { tint: 0xe4e2d8, sides: 6 });
    // a drain grate across the dip at the mouth
    B.box(m.grate, 0.3, 0.012, TZ1 - TZ0, XT + 0.75, 0, (TZ0 + TZ1) / 2, { ry: 0, uv: [0, 0], skip: 'ny' });
    B.box(m.pv, 0.42, 0.02, TZ1 - TZ0, XT + 0.75, -0.012, (TZ0 + TZ1) / 2, { tint: 0x5a5856, skip: 'ny' });
    // the embankment on top: grass shoulders, ballast, sleepers, rails, a fence, catenary
    const zA = -48, zB = 68, LL = zB - zA, zc = (zA + zB) / 2;
    B.box(m.grass, XE - XT + 0.6, 0.3, LL, (XT + XE) / 2 + 0.3, YE - 0.3, zc, { skip: 'ny' });
    B.box(m.ballast, 7.2, 0.18, LL, 31.5, YE, zc, { skip: 'ny' });
    B.box(m.ballast, 6.4, 0.12, LL, 31.5, YE + 0.18, zc, { uv: [0.5, 0.5], skip: 'ny' });
    for (const tx of TRACKS) {
      for (let z = -14.2; z < 34; z += 0.62) B.box(m.concrete, 2.1, 0.12, 0.22, tx, YE + 0.24, z, { tint: 0xa9a59c, skip: 'ny' });
      for (const rx of [-0.535, 0.535]) {
        B.box(m.metal, 0.08, 0.14, LL, tx + rx, YE + 0.36, zc, { tint: 0x7a5a48, skip: 'ny py' });
        B.box(m.metal, 0.07, 0.03, LL, tx + rx, YR - 0.03, zc, { tint: 0xd8dce0, skip: 'ny' });
      }
    }
    for (let z = zA; z < zB; z += 2.4) B.box(m.pv, 0.1, 1.25, 0.1, XT + 0.2, YE, z, { tint: 0x9aa89a, skip: 'ny' });
    for (const y of [0.45, 0.85, 1.2]) B.box(m.metal, 0.04, 0.04, LL, XT + 0.2, YE + y, zc, { tint: 0x6a7a6a });
    for (const z of [-26, 4, 34, 64]) {
      B.box(m.girder, 0.26, 5.6, 0.26, XT + 0.75, YE, z, { tint: 0x8a9096, skip: 'ny' });
      B.box(m.girder, 7.2, 0.18, 0.16, XT + 0.75 + 3.6, YE + 5.0, z, { tint: 0x8a9096 });
      B.beam(m.girder, [XT + 0.85, YE + 3.6, z], [XT + 2.6, YE + 5.0, z], 0.1, { tint: 0x8a9096 });
      for (const tx of TRACKS) { B.box(m.metal, 0.05, 0.7, 0.05, tx, YE + 4.3, z, { tint: 0x6a7076 }); B.lathe(m.gloss, [[0.04, 0], [0.07, 0.05], [0.04, 0.1], [0.07, 0.15], [0.04, 0.2]], tx, YE + 4.72, z, { tint: 0x8a6a4a, sides: 6 }); }
    }
    for (const tx of TRACKS) {
      B.box(m.pv, 0.025, 0.025, LL, tx, YR + 4.55, zc, { tint: 0x2a2624 });
      B.box(m.pv, 0.02, 0.02, LL, tx, YR + 5.1, zc, { tint: 0x2a2624 });
      for (let z = -44; z < 66; z += 5) B.box(m.pv, 0.012, 0.55, 0.012, tx, YR + 4.55, z, { tint: 0x2a2624 });
    }
    // the far end is closed off in the dark; roofs beyond only peek over the embankment
    B.box(I(m.pv), 0.1, YE - 0.2, TZ1 - TZ0 + 1.4, XE - 0.4, 0, (TZ0 + TZ1) / 2, { tint: 0x050505 });
    B.pop();
    // signs on the girder face and the pier (unmirrored so their text reads correctly), the mouth's dressing
    const gx = s * (XT - 0.2), ry = s > 0 ? -Math.PI / 2 : Math.PI / 2, fx = s * (XT - 0.41);
    place(t, 'clearRound', gx, TH + 0.2, 9.0, ry, 0.62);
    place(t, 'clearPlate', gx, TH + 0.25, 10.4, ry, 0.9);
    place(t, 'bridgeName', fx, 2.1, TZ1 + 0.72, ry, 0.62);
    place(t, 'snatch', fx, 1.5, TZ0 - 0.72, ry, 0.4);
    for (const zc2 of [TZ0 - 0.72, TZ1 + 0.72]) { B.push(fx, 0, zc2, ry); t.decalQ('base', 0, 0.34, 0.004, { w: 1.3, h: 0.5 }); t.decalQ('drip' + (zc2 > 9 ? 1 : 2), 0.1, TH - 1.5, 0.004, { w: 0.9, h: 1.7 }); B.pop(); }
    B.push(0, 0, 0, 0, s < 0);
    B.tube(m.pv, [[XT - 0.43, 0.4, TZ1 + 1.22], [XT - 0.43, TH + 0.5, TZ1 + 1.22]], 0.028, { tint: 0x6a6e70, sides: 5 });
    B.box(m.pv, 0.14, 0.42, 0.32, XT - 0.47, 1.05, TZ1 + 1.15, { tint: 0x8a9290, bevel: 0.015 });
    B.box(m.pv, 0.02, 0.06, 0.2, XT - 0.545, 1.36, TZ1 + 1.15, { tint: 0xf2c41a });
    B.pop();
    t.prop('drink_cans', s * (XT + 0.45), 0, TZ0 + 0.45, s * 0.6);
    t.puddle(s * (XT - 0.5), 8.1, 1.9, 1.15, 0.15 * s);
    t.puddle(s * (XT + 0.9), 11.0, 1.4, 1.0, -0.3 * s);
    // roofs beyond the tracks
    for (const [z, w, h] of [[5.3, 7.2, 6.6], [13.3, 8.0, 6.0]]) t.backHouse(s * (XE + 7.4), z + (s > 0 ? 0 : 0), w, 6, h, 1);
  }
}

/** A trim sign on a wall facing along x (world coordinates): bottom centre at (x, y, z). */
function place(t, key, x, y, z, ry, w) { t.B.push(x, 0, z, ry); t.sign(key, 0, y, 0, { w }); t.B.pop(); }
