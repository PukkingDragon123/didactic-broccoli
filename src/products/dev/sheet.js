// Dev page for the label studio: contact sheets drawn at whole-pixel scales. ?s=fonts | mascots | ...
import '@fontsource/dotgothic16/400.css';
import '../../ui/fonts.css';
import { Px, css } from '../px.js';
import { m5, m3, mk, ma, label, whenFontsReady, bold, shear, arc } from '../type.js';
import { MASCOTS } from '../mascots.js';
import { BRANDS, DRINKS } from '../brands.js';
import { paintWrap, spr } from '../labels.js';
import { FOODS } from '../../needs/foods.js';

const q = new URLSearchParams(location.search), which = (q.get('s') || 'mascots').split(',');
const sheets = (window.__sheets = {});
const show = (name, canvas) => { sheets[name] = canvas; document.getElementById('out').appendChild(canvas); };
window.onerror = (m, s, l) => { document.getElementById('err').textContent += `${m} ${s}:${l}\n`; };

function fonts() {
  const p = new Px(420, 330, 0xf4ecd8);
  let y = 4;
  for (const size of [8, 10, 12, 14, 16]) {
    label(p, m5(String(size)), 2, y, { c: 0xc8302a });
    label(p, mk('品名：コーヒー飲料　原材料名：砂糖、牛乳', size), 20, y, {}); y += size + 4;
    label(p, mk('あき缶はくずかごへ　プルタブ　賞味期限　製造者', size), 20, y, {}); y += size + 4;
    label(p, mk('内容量１９０ｇ 190g ガンコ珈琲 税別 新発売 果汁10%', size), 20, y, {}); y += size + 6;
  }
  label(p, ma('Ganko Coffee 1999 Alagard', 16), 4, y, {}); y += 20;
  label(p, m5('5X7 GANKO COFFEE 190G ¥130'), 4, y, {}); y += 10;
  label(p, m3('MICRO 3X5: INGREDIENTS COFFEE, SUGAR, MILK 4901234567894'), 4, y, {}); y += 8;
  label(p, bold(mk('がんこ珈琲', 16)), 4, y, { c: 0xfffaf0, out: 0x241a1e, sh: [1, 1, 0xc8302a] });
  label(p, shear(bold(mk('プクポップ', 16)), 0.3), 110, y, { c: 0xffd23f, out: 0x1a3a8a, ow: 1 });
  label(p, arc(m5('PUKU POP', 2), 4), 220, y, { c: 0xe0443a, out: 0xfffaf0 });
  show('fonts', p.canvas(3));
}

function mascots() {
  const list = [
    ['bancho', ['cross', 'thumb', 'cup']], ['puku', ['float', 'blow', 'pop']], ['chako', ['stand', 'sip', 'leaf']],
    ['momo', ['wave', 'drink', 'sleep']], ['shizuku', ['run', 'flex', 'cheer']], ['kokekko', ['flex', 'crow', 'point']],
    ['fukuro', ['mug', 'wink', 'doze']], ['nabe', ['ladle', 'steam', 'bow']], ['nazo', ['shrug', 'peek', 'float']],
    ['peppo', [0]], ['neko', [0]], ['chuta', [0]], ['kamepan', [0]], ['hotaru', [0]], ['biri', [0]], ['mogu', [0]], ['omusubi', [0]],
  ];
  const p = new Px(56 * 6, 58 * 6, 0xe8dcc0);
  let i = 0;
  for (const [k, poses] of list) for (const pose of poses) {
    const s = pose === 0 ? MASCOTS[k]() : MASCOTS[k](pose);
    const cx = (i % 6) * 56, cy = Math.floor(i / 6) * 58;
    p.rect(cx + 1, cy + 1, 54, 56, i % 2 ? 0xf4ecd8 : 0xdfeaf0);
    p.blit(s, cx + Math.round((56 - s.w) / 2), cy + 54 - s.h);
    i++;
  }
  show('mascots', p.canvas(4));
}

