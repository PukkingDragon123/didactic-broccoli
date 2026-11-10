// Bakes the hand-pixelled foliage sheet (src/town/leafSheet.js) and its coverage-preserving mip chain into one PNG,
// public/img/foliage.png: level 0 (2048 x 1024) on the left, the smaller levels stacked down a 1024 px column on its
// right (level k at x = 2048, y = 1024 - 2048 / 2^(k - 1)... see MIP_AT in leafSheet.js). Run after editing the art:
//   node tools/bake-foliage.mjs [--preview shots/trees/leafsheet.png]
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { drawSheet, buildMips, MIP_AT, SW, SH } from '../src/town/leafSheet.js';

function png(file, w, h, rgba, flat = null) {
  const ch = flat ? 3 : 4, raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * ch + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = y * (w * ch + 1) + 1 + x * ch, a = rgba[i + 3] / 255;
      for (let c = 0; c < ch; c++) raw[o + c] = flat && c < 3 ? Math.round(rgba[i + c] * a + flat[c] * (1 - a)) : rgba[i + c];
    }
  }
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = flat ? 2 : 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

const t0 = Date.now();
const { data } = drawSheet(), mips = buildMips(data, SW, SH);
const PW = SW + SW / 2, out = new Uint8Array(PW * SH * 4);
mips.forEach((m, k) => {
  const [ox, oy] = MIP_AT(k);
  for (let y = 0; y < m.height; y++) out.set(m.data.subarray(y * m.width * 4, (y + 1) * m.width * 4), ((oy + y) * PW + ox) * 4);
});
png('public/img/foliage.png', PW, SH, out);
const pv = process.argv.indexOf('--preview');
if (pv > 0) png(process.argv[pv + 1], SW, SH, data, [104, 112, 120]);
console.log(`foliage sheet baked in ${Date.now() - t0} ms: ${mips.length} levels`);
