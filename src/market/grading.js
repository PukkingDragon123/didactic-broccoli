// KGS, the Kanto Grading Service: send a figure in (pay the fee, pack it in the OUTGOING crate, Gen-san takes it),
// wait a few days, and it comes back sealed in an acrylic slab with a grade from 1 to 10 (half points from 8.5). Fresh
// pulls usually grade high; scuffed second-hand ones don't; stickers and doodles count as "altered" (max 6); a
// misprint gets the ERROR label collectors pay extra for; a bootleg comes back ungraded with a polite letter.
//   mk.grading.submit(desc, tier) -> res;  mk.grading.jobs();  TIERS
import { getItem } from '../data/series/index.js';
import { marketState, nextId, stamp, today, yen, rint, whenText, wpick } from './util.js';
import { gradeWord } from './models.js';

export const TIERS = {
  economy: { name: 'Economy', days: 5, fee: 400 },
  standard: { name: 'Standard', days: 3, fee: 900 },
  express: { name: 'Express', days: 1, fee: 2500 },
};

export function installGrading(g, mk) {
  const S = marketState(g);
  S.grading ||= [];
  const api = mk.grading = {
    jobs: () => S.grading,
    submit(desc, tier = 'standard', extra = {}) {
      if (g.progress && !g.progress.unlocked('market:grading')) return { ok: false, msg: `Grading unlocks at shop level ${g.progress.levelFor('market:grading')}` };
      const T = TIERS[tier];
      if (!T) return { ok: false, msg: '?' };
      if (desc.kind !== 'toy') return { ok: false, msg: 'Only loose figures can be graded' };
      if (!mk.owned().some((e) => e.desc.kind === 'toy' && e.desc.key === desc.key && (e.desc.finish || 'normal') === (desc.finish || 'normal'))) return { ok: false, msg: "You don't have that figure free to send" };
      if (!(g.sim?.payDigital ? g.sim.payDigital(T.fee, `KGS grading (${T.name})`) : g.spend(T.fee))) return { ok: false, msg: `The fee is ${yen(T.fee)}: not enough in the bank` };
      const job = { id: nextId(S, 'k'), item: { kind: 'toy', key: desc.key, finish: desc.finish || 'normal' }, tier, status: 'topack', placed: stamp(g), cert: `${rint(10, 99)}${rint(100000, 999999)}`, ...extra };
      S.grading.unshift(job);
      S.ship.push({ id: nextId(S, 'p'), kind: 'grading', ref: job.id, item: { kind: 'toy', key: desc.key, finish: desc.finish || 'normal' }, buyer: 'KGS', status: 'topack', due: stamp(g) + 7 * 1440 });
      g.save();
      return { ok: true, msg: 'Submitted! Pack the figure in the OUTGOING crate for Gen-san.' };
    },
    onShipped(s) {
      if (s.kind !== 'grading') return;
      const job = S.grading.find((j) => j.id === s.ref);
      if (!job) return;
      job.status = 'grading';
      job.item.variant = s.item.variant || null;
      job.item.grade = s.item.grade || null;
      job.due = stamp(g) + TIERS[job.tier].days * 1440;
    },
  };

  /** The grade a figure gets (1-10; null = can't be graded). */
  function score(item) {
    const v = item.variant;
    if (v?.bootleg) return null;
    const base = { S: [[10, 1], [9.5, 3], [9, 4]], A: [[9.5, 1], [9, 3], [8.5, 3], [8, 2]], B: [[8, 2], [7, 3], [6, 2]], C: [[6, 2], [5, 3], [4, 2]], J: [[3, 2], [2, 2], [1, 1]] }[item.grade]
      || [[10, 1], [9.5, 3], [9, 4], [8.5, 3], [8, 2]]; // a fresh pull from your own machines
    let s = wpick(base);
    if (v?.faded) s = Math.min(s, 7);
    if (v?.stickers || v?.doodle || v?.signed || v?.stain) s = Math.min(s, 6);
    return s;
  }

  g.events.on('hour', () => {
    const now = stamp(g);
    for (const j of S.grading) {
      if (j.status !== 'grading' || now < j.due) continue;
      const s = score(j.item);
      const nm = getItem(j.item.key)?.name || 'your figure';
      j.score = s;
      j.status = 'returning';
      const contents = s === null
        ? [{ kind: 'toy', d: { key: j.item.key, finish: j.item.finish, variant: j.item.variant } }]
        : [{ kind: 'mkt', d: { t: 'slab', key: j.item.key, finish: j.item.finish, score: s, cert: `KGS ${j.cert}`, variant: j.item.variant || null, error: !!j.item.variant?.misprint } }];
      g.delivery.order({ type: 'parcel', size: 'S', from: 'KGS', label: s === null ? `${nm} (ungraded)` : `KGS ${s} ${nm}`, contents, grading: j.id }, { minutes: 40 + Math.random() * 60 });
      g.os?.mail?.send?.({ from: 'KGS Kanto Grading Service', addr: 'results@kgs-grading.jp', subject: s === null ? `We could not grade your ${nm}` : `Your grade: ${s} ${gradeWord(s)}`, body: s === null
        ? `Dear collector,\n\nOur graders examined your ${nm} (order ${j.cert}) and believe it is a counterfeit. We do not grade counterfeit items.\n\nIt is on its way back to you.\n\nKGS - every capsule tells the truth.`
        : `Dear collector,\n\nYour ${nm} (cert ${j.cert}) received a grade of\n\n   ${s}  ${gradeWord(s)}${j.item.variant?.misprint ? '  (ERROR / MISPRINT)' : ''}${j.item.variant && !j.item.variant.misprint && s <= 6 ? '\n   (altered: stickers or marker)' : ''}\n\nIt is sealed in a KGS slab and on its way back by courier.\n\nKGS - every capsule tells the truth.` });
      S.stats.graded++;
      if (s >= 10) g.os?.achievements?.unlock('mkt_gem_mint');
    }
  });
  g.events.on('courier', ({ phase, items }) => {
    if (phase !== 'drop') return;
    for (const d of items) { const j = d.grading && S.grading.find((x) => x.id === d.grading); if (j) j.status = 'done'; }
  });
  api.whenBack = (j) => (j.due ? whenText(g, j.due) : '');
  api.TIERS = TIERS;
  api.today = () => today(g);
}
