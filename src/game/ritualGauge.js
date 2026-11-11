// The little paper slip under the hint while you open a capsule (src/game/ritual.js): a hand-pixelled gauge for the
// step in hand, drawn at 1 texel = 2 CSS px. Peel: the seam as a ring, the way round to go, how far it has come away and
// where your finger is. Crack: the rocking marker and the moment to press. Twist: the notches, and whether your fingers
// are ready for the next one. Pull / foil: how far along. Ink on receipt paper, no glow.
const W = 76, H = 30;
const INK = '#3a2a20', RED = '#c8402e', MUTE = '#c9bfae', TEAL = '#3f8a80', GOLD = '#d8a830', PAPER = '#f6f3ea';

export function createGauge() {
  const el = document.createElement('div');
  el.id = 'ritual-gauge';
  el.style.cssText = [
    'position:absolute', 'left:50%', 'top:calc(50% + 96px)', 'transform:translateX(-50%)', 'pointer-events:none', 'display:none', 'z-index:5',
    'padding:2px 6px', 'border:12px solid transparent', 'border-image:var(--pp-edge-receipt) 6 / 12px', `background:var(--pp-grain-receipt, ${PAPER}) 0 0 / 96px padding-box`,
    `filter:drop-shadow(3px 3px 0 rgba(26,18,22,.45))`,
  ].join(';');
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.style.cssText = `display:block;width:${W * 2}px;height:${H * 2}px;image-rendering:pixelated`;
  el.append(cv);
  (document.getElementById('hud') || document.body).append(el);
  const g = cv.getContext('2d');
  const px = (x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const ring = (cx, cy, r, c, from = 0, span = Math.PI * 2, step = 1) => {
    const n = Math.max(8, Math.round(Math.abs(span) * r * 1.6));
    for (let i = 0; i <= n; i += step) { const a = from + span * (i / n); px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); }
  };
  const bar = (x, y, w, h, k, c) => { px(x - 1, y - 1, INK, w + 2, 1); px(x - 1, y + h, INK, w + 2, 1); px(x - 1, y, INK, 1, h); px(x + w, y, INK, 1, h); px(x, y, MUTE, w, h); px(x, y, c, Math.round(w * Math.max(0, Math.min(1, k))), h); };
  let shown = false;
  return {
    hide() { if (shown) { el.style.display = 'none'; shown = false; } },
    /** st: { kind, p, ...per kind } */
    draw(st) {
      if (!shown) { el.style.display = 'block'; shown = true; }
      g.clearRect(0, 0, W, H);
      if (st.kind === 'peel') {
        // the seam, the way round (anticlockwise, from the top), the strip that has come away, your finger
        const cx = 16, cy = 15, r = 11;
        ring(cx, cy, r, MUTE);
        ring(cx, cy, r, RED, -Math.PI / 2, -Math.PI * 2 * st.p);
        ring(cx, cy, r - 1, RED, -Math.PI / 2, -Math.PI * 2 * st.p, 2);
        const fa = st.fa ?? -Math.PI / 2;
        px(cx + Math.cos(fa) * r - 1, cy + Math.sin(fa) * r - 1, st.snag > 0 ? RED : INK, 3, 3);
        // the arrow: a short arc with a head, anticlockwise
        ring(cx, cy, 5, INK, -0.3, -Math.PI * 1.3);
        const ha = -0.3 - Math.PI * 1.3, hx = cx + Math.cos(ha) * 5, hy = cy + Math.sin(ha) * 5;
        px(hx - 1, hy - 1, INK, 3, 1); px(hx - 1, hy, INK, 1, 2);
        // the band count and a "too fast" tick
        for (let k = 0; k < st.bands; k++) px(34 + k * 6, 22, k < st.done ? RED : MUTE, 4, 4);
        bar(34, 8, 36, 5, st.p, st.snag > 0 ? GOLD : RED);
      } else if (st.kind === 'crack') {
        // the rocking marker over a bar; press when it is in the band
        const x0 = 6, w = 64, zx = x0 + w * (0.5 - st.w), zw = Math.max(2, w * st.w * 2);
        bar(x0, 11, w, 6, 0, INK);
        px(zx, 11, TEAL, zw, 6);
        px(x0 + w / 2 - 1, 11, '#2f6a62', 2, 6);
        const mx = x0 + w * st.m;
        for (let k = 0; k < 4; k++) px(mx - k, 9 - k, st.flash > 0 ? RED : INK, k * 2 + 1, 1);
        px(mx, 18, st.flash > 0 ? RED : INK, 1, 3);
        for (let k = 0; k < st.hits; k++) { const f = Math.max(0, Math.min(1, st.got - k)); px(6 + k * 8, 24, MUTE, 6, 4); if (f > 0) px(6 + k * 8, 24, RED, Math.round(6 * f), 4); }
      } else if (st.kind === 'twist') {
        // the notches round the lugs; the fill under them is your grip coming back
        for (let k = 0; k < st.n; k++) {
          const x = 8 + k * Math.min(13, 60 / st.n), done = k < st.done;
          px(x, 7, INK, 9, 9); px(x + 1, 8, done ? RED : PAPER, 7, 7);
          if (done) { px(x + 3, 10, PAPER, 3, 3); }
        }
        bar(8, 21, 60, 4, st.ready, st.ready >= 1 ? TEAL : MUTE);
        if (st.slip > 0) for (let k = 0; k < 5; k++) px(64 + (k % 2), 4 + k * 3, RED, 2, 2);
      } else {
        bar(6, 12, 64, 6, st.p, st.kind === 'foil' ? GOLD : RED);
      }
    },
  };
}
