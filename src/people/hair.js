// Hair and hats as a few chunky shells around the cranium (all on the head bone, except long hair below the
// nape which rides on the chest, and pony / twin tails which hang from spring-driven tail bones).
import { seg } from './body.js';

/** Cranium cross-section at height y, grown by (ex, ez) and shifted by dz. */
function cs(P, y, ex = 0, ez = 0, dz = 0) {
  const sl = 0.06 * P.hu, t = Math.max(0, Math.min(1, (y - P.noseY) / (P.crown - P.noseY)));
  return [0, P.hcz - sl * 0.6 * t + dz, P.hw * (1 - 0.1 * t) + ex, P.hd - sl * 0.4 * t + ez];
}

/** Grow a top section [cx, cz, hx, hz] so it still encloses the cranium's crown (no scalp poking through). */
function enclose(P, c, m = 0.01 * P.hu, ch = 0.3) {
  const k = cs(P, P.crown);
  m += Math.max(0, ch - 0.3) * 0.22 * P.hu; // a bigger corner chamfer than the skull's needs more room
  const front = Math.max(c[1] + c[3], k[1] + k[3] + m), back = Math.min(c[1] - c[3], k[1] - k[3] - m);
  return [c[0], (front + back) / 2, Math.max(c[2], k[2] + m), (front - back) / 2];
}

