// Side hustles. The neighbourhood notice board by the garbage station carries the lane's odd jobs as little paper
// flyers (and they come in on Pichat, the PC messenger, once the computer's on): walk Mrs. Sato's shiba, wash Mr.
// Tanaka's car, squeegee Mikawa-ya's windows, sweep the lane for the neighbourhood association. Take one by pulling
// its flyer off the board; it pays cash (and some XP) when it's done. A job can be done once a day (while the shop
// isn't open yet, again after a little while, so money for the first machine is always within reach).
//   jobs.active (the running job)   jobs.take(id)   jobs.goal() -> objective for the card   jobs.cancel()
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { formatYen } from '../core/util.js';
import { jobFlyerPix, boardPix } from './art.js';
import { DogWalk } from './jobs/dog.js';
import { CarWash } from './jobs/carwash.js';
import { WindowWash } from './jobs/windows.js';
import { StreetSweep } from './jobs/sweep.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const BOARD = { x: -5.05, z: 5.5 };
const OPENING_COOLDOWN = 150; // s of play before a job can be done again while the shop isn't open yet

export const JOBS = [
  { id: 'dog', title: 'DOG WALK', name: 'Walk Pochi the shiba', who: 'Mrs. Sato', pay: 1200, xp: 25, cls: DogWalk, msg: 'Could you walk Pochi for me today? My knees... She knows the way. ¥1,200 in the mailbox after.' },
  { id: 'car', title: 'CAR WASH', name: "Wash Mr. Tanaka's car", who: 'Mr. Tanaka', pay: 1500, xp: 30, cls: CarWash, msg: "My car's filthy and my back's gone. Bucket and sponge are by it. ¥1,500, cash." },
  { id: 'windows', title: 'WINDOWS', name: "Clean Mikawa-ya's windows", who: 'Mikawa-ya', pay: 1000, xp: 20, cls: WindowWash, msg: "Can't see out of my own shop windows. Squeegee's by the door. ¥1,000 and a ramune." },
  { id: 'street', title: 'CLEAN-UP', name: 'Sweep the lane', who: 'Neighbourhood Assoc.', pay: 900, xp: 20, cls: StreetSweep, msg: 'Lane clean-up! Petals and litter between the tunnels. Bring a broom. ¥900 from the association fund.', needs: 'broom' },
];
export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export class Jobs {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.s = life.s.jobs;
    this.active = null;
    this.flyers = new Map();
    this.buildBoard();
    this.refreshBoard();
    this.hookMessenger();
    game.events.on('newDay', () => { this.refreshBoard(); this.postOffers(); });
  }

  /** Can job `id` be taken right now? */
  available(id) {
    const g = this.game;
    if (this.active) return false;
    const day = g.clock?.day ?? 1;
    if (this.s.last[id] !== day) return true;
    // before the shop has opened: again after a little while
    return !g.story?.done && (g.state.playTime || 0) - (this.s.lastT[id] || 0) > OPENING_COOLDOWN;
  }

  // ------------------------------------------------------------------ the notice board
  buildBoard() {
    const g = this.game;
    const grp = new THREE.Group();
    grp.position.set(BOARD.x, 0, BOARD.z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.6, metalness: 0.2 });
    for (const x of [-0.48, 0.48]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.95, 0.07), wood); p.position.set(x, 0.975, 0); p.castShadow = true; grp.add(p); }
    const cork = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.66, 0.04), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: boardPix().texture(), roughness: 0.95 }), wood]);
    cork.position.set(0, 1.42, 0.02);
    cork.castShadow = true; cork.receiveShadow = true;
    grp.add(cork);
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.26), roof);
    r.position.set(0, 1.8, 0.06); r.rotation.x = -0.18; r.castShadow = true;
    grp.add(r);
    g.scene.add(grp);
    this.board = grp;
    g.player.addObstacle(BOARD.x - 0.55, BOARD.x + 0.55, BOARD.z - 0.08, BOARD.z + 0.08);
    // the board itself: what's on it / give up the job in hand
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(BOARD.x, 1.42, BOARD.z + 0.04);
    g.scene.add(hit);
    g.interaction.add(hit, {
      reach: 2.6,
      hint: () => {
        if (this.active) return { key: 'RMB', text: `On a job: ${this.active.def.name}`, sub: 'Right click to give it up' };
        const n = JOBS.filter((j) => this.available(j.id)).length;
        return { key: '', text: 'Neighbourhood notice board', sub: n ? `${n} odd job${n > 1 ? 's' : ''} pinned up` : 'No jobs right now. Check again tomorrow' };
      },
      use: () => false,
      alt: () => { if (this.active) this.cancel(); },
    });
    // the flyers, pinned in a row (made once, shown while the job's on offer)
    JOBS.forEach((J, i) => {
      const tex = jobFlyerPix(J.id, J.title, formatYen(J.pay)).texture();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      m.position.set(BOARD.x - 0.4 + (i % 3) * 0.19 + (i >= 3 ? 0.09 : 0), 1.52 - (i >= 3 ? 0.22 : 0) + (i % 2) * 0.02, BOARD.z + 0.046);
      m.rotation.z = (i % 2 ? -0.05 : 0.04);
      g.scene.add(m);
      this.flyers.set(J.id, m);
      g.interaction.add(m, {
        reach: 2.6,
        hint: () => {
          if (this.active) return null;
          const need = J.needs && !g.held.has(J.needs) ? ` · bring a ${J.needs}` : '';
          return { key: 'LMB', text: `Take the job: ${J.name}`, sub: `${J.who} · ${formatYen(J.pay)}${need}` };
        },
        use: () => { this.take(J.id); return false; },
      });
    });
  }

  refreshBoard() {
    for (const J of JOBS) { const m = this.flyers.get(J.id); if (m) m.visible = this.available(J.id) || this.active?.def.id === J.id; }
  }

  // ------------------------------------------------------------------ taking, finishing, giving up
  take(id) {
    const g = this.game, J = JOB_BY_ID[id];
    if (!J || this.active || !this.available(id)) return false;
    const job = new J.cls(g, this, J);
    this.active = job;
    const m = this.flyers.get(id);
    if (m) m.visible = false;
    audio.play('paper', { vol: 0.9 });
    g.fp?.live && g.fp.play('tap', 0.45, { at: g.fp.toAnchor(m?.getWorldPosition(V(0, 0, 0)) || g.camera.position, V(0, 0, 0)), hand: g.fp.freeHand() });
    job.start();
    g.news(`Job: ${J.name}`, `${J.who} · ${formatYen(J.pay)}`, 5000);
    g.guide?.pulse?.();
    g.save();
    return true;
  }

  /** The job is done: cash in hand, XP, the board updated. */
  finish(pay = this.active?.def.pay, at = null) {
    const g = this.game, job = this.active;
    if (!job) return;
    const J = job.def;
    job.dispose?.();
    this.active = null;
    g.addMoney(pay, false, `Job: ${J.name}`);
    g.progress?.addXP(J.xp, 'job');
    if (at) g.effects.coinBurst({ pos: at, count: 10, up: 1.4, spread: 0.5, life: 1.4 });
    this.s.done[J.id] = (this.s.done[J.id] || 0) + 1;
    this.s.last[J.id] = g.clock?.day ?? 1;
    this.s.lastT[J.id] = g.state.playTime || 0;
    this.s.earned += pay;
    this.s.count++;
    audio.play('register', { vol: 0.6 });
    audio.play('task', { vol: 0.6 });
    g.news(`${J.who}: thank you!`, `+${formatYen(pay)} for the job`, 5500);
    g.events.emit('jobDone', { id: J.id, pay });
    this.refreshBoard();
    g.save();
  }

  cancel() {
    const g = this.game, job = this.active;
    if (!job) return;
    job.dispose?.();
    this.active = null;
    this.refreshBoard();
    g.news('Job given up', `${job.def.who} will ask someone else`, 4000);
  }

  // ------------------------------------------------------------------ the messenger
  hookMessenger() {
    const os = this.game.os;
    if (!os?.messenger) return;
    this.thread = os.messenger.thread({ id: 'lane_board', name: 'Lane Notice Board', avatar: { bg: 0x2a5a3a }, kind: 'npc', about: 'Odd jobs from the neighbours' });
    this.thread.onReply((v) => {
      if (typeof v !== 'string' || !v.startsWith('job:')) return;
      const id = v.slice(4);
      if (this.take(id)) this.thread.post({ from: 'them', text: `Great! ${JOB_BY_ID[id].who} says thanks in advance.`, delay: 1.2 });
      else this.thread.post({ from: 'them', text: this.active ? 'Finish the job you are on first!' : 'Someone took that one already. Try again tomorrow.', delay: 1.2 });
    });
    if (!this.s.posted) this.postOffers();
  }

  postOffers() {
    const g = this.game;
    if (!this.thread) return;
    const day = g.clock?.day ?? 1;
    if (this.s.posted === day) return;
    this.s.posted = day;
    const open = JOBS.filter((j) => this.s.last[j.id] !== day);
    if (!open.length) return;
    const J = open[(day * 7) % open.length];
    this.thread.post({ from: 'them', text: `${J.who}: ${J.msg}`, choices: [{ label: "I'll do it", value: 'job:' + J.id }, { label: 'Not today', value: 'no' }], delay: 2 });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    if (this.active) this.active.update(dt);
    this.refreshT = (this.refreshT || 0) - dt;
    if (this.refreshT <= 0) { this.refreshT = 2; this.refreshBoard(); }
  }

  goal() { return this.active?.goal?.() || null; }
  toolHint(it) { return this.active?.toolHint?.(it) || null; }
}
