// The lived-in clutter of your flat (#102): old toys on the shelves, the radio and the alarm clock by the futon, a game
// of shogi left on the tatami, the kitchen counter's rice cooker, kettle and dish rack, the getabako and slippers in the
// genkan, the closet's folded futon and toy box. Every piece is an imported hand-made model (src/data/props/home.js).
//   dressRoom(prop, R, ROOM, block) — called by src/room/build.js; prop(id, x, y, z, ry, s, name) as there
// Nothing here is interactive; it never sits on the furniture spots (Room.js spots) or in a walkway.
export function dressRoom(prop, R, ROOM, block) {
  const { x0, x1, z0, z1, zPart } = ROOM;
  const at = (id, x, y, z, ry = 0, s = 1) => prop(id, x, y, z, ry, s);

  // ---- the cube bookshelf against the partition (faces -z): books and old toys in its cubbies, more on top
  const bs = { x: x0 + 0.48, z: zPart - 0.26 };
  const cub = [-0.29, 0, 0.29], lev = [0.035, 0.335, 0.635];
  at('hm_books_stack', bs.x + cub[0], lev[0], bs.z, 0.1, 0.95);
  at('hm_robot_blue', bs.x + cub[1], lev[0], bs.z - 0.02, Math.PI + 0.25, 0.95);
  at('hm_books_old', bs.x + cub[2], lev[0], bs.z, Math.PI / 2, 0.85);
  at('hm_kendama', bs.x + cub[0], lev[1], bs.z - 0.02, 0.5);
  at('hm_kokeshi', bs.x + cub[0] + 0.08, lev[1], bs.z - 0.03, Math.PI, 0.9);
  at('hm_radio', bs.x + cub[1], lev[1], bs.z, Math.PI, 0.78);
  at('hm_robot_red', bs.x + cub[2], lev[1], bs.z - 0.02, Math.PI - 0.3, 0.95);
  at('hm_camera', bs.x + cub[0], lev[2], bs.z - 0.02, Math.PI + 0.4);
  at('hm_books_mags', bs.x + cub[1] + 0.02, lev[2], bs.z, Math.PI, 0.62);
  at('hm_music_box', bs.x + cub[2], lev[2], bs.z - 0.02, Math.PI - 0.2);
  at('hm_maneki', bs.x - 0.3, 0.915, bs.z, Math.PI + 0.2);
  at('hm_kokeshi_tall', bs.x + 0.32, 0.915, bs.z, Math.PI - 0.3);

  // ---- by the futon's head: an alarm clock, a stack of manga, the transistor radio, an old teddy
  const f = R.futon;
  at('hm_alarm_clock', f.x + 0.66, 0, f.z - 0.78, -0.5);
  at('hm_books_stack', f.x + 0.66, 0, f.z - 0.42, 0.4, 0.8);
  at('hm_radio_ussr', f.x + 0.68, 0, f.z - 0.05, -Math.PI / 2 + 0.2, 0.8);

  // ---- the desk: the alarm clock's brother, a pencil case, a camera, the little tin robot
  const dk = R.desk;
  at('hm_pencil_case', dk.x - 0.22, 0.72, dk.z + 0.12, -Math.PI / 2 + 0.3);
  at('hm_robot_teal', dk.x + 0.18, 0.72, dk.z - 0.42, -Math.PI / 2 - 0.4, 0.85);
  at('hm_camera2', dk.x - 0.18, 0.72, dk.z - 0.12, -Math.PI / 2 + 0.6);

  // ---- the TV corner: a robot on the set, the train on the floor (room_console), a record player by the rack
  at('hm_robot_blue', 0.97, 0.78, z0 + 0.22, -0.35, 0.8);
  at('hm_tape', 0.22, 0, z0 + 0.3, 0.3, 1);

  // ---- a game of shogi abandoned on the tatami, playing cards (menko) by the zabuton, the kendama
  at('hm_shogi', 0.88, 0, -0.95, 0.15, 1);
  at('hm_mahjong', 0.6, 0, -0.2, 0.7, 0.8);
  at('hm_kendama', 0.62, 0, -0.42, 2.1);
  at('hm_teapot', 0.38, 0.32, -0.56, 0.8, 0.95);
  at('hm_taiyaki', -0.05, 0.32, -0.5, 0.4, 1);

  // ---- the sofa: an old teddy in the corner, a cushion
  at('hm_teddy_old', x1 - 0.22, 0.34, -0.66, -Math.PI / 2 + 0.3, 0.9);

  // ---- the kitchen counter (room_kitchen, along the front wall, facing -z) and the fridge's top
  at('hm_ricecooker', 0.02, 0.9, z1 - 0.28, Math.PI + 0.2, 0.95);
  at('hm_dish_rack', 0.55, 0.9, z1 - 0.25, Math.PI);
  at('hm_teapot_enamel', 1.05, 0.9, z1 - 0.3, Math.PI - 0.4, 0.95);
  at('hm_toaster', 1.5, 1.42, z1 - 0.3, Math.PI + 0.2, 0.9);
  at('hm_thermos', -0.15, 0.9, z1 - 0.2, 0.3, 0.9);
  at('hm_sake', 1.28, 0.9, z1 - 0.2, 0.5, 0.9);

  // ---- the genkan: the getabako along the west wall, slippers waiting on the step
  at('hm_shoe_rack', x0 + 0.17, -0.12, 1.82, 0, 0.8);
  block(x0, x0 + 0.38, 1.4, 2.25);
  at('hm_slippers', -1.2, 0, 1.18, Math.PI, 0.95);

  // ---- the closet (oshiire, west wall): the spare futon folded on the shelf, the toy box and old books below
  const cx = x0 - 0.45, cz = -0.86;
  at('hm_futon_folded', cx, 0.86, cz, Math.PI / 2, 0.95);
  at('hm_toybox_small', cx, 0.0, cz, Math.PI / 2, 1.1);
  at('hm_books_old', cx + 0.05, 0.0, cz - 0.42, 0.3, 0.9);
  at('room_boxes', cx, 1.2, cz - 0.05, 0.2, 0.75);
}
