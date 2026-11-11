// Series 18 — Puchi Puchi Suizokukan (ぷちぷち水族館)
// Chibi sea creatures from the aquarium: the squishy, the flat, the ancient and the enormous.
// Puchi Aquarium: deep-sea and aquarium creatures as blocky vinyl figures with painted markings (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { cute, stick, WHITE } from '../../figures/props.js';

const SAND = { c: 0xe6d4a4, t: 'stone', top: 0xeedcb0 };
const R = Math.PI / 180;
const F = {
  mendako(k) {
    k.soft([0, 10, 0], [17, 10, 15], { c: 0xe8705a, t: 'gloss', m: 'gloss', d: [cute({ y: 2, gap: 7, er: 1.8, eh: 2.2, mouth: 'cat', mw: 3 }), D.dots(4, 0.6, 0xf49a84, { dir: 't' })] }, { flat: true, ch: 0.5, bev: 0.5, bs: 0.62 });
    k.mirror(() => k.box([9, 20, 0], [6, 7, 2.4], { c: 0xe8705a, t: 'gloss' }, { ch: 0.5, rot: [0, 0, -0.5], top: [0.6, 1] }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.box([Math.cos(a) * 15, 1.2, Math.sin(a) * 13], [6, 2.4, 4], { c: 0xd85a48, t: 'gloss' }, { ch: 0.5, rot: [0, -a, 0] }); }
  },
  chinanago(k) {
    k.box([0, 3, 0], [56, 6, 30], { ...SAND, d: [D.dots(3, 0.4, 0xc8b484, { dir: 't' })] }, { ch: 0.3 });
    const eel = (x, z, h, c, spots, turn, look) => k.at([x, 5, z], [0, turn, 0], () => {
      k.box([0, h * 0.35, 0], [5, h * 0.7, 5], { c, t: 'gloss', d: [spots ? D.dots(2.4, 0.5, spots, { dir: '*' }) : D.stripes('y', 4, 1.4, 0xf06a2a)] }, { ch: 0.5 });
      k.at([0, h * 0.7, 0], [0.25, 0, look], () => k.box([0, h * 0.18, 0.8], [5.4, h * 0.36, 5.6], { c, t: 'gloss', d: [D.circ(1.2, 2, 1.2, 0x1a1a1a, { dir: 'f' }), D.circ(0.8, 2.5, 0.4, 0xffffff, { dir: 'f' }), D.line(-1, -1, 1.5, -1, 0.4, 0x1a1a1a, { dir: 'f' }), spots ? D.dots(2.4, 0.5, spots, { dir: '*' }) : null] }, { ch: 0.5, top: [0.85, 0.85] }));
      k.cyl([0, 0.4, 0], 4, 1.2, { c: 0xc8b484, t: 'stone' });
    });
    eel(-16, 2, 30, 0xf6f2e6, 0x2a2a2a, 0.3, 0.3); eel(0, -4, 40, 0xf6a03a, null, 0, -0.2); eel(15, 4, 24, 0xf6f2e6, 0x2a2a2a, -0.4, 0.4);
  },
  clione(k) {
    k.soft([0, 34, 0], [8, 8, 7.4], { c: 0xe8f4f8, m: 'glass', t: 'glass', d: [cute({ y: 0, gap: 3, er: 1, eh: 1.3, mouth: 'smile', mw: 1.8 })] }, { ch: 0.586, bev: 0.5, bs: 0.6 });
    k.prism([[0, 3, 3, 0, 0, 0.586], [8, 7, 6.4, 0, 0, 0.586], [20, 6.6, 6, 0, 0, 0.586]], { c: 0xe8f4f8, m: 'glass', t: 'glass' }, { pos: [0, 6, 0] });
    k.soft([0, 20, 0], [3, 5, 3], { c: 0xf06a5a, m: 'glow' }, { ch: 0.586 });
    k.soft([0, 38, 0], [2.4, 2, 2.4], { c: 0xf06a5a, t: 'gloss' }, { ch: 0.586 });
    k.mirror(() => k.box([10, 24, 0], [10, 3, 6], { c: 0xe8f4f8, m: 'glass', t: 'glass' }, { ch: 0.586, rot: [0, 0, 0.35], top: [0.6, 1] }));
    k.cyl([0, 1.5, 0], 9, 3, { c: 0x2a4a7a, t: 'gloss' });
    stick(k, [0, 3, 0], [0, 7, 0], 1.4, { c: 0xd8eef6, m: 'glass' });
  },
  manbou(k) {
    k.box([0, 2, 0], [44, 4, 22], { c: 0x2a4a7a, t: 'gloss', top: 0x3a6a9a }, { ch: 0.3 });
    // the sunfish: a tall disc, lying fainted on its side, eyes as crosses
    k.at([0, 26, 0], [0, 0, 0.35], () => {
      k.prism([[-20, 6, 4, 0, 0, 0.5], [-12, 14, 5, 0, 0, 0.5], [10, 15, 5, 0, 0, 0.5], [16, 11, 4.4, 0, 0, 0.5]], { c: 0x9ab0c0, t: 'gloss', d: [D.ell(0, -8, 12, 6, 0xd8e2ea), cute({ eye: 'x', y: 6, x: -6, gap: 3, er: 1.4, mouth: 'o', my: 1, mw: 2 }), cute({ eye: 'x', y: 6, x: -6, gap: 3, er: 1.4, mouth: 'o', my: 1, mw: 2, dir: 'b' })] }, { rot: [0, 0, Math.PI / 2], pf: true });
      k.box([0, 15, 0], [8, 16, 2], { c: 0x8aa0b0, t: 'gloss' }, { ch: 0.4, top: [0.5, 1] });
      k.box([0, -15, 0], [8, 16, 2], { c: 0x8aa0b0, t: 'gloss' }, { ch: 0.4, top: [1.6, 1] });
      k.box([18, 0, 0], [5, 26, 3], { c: 0x8aa0b0, t: 'gloss', d: [D.stripes('y', 3, 0.6, 0x7a90a0)] }, { ch: 0.5 });
    });
  },
  gusokumushi(k) {
    k.box([0, 2, 0], [50, 4, 28], SAND, { ch: 0.3 });
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const z = 16 - i * 5, w = 22 - Math.abs(i - 2.5) * 1.6;
      k.soft([0, 9, z], [w / 2, 5.6, 3], { c: 0xc8bca8, t: 'gloss', d: [D.band('z', -3, -2.2, 0x9a8e7a)] }, { ch: 0.5, bev: 0.45, bs: 0.7 });
      k.mirror(() => k.box([w / 2, 3.4, z], [3, 1.4, 1.4], { c: 0xa89a84 }, { ch: 0.4, rot: [0, 0, -0.5] }));
    }
    k.soft([0, 8, 21], [9, 4.4, 3], { c: 0xc8bca8, t: 'gloss', d: [D.ell(-5.6, 1, 2.2, 1.6, 0x2a2a30), D.ell(5.6, 1, 2.2, 1.6, 0x2a2a30), D.circ(-6, 1.5, 0.5, 0xffffff), D.circ(5.2, 1.5, 0.5, 0xffffff)] }, { ch: 0.5 });
    k.mirror(() => k.box([5, 9, 27], [1, 1, 10], { c: 0xa89a84 }, { ch: 0.3, rot: [0.3, 0.4, 0] }));
    k.box([0, 7, -20], [14, 2, 6], { c: 0xb8ac98, t: 'gloss' }, { ch: 0.5 });
  },
  kurage(k) {
    k.box([0, 3, 0], [40, 6, 40], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.2 });
    k.box([0, 28, 0], [38, 44, 38], { c: 0x2a5aa8, m: 'glass', t: 'glass' }, { ch: 0.1 });
    k.box([0, 51, 0], [40, 2, 40], { c: 0x2a2a30 }, { ch: 0.2 });
    const jelly = (x, y, z, s) => {
      k.soft([x, y, z], [7 * s, 4 * s, 7 * s], { c: 0xe8f0ff, m: 'glass', t: 'glass', d: [D.ring(0, 0, 3 * s, 0.9, 0xd8a0d8, { dir: 't' })] }, { ch: 0.586, flat: true, bev: 0.6, bs: 0.5 });
      for (let i = 0; i < 4; i++) k.box([x + Math.cos(i * 1.57) * 3 * s, y - 6 * s, z + Math.sin(i * 1.57) * 3 * s], [0.8, 10 * s, 0.8], { c: 0xe8f0ff, m: 'glass' }, { ch: 0 });
    };
    jelly(-6, 36, 4, 1.2); jelly(8, 26, -4, 0.9); jelly(-4, 18, -8, 0.7);
  },
  irukashow(k) {
    k.box([0, 4, 0], [60, 8, 34], { c: 0x5ab8e8, m: 'glass', t: 'water', side: 0xe8e8ee }, { ch: 0.2 });
    // the dolphin leaping through a hoop, a ball on its nose
    k.at([0, 30, 0], [0, 0, 0.5], () => {
      k.prism([[-22, 2, 2, 0, 0, 0.5], [-12, 6, 5, 0, 0, 0.5], [6, 8, 6.6, 0, 0, 0.5], [14, 6, 5.6, 0, 0, 0.5], [22, 2, 2, 0, 0, 0.5]], { c: 0x6a8aa8, t: 'gloss', m: 'gloss', d: [D.band('y', -20, -2, 0x6a8aa8), D.fn('*', (c, o) => { if (c.y < -1.5) { o[0] = 236; o[1] = 240; o[2] = 244; } }), D.circ(11, 1.6, 1.2, 0x1a1a1a, { dir: 'f' }), D.circ(11, 1.6, 1.2, 0x1a1a1a, { dir: 'b' }), D.arc(18, -2, 3, 1.6, Math.PI + 0.3, 2 * Math.PI - 0.6, 0.5, 0x1a1a1a, { dir: 'f' })] }, { rot: [0, 0, -Math.PI / 2], pf: true });
      k.box([-2, 9, 0], [8, 7, 2], { c: 0x6a8aa8, t: 'gloss' }, { ch: 0.4, top: [0.3, 1], sh: [-3, 0] });
      k.box([-24, 0, 0], [4, 14, 2], { c: 0x6a8aa8, t: 'gloss' }, { ch: 0.5 });
      k.soft([27, 3, 0], [5, 5, 5], { c: 0xf6f2e8, t: 'gloss', m: 'gloss', d: [D.stripes('x', 5, 2.4, 0xe83a3a), D.band('x', 1.2, 4, 0x3a8ae8)] }, { ch: 0.586 });
    });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.box([-6, 28 + Math.sin(a) * 16, Math.cos(a) * 16], [2, 6.6, 2], { c: i % 2 ? 0xe83a3a : 0xffffff, t: 'gloss' }, { rot: [-a, 0, 0], ch: 0.4 }); }
    k.box([-6, 10, 0], [2, 4, 2], 0x8a8a92);
  },
  jinbei(k) {
    k.box([0, 2, 0], [60, 4, 26], { c: 0x2a4a7a, t: 'gloss', top: 0x3a6a9a }, { ch: 0.3 });
    stick(k, [0, 4, 0], [0, 14, 0], 3, { c: 0xd8eef6, m: 'glass' });
    k.at([0, 26, 0], [0, 0.3, 0], () => {
      k.prism([[-34, 2, 1.6, 0, 0, 0.5], [-24, 6, 5, 0, 0, 0.5], [0, 10, 12, 0, 0, 0.5], [18, 9, 13, 0, 0, 0.5], [24, 6, 11, 0, 0, 0.5]], { c: 0x3a5a7a, t: 'gloss', d: [D.dots(3.4, 0.7, 0xe8eef2, { dir: '*' }), D.fn('u', (c, o) => { o[0] = 236; o[1] = 240; o[2] = 244; }), D.fn('*', (c, o) => { if (c.x > 21 && c.ny < 0.5 && c.y < 0) { o[0] = 30; o[1] = 36; o[2] = 46; } })] }, { rot: [0, 0, -Math.PI / 2], pf: true });
      k.box([-2, 10, 0], [12, 9, 2], { c: 0x3a5a7a, t: 'gloss', d: [D.dots(3, 0.6, 0xe8eef2, { dir: '*' })] }, { ch: 0.4, top: [0.3, 1], sh: [-4, 0] });
      k.box([-36, 2, 0], [5, 22, 2.4], { c: 0x3a5a7a, t: 'gloss' }, { ch: 0.5, top: [1.4, 1], rot: [0, 0, 0.1] });
      k.mirror(() => k.box([4, -6, 12], [12, 2, 10], { c: 0x3a5a7a, t: 'gloss' }, { ch: 0.5, rot: [0.3, 0, -0.2] }));
      // a tiny rider on its back
      k.at([2, 9, 0], [0, -0.3, 0], () => beast(k, 'loaf', { c: 0xf6f2e8, c2: 0xffffff, size: 0.42, ears: 'tri', inner: 0xf4a8b0, face: { eye: 'happy', mouth: 'open' } }));
    });
  },
};

