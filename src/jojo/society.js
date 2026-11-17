// The Sanchōme Pose Society: a bizarre little side story with two original eccentrics of the lane, who teach you
// poses (an affectionate homage to a certain manga's love of impossible stances; every character and line is
// original). They live on the lane like everyone else (src/npc/Lane.js: routines, memory, chats, quest markers).
//   Madame Kujaku   a retired revue star (the Hanamichi Revue, 1958-1979) with heart-shaped sunglasses and a fan;
//                   afternoons on the north pavement. Quest "A Lesson in Posture": strike three poses, then show her the
//                   Skyward Finger -> learn Picture Frame and Curtain Call.
//   Mr. Hidari      a tailor who sees angles everywhere (monocle, flat cap, a tape measure round the neck in spirit);
//                   mornings and late afternoons on the south pavement. Quest "The Tailor's Angles": pull a Bizarre
//                   Pose Club figure and bring it to him -> learn Grasp of Fate and The Coil.
//   Gōda Tetsuzan   the rival (src/jojo/rival.js). Quest "Showdown at the Shutter": beat him in a pose-off.
//   registerSociety(game, jojo)   adds them to the lane (once it exists) and defines the quests
import * as THREE from 'three';
import { makeCast, CAST } from './cast.js';
import { POSE_INFO } from './poses.js';
import { clearAt } from '../cinema/shots.js';
import { getItem } from '../data/series/index.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

/** Learn poses (with a banner-sized news line). */
export function learn(g, names) {
  const J = g.jojo;
  const fresh = names.filter((n) => !J.s.learned.includes(n));
  J.s.learned.push(...fresh);
  if (fresh.length) g.news?.(`New pose${fresh.length > 1 ? 's' : ''}: ${fresh.map((n) => POSE_INFO[n]?.name || n).join(', ')}`, 'Press V to strike a pose');
  g.save?.();
  return fresh;
}

const holdingBizarre = (g) => {
  const it = g.held?.item;
  return it?.kind === 'toy' && getItem(it.data?.key)?.series === 'bizarre';
};
const hasBizarre = (g) => Object.keys(g.state.discovered || {}).some((k) => getItem(k)?.series === 'bizarre');

// ------------------------------------------------------------------ Madame Kujaku
const KUJAKU = {
  id: 'jj_kujaku', name: 'Madame Kujaku', role: 'Retired revue star', stranger: 'the lady with the fan', color: CAST.kujaku.color,
  build: () => makeCast('kujaku'), voice: CAST.kujaku.voice, tts: { pitch: 1.3, rate: 0.95 }, speed: 0.85,
  door: [-25.5, 10.9], spots: [[-12.2, 13.95, Math.PI], [-14.6, 13.9, Math.PI], [-3.0, 13.95, Math.PI]],
  hours: [[13.5, 18.5, 'spot'], [18.5, 13.5, 'home']],
  lines: {
    idle: ['Posture, darling. POSTURE.', 'In 1962 I held the Curtain Call for eleven minutes. The audience wept. Then they went home.', 'The lane has no stage lights. I bring my own. (It is the sun.)', 'Every pose is a door. Most people never open one.', 'That tailor down the lane measures everything. Even compliments.', 'A spine is a promise, darling. Keep it.'],
    home: ['The curtain falls. Goodnight, darlings.', 'Exit, stage left.'],
    slapped: ['HOW DARE YOU. ...Do it again, the light was wrong.', 'I have been slapped by better. In 1971. By a TENOR.'],
    remember: ['You slapped me, darling. I put it in my memoirs.'],
    discover: ['Ooh. Hold it up. Higher. Let the lane SEE it.'],
  },
  setup(L, n) { n.poseT = rnd(8, 16); },
  idle(L, n, dt) {
    n.look = n.playerDist < 8 ? 'player' : null;
    if ((n.poseT -= dt) > 0) return;
    n.poseT = rnd(22, 40);
    if (n.playerDist < 14) {
      const p = pick(['pose_frame', 'pose_sweep', 'pose_lean', 'pose_tower']);
      n.gesture(p);
      L.game.jojo?.kana.spawn({ kind: 'go', at: n.h, n: 3, dur: 2.6, sound: n.playerDist < 8 });
      if (n.playerDist < 10) n.say(pick(['Ta-daa.', 'Hold... and BREATHE.', 'They don\'t make spines like this anymore.', 'For the cheap seats!']));
    }
  },
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    return { start: [
      ...(first ? [{ gesture: 'pose_sweep', say: 'Ah! A new face in the audience. Madame Kujaku, of the Hanamichi Revue. Retired. Undefeated.' }, 'The Sanchōme Pose Society is always looking for fresh spines.'] : [{ say: pick(['Darling.', 'The shopkeeper! Stand up straight.', 'Ah, my favourite pupil. My only pupil.']) }]),
      { if: () => !q?.isActive('jj_posture') && !q?.isDone('jj_posture'), then: 'offer' },
      { if: () => q?.isActive('jj_posture') && q.stepIndex('jj_posture') === 0, then: ['Three different poses, darling. Out here, where the lane can see you. Press V.'] },
      { if: () => q?.isActive('jj_posture') && q.stepIndex('jj_posture') === 1, then: ['Well? The Skyward Finger. Right here, in front of me. Point at the heavens like they owe you money.'] },
      { choose: [
        { text: 'Any tips?', then: [pick(['Power crushes Mystery. Mystery bewitches Grace. Grace outclasses Power. Learn it like your own phone number.', 'Never pose with your knees locked. Knees are where the drama lives.', 'If a man in yen-shaped sunglasses challenges you... answer his Power with Grace.', 'Look at the lens. Always the lens. Even when there is no lens.'])] },
        { text: 'Tell me about the Revue.', then: ['Twenty-one years. Three thousand curtain calls. One fire. Small fire. Mostly my fault.', 'We were the only revue in Tokyo with a pose for every emotion. Including "mild disappointment".'] },
        { text: 'Bravo, Madame.', rel: 1, then: [{ gesture: 'pose_frame', say: 'I KNOW.' }] },
      ], time: 10, timeout: 2 },
    ],
    offer: ['Tell me, little shopkeeper. Do you POSE?', { choose: [
      { text: 'All the time.', rel: 1, quest: 'jj_posture', then: ['Liar. A delightful liar. Prove it.', 'Strike three different poses where the lane can see you. Then show me the Skyward Finger. Press V, darling.'] },
      { text: 'Pose? Like... for photos?', quest: 'jj_posture', then: ['Photos. PHOTOS! Oh, you poor thing.', 'Three different poses, out here in the lane. Then the Skyward Finger, for me. Press V.'] },
    ], time: 10, timeout: 1 }] };
  },
};

