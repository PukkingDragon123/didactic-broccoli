// People built ahead of time (performance): the body mesh, the whole painted atlas and its upload to the GPU happen in
// idle-time slices (src/core/idle.js) while the game runs, so whoever spawns the person later (the next passer-by)
// gets them finished, with nothing built or painted on that frame. The person is exactly the one createHuman() would
// make with the same arguments (same spec, same atlas); only when and where the work happens differs.
//   prebuildHuman({ preset, seed, height }, renderer?)   start building in the background (no-op when already queued)
//   humanReady(opts) -> bool                           finished?
//   takeHuman(opts) -> Human | null                    the finished person (null when it isn't ready: build as before)
//   dropHuman(opts)                                    forget one that won't be needed
import { Human } from './Human.js';
import { makeSpec, streetPreset } from './presets.js';
import { buildPlan } from './body.js';
import { buildMesh } from './mesh.js';
import { idleJob } from '../core/idle.js';
import { buildGear } from './gear.js';

const keyOf = ({ preset, seed = 1, height }) => `${preset || ''}|${seed}|${height ?? ''}`;
const jobs = new Map(); // key -> IdleJob (its value: the Human)

function* build({ preset, seed = 1, height }, renderer) {
  // the same spec as createHuman({ preset, seed, height })
  const spec = makeSpec(preset || streetPreset(seed), seed, height);
  const plan = buildPlan(spec);
  yield;
  plan.gear = buildGear(plan);
  yield;
  const mesh = buildMesh(plan);
  yield;
  const h = new Human(spec, { prebuild: true, built: { plan, mesh } });
  yield;
  while (!h.stepPaint()) yield;
  // the atlas goes up to the GPU now rather than on the first frame they're drawn
  if (renderer?.initTexture) renderer.initTexture(h.tex);
  return h;
}

/** Start building this person in the background. renderer: a WebGLRenderer to upload their texture with. */
export function prebuildHuman(opts, renderer = null) {
  const k = keyOf(opts);
  if (!jobs.has(k)) jobs.set(k, idleJob(build(opts, renderer)));
}

export function humanReady(opts) { return !!jobs.get(keyOf(opts))?.done; }

/** The prebuilt person, or null if they're not finished (the half-built one is dropped: build them the usual way). */
export function takeHuman(opts) {
  const k = keyOf(opts), job = jobs.get(k);
  if (!job) return null;
  jobs.delete(k);
  if (job.done && job.value) return job.value;
  job.cancel();
  return null;
}

export function dropHuman(opts) {
  const k = keyOf(opts), job = jobs.get(k);
  if (!job) return;
  jobs.delete(k);
  if (job.done) job.value?.dispose(); else job.cancel();
}
