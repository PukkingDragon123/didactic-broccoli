// The title screen. Dusk in the back lane: the garage lit up behind its half-rolled shutter, lanterns and noren, pigeons
// on the wire, a moth at the lamp, a train now and then over the west bridge; you idling by a Shōwa gacha machine with
// your phone, Mikan asleep on the bench. Over it hangs the shop's enamel sign, and under the sign a strand of paper
// tags: the menu (words only, no icons: a tall ticket for the way in, manila tags, two short kraft ones for the
// housekeeping). Picking Continue / New Game plays the machine (you crank it, a capsule drops and pops open),
// then the camera moves into the scene and the screen fades into the game. Wardrobe (or clicking yourself) turns the
// camera to you and opens the dressing room (src/dressing, or the old closet while that isn't there).
//
//   const menu = new TitleMenu(game, { lockInput(), onEnter(kind), openSettings(), openShare(mode) });
//   menu.update(dt) every frame while it is up (it ticks the world it shows and drives the camera)
//   menu.busy (a sequence or the dressing room), menu.leaving (on its way into the game)
//   menu.play('continue' | 'new')  menu.dispose() (hands the borrowed scene back)
import * as THREE from 'three';
import './menu.css';
import { audio } from '../core/audio.js';
import { stageDusk } from './stage.js';
import { MenuMachine } from './machine.js';
import { MenuCast } from './cast.js';
import { MenuLife } from './life.js';
import { MenuShot } from './shot.js';
import { MenuUI, confirmSlip } from './ui.js';
import { openCredits } from './credits.js';
import { claimItch, itchClaimed } from '../cosmetics/itch.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sfx = (n, o = {}) => { try { audio.init(); audio.play(n, o); } catch { /* audio not ready */ } };
// where things stand in the shot (the garage front is z ≈ 5.05..5.75, the lane's near walking line z = 7.3)
const MACHINE = { x: 1.15, z: 6.1, rotY: 0.6 };
const SPOTS = {
  me: { x: 1.75, z: 5.9, yaw: 0.42 },
  cat: { x: 3.1, y: 0.43, z: 5.5, yaw: -0.6 },
};
const WIRES = [
  // the coping along the top of the garage's false front (src/world/Town.js buildShopFront): a pigeons' ledge against
  // the sky (sag 0: a straight perch)
  { a: V(-4.3, 4.55, 5.14), b: V(4.3, 4.55, 5.14), sag: 0, at: [0.27, 0.33, 0.37, 0.56, 0.71] },
];
const MOTH = V(2.2, 3.6, 5.98); // just in front of and under the right lamp over the shutter, against the dark facade
const loadCloset = import.meta.glob('../ui/Closet.js'); // the old closet, if it's still in the tree

