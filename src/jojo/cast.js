// The original eccentrics of the bizarre side story, built from the player-character kit (src/people/avatar.js:
// a base look plus closet cosmetics, painted and dressed like you are), and the shared helpers their scenes use.
//   makeCast(id, { lazy }) -> Human         CAST[id] = { name, color, voice, look }
//   line(c, g, who, text, opts)    a floating line (plain text beside the head, typed with an 8-bit voice) as a cutscene
//                                  waiter that lasts as long as it takes to read (skipping closes it)
//   walker(h)                      walk a Human to a point at a pace: w.to(x, z, speed), w.update(dt) -> arrived
import * as THREE from 'three';
import { createAvatarHuman } from '../people/avatar.js';
import { talk as blipVoice } from '../people/voice.js';

export const CAST = {
  goda: {
    name: 'Gōda Tetsuzan', short: 'Gōda', color: '#e8b830', voice: { base: 132, duty: 0.5 }, scale: 1.05,
    look: { body: 'm', skin: 'medium', hair: 'sidepart', hairCol: 'black', top: 'aloha', topCol: 'white', bottom: 'slacks', botCol: 'black', eyes: 'sharp', brows: 'thick', outfit: 'cx_sukajan', face: 'cx_yenshades', shoes: 'cx_goldkicks', seed: 31 },
  },
  kujaku: {
    name: 'Madame Kujaku', short: 'Kujaku', color: '#d86ab0', voice: { base: 340, duty: 0.125 }, scale: 0.97,
    look: { body: 'f', skin: 'fair', hair: 'bun', hairCol: 'silver', top: 'knit', topCol: 'plum', bottom: 'longskirt', botCol: 'black', eyes: 'almond', brows: 'arched', cheeks: 'blush', face: 'cx_heart', shoes: 'cx_redhi', bag: 'cx_handbag', seed: 52 },
  },
  hidari: {
    name: 'Mr. Hidari', short: 'Hidari', color: '#7aa6d8', voice: { base: 228, duty: 0.25 }, scale: 0.94,
    look: { body: 'm', skin: 'light', hair: 'short', hairCol: 'silver', top: 'flannel', topCol: 'charcoal', bottom: 'slacks', botCol: 'grey', eyes: 'sleepy', brows: 'straight', outfit: 'cx_blazer', face: 'cx_monocle', hat: 'cx_flatcap', shoes: 'cx_loafers', seed: 77 },
  },
};

export function makeCast(id, { lazy = false } = {}) {
  const C = CAST[id];
  const h = createAvatarHuman(C.look, { lazy });
  if (!lazy) h.finishPaint?.();
  h.root.scale.setScalar(C.scale || 1);
  h.root.name = 'jojo-' + id;
  h.castId = id;
  return h;
}

export const voiceOf = (id) => { const C = CAST[id]; return C ? blipVoice(null, { base: C.voice.base, duty: C.voice.duty, vol: 0.9 }) : null; };

/** Reading time for a line (seconds after it has finished typing). */
export const readTime = (text) => Math.max(1.0, 0.45 + String(text).split(/\s+/).length * 0.2);

/**
 * Someone says a line in a cutscene: plain floating text beside their head (src/people/Bubbles.js), typed with their
 * voice, held for as long as it takes to read. who: a cast id (with h) | { h, name, color, voice } | 'me' (the stand-in).
 */
export function line(c, g, who, text, { h = null, style = 'say', hold = null, big = true } = {}) {
  const C = typeof who === 'string' ? CAST[who] : who;
  const target = h || C?.h;
  if (!target || !g.bubbles) return c.wait(0.5);
  const me = who === 'me';
  const b = g.bubbles.say(target, text, {
    big, hold: true, style: me ? 'me' : style, name: me ? 'You' : C?.short || C?.name, color: me ? '#f2e2c4' : C?.color,
    onChar: me ? c.voice : (C?.voice?.base ? blipVoice(null, { base: C.voice.base, duty: C.voice.duty, vol: 0.9 }) : null),
  });
  const read = hold ?? readTime(text);
  let t = 0, typedAt = -1;
  return {
    update: (dt) => {
      if (c.skipping) { b.close(); return true; }
      t += dt;
      if (b.typed && typedAt < 0) typedAt = t;
      if (typedAt >= 0 && t - typedAt >= read) { b.close(); return true; }
      return t > 30;
    },
  };
}

const _d = new THREE.Vector3();
/** Walk a Human across flat ground at a pace, facing the way it goes (Human.update does the gait). */
export function walker(h) {
  const W = {
    target: null, speed: 1.2, moving: false,
    to(x, z, speed = 1.2) { W.target = new THREE.Vector3(x, 0, z); W.speed = speed; W.moving = true; return W; },
    update(dt, lookAt = null) {
      let sp = 0;
      if (W.moving && W.target) {
        const r = h.root.position;
        _d.subVectors(W.target, r).setY(0);
        const d = _d.length();
        if (d < 0.05) W.moving = false;
        else {
          const step = Math.min(d, W.speed * dt);
          r.addScaledVector(_d.normalize(), step);
          sp = W.speed;
          const want = Math.atan2(_d.x, _d.z);
          h.root.rotation.y += Math.atan2(Math.sin(want - h.root.rotation.y), Math.cos(want - h.root.rotation.y)) * Math.min(1, dt * 8);
        }
      }
      h.update(dt, { speed: sp, lookAt });
      return !W.moving;
    },
    face(yaw, dt = 1) { h.root.rotation.y += Math.atan2(Math.sin(yaw - h.root.rotation.y), Math.cos(yaw - h.root.rotation.y)) * Math.min(1, dt * 6); },
  };
  return W;
}
