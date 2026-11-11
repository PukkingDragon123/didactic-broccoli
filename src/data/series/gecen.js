// Gēsen Collection (ゲーセンコレクション): a 1999 game centre in miniature: upright cabinets, a crane game, a
// photo-sticker booth, a rhythm game, a medal pusher and their regulars. Blocky figures with printed marquees,
// screens and worn control panels (src/figures). 全6種 + シークレット.
import { chibi, D } from '../../figures/chibi.js';
import { stick, cute, sign } from '../../figures/props.js';

const FLOOR = (k, w = 46, d = 40) => k.box([0, 1.5, 0], [w, 3, d], { c: 0x3a2a4a, t: 'felt', d: [D.fn('t', (c, o) => { const u = ((Math.floor(c.a / 3) + Math.floor(c.b / 3)) & 3); if (u === 0) { o[0] = 90; o[1] = 60; o[2] = 140; } else if (u === 2) { o[0] = 40; o[1] = 110; o[2] = 120; } })] }, { ch: 0.2 });
/** An upright cabinet: plinth, coin door, control panel with stick and buttons, glowing screen, lit marquee. */
function cabinet(k, col, title, screen, o = {}) {
  const x = o.x ?? 0, z = o.z ?? 0;
  k.at([x, 3, z], [0, o.ry ?? 0, 0], () => {
    k.box([0, 10, -2], [18, 20, 16], { c: col, t: 'gloss', d: [D.rect(-4, -6, 4, 2, 0x2a2a30, { dir: 'f' }), D.rect(-2, -4, 2, -2, 0xe8c040, { dir: 'f' }), D.txt('100円', 0, 0, 1.6, 0xe8c040), D.stripes('y', 3, 0.6, 0x00000000 | 0x1a1a22, { dir: 'x' })] }, { ch: 0.15 });
    k.box([0, 22, 3], [19, 4, 10], { c: 0x2a2a30, t: 'gloss', d: [D.circ(-5, 1, 1.4, 0xd8302a, { dir: 't' }), D.circ(1, 0, 1.1, 0xf2c23a, { dir: 't' }), D.circ(4, 1, 1.1, 0x3a8ae8, { dir: 't' }), D.circ(7, 0, 1.1, 0x3ab84a, { dir: 't' })] }, { ch: 0.3, rot: [0.3, 0, 0] });
    stick(k, [-5, 24, 4], [-5, 28, 4.6], 1, { c: 0x1a1a1e }); k.soft([-5, 28.6, 4.6], [1.6, 1.6, 1.6], { c: 0xd8302a, t: 'gloss', m: 'gloss' }, { ch: 0.586 });
    k.box([0, 34, -3], [18, 20, 14], { c: col, t: 'gloss', d: [D.rect(-7.5, -7, 7.5, 7, 0x0a0a12, { dir: 'f', r: 1 })] }, { ch: 0.15, rot: [-0.15, 0, 0] });
    k.box([0, 34.6, 4], [15, 12, 0.6], { c: 0x1a2a3a, m: 'glow', d: screen }, { ch: 0, rot: [-0.15, 0, 0] });
    k.box([0, 48, -2], [19, 7, 15], { c: 0xf4f0e8, m: 'glow', d: [D.txt(title, 0, 0, 3.4, o.titleC ?? col), D.band('y', -3.5, -2.6, col)] }, { ch: 0.2 });
  });
}
const pixScreen = (fn) => [D.fn('f', fn)];
const F = {
  street(k) {
    FLOOR(k);
    cabinet(k, 0xc8302a, 'ストリート', pixScreen((c, o) => { const g = c.y < -3; if (g) { o[0] = 90; o[1] = 70; o[2] = 50; } else { o[0] = 230; o[1] = 140; o[2] = 80; } if (Math.abs(c.x + 3.5) < 1.2 && c.y > -3 && c.y < 1.5) { o[0] = 240; o[1] = 240; o[2] = 240; } if (Math.abs(c.x - 3) < 1.2 && c.y > -3 && c.y < 1.2) { o[0] = 60; o[1] = 90; o[2] = 200; } }));
  },
  shooter(k) {
    FLOOR(k);
    cabinet(k, 0x2a4aa8, 'ギャラクシー', pixScreen((c, o) => { o[0] = 10; o[1] = 12; o[2] = 30; if (((Math.floor(c.x * 2.3) * 7 + Math.floor(c.y * 2.3) * 13) % 23) === 0) { o[0] = o[1] = o[2] = 220; } if (Math.abs(c.x) < 1.2 && c.y < -3 && c.y > -5) { o[0] = 240; o[1] = 240; o[2] = 120; } if (Math.abs(c.x - 2) < 1.4 && Math.abs(c.y - 3) < 0.8) { o[0] = 230; o[1] = 70; o[2] = 200; } }), { titleC: 0x2a4aa8 });
  },
  crane(k) {
    FLOOR(k, 46, 44);
    k.box([0, 9, 0], [30, 14, 30], { c: 0xf06aa8, t: 'gloss', d: [D.rect(-5, -4, 5, 1, 0xe8e8ee, { dir: 'f' }), D.txt('100', 0, -1.5, 2, 0xd8302a)] }, { ch: 0.15 });
    k.box([0, 30, 0], [30, 28, 30], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { ch: 0.05, caps: 'bot' });
    for (const x of [-14.4, 14.4]) for (const z of [-14.4, 14.4]) k.box([x, 30, z], [1.6, 28, 1.6], { c: 0xf06aa8, t: 'gloss' }, { ch: 0.3 });
    k.box([0, 46, 0], [32, 6, 32], { c: 0xf4f0e8, m: 'glow', d: [D.txt('UFOキャッチャー', 0, 0, 2.6, 0xf06aa8)] }, { ch: 0.2 });
    for (let i = 0; i < 9; i++) k.soft([-9 + (i % 3) * 9, 18.5 + Math.floor(i / 3) * 0.6, -8 + Math.floor(i / 3) * 8], [3.6, 3, 3.6], { c: [0xe8a04a, 0xf2f0ea, 0xa8c8e8, 0xf6c0d0, 0x8ac06a][i % 5], t: 'plush', d: [cute({ gap: 1.4, er: 0.5, eh: 0.6, mw: 0.9, my: -1.2, blush: false })] }, { ch: 0.5 });
    k.box([4, 40, 2], [2, 4, 2], { c: 0xd8d8de, m: 'metal' }); stick(k, [4, 38, 2], [4, 30, 2], 0.6, { c: 0xd8d8de, m: 'metal' });
    for (const a of [0, 2.1, 4.2]) k.box([4 + Math.cos(a) * 2, 28, 2 + Math.sin(a) * 2], [0.8, 4, 0.8], { c: 0xd8d8de, m: 'metal' }, { rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
  },
  purikura(k) {
    FLOOR(k);
    k.box([0, 24, -4], [34, 42, 26], { c: 0xf6f0f8, t: 'gloss', d: [D.rect(-15, 4, 15, 18, 0xf28ab8, { dir: 'f' }), D.txt('プリ帳', 0, 11, 4.6, 0xffffff), D.star(-11, -4, 2.4, 0xf2d84a, { dir: 'f' }), D.star(11, -8, 1.8, 0x6ad8f0, { dir: 'f' })] }, { ch: 0.15 });
    k.box([10, 18, 10], [12, 34, 1], { c: 0xf28ab8, t: 'cloth', d: [D.stripes('x', 3, 0.6, 0xd86a9a)] }, { ch: 0.1 });
    k.at([-6, 3, 13], [0, 0.2, 0], () => chibi(k, { H: 30, hair: 'twin', hairC: 0xc89a5a, face: { eye: 'wink', mouth: 'open', lash: true }, top: { c: 0xf4f0e8 }, outfit: { kind: 'sailor', collar: 0x2a3a6a }, legs: 'skirt', bottom: { c: 0x2a3a6a }, socks: 0xffffff, armR: [150, -20, 0], armL: [20, 20, 40] }));
    k.box([-10, 10, 14], [6, 0.6, 4], { c: 0xffffff, d: [D.rect(-2.6, -1.6, -0.2, 1.6, 0xf6c0d8, { dir: 't' }), D.rect(0.2, -1.6, 2.6, 1.6, 0xa8d8f0, { dir: 't' })] }, { ch: 0 });
  },
  rhythm(k) {
    FLOOR(k, 50, 44);
    cabinet(k, 0x3ab8a8, 'ビートマニア', pixScreen((c, o) => { o[0] = 12; o[1] = 12; o[2] = 24; for (let i = 0; i < 5; i++) if (Math.abs(c.x + 6 + i * 3) < 1 && ((Math.floor(c.y * 1.5 + i * 3) % 5) === 0)) { o[0] = [240, 120, 240, 120, 240][i]; o[1] = 240; o[2] = [240, 200, 120, 200, 240][i]; } if (c.y < -4.6 && c.y > -5.2) { o[0] = 230; o[1] = 60; o[2] = 60; } }), { z: -6, titleC: 0x1a6a6a });
    k.at([0, 3, 10], [0, 0, 0], () => chibi(k, { H: 34, hair: 'spiky', hairC: 0xd8a040, face: { eye: 'angry', mouth: 'grin' }, top: { c: 0x2a2a30, t: 'cloth', d: [D.txt('DJ', 0, 0, 3, 0xf2c23a)] }, bottom: { c: 0x3a5a8a, t: 'denim' }, armL: [70, 20, 40], armR: [70, -20, 40], head: [20, 0, 0] }));
  },
  medal(k) {
    FLOOR(k, 50, 44);
    k.box([0, 10, 0], [38, 14, 30], { c: 0xd8b040, t: 'metal', m: 'metal', d: [D.rect(-16, -5, 16, 5, 0x8a2a2a, { dir: 'f' }), D.txt('MEDAL', 0, 0, 3.4, 0xf2d84a)] }, { ch: 0.15 });
    k.box([0, 24, -2], [36, 14, 26], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { ch: 0.05, caps: 'bot' });
    k.box([0, 18, -2], [32, 1.4, 22], { c: 0xc8c8d0, t: 'metal', d: [D.dots(2.6, 1, 0xe8c040, { dir: 't' })] }, { ch: 0.1 });
    for (let i = 0; i < 12; i++) k.cyl([-12 + (i % 6) * 5, 19.4 + Math.floor(i / 6) * 0.6, 4 - Math.floor(i / 6) * 4], 1.8, 0.6, { c: 0xe8c040, m: 'metal' });
    k.box([0, 34, -2], [38, 6, 28], { c: 0x8a2a2a, t: 'gloss', d: [D.stripes('x', 4, 2, 0xe8c040, { dir: 'f' })] }, { ch: 0.2 });
    k.at([0, 36, -2], [0, 0, 0], () => { k.cyl([0, 4, 0], 6, 8, { c: 0xe8c040, m: 'metal', t: 'metal', d: [D.txt('JP', 0, 0, 3, 0x8a2a2a)] }, { top: 0.8 }); });
  },
  owner(k) {
    // the secret: the game centre's night manager asleep on a stool, cash box under one arm, a golden cabinet glowing
    FLOOR(k, 50, 44);
    cabinet(k, 0xe8c040, 'GOLD', pixScreen((c, o) => { o[0] = 240; o[1] = 200; o[2] = 80; if (((Math.floor(c.x) + Math.floor(c.y)) & 1)) { o[0] = 250; o[1] = 230; o[2] = 140; } }), { x: -10, z: -6, titleC: 0x8a6a10 });
    k.cyl([12, 8, 6], 5, 1.6, { c: 0x8a2a2a, t: 'cloth' }); k.cyl([12, 4, 6], 1, 7, { c: 0xd8d8de, m: 'metal' });
    k.at([12, 8.6, 6], [0, -0.5, 0], () => chibi(k, { H: 44, sit: true, hair: 'short', hairC: 0x8a8a92, face: { eye: 'closed', mouth: 'o', brow: 'thick', nose: 'dot' }, top: { c: 0xf4f0e8 }, outfit: { kind: 'suit', tie: 0x2a2a30, c2: 0xf4f0e8 }, sleeve: { c: 0x2a2a34 }, bottom: { c: 0x2a2a34 }, head: [20, 0, 14], armL: [30, 20, 60], armR: [10, -10, 10], legL: [80, 10], legR: [80, -10],
      holdL(k) { k.box([0, -2, 4], [8, 5, 6], { c: 0x3a3a44, t: 'metal', d: [D.rect(-1, 1, 1, 2, 0xe8c040)] }, { ch: 0.2 }); } }));
  },
};
export default {
  id: 'gecen',
  order: 21,
  name: 'Gēsen Collection',
  jp: 'ゲーセンコレクション',
  tagline: 'The game centre down the arcade, in your hand',
  taglineJp: 'あの頃のゲーセン、ミニチュアで！',
  price: 400,
  themes: ['retro', 'city'],
  card: { bg: '#20183a', accent: '#f06aa8', text: '#f6f0ff', pattern: 'stripes', accent2: '#3ab8a8' },
  capsule: { colors: [0xf06aa8, 0x3ab8a8, 0xf2c23a, 0x6a5ad8] },
  items: [
    { id: 'street', name: 'Versus Fighter Cabinet', jp: '対戦格闘台', rarity: 'common', desc: 'Two players, one stick each, forty years of grudges. Winner stays on.', fig: F.street },
    { id: 'shooter', name: 'Galaxy Shooter Cabinet', jp: 'シューティング台', rarity: 'common', desc: 'One credit lasts forty seconds. The high score has been the same name since 1987.', fig: F.shooter },
    { id: 'crane', name: 'UFO Catcher', jp: 'UFOキャッチャー', rarity: 'common', desc: 'The claw is "just a little loose". Has been since installation.', fig: F.crane },
    { id: 'purikura', name: 'Purikura Booth', jp: 'プリクラ', rarity: 'uncommon', desc: 'Sixteen stickers, eight poses, one very important notebook.', fig: F.purikura },
    { id: 'rhythm', name: 'Rhythm Machine', jp: '音ゲー', rarity: 'rare', desc: 'He plays with his eyes closed. The crowd behind him does not.', fig: F.rhythm },
    { id: 'medal', name: 'Medal Pusher', jp: 'メダルゲーム', rarity: 'ultra', desc: 'One more medal and the whole ledge falls. One more. One more.', fig: F.medal },
    { id: 'owner', name: 'The Night Manager', jp: '夜の店長', rarity: 'secret', desc: 'SECRET. Asleep on his stool by the golden cabinet nobody has ever seen switched off.', fig: F.owner },
  ],
};