export class TitleMenu {
  constructor(game, opts = {}) {
    this.game = game;
    this.opts = opts;
    const g = game;
    this.stage = stageDusk(g);
    this.machine = new MenuMachine(g, MACHINE);
    this.cast = new MenuCast(g, SPOTS);
    this.cast.sleep = (t) => this.sleep(t);
    this.life = new MenuLife(g, { wires: WIRES, moth: MOTH });
    this.shot = new MenuShot(g);
    this.busy = false;
    g.held.anchor.visible = false;
    this.fade = document.getElementById('tm-fade') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'tm-fade' }));
    this.ui = new MenuUI(document.getElementById('title'), {
      onPick: (id) => this.pick(id),
      onHover: (id) => { this.cast.hover = id === 'wardrobe'; },
    });
    this.ui.setItems(this.items());
    // a little tag off the Wardrobe tag: follow the game on itch.io for a free Duck Head (until it's claimed)
    this.ui.setItch(!g.visiting && !itchClaimed(g), () => this.itch());
    // the pointer over the scene: you (hover = you look up and wave, the Wardrobe tag swings; click = the wardrobe)
    const canvas = g.renderer.renderer.domElement;
    this.canvas = canvas;
    const ndc = (e) => [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
    this.onMove = (e) => {
      if (this.busy || !this.idle()) { canvas.style.cursor = ''; return; }
      if (e.target?.closest?.('.tm-tag, .tm-itch, .panel, .tm-modal, .tm-credits')) return;
      const over = this.cast.pick(g.camera, ...ndc(e));
      if (over !== this.overMe) {
        this.overMe = over;
        canvas.style.cursor = over ? 'pointer' : '';
        if (e.pointerType !== 'touch') {
          this.cast.hover = over;
          const i = this.ui.tags.findIndex((t) => t.it.id === 'wardrobe');
          if (over && i >= 0) this.ui.setHot(i, true); else if (!over && this.ui.tags[this.ui.hot]?.it.id === 'wardrobe' && document.activeElement !== this.ui.tags[this.ui.hot].b) this.ui.setHot(-1);
        }
      }
    };
    this.onDown = (e) => { this.downAt = this.idle() && !this.busy ? { x: e.clientX, y: e.clientY, me: this.cast.pick(g.camera, ...ndc(e)) } : null; if (this.leaving) this.skip(); };
    this.onUp = (e) => {
      const d = this.downAt; this.downAt = null;
      if (!d?.me || this.busy || !this.idle()) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 30 || this.cast.pick(g.camera, ...ndc(e))) { sfx('uiClick', { vol: 0.6 }); this.wardrobe(); }
    };
    this.onKey = (e) => { if (this.leaving && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) this.skip(); };
    addEventListener('pointermove', this.onMove);
    addEventListener('pointerdown', this.onDown);
    addEventListener('pointerup', this.onUp);
    addEventListener('keydown', this.onKey);
    // a nudge for new players: you tell them they can click you
    this.hintT = g.state.flags?.closetSeen ? Infinity : 9;
    this.offAvatar = g.events?.on?.('avatar', (look) => { if (!this.closetOpen && !this.dressingOpen && !this.leaving) this.cast.build(look); });
    this.offItch = g.events?.on?.('itch', () => this.ui.setItch(false));
  }

  /** What's on the strand, from the save: Continue only once there's a shop to go back to. */
  items() {
    const g = this.game, st = g.state.story || {};
    const progress = !!(g.story?.done || st.intro);
    const visiting = !!g.visiting;
    this.progress = progress;
    const it = [];
    // (no icons: the type carries it. primary = the tall ticket; tier 3 = the short kraft tags)
    if (progress || visiting) it.push({ id: 'continue', label: visiting ? 'Visit Shop' : 'Continue', note: visiting ? '' : `DAY ${g.clock?.day ?? 1}`, sub: visiting ? "A FRIEND'S SHOP" : 'BACK TO THE GARAGE', primary: true });
    if (!visiting) it.push({ id: 'new', label: 'New Game', note: '¥100', sub: 'ONE COIN, ONE TURN', primary: !progress });
    it.push({ id: 'host', label: 'Host Shop' });
    it.push({ id: 'join', label: 'Join Friend' });
    if (!visiting) it.push({ id: 'wardrobe', label: 'Wardrobe' });
    it.push({ id: 'settings', label: 'Settings', tier: 3 });
    it.push({ id: 'credits', label: 'Credits', tier: 3 });
    return it;
  }

  /** The idle menu (no panel or overlay on top of it). */
  idle() {
    if (this.leaving || this.busy) return false;
    for (const id of ['pause', 'share']) { const el = document.getElementById(id); if (el && !el.classList.contains('hidden')) return false; }
    return !document.querySelector('.tm-modal, .tm-credits');
  }

  async pick(id) {
    if (this.leaving || this.busy) return;
    if (id === 'continue') this.play('continue');
    else if (id === 'new') {
      if (!this.progress) { this.play('new'); return; }
      this.ui.show(false);
      const yes = await confirmSlip({
        title: 'Start over?', yes: 'Tear it up', no: 'Keep my shop',
        body: `Your shop (day ${this.game.clock?.day ?? 1}) and everything in it will be torn up for good.`,
      });
      if (yes) { this.ui.stamp('new'); setTimeout(() => this.game.reset(), 350); return; }
      this.ui.show(true);
      this.ui.focus('new');
    } else if (id === 'host' || id === 'join') this.opts.openShare?.(id);
    else if (id === 'settings') this.opts.openSettings?.();
    else if (id === 'wardrobe') this.wardrobe();
    else if (id === 'credits') {
      this.ui.show(false);
      await openCredits();
      this.ui.show(true);
      this.ui.focus('credits');
    }
  }

  /** The itch tag: open the itch.io page in a new tab, the Duck Head goes into your wardrobe (with its unlock card). */
  itch() {
    if (this.leaving || this.busy) return;
    const got = claimItch(this.game);
    this.ui.setItch(false);
    if (got) this.cast.say('Quack! A duck head, for me?', 3);
  }

  /** Into the game: lock the pointer now (inside the click), stamp the tag, crank, the capsule, the camera move, fade. */
  async play(kind) {
    if (this.leaving) return;
    this.leaving = true;
    this.busy = true;
    this.kind = kind;
    const g = this.game;
    this.opts.lockInput?.();
    g.bubbles?.clear(this.cast.me);
    this.ui.stamp(kind);
    await this.sleep(0.28);
    this.ui.leave();
    const M = this.machine;
    // 1. push in on the machine and you while you crank it: from its front left, you in profile at the handle
    this.shot.move([{ pos: M.world(-0.8, 1.32, 3.0), look: M.world(0.28, 0.88, 0.1), fov: 46 }], 1.3);
    await this.cast.crank(M, 0.95);
    // 2. the capsule rolls out, pops open
    const cap = await M.dispense();
    await this.sleep(0.12);
    M.pop(cap);
    this.cast.cheer();
    await this.sleep(0.55);
    // 3. the camera moves into the scene: under the shutter into the lit garage (continue), or up the lane toward the
    // west bridge where the new story arrives (new game)
    const keys = kind === 'continue'
      ? [{ pos: V(0.9, 0.95, 7.2), look: V(0.2, 0.75, 4.4), fov: 50, at: 0.45 }, { pos: V(0.35, 0.82, 4.6), look: V(0.0, 1.0, 0.5), fov: 58, at: 1 }]
      : [{ pos: V(1.5, 1.7, 9.6), look: V(-8, 3.2, 9.4), fov: 48, at: 0.5 }, { pos: V(-2.5, 2.4, 9.6), look: V(-26, 4.6, 9.6), fov: 44, at: 1 }];
    const moved = this.shot.move(keys, 1.9);
    await this.sleep(1.25);
    this.fade.className = 'on';
    await Promise.race([moved, this.sleep(0.6)]);
    await this.sleep(0.42);
    this.opts.onEnter?.(kind);
  }

  /** Clicks / keys during the transition hurry it along. */
  skip() { this.shot.speed = 5; this.fast = true; }

  /** Wait in the menu's own time (frame time, sped up by skip()), so the sequence keeps step with the camera. */
  sleep(s) { return new Promise((r) => (this.waits ||= []).push({ t: s, r })); }

  /** The wardrobe: the camera turns to you, the dressing room opens; back to the shot when it closes. */
  async wardrobe() {
    if (this.busy || this.leaving) return;
    const g = this.game;
    if (g.visiting) { this.cast.say("My closet's at home!"); return; }
    this.busy = true;
    const f = g.state.flags || (g.state.flags = {});
    f.closetSeen = true; this.hintT = Infinity;
    g.bubbles?.clear(this.cast.me);
    this.ui.show(false);
    this.ui.el.classList.add('hide-all');
    this.cast.faceCamera(true);
    sfx('paper', { vol: 0.4 });
    const p = this.cast.me.root.position;
    if (g.dressing?.open) {
      // turn to you and close in (the dressing room fades up over this)
      await this.shot.move([{ pos: V(p.x + 1.15, 1.25, p.z + 2.0), look: V(p.x, 1.05, p.z), fov: 34, at: 1 }], 0.75);
      // (it draws on a canvas of its own and stops the game's frame while it covers the screen)
      this.dressingOpen = true;
      try { await g.dressing.open({ from: 'menu' }); } catch (e) { console.error('dressing room', e); }
      this.dressingOpen = false;
      this.cast.build(g.state.avatar);
    } else {
      // the old closet: you, framed in the part of the screen its panel leaves free
      const load = Object.values(loadCloset)[0];
      const mod = load ? await load() : null;
      if (mod?.Closet) {
        this.closet ||= new mod.Closet(g, this.cast);
        this.closetOpen = this.cast.closetOpen = true;
        const done = new Promise((r) => { this.cast.onClosetClosed = r; });
        this.closet.open();
        this.shot.move([this.closetFrame()], 0.9);
        this.onCloset = () => { if (this.closetOpen) this.shot.move([this.closetFrame()], 0.3); };
        addEventListener('resize', this.onCloset);
        await done;
        removeEventListener('resize', this.onCloset);
        this.closetOpen = false;
      }
    }
    this.cast.faceCamera(false);
    this.ui.el.classList.remove('hide-all');
    await this.shot.home(0.8);
    this.ui.show(true);
    this.busy = false;
  }

  /** The closet framing: you, full body, centred in the part of the screen the closet panel leaves free. */
  closetFrame() {
    const p = this.cast.me.root.position, W = innerWidth, H = innerHeight;
    const r = this.closet?.freeRect?.() || { x: 0, y: 0, w: W, h: H };
    const aspect = W / H, tanV = Math.tan(THREE.MathUtils.degToRad(17));
    const need = Math.max(1.3 / Math.max(0.3, r.h / H), 0.75 / (aspect * Math.max(0.25, r.w / W)));
    const dist = Math.max(2.4, Math.min(4.2, need / tanV));
    const dir = V(0.55, 0, 1).normalize();
    const pos = V(p.x, 1.15, p.z).addScaledVector(dir, dist);
    const cx = ((r.x + r.w / 2) / W) * 2 - 1, cy = 1 - ((r.y + r.h / 2) / H) * 2;
    const look = V(p.x, 1.0, p.z);
    const fwd = look.clone().sub(pos).normalize(), right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize();
    look.addScaledVector(right, -cx * dist * tanV * aspect).add(V(0, -cy * dist * tanV, 0));
    return { pos, look, fov: 34, at: 1 };
  }

  update(dt) {
    const g = this.game;
    const k = this.fast ? 5 : 1;
    // the world the shot shows (the menu never runs game.update: no player, no clock, no customers)
    g.time += dt;
    for (const m of g.machines) m.update(dt, g.time);
    g.garage.update(dt, g.time);
    g.street.update(dt, g.time);
    g.pedestrians?.update(dt);
    g.effects.update(dt, g.time);
    g.lighting.update(dt, g.time);
    g.tweens.update(dt);
    this.stage.update();
    // the pointer is locked for the game already: don't let the mouse wind the view up while the way in plays
    if (this.leaving && g.input?.mouse) { g.input.mouse.dx = 0; g.input.mouse.dy = 0; }
    if (this.waits?.length) this.waits = this.waits.filter((w) => ((w.t -= dt * k) > 0 ? true : (w.r(), false)));
    this.machine.update(dt * k);
    this.cast.update(dt * k, g.camera);
    this.shot.update(dt);
    this.life.update(dt, g.camera);
    // passers-by would walk right through the machine close-up: they step out of the shot while it plays
    const peds = g.pedestrians?.list;
    if (peds && (this.leaving || this.closetOpen || this.hidPeds)) {
      this.hidPeds = this.leaving || this.closetOpen;
      for (const q of peds) { const r = q.h?.root; if (!r) continue; r.visible = !this.hidPeds || !(r.position.x > -1.5 && r.position.x < 7.5 && r.position.z > 5.4 && r.position.z < 12.8); }
    }
    // new players: "Psst!" once in a while until they've opened the wardrobe
    if (this.idle() && this.hintT !== Infinity) {
      this.hintT -= dt;
      if (this.hintT < 0) { this.hintT = 24; this.cast.glance = 3.2; this.cast.say(document.body.classList.contains('touchmode') ? 'Psst! Tap me to change clothes!' : 'Psst! Click me to change clothes!', 3.4); }
    }
  }

  /** Hand the scene back (the stage is restored exactly) and take the menu's things away. */
  dispose() {
    removeEventListener('pointermove', this.onMove);
    removeEventListener('pointerdown', this.onDown);
    removeEventListener('pointerup', this.onUp);
    removeEventListener('keydown', this.onKey);
    this.offAvatar?.();
    this.offItch?.();
    if (this.onCloset) removeEventListener('resize', this.onCloset);
    if (this.hidPeds) for (const q of this.game.pedestrians?.list || []) if (q.h?.root) q.h.root.visible = true;
    this.closet?.dispose?.();
    this.cast.dispose();
    this.machine.dispose();
    this.life.dispose();
    this.ui.dispose();
    this.stage.restore();
    this.canvas.style.cursor = '';
  }
}