export function hairSegments(spec, P, J) {
  const S = [], hu = P.hu, st = spec.hair.style, hat = spec.hat?.kind;
  const add = (part, bone, mat, y0, y1, b, t, o) => { const x = seg(part, bone, mat, y0, y1, b, t, o); S.push(x); return x; };
  const vol = spec.hair.volume || 1;
  // --- the hair
  const cap = (th, y0, o = {}) => add('hairCap', 'head', 'hair', y0, P.crown + th * 0.9, cs(P, y0, th, th, o.dz || 0), (() => { const c = cs(P, P.crown, th * 0.75, th * 0.8, (o.dz || 0) - th * 0.15); c[2] *= o.round ?? 0.9; c[3] *= o.round ?? 0.9; return enclose(P, c, 0.004 * hu, o.ch ?? 0.38); })(), { ch: o.ch ?? 0.38, caps: 'top' });
  const sides = (th, y0, y1, zf, flare = 0) => {
    const zb = P.hcz - P.hd - th * 0.6, mid = (zf + zb) / 2, hz = (zf - zb) / 2;
    const x0 = cs(P, y0)[2], x1 = cs(P, y1)[2];
    add('hairSide', 'head', 'hair', y0, y1, [x0 + th * (0.5 + flare) - 0.004, mid, th * (0.5 + flare) + 0.004, hz], [x1 + th * 0.5 - 0.004, mid, th * 0.5 + 0.004, hz], { ch: 0.3, mirror: true, caps: 'bot' });
  };
  const back = (th, y0, y1, w = 1, flare = 0) => {
    const c0 = cs(P, y0), c1 = cs(P, y1);
    add('hairBack', 'head', 'hair', y0, y1, [0, c0[1] - c0[3] + 0.03 * hu - th * (1 + flare) / 2, (c0[2] + th) * w + flare * th, th * (1 + flare) / 2 + 0.03 * hu], [0, c1[1] - c1[3] + 0.03 * hu - th / 2, (c1[2] + th) * w, th / 2 + 0.03 * hu], { ch: 0.35, caps: 'bot' });
  };
  const bangs = (yb, w = 0.86, th = 0.035 * hu, cut = 'straight') => {
    const c = cs(P, P.hairY);
    add('bangs', 'head', 'hair', yb, P.hairY + 0.06 * hu, [0, P.zf + th / 2 - 0.01 * hu, P.hw * w, th / 2], [0, c[1] + c[3] + th / 2 - 0.004, c[2] * w * 0.98, th / 2], { ch: 0.3, caps: 'bot', cut });
  };
  const tail = (bone, len, w, x, y, z) => {
    J[bone] = [x, y, z];
    add('tail', bone, 'hair', y - len, y + 0.02 * hu, [x, z - 0.03 * hu, w * 0.55, w * 0.5], [x, z, w, w * 0.9], { ch: 0.4, rot: { p: [x, y, z], e: [-0.12, 0, x > 0 ? -0.1 : x < 0 ? 0.1 : 0] } });
  };
  if (!hat || hat === 'headband') {
    if (st === 'short' || st === 'sidepart') {
      cap(0.05 * hu * vol, P.hairY - 0.015 * hu, { dz: 0.005 * hu });
      sides(0.032 * hu, P.earTop - 0.03 * hu, P.hairY, P.zf - 0.2 * hu);
      back(0.04 * hu, P.napeY, P.hairY);
      if (st === 'sidepart') add('fringe', 'head', 'hair', P.hairY - 0.07 * hu, P.hairY + 0.07 * hu, [spec.hair.part * P.hw * 0.32, P.zf + 0.012 * hu, P.hw * 0.42, 0.022 * hu], [spec.hair.part * P.hw * 0.28, P.zf - 0.01 * hu, P.hw * 0.52, 0.03 * hu], { ch: 0.4, caps: 'none', cut: 'swept' });
    } else if (st === 'buzz') {
      cap(0.016 * hu, P.hairY - 0.01 * hu, { round: 0.95 });
      sides(0.012 * hu, P.earTop - 0.02 * hu, P.hairY, P.zf - 0.2 * hu);
      back(0.014 * hu, P.napeY, P.hairY);
    } else if (st === 'messy' || st === 'mushroom' || st === 'bowl') {
      const th = (st === 'bowl' ? 0.05 : 0.07) * hu;
      cap(th, P.hairY - 0.03 * hu, { dz: 0.006 * hu, round: 0.88, ch: 0.45 });
      sides((st === 'messy' ? 0.028 : 0.035) * hu, P.earTop - (st === 'mushroom' ? 0.08 : st === 'messy' ? 0 : 0.03) * hu, P.hairY, P.zf - (st === 'messy' ? 0.19 : 0.16) * hu, st === 'messy' ? 0 : 0.15);
      back(0.04 * hu, P.napeY - 0.02 * hu, P.hairY, 1, 0.15);
      bangs(P.browY + (st === 'messy' ? 0.06 : 0.02) * hu, 0.88, 0.04 * hu, st === 'messy' ? 'messy' : 'straight');
    } else if (st === 'bob' || st === 'long' || st === 'pigtails' || st === 'twintails' || st === 'ponytail' || st === 'bun') {
      const tight = st === 'ponytail' || st === 'bun' || st === 'twintails' || st === 'pigtails';
      const th = (tight ? 0.035 : 0.055) * hu * vol;
      cap(th, P.hairY - 0.025 * hu, { dz: 0.004 * hu });
      if (st === 'bob' || st === 'long') {
        const yb = P.chin + (st === 'bob' ? 0.08 : -0.02) * hu;
        sides((st === 'long' ? 0.042 : 0.055) * hu * vol, yb, P.hairY, P.zf - (st === 'long' ? 0.12 : 0.07) * hu, st === 'long' ? 0.15 : 0.35);
        back(0.055 * hu * vol, yb, P.hairY, 1.02, st === 'long' ? 0.2 : 0.35);
        bangs(P.browY + 0.03 * hu, 0.86, 0.04 * hu, st === 'long' && spec.hair.part ? 'side' : 'straight');
        if (st === 'long') {
          // the rest of the length rides on the chest so the head can turn freely
          const w = P.hw * 1.05 * vol, zb = -P.chestZ * 0.62;
          add('hairLong', 'chest', 'hair', P.bustY - 0.03 * P.H * (spec.age === 'teen' ? 0 : 1), P.neckBase + 0.05 * hu, [0, zb - 0.03 * hu, w * 1.1, 0.045 * hu * vol], [0, zb - 0.045 * hu, w, 0.06 * hu * vol], { ch: 0.35, caps: 'bot' });
        }
      } else {
        sides(0.03 * hu, P.earTop - 0.02 * hu, P.hairY, P.zf - 0.16 * hu);
        back(0.035 * hu, P.napeY, P.hairY);
        bangs(P.browY + 0.05 * hu, 0.84, 0.035 * hu, 'side');
        const zb = P.hcz - P.hd;
        if (st === 'ponytail') tail('tailL', P.H * (spec.age === 'kid' ? 0.11 : 0.15) * vol, 0.026 * P.H * Math.sqrt(vol), 0, P.eyeY + 0.12 * hu, zb - 0.02 * hu);
        else if (st === 'bun') add('bun', 'head', 'hair', P.crown - 0.32 * hu, P.crown - 0.02 * hu, [0, zb - 0.06 * hu, 0.17 * hu, 0.13 * hu], [0, zb - 0.02 * hu, 0.14 * hu, 0.11 * hu], { ch: 0.45 });
        else {
          const len = P.H * (st === 'pigtails' ? 0.07 : 0.14) * vol, w = (st === 'pigtails' ? 0.017 : 0.019) * P.H * Math.sqrt(vol);
          for (const sx of [1, -1]) tail(sx > 0 ? 'tailL' : 'tailR', len, w, sx * (P.hw + 0.03 * hu), P.earTop + 0.06 * hu, P.hcz - 0.3 * hu);
        }
      }
    } else if (st === 'perm') {
      const th = 0.1 * hu;
      cap(th, P.hairY - 0.04 * hu, { dz: -0.01 * hu, round: 0.85, ch: 0.45 });
      sides(0.07 * hu, P.earBot + 0.06 * hu, P.hairY, P.zf - 0.17 * hu, 0.2);
      back(0.08 * hu, P.napeY + 0.02 * hu, P.hairY, 1.04, 0.2);
      add('fringe', 'head', 'hair', P.hairY - 0.08 * hu, P.hairY + 0.05 * hu, [0, P.zf + 0.01 * hu, P.hw * 0.8, 0.03 * hu], [0, P.zf - 0.02 * hu, P.hw * 0.86, 0.04 * hu], { ch: 0.45, caps: 'none', cut: 'curly' });
    } else if (st === 'bald') {
      sides(0.014 * hu, P.earBot + 0.02 * hu, P.earTop + 0.12 * hu, P.zf - 0.25 * hu);
      back(0.016 * hu, P.napeY, P.earTop + 0.1 * hu);
    }
  }
  // a rounder skull top for bald heads (skin)
  if (st === 'bald' && (!hat || hat === 'headband')) add('scalp', 'head', 'head', P.hairY + 0.02 * hu, P.crown + 0.04 * hu, cs(P, P.hairY + 0.02 * hu, 0.003 * hu, 0.003 * hu), (() => { const c = cs(P, P.crown, 0, 0, -0.04 * hu); c[2] *= 0.62; c[3] *= 0.64; return c; })(), { ch: 0.45, caps: 'top' });
  if (!hat) return S;
  // --- hats (hair below the hat band still shows)
  if (hat !== 'headband') {
    const th = st === 'perm' ? 0.08 * hu : 0.03 * hu;
    const yHat = P.browY + (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat' ? 0.15 : 0.2) * hu;
    if (st !== 'bald' && st !== 'none') {
      // only the hair below the hat band (kept inside the crown so it never pokes through)
      sides(0.026 * hu, P.earTop - 0.03 * hu, yHat + 0.015 * hu, P.zf - 0.2 * hu);
      back(0.03 * hu, P.napeY, yHat + 0.015 * hu);
    } else if (st === 'bald') {
      sides(0.014 * hu, P.earBot + 0.02 * hu, P.earTop + 0.1 * hu, P.zf - 0.25 * hu);
      back(0.016 * hu, P.napeY, P.earTop + 0.08 * hu);
    }
    const y0 = P.browY + (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat' ? 0.15 : 0.2) * hu;
    if (hat === 'cap') {
      add('hatCrown', 'head', 'hat', y0, P.crown + 0.05 * hu, cs(P, y0, th + 0.012 * hu, th + 0.01 * hu), (() => { const c = cs(P, P.crown, th * 0.6, th * 0.6, -0.02 * hu); c[2] *= 0.82; c[3] *= 0.84; return enclose(P, c, 0.01 * hu, 0.42); })(), { ch: 0.42, caps: 'top' });
      add('visor', 'head', 'hat2', y0 - 0.005 * hu, y0 + 0.022 * hu, [0, P.zf + 0.2 * hu, P.hw * 0.78, 0.2 * hu], [0, P.zf + 0.2 * hu, P.hw * 0.78, 0.2 * hu], { ch: 0.5, rot: { p: [0, y0, P.zf], e: [0.18, 0, 0] } });
    } else if (hat === 'flatcap') {
      add('hatCrown', 'head', 'hat', y0, P.crown + 0.01 * hu, cs(P, y0, th + 0.015 * hu, th + 0.02 * hu), (() => { const c = cs(P, P.crown, th, th, 0.06 * hu); c[2] *= 0.95; c[3] *= 0.85; return enclose(P, c, 0.01 * hu, 0.4); })(), { ch: 0.4, caps: 'top' });
      add('visor', 'head', 'hat2', y0 - 0.01 * hu, y0 + 0.02 * hu, [0, P.zf + 0.1 * hu, P.hw * 0.86, 0.1 * hu], null, { ch: 0.5, rot: { p: [0, y0, P.zf], e: [0.22, 0, 0] } });
    } else if (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat') {
      const brim = hat === 'sunhat' ? 0.36 * hu : hat === 'schoolhat' ? 0.24 * hu : 0.2 * hu;
      add('hatCrown', 'head', 'hat', y0, P.crown + 0.07 * hu, cs(P, y0, th + 0.02 * hu, th + 0.02 * hu, -0.01 * hu), (() => { const c = cs(P, P.crown, th, th, -0.02 * hu); c[2] *= 0.86; c[3] *= 0.86; return enclose(P, c, 0.01 * hu, 0.5); })(), { ch: 0.5, caps: 'top' });
      const c = cs(P, y0, th + brim, th + brim, -0.01 * hu);
      add('brim', 'head', 'hat2', y0 - 0.025 * hu, y0 + 0.004 * hu, [c[0], c[1], c[2] * 1.02, c[3] * 1.02], c, { ch: 0.42, dens: 0.8 });
    } else if (hat === 'hardhat') {
      add('hatCrown', 'head', 'hat', y0, P.crown + 0.1 * hu, cs(P, y0, th + 0.035 * hu, th + 0.04 * hu), (() => { const c = cs(P, P.crown, th, th, -0.01 * hu); c[2] *= 0.78; c[3] *= 0.8; return enclose(P, c, 0.01 * hu, 0.5); })(), { ch: 0.5, caps: 'top' });
      const c = cs(P, y0, th + 0.07 * hu, th + 0.09 * hu, 0.03 * hu);
      add('brim', 'head', 'hat2', y0 - 0.02 * hu, y0 + 0.008 * hu, c, c, { ch: 0.45, dens: 0.8 });
    }
  } else {
    // tenugui headband just above the brows
    add('headband', 'head', 'hat', P.browY + 0.1 * hu, P.browY + 0.2 * hu, cs(P, P.browY + 0.1 * hu, 0.012 * hu, 0.012 * hu), cs(P, P.browY + 0.2 * hu, 0.012 * hu, 0.012 * hu), { ch: 0.32, caps: 'none' });
  }
  return S;
}
