// Employees (src/staff/): the Inspired job site (post ads, read procedurally generated CVs with portraits rendered
// from each applicant's 3D look), interviews at the shop (game.talk), hired staff who come in for their shifts and do
// real work (restocking machines from cartons, sweeping, taking out the trash, greeting and selling, emptying coin
// boxes, packing Off-Hobby parcels, night patrols), wages every Friday, morale, requests, promotions and firing, the
// Staff Rota program on the PC. Odd applicants include a kappa, a tanuki, a ghost and a man who is not a ninja.
// Exposes game.staff (src/staff/Staff.js) and game.staffDebug (window.dbg.staff).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { Staff } from '../staff/Staff.js';
import { Worker } from '../staff/worker.js';
import { installInspired } from '../staff/site.js';
import { installRota } from '../staff/rota.js';
import { postOf } from '../staff/tasks.js';
import { HOURS, weekdayOf } from '../staff/data.js';

const ACH = [
  { id: 'staff_first', name: 'Boss', desc: 'Hire your first employee.', icon: 'os_inspired' },
  { id: 'staff_kappa', name: 'Water on the Payroll', desc: 'Hire a kappa.', icon: 'os_star' },
  { id: 'staff_weird', name: 'Unusual Staffing', desc: 'Employ two people who are... not entirely ordinary.', icon: 'os_trophy' },
  { id: 'staff_promote', name: 'Climbing the Ladder', desc: 'Promote someone.', icon: 'os_trophy' },
  { id: 'staff_fired', name: 'It\'s Not You, It\'s Me', desc: 'Let someone go.', icon: 'os_warn' },
  { id: 'staff_leaves', name: 'Leaf Money', desc: 'Have a customer paid their change in leaves.', icon: 'os_error', hidden: true },
];

export function install(game) {
  const g = game;
  if (g.staff) return;
  const staff = g.staff = new Staff(g);
  try { installInspired(g, staff); } catch (e) { console.warn('inspired site', e); }
  try { installRota(g, staff); } catch (e) { console.warn('staff rota', e); }
  for (const a of ACH) g.os?.achievements?.define(a);
  for (const r of staff.list()) { try { staff.codex(r); } catch { /* */ } }
  Game.updaters.push((gg, dt) => staff.update(dt));
  g.staffDebug = debug(g, staff);
  setTimeout(() => { if (g.debug) g.debug.staff = g.staffDebug; }, 0);
}

