// Grandpa's notebook, read in first person: an open leather book lifted in front of the camera with
// hand-inked pages (his letter, a live to-do list, shop tips, a sketch of the cat and a map of the lane).
// LMB / D / Right = next spread, RMB / A / Left = previous, Q / E / Esc = close. Touch: on-screen buttons.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';

const PW = 480, PH = 640; // page canvas size
const INK = '#26345e', INK2 = '#5a6a9a', RED = '#b8322e';

const CAT = [
  '....K..........K....',
  '...KOK........KOK...',
  '...KOOK......KOOK...',
  '..KOOOOKKKKKKOOOOK..',
  '..KOOOOOOWWWOOOOOK..',
  '.KOOOOOOWWWWWOOOOOK.',
  '.KOOKKOOWWWWWOOKKOK.',
  '.KOOKKOOWWWWWOOKKOK.',
  '.KOOOOOOWWKWWOOOOOK.',
  '.KOOOOOWWKWKWWOOOOK.',
  '..KOOOOWWWWWWWOOOK..',
  '...KKOOOWWWWWOOKK...',
  '....KKKKKKKKKKKK....',
];

export class Notebook {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.spread = 0;
    this.spreads = 3;
    this.flip = null;
    this.t = 0;
    const ui = document.createElement('div');
    ui.id = 'reader-ui';
    ui.innerHTML = '<button data-a="prev">&lt;</button><span class="pg"></span><button data-a="close">Close</button><button data-a="next">&gt;</button>';
    document.body.appendChild(ui);
    ui.addEventListener('pointerdown', (e) => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a) return;
      e.preventDefault(); e.stopPropagation();
      if (a === 'next') this.turn(1); else if (a === 'prev') this.turn(-1); else this.close();
    });
    this.ui = ui;
    this.build();
  }

  build() {
    const mk = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return { c, t }; };
    this.pages = [mk(), mk(), mk(), mk()]; // left, right, flipping front, flipping back
    const w = 0.15, h = 0.2;
    this.w = w; this.h = h;
    const book = new THREE.Group();
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: 0.7 });
    // pages are unlit (always readable, whatever the room's light) and a touch dimmer than white so they never bloom
    const pageMat = (i) => new THREE.MeshBasicMaterial({ map: this.pages[i].t, color: 0xd8d0c4 });
    // covers + page blocks, opened into a shallow V
    const half = (side) => {
      const g = new THREE.Group();
      g.rotation.y = side * 0.13;
      const cover = new THREE.Mesh(new THREE.BoxGeometry(w + 0.008, h + 0.012, 0.004), leather);
      cover.position.set(side * (w / 2 + 0.002), 0, -0.006);
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.95 }));
      block.position.set(side * w / 2, 0, -0.001);
      const page = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pageMat(side < 0 ? 0 : 1));
      page.position.set(side * w / 2, 0, 0.0025);
      g.add(cover, block, page);
      book.add(g);
      return g;
    };
    this.left = half(-1);
    this.right = half(1);
    // the page that turns: two back-to-back planes hinged at the spine
    const fl = new THREE.Group();
    fl.rotation.y = 0.13;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pageMat(2));
    front.position.set(w / 2, 0, 0.003);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pageMat(3));
    back.rotation.y = Math.PI;
    back.position.set(w / 2, 0, 0.0029);
    fl.add(front, back);
    fl.visible = false;
    book.add(fl);
    this.flipPage = fl;
    // ribbon bookmark
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07, 0.001), new THREE.MeshStandardMaterial({ color: 0xb8322e, roughness: 0.6 }));
    rib.position.set(0.004, -h / 2 - 0.03, 0.003);
    book.add(rib);
    book.traverse((m) => { if (m.isMesh) { m.userData.noRim = true; m.castShadow = false; } });
    this.book = book;
  }

  // ------------------------------------------------------------------ page art
  paper(g, seed, side) {
    g.fillStyle = '#f1e6cc'; g.fillRect(0, 0, PW, PH);
    // fibres + blotchy ageing
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,130,80,0.06)' : 'rgba(255,255,255,0.08)'; g.fillRect(r() * PW | 0, r() * PH | 0, 2 + (r() * 3 | 0), 1); }
    for (let i = 0; i < 6; i++) { const x = r() * PW, y = r() * PH, rr = 30 + r() * 70; const grd = g.createRadialGradient(x, y, 0, x, y, rr); grd.addColorStop(0, 'rgba(190,150,90,0.10)'); grd.addColorStop(1, 'rgba(190,150,90,0)'); g.fillStyle = grd; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    // gutter shadow toward the spine, darker edges
    const gx = side < 0 ? PW : 0;
    const gs = g.createLinearGradient(gx, 0, side < 0 ? PW - 60 : 60, 0);
    gs.addColorStop(0, 'rgba(90,60,30,0.28)'); gs.addColorStop(1, 'rgba(90,60,30,0)');
    g.fillStyle = gs; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = 'rgba(120,90,50,0.25)'; g.lineWidth = 6; g.strokeRect(0, 0, PW, PH);
    // ruled lines + margin
    g.fillStyle = 'rgba(90,130,190,0.28)';
    for (let y = 92; y < PH - 30; y += 34) g.fillRect(24, y, PW - 48, 2);
    g.fillStyle = 'rgba(200,70,70,0.35)'; g.fillRect(side < 0 ? 62 : 54, 20, 2, PH - 40);
  }

  text(g, str, x, y, { size = 30, color = INK, font = 'Jersey 10', max = PW - x - 30, lh = 34 } = {}) {
    g.font = `${size}px "${font}"`;
    g.fillStyle = color;
    g.textBaseline = 'alphabetic';
    const words = str.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test;
    }
    if (line) g.fillText(line, x, yy);
    return yy + lh;
  }

  check(g, x, y, done) {
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x, y - 20, 22, 22);
    if (!done) return;
    g.strokeStyle = RED; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 3, y - 10); g.lineTo(x + 10, y - 2); g.lineTo(x + 26, y - 26); g.stroke();
  }

  sketch(g, rows, x, y, k, legend) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (legend[ch]) { g.fillStyle = legend[ch]; g.fillRect(x + i * k, y + j * k, k, k); } }));
  }

  drawPage(g, n) {
    const side = n % 2 ? 1 : -1;
    this.paper(g, n + 3, side);
    const L = side < 0 ? 80 : 72;
    const st = this.game.story;
    if (n === 0) {
      let y = this.text(g, 'Dear kiddo,', L, 80, { size: 40 });
      y += 4;
      for (const p of [
        "If you're reading this, the old garage is yours now. Sorry about the mess - my knees gave up before the dust did.",
        'This was the happiest gacha corner on the street. Kids lined up after school, grown-ups pretended they were not excited.',
        'Clean it up, fix my old machines and roll that shutter up again. There is a little money in the biscuit tin on the steel rack.',
        'And feed the cat. She has been waiting.',
      ]) y = this.text(g, p, L, y, { size: 26, lh: 34 }) + 8;
      this.text(g, '- Grandpa', PW - 190, Math.min(PH - 40, y + 10), { size: 34 });
    } else if (n === 1) {
      this.text(g, 'TO DO', L, 72, { size: 44, color: RED });
      let y = 128;
      for (const t of st?.todo() || []) {
        this.check(g, L, y, t.done);
        y = this.text(g, t.text, L + 36, y, { size: 26, color: t.done ? INK2 : INK, lh: 30 }) + 6;
      }
      this.text(g, 'Mikawa-ya, the little shop across the lane, sells all you need.', L, Math.max(y + 12, PH - 120), { size: 22, color: INK2, lh: 28 });
    } else if (n === 2) {
      this.text(g, 'Running the shop', L, 72, { size: 38, color: RED });
      let y = 122;
      for (const p of [
        'Coin on the slot, turn the handle, twist the capsule open.',
        'Show off the good ones on the shelf. Doubles go in the sell box.',
        'Refills and new machines: the old PC in the back corner.',
        'Customers will not find us by magic. Hand out flyers on the street!',
        'Complete a series and something nice happens.',
      ]) { g.fillStyle = INK; g.fillRect(L, y - 12, 8, 8); y = this.text(g, p, L + 20, y, { size: 24, lh: 30 }) + 8; }
    } else if (n === 3) {
      this.text(g, 'Mikan', L + 10, 80, { size: 44, color: RED });
      this.sketch(g, CAT, L + 30, 110, 14, { K: INK, O: '#e0a050', W: '#fbf4e4' });
      let y = this.text(g, 'Calico. Likes milk, sunny spots and sleeping on the crates. Hates the broom.', L, 330, { size: 24, lh: 30 });
      y = this.text(g, st?.flags.fed ? 'She trusts you now. :)' : 'Shy. Bring her milk first.', L, y + 8, { size: 24, color: INK2, lh: 30 });
    } else if (n === 4) {
      this.text(g, 'Our lane', L, 72, { size: 40, color: RED });
      // little ink map: tunnels at both ends, the garage, the shop, the garbage station
      g.strokeStyle = INK; g.lineWidth = 3;
      g.strokeRect(L, 200, PW - L - 40, 70); // the lane
      g.fillStyle = INK2; g.fillRect(L - 6, 186, 18, 98); g.fillRect(PW - 52, 186, 18, 98);
      const box = (x, y, w, h, label, ty) => { g.strokeRect(x, y, w, h); this.text(g, label, x, ty, { size: 22, lh: 24, max: 160 }); };
      box(L + 150, 120, 90, 80, 'Garage', 112);
      box(L + 40, 270, 110, 70, 'Mikawa-ya', 366);
      box(L + 10, 140, 50, 60, 'Trash', 132);
      this.text(g, 'tunnel', L - 10, 312, { size: 20, color: INK2 });
      this.text(g, 'tunnel', PW - 110, 312, { size: 20, color: INK2 });
      g.fillStyle = RED; g.beginPath(); g.arc(L + 195, 236, 7, 0, Math.PI * 2); g.fill();
      this.text(g, 'you are here', L + 210, 244, { size: 20, color: RED });
      this.text(g, 'Garbage goes to the station by the recycle cage. Trains rumble over the tunnels every few minutes - you get used to it.', L, 430, { size: 22, lh: 28 });
    } else {
      this.text(g, 'Collection', L, 72, { size: 40, color: RED });
      const s = this.game.state;
      let y = 130;
      y = this.text(g, `Figures found: ${Object.keys(s.discovered).length}`, L, y, { size: 28 });
      y = this.text(g, `Series completed: ${Object.keys(s.completed).length}`, L, y, { size: 28 });
      y = this.text(g, `Capsules turned: ${s.pulls}`, L, y, { size: 28 });
      this.text(g, 'Keep going, kiddo. I am proud of you.', L, y + 40, { size: 26, color: INK2 });
    }
  }

  paint(target, n) {
    const p = this.pages[target];
    this.drawPage(p.c.getContext('2d'), n);
    p.t.needsUpdate = true;
  }

  paintSpread() {
    this.paint(0, this.spread * 2);
    this.paint(1, this.spread * 2 + 1);
    this.ui.querySelector('.pg').textContent = `${this.spread + 1} / ${this.spreads}`;
  }

  // ------------------------------------------------------------------ open / close / turn
  show(spread = null) {
    const g = this.game, h = g.held;
    if (this.open || h.busy) return;
    this.open = true;
    if (spread !== null) this.spread = spread;
    this.paintSpread();
    h.reading = true;
    if (h.item) h.item.obj.visible = false;
    h.anchor.add(this.book);
    this.book.position.set(0, -0.32, -0.3);
    this.book.rotation.set(0.9, 0, 0);
    this.t = 0;
    g.player.frozen = true;
    g.player.lookLocked = true;
    document.body.classList.add('reading');
    this.ui.classList.add('on');
    audio.play('page', { vol: 0.8 });
    g.events.emit('notebook', true);
  }

  close() {
    if (!this.open) return;
    const g = this.game, h = g.held;
    this.open = false;
    this.closing = 0;
    g.player.frozen = false;
    g.player.lookLocked = false;
    document.body.classList.remove('reading');
    this.ui.classList.remove('on');
    audio.play('page', { vol: 0.5 });
    g.events.emit('notebook', false);
    h.reading = false;
    if (h.item) h.item.obj.visible = true;
  }

  turn(dir) {
    const nx = this.spread + dir;
    if (this.flip || nx < 0 || nx >= this.spreads) { audio.play('rotate', { vol: 0.3 }); return; }
    // the turning leaf shows the current right page on its front and the next left page on its back (or vice versa)
    if (dir > 0) { this.paint(2, this.spread * 2 + 1); this.paint(3, nx * 2); this.paint(1, nx * 2 + 1); }
    else { this.paint(2, nx * 2 + 1); this.paint(3, this.spread * 2); this.paint(0, nx * 2); }
    this.flip = { dir, t: 0, to: nx };
    this.flipPage.visible = true;
    this.flipPage.rotation.y = dir > 0 ? 0.13 : Math.PI - 0.13;
    audio.play('page', { vol: 0.9 });
  }

  update(dt) {
    const g = this.game, inp = g.input;
    if (!this.open) {
      if (this.book.parent && this.closing !== undefined) {
        this.closing += dt / 0.25;
        const k = ease.inCubic(Math.min(1, this.closing));
        this.book.position.set(0, -0.035 - k * 0.3, -0.3);
        this.book.rotation.x = 0.25 + k * 0.7;
        if (this.closing >= 1) { this.book.parent.remove(this.book); this.closing = undefined; }
      }
      return;
    }
    this.t += dt;
    const k = ease.outBack(Math.min(1, this.t / 0.4));
    this.book.position.set(0, -0.32 + k * 0.285, -0.3);
    this.book.rotation.set(0.9 - k * 0.65, 0, 0);
    if (this.flip) {
      const f = this.flip;
      f.t += dt / 0.45;
      const e = ease.inOutCubic(Math.min(1, f.t));
      this.flipPage.rotation.y = f.dir > 0 ? 0.13 + e * (Math.PI - 0.26) : Math.PI - 0.13 - e * (Math.PI - 0.26);
      this.flipPage.position.z = Math.sin(e * Math.PI) * 0.01;
      if (f.t >= 1) {
        this.spread = f.to;
        this.flip = null;
        this.flipPage.visible = false;
        this.paintSpread();
      }
    }
    if (!inp.locked) { if (!this.game.input.touch) this.close(); return; }
    if (inp.buttonDown(0) || inp.keyPressed('KeyD') || inp.keyPressed('ArrowRight')) this.turn(1);
    if (inp.buttonDown(2) || inp.keyPressed('KeyA') || inp.keyPressed('ArrowLeft')) this.turn(-1);
    if (inp.keyPressed('KeyQ') || inp.keyPressed('KeyE') || inp.keyPressed('Escape') || inp.keyPressed('Tab')) this.close();
  }
}
