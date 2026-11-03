// Background work in small slices (performance). A job is a generator that yields between steps of a few ms each;
// jobs are stepped in the browser's idle time (requestIdleCallback), never starting a step that the time left before the
// next frame can't hold (each job learns how long its steps take). So building the next passer-by and the like never
// lands on the frame that needs it. A page that is never idle (a slow machine running flat out) still gets a short
// slice every IDLE_WAIT ms, and a browser without requestIdleCallback gets one on a timer.
//   const job = idleJob(gen, { onDone })   job.done, job.value (what the generator returned), job.cancel(),
//                                           job.finish() (runs the rest now and returns the value)
//   idleStats: { ms, slices }               time spent in slices so far (tools/perf.mjs --lane counts it per frame)
const IDLE_WAIT = 100; // ms: the longest a job waits for idle time before it gets a slice anyway
const FORCED = 2; // ms: the slice it gets then
const MAX_SLICE = 8; // ms: never more than this in one go, even when the browser offers a long idle period

export const idleStats = { ms: 0, slices: 0 };
const jobs = [];
let scheduled = false, lastStep = 0;

const hasIdle = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function';

function schedule() {
  if (scheduled || !jobs.length) return;
  scheduled = true;
  if (hasIdle) requestIdleCallback(run, { timeout: IDLE_WAIT });
  else setTimeout(() => run(null), 30);
}

function run(deadline) {
  scheduled = false;
  const t0 = performance.now();
  // (a fresh idle callback restarts its timeout: a job whose steps never fit the idle periods on offer is forced here)
  const forced = !deadline || deadline.didTimeout || t0 - lastStep > IDLE_WAIT;
  const budget = forced ? FORCED : Math.min(MAX_SLICE, deadline.timeRemaining());
  const end = t0 + budget;
  let stepped = false;
  while (jobs.length) {
    const job = jobs[0];
    const now = performance.now();
    // don't start a step that probably won't fit (but always make some progress in a forced slice)
    if (now + job.est > end && (stepped || !forced)) break;
    const a = now;
    let r;
    try { r = job.gen.next(); } catch (e) { console.warn('idle job', e); r = { done: true, value: undefined }; }
    const d = performance.now() - a;
    job.est = Math.max(d, job.est * 0.8); // the slowest recent step, decaying
    stepped = true;
    if (r.done) { jobs.shift(); job.complete(r.value); }
  }
  const spent = performance.now() - t0;
  if (stepped) { idleStats.ms += spent; idleStats.slices++; lastStep = performance.now(); }
  schedule();
}

class IdleJob {
  constructor(gen, opts) { this.gen = gen; this.est = 1; this.done = false; this.value = undefined; this.onDone = opts.onDone || null; }
  complete(v) { this.done = true; this.value = v; this.onDone?.(v); }
  cancel() {
    const i = jobs.indexOf(this);
    if (i >= 0) jobs.splice(i, 1);
    if (!this.done) { try { this.gen.return(); } catch { /* */ } }
    this.done = true;
  }
  /** Run what is left right now and return the generator's value. */
  finish() {
    if (this.done) return this.value;
    const i = jobs.indexOf(this);
    if (i >= 0) jobs.splice(i, 1);
    let r;
    do r = this.gen.next(); while (!r.done);
    this.complete(r.value);
    return this.value;
  }
}

/** Queue a generator to be stepped in idle time (first in, first out). */
export function idleJob(gen, opts = {}) {
  const job = new IdleJob(gen, opts);
  if (!jobs.length) lastStep = performance.now();
  jobs.push(job);
  schedule();
  return job;
}