// ------------------------------------------------------------------ debug / test helpers (window.dbg.staff)
function debug(g, staff) {
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const D = {
    /** Shop level 10+ (Inspired opens) or a given level. */
    unlock(level = 10) { const P = g.progress; if (P && P.level < level) { P.s.level = level; P.s.xp = 0; } staff.checkUnlock(); return staff.slots(); },
    /** Post an ad (bank topped up first). */
    ad(role = 'restock', wage = 750, hours = 'day') { g.wallet?.addBank?.(1000, 'test'); return staff.postAd({ role, wage, hours }).ad?.id || null; },
    /** A new applicant (arch: 'kappa', 'tanuki', 'salaryman', 'gyaru', 'robokid', 'student', 'ninja', 'ghost' or 'local'). */
    applicant(arch = 'local', role = 'restock', hours = 'day') {
      let ad = staff.s.ads.find((a) => a.open && a.role === role);
      if (!ad) { ad = { id: `ad${staff.s.seq++}`, role, wage: 750, hours, posted: staff.stamp, until: staff.stamp + 5 * 1440, next: Infinity, n: 0, open: true }; staff.s.ads.unshift(ad); }
      return staff.newApplicant(ad, arch).id;
    },
    /** Invite someone to come in `min` in-game minutes from now. */
    invite(id, min = 0) { return staff.invite(id, staff.stamp + min); },
    /** Hire someone now (skipping the interview), on a job and shift that covers the current hour. */
    hire(id, role, hours) {
      const p = staff.applicant(id);
      if (!p) return null;
      p.status = 'interviewed';
      const h = g.clock?.hours ?? 12;
      hours ||= Object.keys(HOURS).find((k) => { const s = HOURS[k]; return s.from < s.to ? h >= s.from && h < s.to - 1 : h >= s.from || h < s.to - 1; }) || 'day';
      if (!staff.canHire()) D.unlock(Math.max(g.progress?.level || 1, staff.list().length >= 2 ? 24 : staff.list().length >= 1 ? 17 : 10));
      const r = staff.hire(id, { role, hours });
      const rec = staff.rec(id);
      if (rec) { rec.start = staff.day; rec.dayOff = (weekdayOf(staff.day) + 3) % 7; }
      return r;
    },
    /** Applicant + hire + standing at their post right now. */
    quick(arch = 'kappa', role = 'clean') {
      D.unlock(Math.max(g.progress?.level || 1, 10));
      const id = D.applicant(arch, role);
      D.hire(id, role);
      D.shift(id);
      return id;
    },
    /** Put a hired worker on shift at once, at their post (or at x, z). */
    shift(id, x, z, yaw) {
      const r = staff.rec(id);
      if (!r) return null;
      let w = staff.workers.get(id);
      if (!w) { w = new Worker(staff, r); staff.workers.set(id, w); }
      const [post, py] = postOf(r.role);
      const p = x === undefined ? post : V(x, z);
      if (!w.npc) w.spawn(p, yaw ?? py); else w.npc.place(p, yaw ?? py);
      w.npc.h.finishPaint?.();
      w.state = 'working';
      w.stopJob();
      return [p.x, p.z];
    },
    /** The applicant's visitor, waiting in the shop now (for an interview). */
    visit(id) {
      const p = staff.applicant(id);
      if (!p) return null;
      if (p.status !== 'invited') staff.invite(id, staff.stamp);
      p.lateBy = 0;
      if (!staff.visitors.get(id)) staff.comeIn(p);
      const v = staff.visitors.get(id);
      v.stopJob();
      v.npc.place(V(1.25, 2.9), Math.PI * 0.9);
      v.npc.h.finishPaint?.();
      v.state = 'waiting';
      return true;
    },
    /** Start the interview / chat with someone (async: use dbg.staff.run to let it play). */
    talk(id) { const w = staff.visitors.get(id) || staff.workers.get(id); if (w?.npc) staff.clicked(w); return !!w?.npc; },
    worker: (id) => staff.workers.get(id) || staff.visitors.get(id) || null,
    /** Empty capsules on the garage floor. */
    mess(n = 6) { for (let i = 0; i < n; i++) g.items.spawnShell?.(V(-1.6 + Math.random() * 3.2, 0.5 + Math.random() * 2.5).setY(0.2), { series: 'mochi' }); return g.shells?.list.size; },
    /** Empty a machine and leave a refill carton by the shutter. */
    empty(i = 0, series) {
      const m = g.machines[i];
      if (!m) return false;
      while (m.data.stock.length) m.takeCapsule();
      m.updateSoldOut?.();
      D.carton(series || m.data.series, 20);
      return true;
    },
    carton(series = 'mochi', count = 20, x = 1.6, z = 4.1) {
      const data = { type: 'refill', series, count, stage: 0, label: `x${count}` };
      return !!g.items.spawnBox(data, V(x, z), g.delivery.meshFor(data));
    },
    coins(i = 0, yen = 1500) { const m = g.machines[i]; if (!m) return 0; m.data.cash = yen; m.updateCoins?.(); return m.data.cash; },
    trash(n = 18) { const T = g.life?.trash; if (!T) return 0; T.s.trash.level = n; T.setFill?.(); return T.level; },
    dry(id, k = 0.15) { const r = staff.rec(id); if (!r) return null; r.dish = k; staff.workers.get(id)?.h?.staffRig?.setDish?.(k); return k; },
    /** Step the game while letting chats (async scripts) advance. */
    async run(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { g.debug?.step(dt, dt); for (let k = 0; k < 8; k++) await null; } },
    state() {
      return {
        level: g.progress?.level, slots: staff.slots(), ads: staff.s.ads.length,
        applicants: staff.s.applicants.map((p) => [p.id, p.arch, p.name, p.status]),
        staff: staff.list().map((r) => { const w = staff.workers.get(r.id); return [r.id, r.arch, r.role, r.hours, Math.round(r.morale), w?.state, w?.job?.kind || w?.mood?.label || null, w?.npc ? [+w.npc.pos.x.toFixed(2), +w.npc.pos.z.toFixed(2)] : null]; }),
      };
    },
  };
  return D;
}
