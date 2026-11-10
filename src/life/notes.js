// Grandpa's notes: paper notes taped around the garage, written before you arrived (he walks you through the first
// ones in person, src/grandpa/, and they carry on after he's gone; the last one is a page of the notebook he gives you
// at the taxi, kept on the computer desk). Click one and you pick it up
// and read it in first person, a sheet of his handwriting held up in both hands (pixel art, src/life/art.js). Every
// note is a little to-do list: its boxes tick themselves (in red pen) as you do the jobs, and the objective card quotes
// him (src/game/Guide.js). Notes you've read stay where they are, so you can read them again.
//   life.notes.place(id, { pos, rotY, flat, size }) -> world mesh        life.notes.open(id) / close()
//   life.notes.isRead(id)   life.notes.refresh(id) (repaint the ticks)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { paintNote } from './art.js';

/** The notes. rows: see paintNote (src/life/art.js); task ids are the story's to-do ids (game.story.isDone). */
export const NOTES = {
  power: {
    paper: 'memo', w: 128, h: 176, seed: 12, where: 'on the counter',
    rows: [
      { big: 'POWER FIRST' },
      { task: 'breaker', text: 'MAIN BREAKER: GREY BOX BY THE BACK DOOR. FLIP IT UP.' },
      { task: 'lights', text: 'LIGHT SWITCH, SAME WALL.' },
      { task: 'window', text: 'OPEN THE WINDOW. IT STINKS OF CARDBOARD.' },
      { task: 'tube', text: 'LEFT TUBE DIED AT OBON. NEW ONE: MIKAWA-YA.' },
      { doodle: 'breaker', scale: 2, x: 12, inline: true }, { doodle: 'arrowU', scale: 2, x: 36, inline: true }, { doodle: 'bulb', scale: 2, right: true },
      { sign: '- G' },
    ],
  },
  clean: {
    paper: 'memo', w: 128, h: 176, seed: 13, where: 'on the sink',
    rows: [
      { big: 'CLEAN UP' },
      { task: 'wipe', text: "RAG'S BY THE TAP. WET IT, WIPE THE COUNTER." },
      { task: 'sweep', text: 'SWEEP THE DUST. BROOMS: MIKAWA-YA.' },
      { task: 'bag', text: 'BIN BAGS UNDER THE SINK. BAG THE RUBBISH.' },
      { task: 'trashout', text: 'ALL OF IT TO THE STATION, LEFT OF THE SHOP.' },
      { red: 'BURNABLE: MON + THU' },
      { doodle: 'bag', scale: 2, right: true },
    ],
  },
  tin: {
    paper: 'yellow', w: 112, h: 162, seed: 14, where: 'on the steel rack',
    rows: [
      { big: 'THE TIN' },
      { task: 'tin', text: 'SAVINGS. FOR BROOMS AND MILK.' },
      { red: 'NOT CAPSULES.' },
      { task: 'tray', text: 'COIN BAG = CHANGE FLOAT. INTO THE TRAY ON THE COUNTER.' },
      'PS: THE RADIO EATS AA BATTERIES.',
      { doodle: 'tin', scale: 2, x: 10, inline: true }, { doodle: 'coins', scale: 2, x: 40 },
    ],
  },
  junk: {
    paper: 'memo', w: 120, h: 136, seed: 15, where: 'on the boxes',
    rows: [
      { big: 'JUNK' },
      'MY OLD MACHINES WENT TO THE SCRAP MAN. THEIR PARTS CAN GO TOO.',
      { task: 'junk', text: 'LOOK INSIDE, THEN OUT THEY GO.' },
      { red: 'KEEP ANYTHING THAT SAYS OPEN!' },
    ],
  },
  cat: {
    paper: 'yellow', w: 112, h: 136, seed: 16, where: 'on the heater',
    rows: [
      { big: 'MIKAN' },
      { doodle: 'cat', scale: 2, right: true, inline: true },
      "THE CAT. SHE'S SHY.",
      { gap: 4 },
      { task: 'feed', text: 'MILK FROM MIKAWA-YA, BOWL BY THE HEATER.' },
      "DON'T TELL ANYONE I FEED HER.",
    ],
  },
  pc: {
    paper: 'yellow', w: 112, h: 184, seed: 17, where: 'on the computer desk',
    rows: [
      { big: 'MACHINES' },
      "THEY'RE ON THE COMPUTER NOW. OFF-HOBBY = USED, DAIKOKU = NEW.",
      { red: 'MONEY? NOT IN THE TIN! EARN IT.' },
      { task: 'job', text: 'NEIGHBOURS NEED A HAND. BOARD BY THE STATION.' },
      { task: 'buymachine', text: 'CASH IN THE BANK (ATM), THEN BUY ONE. A USED ONE IS FINE.' },
      "PS: I'M ON THE TRAIN BY NOW. YOU'LL BE FINE.",
      { doodle: 'car', scale: 2, right: true },
    ],
  },
  machine: {
    paper: 'memo', w: 128, h: 168, seed: 18, where: 'on the machine wall',
    rows: [
      { big: 'MACHINE CORNER' },
      { task: 'unbox', text: 'UNBOX IT: STRAPS, CARTON, FOAM.' },
      { task: 'plug', text: 'PLUG IT IN BEHIND. ONE PER SOCKET.' },
      { task: 'restock', text: 'CAPSULES FROM THE COMPUTER. FILL IT UP.' },
      { task: 'price', text: 'PRICE PLATE: KIDS PAY 100. 200 FOR THE GOOD ONES.' },
      { doodle: 'machine', scale: 2, x: 12, inline: true }, { doodle: 'plug', scale: 2, x: 40 },
    ],
  },
  sign: {
    paper: 'card', w: 120, h: 140, seed: 19, where: 'with the sign', tape: false,
    rows: [
      { big: 'MY OLD SIGN!' },
      { task: 'hang', text: 'HANG IT ON THE HOOK BY THE SHUTTER.' },
      { task: 'open', text: "FLIP IT TO OPEN WHEN THE MACHINE'S READY." },
      "FLIP IT BACK EVERY NIGHT. THAT'S THE WHOLE JOB, KIDDO.",
      { doodle: 'sign', scale: 2, x: 10, inline: true }, { doodle: 'heart', scale: 2, x: 34 },
    ],
  },
  // the page of the notebook he hands you at the taxi (src/grandpa/; it lies on the computer desk afterwards)
  book: {
    paper: 'letter', w: 144, h: 204, seed: 21, where: 'in his notebook', tape: false,
    rows: [
      { big: 'THE REST OF IT' },
      'TOLD YOU I WROTE IT ALL DOWN. THIS IS THE PEN ONE.',
      { task: 'read_pc', text: 'MY NOTE ON THE COMPUTER DESK.' },
      { task: 'job', text: 'ODD JOBS FOR MONEY. BOARD BY THE STATION.' },
      { task: 'buymachine', text: 'BUY A MACHINE. USED IS FINE.' },
      { task: 'restock', text: 'FILL IT UP. KIDS PAY 100.' },
      { task: 'open', text: 'HANG MY SIGN. FLIP IT TO OPEN.' },
      { red: 'RING ME: 0557-81-1937. NOT AFTER 8. BATH.' },
      { sign: '- GRAMPS' },
    ],
  },
};

