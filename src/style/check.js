// Checking yourself, in first person: hold Tab (or the wallet button on a touch screen) and your left hand pulls out
// your wallet and flips it open in front of you: the cash side shows a bill and a till slip with your cash, the card
// side the time and date, your shop level and your energy. A cheap digital watch on the inside of your left wrist
// shows the time too. Release and it goes back in your pocket (a quick tap keeps it out for a moment).
// Wraps the first-person body (src/game/FPBody.js) from outside: the left hand's pose is taken over while the wallet
// is out, the watch rides on the wrist bone (re-fitted whenever your avatar changes).
//   installCheck(game) -> { get k() }      (game.check)
import * as THREE from 'three';
import { draw5, textW5 } from '../gfx/font5x7.js';
import { audio } from '../core/audio.js';

const W = 0.094, H = 0.126; // one half of the open wallet (m)
const TW = 48, TH = 64; // texels per half
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion();
const yenS = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function panel(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return { c, g: c.getContext('2d'), t };
}
const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

// a 3 x 5 digit font for the watch face
const D35 = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];

export function installCheck(game) {
  const g = game, fp = g.fp, hud = g.hudCtl, anchor = g.held.anchor;
  const st = { k: 0, on: false, hold: 0, t: 0, drawT: 0, touch: false, opened: false };

  // ---------------------------------------------------------------- the wallet (two halves hinged at the spine)
  const wallet = new THREE.Group();
  wallet.name = 'check-wallet';
  wallet.visible = false;
  anchor.add(wallet);
  const leather = new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: 0.72 });
  const P = [panel(TW, TH), panel(TW, TH)];
  const half = (side, p) => {
    const grp = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(W + 0.006, H + 0.006, 0.005), leather);
    cover.position.set(side * (W / 2 + 0.002), 0, -0.004);
    // unlit like the notebook pages: always readable, a touch dimmer than white so it never blooms
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: p.t, color: 0xdcd4c8 }));
    face.position.set(side * W / 2, 0, -0.001);
    grp.add(cover, face);
    wallet.add(grp);
    return grp;
  };
  const L = half(-1, P[0]), R = half(1, P[1]);
  wallet.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.userData.noRim = true; } });

  function paint() {
    const c = g.clock, d = c ? g.calendar?.dateOf?.(c.day) : null;
    // cash side: leather, a folded bill, the till slip with your cash
    let x = P[0].g;
    rect(x, 0, 0, TW, TH, '#6a3e24');
    for (let i = 2; i < TW - 2; i += 3) { rect(x, i, 2, 1, 1, '#b88a5a'); rect(x, i, TH - 3, 1, 1, '#b88a5a'); }
    for (let i = 2; i < TH - 2; i += 3) { rect(x, 2, i, 1, 1, '#b88a5a'); rect(x, TW - 3, i, 1, 1, '#b88a5a'); }
    rect(x, 5, 5, 38, 19, '#9aa080'); rect(x, 6, 6, 36, 17, '#e2dec6');
    draw5(x, '1000', 8, 8, { col: '#6a7a56' });
    rect(x, 34, 9, 6, 6, '#c8322c'); rect(x, 35, 10, 4, 4, '#e8a0a0'); rect(x, 8, 17, 22, 1, '#b8bca0'); rect(x, 8, 19, 16, 1, '#b8bca0');
    rect(x, 4, 28, 40, 32, '#f6f3ea');
    for (let i = 4; i < 44; i += 2) rect(x, i, 59, 1, 1, '#6a3e24');
    draw5(x, 'CASH', 12, 31, { col: '#c8322c' });
    const cash = yenS(g.wallet?.cash ?? g.state.money ?? 0);
    const amt = textW5('¥' + cash) <= 36 ? '¥' + cash : textW5(cash) <= 36 ? cash : Math.floor((g.wallet?.cash ?? 0) / 1000) + 'K';
    draw5(x, amt, 44 - textW5(amt), 42, { col: '#241a1e' });
    rect(x, 7, 51, 34, 1, '#c9bca6');
    P[0].t.needsUpdate = true;
    // card side: the clock ticket's red band, date, level, energy
    x = P[1].g;
    rect(x, 0, 0, TW, TH, '#f2ead8');
    rect(x, 0, 0, TW, 1, '#d8ccb0'); rect(x, 0, TH - 1, TW, 1, '#d8ccb0');
    rect(x, 2, 3, TW - 4, 12, '#c8322c');
    const time = c?.time || '--:--';
    draw5(x, time, Math.round((TW - textW5(time)) / 2), 5, { col: '#fff4e0' });
    const dateS = d ? `${d.wd || WD[d.weekday] || ''} ${d.month}/${d.date}` : '';
    draw5(x, dateS, Math.round((TW - textW5(dateS)) / 2), 18, { col: '#5e5046' });
    const Pg = g.progress;
    draw5(x, `LV ${Pg?.level ?? 1}`, 4, 29, { col: '#2f5a9a' });
    rect(x, 4, 38, 40, 5, '#241a1e'); rect(x, 5, 39, 38, 3, '#e6dcc4'); rect(x, 5, 39, Math.round(38 * Math.max(0, Math.min(1, Pg?.frac ?? 0))), 3, '#58c06c');
    const N = g.needs, e = N ? Math.max(0, Math.min(1, N.s.energy / (N.max || 100))) : 1;
    draw5(x, 'EN', 4, 48, { col: '#5e5046' });
    rect(x, 18, 47, 24, 9, '#241a1e'); rect(x, 42, 49, 2, 5, '#241a1e'); rect(x, 19, 48, 22, 7, '#e6dcc4');
    const segs = Math.ceil(e * 5), col = e > 0.5 ? '#58c06c' : e > 0.2 ? '#ffd23f' : '#e5383b';
    for (let i = 0; i < segs; i++) rect(x, 20 + i * 4, 49, 3, 5, col);
    P[1].t.needsUpdate = true;
    paintWatch(time);
  }

  // ---------------------------------------------------------------- the wristwatch (inside of the left wrist)
  const wf = panel(20, 12);
  const watch = new THREE.Group();
  watch.name = 'check-watch';
  const caseM = new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.5 });
  const wcase = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.03, 0.034), caseM);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1, 0.016, 1), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.02), new THREE.MeshBasicMaterial({ map: wf.t, color: 0xd8d8d0 }));
  face.rotation.set(0, -Math.PI / 2, Math.PI); // faces -x (the palm side), reading across the wrist
  face.position.x = -0.0047;
  watch.add(wcase, strap, face);
  watch.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.userData.noRim = true; } });
  function paintWatch(time) {
    const x = wf.g;
    rect(x, 0, 0, 20, 12, '#2a2a2e'); rect(x, 1, 1, 18, 10, '#a8b49a');
    const s = String(time).replace(':', '');
    [...s.padStart(4, '0').slice(0, 4)].forEach((ch, i) => {
      const gl = D35[+ch] || D35[0];
      for (let j = 0; j < 15; j++) if (gl[j] === '1') rect(x, 2 + i * 4 + (i > 1 ? 1 : 0) + (j % 3), 3 + Math.floor(j / 3), 1, 1, '#1e2418');
    });
    if (Math.floor((g.clock?.stamp ?? 0) * 2) % 2 === 0) { rect(x, 9, 4, 1, 1, '#1e2418'); rect(x, 9, 6, 1, 1, '#1e2418'); }
    wf.t.needsUpdate = true;
  }
  function fitWatch() {
    const B = fp?.hb?.[0], Pp = fp?.P;
    if (!B || !Pp) return;
    const ar = fp.ar || 1;
    B.tB.add(watch);
    watch.scale.setScalar(1.35);
    watch.position.set(-(0.0215 * ar + 0.0045), Pp.wristY + 0.032 - Pp.elbowY, 0);
    strap.scale.set(2 * (0.022 * ar + 0.001) / 1.35, 1, 2 * (0.031 * ar + 0.001) / 1.35);
    strap.position.x = (0.0215 * ar + 0.0045) / 1.35;
  }
  if (fp) {
    const build0 = fp.build.bind(fp);
    fp.build = () => { build0(); fitWatch(); };
    fitWatch();
    // the left hand holds the wallet while it's out
    const choose0 = fp.choose.bind(fp);
    fp.choose = (Hh, Wp) => {
      const r = choose0(Hh, Wp);
      if (Hh.h !== 0 || st.k < 0.02 || !wallet.visible) return r;
      wallet.updateWorldMatrix(true, true);
      fp.toAnchor(_v.set(-W * 0.98, -H * 0.44, -0.008).applyMatrix4(L.matrixWorld), _c);
      const fwd = fp.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(L.getWorldQuaternion(_q)), _v3).clone();
      const up = fp.dirToAnchor(_v.set(-0.35, 1, 0).applyQuaternion(_q), _v2).clone();
      fp.setGrip(Hh, Wp, _c, fwd, up, [0.3, 0.08, 0.85, 0.35, 0, 0.2]);
      return 'check';
    };
  }

  // ---------------------------------------------------------------- touch: a wallet button (hold)
  const touchEl = document.getElementById('touch');
  if (touchEl && !document.getElementById('t-check')) {
    const b = document.createElement('button');
    b.className = 'tb t-check'; b.id = 't-check'; b.setAttribute('aria-label', 'Check wallet'); b.dataset.icon = 'wallet'; b.dataset.scale = '2';
    touchEl.appendChild(b);
    import('../ui/staticIcons.js').then((m) => m.setIcon?.(b)).catch(() => {});
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); st.touch = true; });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { st.touch = false; });
  }

  // ---------------------------------------------------------------- per frame (before the hands are posed)
  const can = () => g.input.locked && !g.uiOpen && !g.pc?.active && !g.cutscene?.active && !g.held.reading && !g.talk?.active && !g.uiCine;
  const update = (gg, dt) => {
    st.t += dt;
    const want = can() && (g.input.key('Tab') || st.touch);
    if (want) { if (!st.on) { st.on = true; st.hold = 0; } st.hold += dt; }
    else if (st.on && st.hold > 0.35) st.on = false;
    else if (st.on) st.hold += dt; // a quick tap keeps it out for a moment
    if (st.on && !can()) st.on = false;
    const live = !!fp?.live && anchor.visible;
    st.k = Math.max(0, Math.min(1, st.k + (st.on ? dt / 0.32 : -dt / 0.26)));
    if (hud) { hud.checking = st.on; hud.fpCheck = live; }
    wallet.visible = live && st.k > 0.001;
    if (st.on && !st.opened && live) { st.opened = true; try { audio.play('paper', { vol: 0.5 }); } catch { /* audio not ready */ } }
    if (!st.on) st.opened = false;
    if (!wallet.visible) return;
    const e = smooth(st.k), o = smooth((st.k - 0.4) / 0.6);
    wallet.position.set(lerp(-0.19, -0.06, e), lerp(-0.44, -0.05, e), lerp(-0.32, -0.3, e));
    wallet.rotation.set(lerp(1.1, 0.2, e), lerp(0.55, 0.2, e), lerp(0.35, 0.03, e));
    L.rotation.y = -0.12;
    R.rotation.y = lerp(-Math.PI + 0.2, 0.12, o);
    if ((st.drawT -= dt) <= 0) { st.drawT = 0.5; paint(); }
  };
  g.constructor.updaters.unshift(update);
  paint();
  g.check = { get k() { return st.k; }, get on() { return st.on; }, wallet, watch };
  return g.check;
}
