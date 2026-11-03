// Buying and selling: the Off-Hobby second-hand marketplace (random listings with grades, flaws and funny variants;
// haggling with sellers on Pichat; selling your own figures with custom prices; auctions; KGS grading), the Daikoku Toys
// order desk that replaced GACHA-MART, and Gen-san's FREE CANDY van that brings every delivery and picks up what you
// ship. See src/market/*.js. Exposes game.market (the shop API) and game.courier (the van).
import * as THREE from 'three';
import { Courier } from '../market/courier.js';
import { installWorld, mktName } from '../market/world.js';
import { installOrders } from '../market/orders.js';
import { installHaggle } from '../market/haggle.js';
import { installSelling } from '../market/selling.js';
import { installGrading } from '../market/grading.js';
import { installSites } from '../market/site.js';
import { installSupplier } from '../market/supplier.js';
import { loadPrints } from '../market/thrift.js';
import { THRIFT } from '../market/catalog.js';
import { mktObject, itemObject as itemObjectFn } from '../market/models.js';
import { marketState, courierState, addBank } from '../market/util.js';

const ACH = [
  { id: 'mkt_first', name: 'Pre-loved', desc: 'Buy something on Off-Hobby.', icon: 'os_offhobby' },
  { id: 'mkt_haggler', name: 'Haggle Master', desc: 'Talk a seller down to 70% of their price or less.', icon: 'os_chat' },
  { id: 'mkt_misprint', name: 'Error Collector', desc: 'Buy a factory misprint.', icon: 'os_star' },
  { id: 'mkt_first_sale', name: 'Open for Business', desc: 'Sell something to a collector on Off-Hobby.', icon: 'os_cart' },
  { id: 'mkt_auction', name: 'Going, Going, Gone', desc: 'Win a collector auction.', icon: 'os_trophy' },
  { id: 'mkt_gem_mint', name: 'Gem Mint', desc: 'Get a perfect 10 from KGS.', icon: 'os_trophy' },
  { id: 'mkt_scam_spotter', name: 'Not Today', desc: 'Report a scammer on Off-Hobby.', icon: 'os_warn' },
  { id: 'mkt_scammed', name: 'Lesson Learned', desc: 'Get scammed. It happens to everyone once.', icon: 'os_error', hidden: true },
  { id: 'mkt_brick', name: "It's a Brick", desc: 'Unbox a brick wrapped in newspaper.', icon: 'os_error', hidden: true },
  { id: 'mkt_sweet_tooth', name: 'Sweet Tooth', desc: "Eat ten of Gen-san's free candies.", icon: 'os_star' },
];

export function install(game) {
  const g = game;
  const mk = g.market = { state: marketState(g) };
  installOrders(g, mk);
  installWorld(g, mk);
  if (g.os?.messenger) installHaggle(g, mk); else mk.chat = { open: () => false, scamVanish: () => {} };
  installSelling(g, mk);
  installGrading(g, mk);
  installSites(g, mk);
  installSupplier(g, mk);
  g.courier = new Courier(g);
  g.constructor.updaters.push((gg, dt) => { if (gg.timeStop?.frozen) return; gg.courier.update(dt); mk.tick?.(); });
  for (const a of ACH) g.os?.achievements?.define(a);
  g.os?.codex?.person({ id: 'gensan', name: 'Gen-san', role: 'Lane Express courier', look: { bg: 0xff9ab8, hair: 'short', hairCol: 0xc4c0ba, cap: true, capCol: 0xe45478, glasses: 0x5a4a3a, beard: null, shirt: 0xece4d2, mouth: 'grin' }, desc: 'Genzo, "Gen-san". Has driven the lane since 1979 in a van that says FREE CANDY (he bought it from a sweets wholesaler and never repainted it). Always has a candy for you.', met: () => !!courierState(g).met });
  mk.refresh();

  // thrift tees you own get their photo prints (the avatar rebuilds once they've loaded)
  const owned = new Set(g.state.avatar?.owned || []);
  const mine = THRIFT.filter((t) => t.photo && owned.has(t.id)).map((t) => t.id);
  if (mine.length) loadPrints(mine).then(() => g.events.emit('avatar'));
  setTimeout(() => loadPrints(), 8000); // the rest, quietly, for listing photos and the folded tees

  // the hotbar knows market things
  const HB = g.hotbar;
  if (HB) {
    const icon0 = HB.iconFor.bind(HB), name0 = HB.nameFor.bind(HB), cache = new Map();
    HB.iconFor = (it) => {
      if (it?.kind !== 'mkt') return icon0(it);
      const k = JSON.stringify([it.data.t, it.data.id, it.data.cid, it.data.key, it.data.score]);
      if (!cache.has(k)) { try { cache.set(k, g.thumbs.renderObject(mktObject(g, it.data), 64, { side: 0.5, up: 0.3 }).toDataURL()); } catch { cache.set(k, ''); } }
      return cache.get(k);
    };
    HB.nameFor = (it) => (it?.kind === 'mkt' ? mktName(it.data) : name0(it));
    HB.refresh?.(false);
  }

  // debug / test helpers
  g.marketDebug = {
    summon: () => g.courier.summon(),
    /** Buy the first open listing of a category (money added first). */
    buy(cat = 'figures', i = 0) { mk.refresh(); const l = mk.listings(cat).filter((x) => !x.sold && !x.auction)[i]; if (!l) return null; addBank(g, l.price + 100, 'test'); return mk.buy(l); },
    bank: (v) => addBank(g, v, 'test'),
    /** A parcel straight into your hands. */
    parcel(contents = null) {
      const d = { type: 'parcel', size: 'M', from: 'Off-Hobby', label: 'Test parcel', contents: contents || [{ kind: 'toy', d: { key: 'mochi/shiba', finish: 'normal', variant: { stickers: [{ id: 'star', u: 0.5, v: 0.5, rot: 0.2, s: 1 }], doodle: 'moustache' } } }, { kind: 'mkt', d: { t: 'charm', id: 'maneki_black', grade: 'A' } }] };
      const m = g.delivery.meshFor(d);
      m.position.copy(g.camera.getWorldPosition(new THREE.Vector3()));
      g.scene.add(m);
      return g.held.take('box', d, m);
    },
    state: () => ({ listings: mk.state.listings.length, orders: mk.state.orders.length, mine: mk.state.mine.length, ship: mk.state.ship.length, queue: g.delivery.queue.length, courier: courierState(g), busy: g.courier.busy }),
    /** Product shots of item descriptors in a grid over the page (screenshots of variants). */
    studio(items, size = 200) {
      const old = document.getElementById('mkt-studio');
      old?.remove();
      const box = document.createElement('div');
      box.id = 'mkt-studio';
      Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: 99999, background: '#2a2428', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', alignContent: 'flex-start' });
      for (const it of items) {
        const c = g.thumbs.renderObject(mktObjectOrItem(it), size, { side: it.side ?? 0.2, up: it.up ?? 0.15, outline: false });
        c.style.cssText = `width:${size}px;height:${size}px;image-rendering:pixelated;background:#e8e0d0`;
        box.append(c);
      }
      document.body.append(box);
      return items.length;
    },
  };
  const mktObjectOrItem = (it) => itemObjectFn(g, it);
}