export default {
  id: 'umi',
  order: 18,
  name: 'Puchi Aquarium',
  jp: 'ぷちぷち水族館',
  tagline: 'Tiny friends from the big blue tank',
  taglineJp: 'ゆらゆら～ぷかぷか～',
  price: 400,
  themes: ['ocean', 'cute'],
  card: { bg: '#dcf2fb', accent: '#1f8fc4', text: '#123a52', accent2: '#ff8a5c', pattern: 'waves' },
  capsule: { colors: [0x6fd3f0, 0xffffff, 0xff9a7a, 0x2f6fd6, 0xbff0e0] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'mendako', name: 'Mendako', jp: 'メンダコ', rarity: 'common',
      desc: 'A deep-sea pancake with ears. Flaps them to swim, very slowly, very proudly.',
      fig: F.mendako,
    },
    {
      id: 'chinanago', name: 'Garden Eel Trio', jp: 'チンアナゴ三兄弟', rarity: 'common',
      desc: 'If you look at them, they hide. If you look away, they stare at you.',
      fig: F.chinanago,
    },
    {
      id: 'clione', name: 'Clione Sea Angel', jp: 'クリオネ', rarity: 'common',
      desc: 'Looks like a tiny angel. Eats like a tiny monster. Both are true.',
      fig: F.clione,
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'manbou', name: 'Fainting Sunfish', jp: 'マンボウ', rarity: 'uncommon',
      desc: 'Famously delicate. Has already fainted twice while reading this description.',
      fig: F.manbou,
    },
    {
      id: 'gusokumushi', name: 'Giant Isopod', jp: 'ダイオウグソクムシ', rarity: 'uncommon',
      desc: 'Has not eaten in five years. Is not hungry. Is, frankly, thriving.',
      fig: F.gusokumushi,
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'kurage', name: 'Moon Jelly Tank', jp: 'ミズクラゲの水槽', rarity: 'rare',
      desc: 'Stare for five minutes and all your worries go poyo~n. Clinically unproven.',
      fig: F.kurage,
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'irukashow', name: 'Dolphin Show!', jp: 'イルカショー', rarity: 'ultra',
      desc: 'Jumps through the hoop, balances the ball, and still finds time to splash row one.',
      fig: F.irukashow,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'jinbei', name: 'Gentle Jinbei-san', jp: 'ジンベエザメ', rarity: 'secret',
      desc: 'The biggest fish in the sea. Eats only the tiniest snacks. Gives free rides.',
      fig: F.jinbei,
    },
  ],
};