/** One brand: its name, its mascot's poses, every label unrolled (front | back). ?z= scale, ?b= brand ids */
function brand(bid, z) {
  const b = BRANDS[bid], ids = Object.keys(DRINKS).filter((k) => DRINKS[k].brand === bid);
  const wraps = ids.map((id) => paintWrap(id));
  const perRow = 3, pad = 10, cw = Math.max(...wraps.map((w) => w.w)) + pad;
  const rows = [];
  for (let i = 0; i < wraps.length; i += perRow) rows.push(wraps.slice(i, i + perRow));
  const headH = 64, H = headH + rows.reduce((a, r) => a + Math.max(...r.map((w) => w.h)) + pad + 12, 0) + pad;
  const p = new Px(cw * Math.min(perRow, wraps.length) + pad, H, 0xe8dcc0);
  p.rect(0, 0, p.w, headH - 6, b.main);
  label(p, bold(mk(b.jp, 16)), 10, 8, { c: 0xfffaf0, out: 0x241a1e });
  label(p, m5(b.en), 10, 30, { c: 0xfffaf0 }); label(p, m3(b.maker ? 'JAN 49' + b.code : ''), 10, 42, { c: 0xfffaf0 });
  const poses = { bancho: ['cross', 'thumb', 'cup'], puku: ['float', 'blow', 'pop'], chako: ['stand', 'sip', 'leaf'], momo: ['wave', 'drink', 'sleep'], shizuku: ['run', 'flex', 'cheer'], kokekko: ['flex', 'crow', 'point'], fukuro: ['mug', 'wink', 'doze'], nabe: ['ladle', 'steam', 'bow'], nazo: ['shrug', 'peek', 'float'] }[b.mascot] || [];
  poses.forEach((ps, i) => { const s = spr(b.mascot, ps); p.blit(s, 190 + i * 58 + Math.round((54 - s.w) / 2), headH - 8 - s.h); });
  let y = headH + 4, k = 0;
  for (const r of rows) {
    const rh = Math.max(...r.map((w) => w.h));
    r.forEach((w, i) => { p.blit(w, pad + i * cw, y + 10); label(p, m3(ids[k] + '  ' + (FOODS[ids[k]]?.name || '') + '  ' + DRINKS[ids[k]].cont), pad + i * cw, y + 2, { c: 0x2a2016 }); k++; });
    y += rh + pad + 12;
  }
  show('brand_' + bid, p.canvas(z));
}
/** The containers in 3D under a plain key light (geometry and wrap check; the game adds cel bands and ink). */
async function three3d() {
  const THREE = await import('three');
  const { drinkMesh, drinksSheet } = await import('../containers.js');
  const ids = (q.get('ids') || 'vd_bancho,vd_cider,vd_melon,vd_strong,vd_ocha,vd_realbold,vd_onecup,ramune').split(',');
  const W = 1280, H = 720, r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H); r.setClearColor(0xd8cdb8);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(22, W / H, 0.01, 10);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.position.set(-1, 2, 2); sc.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcbbfa6, roughness: 1 })); sc.add(floor);
  const yaw = +(q.get('yaw') || 0), n = ids.length;
  ids.forEach((id, i) => { for (const [dz, ry] of [[0, yaw], [-0.2, Math.PI + 0.5]]) { const m = drinkMesh(id); m.position.set((i - (n - 1) / 2) * 0.095 + (dz ? 0.04 : 0), 0, dz); m.rotation.y = ry; sc.add(m); } });
  const tilt = +(q.get('tilt') || 0.22);
  cam.position.set(0, 0.1 + Math.sin(tilt) * 1.3, Math.cos(tilt) * 1.45); cam.lookAt(0, 0.08, -0.05);
  await drinksSheet().ready;
  r.render(sc, cam);
  show('three', r.domElement);
  const S = drinksSheet();
  show('atlas', S.A.tex.image);
  window.__info = { tris: ids.map((id) => [id, drinkMesh(id).geometry.attributes.position.count / 3]) };
}
/** A vending cabinet with its samples (no game: plain lights). ?cab=coffee,soda&ang=0.5 */
async function cab3d() {
  const THREE = await import('three');
  const { drinkGeometry, drinksSheet } = await import('../containers.js');
  const { makeCabinet, CAB } = await import('../../places/vending/cabinet.js');
  const { MACHINES } = await import('../../needs/foods.js');
  const liv = (q.get('cab') || 'coffee').split(',');
  const W = 1280, H = 800, r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H); r.setClearColor(0xb8c4cc);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(+(q.get('fov') || 30), W / H, 0.05, 30);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.0); sun.position.set(-1.5, 3, 3); sc.add(sun);
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 1 })));
  const sheets = [drinksSheet()];
  liv.forEach((id, k) => {
    const c = makeCabinet(id); sheets.push(c.sheet);
    const g = c.group; g.position.x = (k - (liv.length - 1) / 2) * 1.04; sc.add(g);
    MACHINES[id].forEach((did, i) => { const m = new THREE.Mesh(drinkGeometry(did, { sample: true }), drinksSheet().lit()); m.position.set(CAB.cols[i % 4], CAB.ledge[Math.floor(i / 4)], CAB.sampleZ); g.add(m); });
  });
  const ang = +(q.get('ang') || 0), dist = +(q.get('dist') || 4.2), ty = +(q.get('ty') || 0.95);
  cam.position.set(Math.sin(ang) * dist, +(q.get('cy') || 1.3), Math.cos(ang) * dist); cam.lookAt(+(q.get('tx') || 0), ty, 0);
  await Promise.all(sheets.map((s) => s.ready));
  r.render(sc, cam);
  show('cab', r.domElement);
  if (q.get('atlas')) show('cabatlas', sheets[1].A.tex.image);
}
const RUN = { fonts, mascots, three: three3d, cab: cab3d };
for (const bid of (q.get('b') || '').split(',').filter(Boolean)) RUN['b:' + bid] = () => brand(bid, +(q.get('z') || 1));
if (q.get('b')) which.length = 0, which.push(...Object.keys(RUN).filter((k) => k.startsWith('b:')));
const run = async () => { document.getElementById('out').innerHTML = ''; for (const k of which) await RUN[k]?.(); };
run().then(() => whenFontsReady()).then(() => run()).then(() => { window.__ready = true; });