// ------------------------------------------------------------------ Mr. Hidari
const HIDARI = {
  id: 'jj_hidari', name: 'Mr. Hidari', role: 'Tailor (angles)', stranger: 'the man with the monocle', color: CAST.hidari.color,
  build: () => makeCast('hidari'), voice: CAST.hidari.voice, tts: { pitch: 0.9, rate: 1.0 }, speed: 0.9,
  door: [25.5, 10.9], spots: [[8.7, 6.6, 0], [11.4, 6.6, 0], [-9.0, 6.6, 0], [6.6, 13.9, Math.PI]],
  hours: [[9.5, 12.5, 'spot'], [12.5, 15, 'wander'], [15, 17.5, 'spot'], [17.5, 9.5, 'home']],
  lines: {
    idle: ['Forty-five degrees. Always forty-five.', 'That lamppost leans one degree east. Unforgivable.', 'A sleeve is just an elbow\'s opinion.', 'Ninety degrees is a corner. One hundred and twelve is a STORY.', 'Madame Kujaku\'s left hip is three degrees proud. I have never told her.', 'Measure twice. Pose once.'],
    home: ['The shop closes at an angle. Good evening.', 'My tape measure is tired.'],
    slapped: ['Thirty degrees. Open palm. Sloppy follow-through.', 'Your wrist was bent. Do not slap me with a bent wrist.'],
    remember: ['You slapped me at a poor angle. I have not forgotten either.'],
    discover: ['Hold it still. ...The elbow. Look at that elbow.'],
  },
  setup(L, n) { n.measureT = rnd(6, 12); },
  idle(L, n, dt) {
    n.look = n.playerDist < 7 ? 'player' : null;
    if ((n.measureT -= dt) > 0) return;
    n.measureT = rnd(16, 30);
    n.gesture(pick(['think', 'point', 'pose_guard']));
    if (n.playerDist < 12) n.say(pick(n.def.lines.idle));
  },
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    return { start: [
      ...(first ? [{ gesture: 'think', say: 'Don\'t move. ...Your left shoulder sits two degrees lower than your right.' }, 'Hidari. Tailor. Forty years of sleeves. I see angles the way you see prices.'] : [{ say: pick(['Ah. The two-degree shoulder.', 'Good day. Your collar is folded at sixty. Acceptable.', 'Stand still. ...Fine. Hello.']) }]),
      { if: () => q?.isActive('jj_angles') && q.stepIndex('jj_angles') === 1 && holdingBizarre(g), then: 'measure' },
      { if: () => q?.isActive('jj_angles') && q.stepIndex('jj_angles') === 1, then: ['You have one? Hold it in your hand when you come, so I can see the elbow.'] },
      { if: () => q?.isActive('jj_angles') && q.stepIndex('jj_angles') === 0, then: ['A Bizarre Pose Club figure. From your capsule machines. I must measure one.'] },
      { if: () => !q?.isActive('jj_angles') && !q?.isDone('jj_angles'), then: 'offer' },
      { choose: [
        { text: 'Any tips?', then: [pick(['Your Grace poses are soft. Lift the elbow. Higher. There.', 'Mystery is in the twist. If your spine isn\'t complaining, it isn\'t Mystery.', 'Power is a straight line from the heel to the fingertip. Draw it.', 'That man from the station poses with his weight on his left foot. Every time. Watch for it.'])] },
        { text: 'Measure me.', then: [{ gesture: 'point', say: 'Elbow: ninety-four. Chin: eleven up. Spirit: rounding up to forty-five.' }] },
        { text: 'Good day, Mr. Hidari.', rel: 1, then: ['Good day. At a slight angle.'] },
      ], time: 10, timeout: 2 },
    ],
    offer: ['Those figures in your capsule machines. The Bizarre Pose Club. Have you SEEN their elbows?', 'I must measure one. For science. For sleeves.', { choose: [
      { text: 'I\'ll find you one.', rel: 1, quest: 'jj_angles', then: ['Good. Hold it in your hand when you bring it. I measure by eye.'] },
      { text: 'They\'re just toys.', quest: 'jj_angles', then: ['Toys are where the angles hide. Bring me one.'] },
    ], time: 10, timeout: 1 }],
    measure: ['That... that is it. Hold it still.', { gesture: 'point', say: 'A hundred and twelve degrees at the elbow. The wrist cocked back like a question. Magnificent. Wrong, but magnificent.' },
      { advance: 'jj_angles' }, { gesture: 'pose_coil', say: 'Now watch me. THIS is how a body should hold it.' }, 'You may keep the toy. I keep the angle.'] };
  },
};

