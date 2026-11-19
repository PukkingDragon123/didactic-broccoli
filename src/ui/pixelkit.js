// The pixel-art kit (public/img/pixelkit: kit.png + kit.json, built by tools/pixelkit/build.py): hand-pixelled /
// pixelised-render sprites for coins, notes, banks, tickets, receipts, stamp cards and capsules. Every sprite is a
// horizontal strip of same-size frames; anims carry an fps. Always drawn at an integer scale, nearest filtering.
//
//   await loadPixelKit()                 (cached; resolves to the atlas, or null if it failed)
//   pkReady() / pkInfo(name)             { x, y, w, h, n, fps, loop }
//   pkCanvas(name, frame = 0, scale = 1) -> canvas (cached)
//   pkURL(name, frame = 0, scale = 1)    -> data: URL (cached)
//   pkDraw(ctx, name, frame, x, y, scale)
//   pkEl(name, { scale, frame, play, fps, loop, cls }) -> <span> with a CSS-background sprite; el.play() / el.stop()
//   coinFor(yen) -> sprite name of the coin for a denomination ('coin100', ...), noteFor(yen)
const BASE = `${import.meta.env?.BASE_URL ?? '/'}img/pixelkit/`;
let atlas = null, img = null, loading = null;
const cache = new Map();

export function loadPixelKit() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const meta = await (await fetch(BASE + 'kit.json')).json();
      const im = new Image();
      im.src = BASE + meta.image;
      await im.decode();
      atlas = meta; img = im;
      return atlas;
    } catch (e) {
      console.warn('[pixelkit] not loaded', e);
      return null;
    }
  })();
  return loading;
}

export const pkReady = () => !!atlas;
export const pkInfo = (name) => atlas?.sprites[name] || null;

export function pkCanvas(name, frame = 0, scale = 1) {
  const s = pkInfo(name);
  const c = document.createElement('canvas');
  if (!s) { c.width = c.height = 1; return c; }
  const k = `${name}/${frame}@${scale}`;
  if (cache.has(k)) return cache.get(k);
  c.width = s.w * scale; c.height = s.h * scale;
  pkDraw(c.getContext('2d'), name, frame, 0, 0, scale);
  cache.set(k, c);
  return c;
}

const urls = new Map();
export function pkURL(name, frame = 0, scale = 1) {
  const k = `${name}/${frame}@${scale}`;
  if (!urls.has(k)) urls.set(k, pkCanvas(name, frame, scale).toDataURL());
  return urls.get(k);
}

export function pkDraw(ctx, name, frame, x, y, scale = 1) {
  const s = pkInfo(name);
  if (!s || !img) return;
  const f = ((frame % s.n) + s.n) % s.n;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, s.x + f * s.w, s.y, s.w, s.h, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
}

/** A sprite element (CSS background at an integer scale). play() steps through the strip at the sprite's fps. */
export function pkEl(name, { scale = 2, frame = 0, play = false, fps = 0, loop = null, cls = '' } = {}) {
  const el = document.createElement('span');
  el.className = `pk-sprite ${cls}`.trim();
  el.setAttribute('aria-hidden', 'true');
  let timer = 0, f = frame;
  const s0 = () => pkInfo(name);
  const paint = () => {
    const s = s0();
    if (!s) return;
    Object.assign(el.style, {
      display: 'inline-block', width: `${s.w * scale}px`, height: `${s.h * scale}px`, imageRendering: 'pixelated',
      backgroundImage: `url(${BASE}${atlas.image})`, backgroundRepeat: 'no-repeat',
      backgroundSize: `${atlas.size[0] * scale}px ${atlas.size[1] * scale}px`,
      backgroundPosition: `${-(s.x + f * s.w) * scale}px ${-s.y * scale}px`,
    });
  };
  el.frame = (i) => { const s = s0(); if (!s) return; f = ((i % s.n) + s.n) % s.n; paint(); };
  el.stop = (to = null) => { clearInterval(timer); timer = 0; if (to != null) el.frame(to); };
  el.play = (opts = {}) => {
    const s = s0();
    if (!s || s.n < 2) return el;
    el.stop();
    const rate = opts.fps || fps || s.fps || 10;
    const lp = opts.loop ?? loop ?? s.loop;
    let left = opts.cycles ? opts.cycles * s.n : Infinity;
    f = opts.from ?? 0; paint();
    timer = setInterval(() => {
      if (!el.isConnected && !opts.detached) { el.stop(); return; }
      if (--left <= 0) { el.stop(opts.end ?? 0); opts.done?.(); return; }
      if (f + 1 >= s.n && !lp) { el.stop(); opts.done?.(); return; }
      el.frame(f + 1);
    }, 1000 / rate);
    return el;
  };
  el.sprite = name;
  if (atlas) { paint(); if (play) el.play(); } else loadPixelKit().then(() => { paint(); if (play) el.play(); });
  return el;
}

const COINS = [500, 100, 50, 10, 5, 1];
export const coinFor = (v) => `coin${COINS.find((c) => v >= c) ?? 1}`;
export const noteFor = (v) => (v >= 10000 ? 'note10000' : v >= 5000 ? 'note5000' : 'note1000');

/** Coins (largest first) for an amount under ¥1000, capped at n pieces: [500, 100, 100, 10...]. */
export function coinSplit(v, n = 8) {
  const out = [];
  v = Math.max(0, Math.round(v));
  for (const c of COINS) while (v >= c && out.length < n) { out.push(c); v -= c; }
  return out;
}
