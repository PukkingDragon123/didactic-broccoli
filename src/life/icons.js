// Inventory / objective icons for the life features (24 x 24 pixel art, registered with defineIcon at import time so
// the hotbar can draw them even for items restored from a save). Drawn with a few pixel ops into a character grid;
// letters are palette entries (src/gfx/icons.js PALETTE) or the icon's own legend.
import { defineIcon } from '../gfx/icons.js';

function grid(w = 24, h = 24) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const api = {
    px(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; return api; },
    rect(x, y, ww, hh, c) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) api.px(i, j, c); return api; },
    frame(x, y, ww, hh, c) { for (let i = x; i < x + ww; i++) { api.px(i, y, c); api.px(i, y + hh - 1, c); } for (let j = y; j < y + hh; j++) { api.px(x, j, c); api.px(x + ww - 1, j, c); } return api; },
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) api.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); return api; },
    disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) api.px(cx + x, cy + y, c); return api; },
    rows: () => g.map((r) => r.join('')),
  };
  return api;
}
const def = (name, draw, legend = {}) => { const g = grid(); draw(g); defineIcon(name, { rows: g.rows(), legend }); };

// a sheet of Grandpa's notepaper with his scrawl
def('note', (g) => {
  g.rect(5, 2, 14, 20, 'w').rect(6, 3, 12, 18, 'W').frame(5, 2, 14, 20, 'u');
  g.rect(9, 1, 6, 3, 'Z');
  for (let y = 7; y < 20; y += 3) g.line(7, y, 16 - (y % 2) * 3, y, 'b');
  g.rect(7, 18, 2, 2, 'R');
});
// a checked tenugui folded over
def('rag', (g) => {
  g.rect(3, 8, 18, 10, 'C').rect(3, 8, 18, 2, 'L');
  for (let x = 3; x < 21; x += 3) g.rect(x, 10, 1, 8, 'B');
  for (let y = 11; y < 18; y += 3) g.rect(3, y, 18, 1, 'B');
  g.rect(3, 17, 18, 1, 'b').line(20, 9, 20, 17, 'b');
  g.rect(15, 18, 5, 3, 'C').rect(15, 20, 5, 1, 'b');
});
// a roll of green bin bags
def('bin_bags', (g) => {
  g.rect(4, 6, 12, 12, 'E').rect(4, 6, 12, 2, 'F').rect(4, 16, 12, 2, 'e');
  g.disc(16, 12, 6, 'e').disc(16, 12, 5, 'E').disc(16, 12, 2, 'w').disc(16, 12, 1, 'u');
  g.rect(6, 17, 9, 4, 'F').rect(6, 20, 9, 1, 'e');
});
// a cloth coin pouch, tied, a coin peeking out
def('coin_float', (g) => {
  g.disc(12, 14, 7, 'T').disc(12, 14, 6, 'A').rect(9, 5, 6, 4, 'T').rect(10, 4, 4, 2, 'A');
  g.line(8, 8, 16, 8, 'R').line(8, 9, 16, 9, 'r');
  g.disc(17, 18, 3, 'y').disc(17, 18, 2, 'Y').px(16, 17, 'Z');
  g.rect(9, 14, 3, 1, 't');
});
// a battered parts carton
def('junk_box', (g) => {
  g.rect(3, 9, 18, 12, 'T').rect(3, 9, 18, 2, 'A').rect(3, 19, 18, 2, 't');
  g.line(3, 9, 8, 5, 'A').line(21, 9, 16, 5, 't').rect(8, 5, 8, 1, 'A');
  g.rect(6, 13, 9, 3, 'w').rect(7, 14, 7, 1, 'k');
  g.line(16, 12, 19, 18, 'N');
});
// flattened cardboard tied with string
def('cardboard', (g) => {
  for (let i = 0; i < 4; i++) g.rect(3 + i, 6 + i * 3, 18 - i, 3, i % 2 ? 'A' : 'T');
  g.rect(3, 18, 18, 2, 't');
  g.line(12, 5, 12, 20, 'w').line(4, 12, 20, 12, 'w');
});
// the OPEN sign on its cord
def('open_sign', (g) => {
  g.line(5, 7, 12, 2, 'k').line(19, 7, 12, 2, 'k');
  g.rect(2, 7, 20, 13, 'T').frame(2, 7, 20, 13, 'N');
  g.rect(4, 9, 16, 9, 'W').frame(4, 9, 16, 9, 'R');
  for (const x of [6, 10, 14]) g.rect(x, 11, 3, 5, 'R');
});
// a red leash with its loop
def('leash', (g) => {
  g.disc(7, 7, 5, 'R').disc(7, 7, 3, '.').disc(7, 7, 2, '.');
  g.line(11, 10, 20, 20, 'R').line(12, 10, 21, 19, 'r');
  g.rect(18, 18, 4, 4, 'l').rect(19, 19, 2, 2, 'g');
});
// a little green poop bag (tied)
def('poop_bag', (g) => {
  g.disc(12, 15, 6, 'E').disc(11, 14, 4, 'F').rect(10, 6, 4, 4, 'E').line(9, 5, 11, 7, 'e').line(15, 5, 13, 7, 'e');
  g.rect(9, 17, 6, 2, 'e');
});
// a yellow-green kitchen sponge
def('sponge', (g) => {
  g.rect(4, 8, 16, 9, 'Y').rect(4, 14, 16, 4, 'E').rect(4, 8, 16, 1, 'Z').rect(4, 17, 16, 1, 'e');
  for (const [x, y] of [[7, 10], [12, 11], [16, 9], [9, 12]]) g.px(x, y, 'y');
});
// a wooden ladle (hishaku)
def('ladle', (g) => {
  g.rect(3, 4, 7, 6, 'T').rect(3, 4, 7, 1, 'A').rect(4, 5, 5, 3, 'C').rect(3, 9, 7, 1, 't');
  g.line(9, 8, 21, 20, 'A').line(10, 8, 22, 20, 't');
});
// a window squeegee
def('squeegee', (g) => {
  g.rect(3, 5, 18, 3, 'l').rect(3, 7, 18, 2, 'K').rect(3, 5, 18, 1, 'L');
  g.rect(11, 8, 2, 13, 'B').rect(11, 8, 1, 13, 'C').rect(10, 19, 4, 3, 'b');
});
// a blue spray bottle
def('spray', (g) => {
  g.rect(8, 9, 9, 13, 'C').rect(8, 9, 2, 13, 'L').rect(15, 9, 2, 13, 'B');
  g.rect(10, 5, 5, 4, 'W').rect(13, 4, 6, 2, 'W').rect(6, 6, 4, 2, 'l');
  g.rect(9, 14, 7, 4, 'w');
});
// Pochi's face
def('dog', (g) => {
  g.disc(12, 13, 8, 'O').rect(4, 3, 4, 6, 'O').rect(16, 3, 4, 6, 'O').rect(5, 4, 2, 4, 'S').rect(17, 4, 2, 4, 'S');
  g.disc(12, 16, 5, 'W').rect(9, 11, 2, 2, 'K').rect(14, 11, 2, 2, 'K').rect(11, 15, 3, 2, 'K').px(12, 18, 'P');
});
// a little kei car
def('car', (g) => {
  g.rect(3, 12, 18, 6, 'Q').rect(6, 6, 12, 6, 'R').rect(7, 7, 4, 4, 'C').rect(13, 7, 4, 4, 'C');
  g.rect(3, 12, 18, 1, 'S').rect(3, 17, 18, 1, 'r').disc(7, 18, 2, 'K').disc(17, 18, 2, 'K').rect(19, 13, 2, 2, 'Z');
});
// a sash window
def('window', (g) => {
  g.rect(3, 3, 18, 18, 'l').frame(3, 3, 18, 18, 'g').rect(4, 4, 7, 16, 'C').rect(13, 4, 7, 16, 'C').rect(11, 3, 2, 18, 'g');
  g.line(5, 6, 8, 9, 'W').line(14, 6, 17, 9, 'W');
});
// the breaker lever
def('breaker', (g) => {
  g.rect(5, 2, 14, 20, 'l').frame(5, 2, 14, 20, 'G').rect(8, 6, 8, 12, 'g').rect(10, 5, 4, 7, 'K').rect(10, 5, 4, 2, 'R');
  g.rect(7, 19, 10, 2, 'Y');
});
// a two-pin plug
def('plug', (g) => {
  g.rect(7, 8, 10, 9, 'w').rect(7, 8, 10, 1, 'W').rect(7, 16, 10, 1, 'u').rect(9, 3, 2, 5, 'L').rect(13, 3, 2, 5, 'L');
  g.rect(11, 17, 2, 5, 'K');
});
// the van
def('van', (g) => {
  g.rect(2, 6, 20, 12, 'c').rect(2, 6, 20, 2, 'w').rect(15, 8, 6, 5, 'C').rect(4, 8, 9, 4, 'C').rect(2, 14, 20, 2, 'R');
  g.disc(6, 18, 2, 'K').disc(18, 18, 2, 'K').rect(21, 13, 1, 2, 'Z');
});
// the garbage truck
def('truck', (g) => {
  g.rect(2, 6, 13, 12, 'W').rect(2, 6, 13, 2, 'w').rect(15, 9, 7, 9, 'B').rect(17, 10, 4, 3, 'C').rect(2, 14, 13, 2, 'b');
  g.disc(6, 18, 2, 'K').disc(18, 18, 2, 'K');
});
// the notice board
def('board', (g) => {
  g.rect(2, 3, 20, 14, 'T').frame(2, 3, 20, 14, 'N').rect(4, 5, 6, 8, 'W').rect(12, 6, 7, 6, 'Y').rect(5, 6, 4, 1, 'R');
  g.rect(5, 17, 2, 5, 'N').rect(17, 17, 2, 5, 'N');
});
// the shop's own trash can
def('trash_can', (g) => {
  g.rect(5, 6, 14, 15, 'B').rect(5, 6, 3, 15, 'C').rect(16, 6, 3, 15, 'b').rect(4, 4, 16, 3, 'w').rect(4, 4, 16, 1, 'W');
  g.rect(9, 12, 6, 4, 'W');
});