export const QUESTS = [
  {
    id: 'jj_posture', title: 'A Lesson in Posture', giver: 'jj_kujaku', giverName: 'Madame Kujaku', color: CAST.kujaku.color,
    steps: [
      { text: 'Strike three different poses', sub: 'Press V for your poses', check: (g) => Object.keys(g.state.jojo?.seen || {}).length >= 3 },
      { text: 'Show Madame Kujaku the Skyward Finger', sub: 'Afternoons on the north side of the lane', on: 'pose', test: (p, g) => p?.name === 'pose_tower' && near(g, 'jj_kujaku', 8) },
    ],
    reward: { money: 1500, text: 'Learned: Picture Frame, Curtain Call', fn: (g) => learn(g, ['pose_frame', 'pose_sweep']) },
    onComplete: (g) => cheer(g, 'jj_kujaku', 'pose_sweep', 'MAGNIFICENT! Now you are dangerous. Take these: the Picture Frame and the Curtain Call.'),
  },
  {
    id: 'jj_angles', title: 'The Tailor\'s Angles', giver: 'jj_hidari', giverName: 'Mr. Hidari', color: CAST.hidari.color,
    steps: [
      { text: 'Pull a Bizarre Pose Club figure', sub: 'Any machine stocked with the series', check: (g) => hasBizarre(g) },
      { text: 'Hold it and show it to Mr. Hidari', sub: 'Mornings and late afternoons on the lane', talk: 'jj_hidari' },
    ],
    reward: { money: 2000, text: 'Learned: Grasp of Fate, The Coil', fn: (g) => learn(g, ['pose_reach', 'pose_coil']) },
  },
  {
    id: 'jj_rival', title: 'Showdown at the Shutter', giver: 'jj_goda', giverName: 'Gōda Tetsuzan', color: CAST.goda.color,
    steps: [{ text: 'Beat Gōda Tetsuzan in a pose-off', sub: 'He comes back in the afternoon every few days. Know a pose of every element', on: 'poseOff', test: (p) => p?.win }],
    reward: { money: 0, text: 'The whole lane talks about your spine' },
  },
];

function near(g, id, r) {
  const n = g.lane?.npc(id);
  if (!n?.present) return false;
  return Math.hypot(n.pos.x - g.player.pos.x, n.pos.z - g.player.pos.z) < r;
}
function cheer(g, id, pose, text) {
  const n = g.lane?.npc(id);
  if (!n?.present) return;
  n.gesture(pose);
  g.jojo?.kana.spawn({ kind: 'do', at: n.h, n: 3, dur: 2.8 });
  setTimeout(() => n.say(text, { dur: 5 }), 500);
}

/** Put the society on the lane (when the lane exists) and define their quests. */
export function registerSociety(g) {
  const SQ = g.sideQuests;
  if (SQ) for (const q of QUESTS) if (!SQ.get(q.id)) SQ.define(q);
  const L = g.lane;
  if (!L) return false;
  for (const d of [KUJAKU, HIDARI]) {
    if (L.byId[d.id] || L.pending.includes(d)) continue;
    // the first of their spots that is clear of everything you can bump into
    const sp = d.spots.find((s) => clearAt(g, s[0], s[1], 0.35)) || d.spots[0];
    d.spot = sp;
    L.pending.push(d);
  }
  return true;
}
export const SOCIETY = { KUJAKU, HIDARI };
void THREE;