/** Notes that used to exist (his letter on the shutter: he's there in person now). They count as read, so old saves
 *  and anything that still asks about them carry on. */
const RETIRED = new Set(['letter']);
const PAPER_H = 0.26; // the sheet's height in your hands (m)
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

export class Notes {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.s = life.s;
    if (!Array.isArray(this.s.notes)) this.s.notes = [];
    this.pix = new Map(); // id -> { p (Pix), tex }
    this.dirty = new Set(); // notes waiting for a repaint
    this.world = new Map(); // id -> mesh
    this.open_ = null;
    this.t = 0;
    // the sheet in your hands: unlit (always readable) and a touch under white so it never blooms
    this.mat = new THREE.MeshBasicMaterial({ color: 0xd8d0c4, alphaTest: 0.5 });
    this.sheet = new THREE.Group();
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x8a8274 }));
    back.rotation.y = Math.PI; back.position.z = -0.0005;
    this.sheet.add(this.face, back);
    this.sheet.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.userData.noRim = true; } });
    const ui = document.createElement('div');
    ui.id = 'note-ui';
    ui.innerHTML = '<span class="k">Q</span> put it down';
    ui.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.close(); });
    document.body.appendChild(ui);
    this.ui = ui;
  }

  isRead(id) { return RETIRED.has(id) || this.s.notes.includes(id); }

  /** The note's texture (painted on first use, repainted by refresh()). */
  tex(id) {
    let e = this.pix.get(id);
    if (!e) {
      const def = NOTES[id];
      const p = paintNote(def, (task) => this.game.story?.isDone?.(task));
      const tex = p.texture();
      tex.minFilter = THREE.NearestMipmapLinearFilter;
      e = { p, tex, def };
      this.pix.set(id, e);
    }
    return e.tex;
  }

  /** Repaint a note's ticks (after a job is done). */
  refresh(id) {
    const e = this.pix.get(id);
    if (!e) return;
    const p = paintNote(e.def, (task) => this.game.story?.isDone?.(task));
    p.flush();
    e.p.ctx.clearRect(0, 0, e.p.w, e.p.h);
    e.p.ctx.drawImage(p.canvas, 0, 0);
    e.tex.needsUpdate = true;
  }
  /** Repaint every note's ticks, one note a frame (a chore just got done). */
  refreshAll() { for (const id of this.pix.keys()) this.dirty.add(id); }

  /** A note taped somewhere: pos (centre), rotY (its face looks along +z turned by rotY), flat (lying on a surface), size (height, m). */
  place(id, { pos, rotY = 0, flat = false, size = 0.17, tilt = 0, parent = null }) {
    const g = this.game, def = NOTES[id];
    this.remove(id);
    if (!def) return null;
    const mat = new THREE.MeshStandardMaterial({ map: this.tex(id), roughness: 0.92, alphaTest: 0.5 });
    const h = size, w = size * (def.w / def.h);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(pos);
    if (flat) m.rotation.set(-Math.PI / 2, 0, rotY);
    else m.rotation.set(0, rotY, tilt);
    m.receiveShadow = true;
    m.userData.noteId = id;
    (parent || g.scene).add(m);
    g.interaction.add(m, {
      reach: 2.4,
      hint: () => (g.held.busy ? null : { key: 'LMB', text: this.isRead(id) ? "Read Grandpa's note again" : "Read Grandpa's note", sub: '' }),
      use: () => { this.open(id); return false; },
    });
    this.world.set(id, m);
    return m;
  }

  remove(id) {
    const m = this.world.get(id);
    if (!m) return;
    this.game.interaction.remove(m);
    m.parent?.remove(m);
    m.geometry.dispose();
    this.world.delete(id);
  }

  // ------------------------------------------------------------------ reading
  open(id, { onClose = null } = {}) {
    const g = this.game, h = g.held;
    if (this.open_ || h.busy || g.notebook?.open) return false;
    const def = NOTES[id];
    if (!def) return false;
    this.refresh(id);
    this.dirty.delete(id);
    this.mat.map = this.tex(id);
    this.mat.needsUpdate = true;
    const H = PAPER_H, W = H * (def.w / def.h);
    this.face.scale.set(W, H, 1);
    this.sheet.children[1].scale.set(W, H, 1);
    this.dims = { w: W, h: H };
    this.open_ = { id, onClose };
    this.t = 0;
    this.closing = undefined;
    h.reading = true;
    if (h.item) h.item.obj.visible = false;
    h.anchor.add(this.sheet);
    this.sheet.position.set(0, -0.36, -0.3);
    this.sheet.rotation.set(0.9, 0, 0);
    g.player.frozen = true;
    g.player.lookLocked = true;
    document.body.classList.add('reading');
    this.ui.classList.add('on');
    audio.play('paper', { vol: 0.8 });
    const first = !this.isRead(id);
    if (first) this.s.notes.push(id);
    g.events.emit('noteRead', { id, first });
    return true;
  }

  close() {
    if (!this.open_) return;
    const g = this.game, h = g.held;
    const o = this.open_;
    this.open_ = null;
    this.closing = 0;
    g.player.frozen = false;
    g.player.lookLocked = false;
    document.body.classList.remove('reading');
    this.ui.classList.remove('on');
    audio.play('page', { vol: 0.5 });
    h.reading = false;
    if (h.item) h.item.obj.visible = true;
    g.events.emit('noteClosed', { id: o.id });
    o.onClose?.();
    g.save();
  }

  get isOpen() { return !!this.open_; }

  update(dt) {
    const g = this.game, inp = g.input;
    if (this.dirty.size) { const id = this.dirty.values().next().value; this.dirty.delete(id); this.refresh(id); }
    if (!this.open_) {
      if (this.sheet.parent && this.closing !== undefined) {
        this.closing += dt / 0.25;
        const k = ease.inCubic(Math.min(1, this.closing));
        this.sheet.position.set(0, -0.035 - k * 0.32, -0.3);
        this.sheet.rotation.x = 0.18 + k * 0.7;
        if (this.closing >= 1) { this.sheet.parent.remove(this.sheet); this.closing = undefined; }
      }
      return;
    }
    this.t += dt;
    const k = ease.outBack(Math.min(1, this.t / 0.4));
    // lifted up into view, breathing a little in your hands
    this.sheet.position.set(Math.sin(this.t * 0.9) * 0.002, -0.36 + k * 0.325 + Math.sin(this.t * 1.3) * 0.0015, -0.3);
    this.sheet.rotation.set(0.9 - k * 0.72, Math.sin(this.t * 0.7) * 0.01, Math.sin(this.t * 0.5) * 0.008);
    if (!inp.locked) { if (!inp.touch) this.close(); return; }
    if (this.t < 0.35) return;
    if (inp.buttonDown(0) || inp.buttonDown(2) || inp.keyPressed('KeyQ') || inp.keyPressed('KeyE') || inp.keyPressed('Escape') || inp.keyPressed('Space')) this.close();
  }

  /** FPBody hook: both hands hold the sheet by its lower corners, thumbs over the front. */
  handPose(fp, H, W) {
    if (this.sheet.parent !== this.game.held.anchor) return null;
    const sd = H.sd, d = this.dims || { w: 0.2, h: 0.26 };
    this.sheet.updateWorldMatrix(true, false);
    const c = fp.toAnchor(_v.set(-sd * d.w * 0.47, -d.h * 0.43, -0.012).applyMatrix4(this.sheet.matrixWorld), new THREE.Vector3());
    this.sheet.getWorldQuaternion(_q);
    const fwd = fp.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(_q), new THREE.Vector3());
    const up = fp.dirToAnchor(_v2.set(-sd * 0.35, 1, 0).applyQuaternion(_q), new THREE.Vector3());
    fp.setGrip(H, W, c, fwd, up, [0.42, 0.04, 0.9, 0.3, 0, 0.3]);
    return 'note';
  }
}
