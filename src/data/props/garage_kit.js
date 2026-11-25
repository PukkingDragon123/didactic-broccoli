// Model-only props for the garage shop's structure, fittings and mess (src/world/garageMess.js): our own garage kit
// (art/lowpix/world/made/garage_kit.py, hand-painted, lowpix) and imported CC0 / CC BY models converted with lowpix
// (art/lowpix/world, credits in CREDITS.md / src/kit/lowpixWorld.js). Every one is drawn at the model's own metres;
// src/world/garageMess.js scales and turns each placement.
const M = (id) => ({ asset: { id: 'lowpix/world/' + id } });
const KIT = ['gk_joist', 'gk_hbeam', 'gk_column', 'gk_channel', 'gk_fluoro', 'gk_tube', 'gk_conduit', 'gk_knob', 'gk_jbox', 'gk_outlet',
  'gk_cordlamp', 'gk_switch', 'gk_toggle', 'gk_door', 'gk_doorframe', 'gk_window', 'gk_curtain', 'gk_lightbox', 'gk_lanterns', 'gk_plank',
  'gk_hookpole', 'gk_bin', 'gk_cordchanger'];
// the imported models the shop is dressed with: prop id -> lowpix world model
const MESS = {
  gm_desk: 'desk_office', gm_rack: 'shelf_steel', gm_power: 'power_box', gm_boxc: 'box_cardboard', gm_boxes: 'room_boxes',
  gm_carton: 'mk_snack_carton', gm_cbflat: 'cardboard_flat', gm_cbbundle: 'cardboard_bundle', gm_cbmess: 'cardboardmess',
  gm_junkbox: 'junk_box', gm_openbox: 'noodle_box', gm_crate: 'crate_plastic', gm_crate2: 'crate_plastic2', gm_cratew: 'crate_wood',
  gm_news: 'newspaper_stack', gm_paint: 'paint_tins', gm_ladder: 'ladder', gm_broom: 'broom', gm_broombin: 'broombin_own',
  gm_toolbox: 'toolbox', gm_jerry: 'jerrycan_plastic', gm_lpg: 'lpg_small', gm_buckets: 'wash_bucket', gm_trash: 'trash_jp',
  gm_wastebin: 'room_trash', gm_bag: 'trash_bag', gm_plasticbag: 'plastic_bag', gm_stool: 'stool_retro', gm_plant: 'plant_pot2',
  gm_plant_tall: 'plant_pot1', gm_cactus: 'cactus_pot', gm_planter: 'planter_clay', gm_register: 'cash_register', gm_cointray: 'cointray',
  gm_ledger: 'notebook_own', gm_books: 'books_old', gm_books2: 'books_stack', gm_mug: 'room_mug', gm_teaglass: 'tea_glass',
  gm_thermos: 'thermos', gm_clock: 'clock_alarm', gm_soroban: 'soroban', gm_fan: 'fan_floor', gm_radio: 'radio_ussr',
  gm_phone: 'phone_rotary', gm_maneki: 'manekineko', gm_daruma: 'daruma', gm_cupnoodle: 'room_cupnoodle', gm_paper: 'paper_crumpled',
  gm_rag: 'rag', gm_tubebox: 'tubebox', gm_batteries: 'batterypack', gm_spray: 'spray_bottle', gm_taperec: 'tape_recorder',
  gm_tv: 'tv_wood', gm_teddy: 'teddy', gm_teddy2: 'teddy2', gm_piggy: 'piggy_bank_c', gm_ashtray: 'mk_ashtray', gm_kettle: 'kettle',
  gm_watering: 'watering_can', gm_helmet: 'wear_hardhat', gm_typewriter: 'typewriter', gm_screwjars: 'screw_jars', gm_chochin: 'chochin',
  gm_boombox: 'boombox', gm_iron: 'iron_antique', gm_sewing: 'sewing_machine2', gm_clothes: 'clothes_folded', gm_milk: 'milkcarton',
  gm_puff: 'goodspuff', gm_noodlecup: 'goodsnoodle', gm_jar: 'mk_jar_pickle', gm_camera: 'camera_vintage', gm_toolchest: 'tool_chest',
  gm_cassette: 'cassette_player', gm_hanger: 'hanger_shirt', gm_binbags: 'bin_bags', gm_dustpan: 'dustpan', gm_bucketm: 'bucket',
};
const out = {};
for (const id of KIT) out[id] = M(id);
for (const [id, m] of Object.entries(MESS)) out[id] = M(m);
export default out;
