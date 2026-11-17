// The bizarre homage (src/jojo): pixel-art ゴゴゴ lettering in 3D, impact frames, more dramatic poses and the pose
// tags (V), the Sanchōme Pose Society on the lane, and Gōda Tetsuzan's pose-off. All original characters and poses.
// dbg.jojo: kana(kind, where), impact(opts), pose(name), npcPose(name), menu(), rival(), learnAll(), society(),
//           filter(name), state()
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { JoJo } from '../jojo/index.js';
import { learn } from '../jojo/society.js';
import { MENU_POSES } from '../jojo/pose.js';
import { freeShot } from '../cinema/shots.js';
import { createAvatarHuman } from '../people/avatar.js';

export function install(game) {
  const g = game;
  const J = g.jojo = new JoJo(g);
  Game.updaters.push((game, dt) => J.update(dt));
  setTimeout(() => {
    if (!g.debug) return;
    g.debug.jojo = {
      kana(kind = 'go', where = 'front', o = {}) {
        const cam = g.camera, p = new THREE.Vector3(0, 0, -2.2).applyQuaternion(cam.quaternion).add(cam.position);
        return J.kana.spawn({ kind, ...(where === 'screen' ? { screen: [0.5, 0.4] } : { at: p }), ...o });
      },
      impact(o = {}) { return J.impact.frame({ at: [0.5, 0.45], ...o }); },
      pose(name = 'pose_tower') { return J.pose(name); },
      /** Everyone on the lane within 12 m strikes a pose (or the given one). */
      npcPose(name = null) { const P = g.player.pos; let n = 0; for (const x of g.lane?.list || []) if (x.present && x.isHuman && x.pos.distanceTo(P) < 12) { x.gesture(name || MENU_POSES[n % 9]); n++; } return n; },
      menu() { J.menu.toggle(); return J.menu.open; },
      rival(now = true) { J.s.rival.done = false; return J.rival.start({ now }); },
      learnAll() { return learn(g, MENU_POSES); },
      society() { return { on: J.societyOn, npcs: ['jj_kujaku', 'jj_hidari'].map((id) => { const n = g.lane?.npc(id); return n ? [id, n.present, n.pos.toArray().map((v) => +v.toFixed(2)), n.def.spot] : [id, null]; }) }; },
      /** Bring a society member to a spot in front of you right now (for shots). */
      summon(id = 'jj_kujaku', dist = 2.4) {
        const n = g.lane?.npc(id); if (!n) return false;
        const P = g.player, x = P.pos.x - Math.sin(P.yaw) * dist, z = P.pos.z - Math.cos(P.yaw) * dist;
        n.setPresent?.(true); g.lane.tasks?.delete(n); n.place?.(new THREE.Vector3(x, 0, z), P.yaw); n.faceTo?.(P.pos); n.activity = 'debug'; return true;
      },
      filter(name = null) { J.impact.filter(name); return name; },
      /** Where the pose camera would stand for you now, and what's in the way. */
      shot() {
        const P = g.player, feet = new THREE.Vector3(P.pos.x, 0, P.pos.z), r = freeShot(g, feet, P.yaw + Math.PI);
        const near = (P.obstacles || []).filter((o) => o.enabled !== false && o.maxX > feet.x - 3 && o.minX < feet.x + 3 && o.maxZ > feet.z - 3 && o.minZ < feet.z + 3).map((o) => [o.minX, o.maxX, o.minZ, o.maxZ].map((v) => +v.toFixed(2)));
        return { pos: r.pos.toArray().map((v) => +v.toFixed(2)), angle: r.angle, dist: r.dist, near };
      },
      state() { return JSON.parse(JSON.stringify(J.s)); },
      /** Build a test person from an avatar look (named jojo-test-<i>) for the material audit. */
      build(look, i = 0) { const h = createAvatarHuman(look, { lazy: false }); h.finishPaint?.(); h.root.name = 'jojo-test-' + i; h.root.position.set(i * 0.8 - 2, 0, 10); g.scene.add(h.root); h.update(0.016, {}); return h.root.name; },
    };
  }, 0);
}
