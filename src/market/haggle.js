// Talking to Off-Hobby sellers on Pichat: ask if it's still there, ask about flaws, haggle with offers and counter-
// offers (some answers are timed: "another buyer wants it, decide NOW"), then pay. Sellers have personalities:
// friendly, stubborn (lowball them and they stop talking to you), desperate, collectors who know their stuff, a kid
// whose mum says no, a grandma who types slowly and puts something extra in the box, chatty ones, and scammers who
// want you to pay "directly, no fees" (never do that).
//   mk.chat.open(listingId)        start / continue the conversation about a listing
//   mk.chat.scamVanish(order)      the "seller" of a parcel that never came goes quiet
import { seller, PERSONA, variantLines, GRADES } from './catalog.js';
import { marketState, nicePrice, yen, pick, whenText } from './util.js';

const SPEED = { grandma: [6, 10], kid: [1, 2.5], scammy: [0.8, 1.6], chatty: [1, 2], desperate: [1, 2.2] };
const delay = (s) => { const [a, b] = SPEED[s.pers] || [1.8, 3.6]; return a + Math.random() * (b - a); };

export function installHaggle(g, mk) {
  const S = marketState(g);
  const M = () => g.os?.messenger;
  const hooked = new Set();

  const thread = (s) => {
    const t = M().thread({ id: `oh_${s.id}`, name: s.name, avatar: s.look, kind: 'seller', about: `Off-Hobby seller from ${s.area}. ${s.blurb} Rating ${s.rating ? s.rating.toFixed(1) : 'none yet'} (${s.sales} sales).` });
    if (!hooked.has(t.id)) { hooked.add(t.id); t.onReply((v) => reply(s, t, v)); t.onText((txt) => text(s, t, txt)); }
    return t;
  };
  const neg = (s) => (S.sellers[s.id] ||= {});
  const listing = (s) => mk.get(neg(s).lid);

  function menu(s, l) {
    const n = neg(s), ask = n.ask ?? l.price;
    const out = [];
    if (!n.availAsked) out.push({ label: 'Is it still available?', value: 'avail' });
    if (!n.flawsAsked) out.push({ label: 'Any flaws I should know about?', value: 'flaws' });
    if (!n.angry && !n.deal) for (const k of [0.9, 0.75, 0.6]) { const v = nicePrice(ask * k); if (v < ask) out.push({ label: `Would you take ${yen(v)}?`, value: `offer:${v}` }); }
    out.push({ label: n.deal ? `Pay now (${yen(n.deal)})` : `I'll take it (${yen(ask)})`, value: `pay:${n.deal || ask}` });
    out.push({ label: 'Never mind', value: 'bye' });
    return out;
  }
  const post = (s, t, text, choices = null, extra = {}) => t.post({ text, delay: delay(s), choices, ...extra });

  const GREET = {
    friendly: (l) => `Hi! Thanks for your interest in the ${l.title}. Ask me anything!`,
    stubborn: (l) => `Yes. The ${l.title}. Price is in the listing.`,
    desperate: (l) => `HI!!! Yes!! The ${l.title}!! Still here!! Please make an offer!!`,
    scammy: (l) => `hello dear customer. ${l.title} is 100% genuine and in perfect condition. we can make a deal`,
    collector: (l) => `Good evening. The ${l.title} is from my own collection. What would you like to know?`,
    kid: (l) => `hi. its my ${l.title.toLowerCase()}. mom is helping me type`,
    grandma: (l) => `Hello dear. My grandson says somebody wrote about the ${l.title}. Is that you? How lovely.`,
    chatty: (l) => `Ooh hello!! The ${l.title}!! I found it in the strangest place, let me tell you sometime :)`,
  };

  mk.chat = {
    open(lid) {
      const l = mk.get(lid);
      if (!l || !g.os?.messenger) return false;
      const s = seller(g, l.seller), t = thread(s), n = neg(s);
      if (S.sellers[s.id]?.banned) { t.post({ from: 'system', text: 'This seller account has been suspended by Off-Hobby.' }); M().open(t.id); return true; }
      if (n.lid !== lid) { Object.assign(n, { lid, ask: l.price, deal: null, rounds: 0, flawsAsked: false, availAsked: false, angry: n.angry && n.angryLid === lid }); }
      t.post({ from: 'system', text: `Off-Hobby: about "${l.title}" (${yen(l.price)}). Never pay outside Off-Hobby.` });
      if (l.sold) post(s, t, l.soldTo === 'you' ? "You already bought it! It's on its way." : 'Sorry, it just sold!');
      else post(s, t, GREET[s.pers](l), menu(s, l));
      M().open(t.id);
      return true;
    },
    scamVanish(o) {
      const s = seller(g, o.seller);
      if (!g.os?.messenger) return;
      const t = thread(s);
      t.post({ text: pick(['...', 'parcel is coming. be patient', 'who is this']), delay: 1 });
      t.post({ from: 'system', text: `${s.name} has deleted their Off-Hobby account. If you paid for something, file a claim (My Off-Hobby > Orders).`, delay: 3 });
      g.os?.notify?.({ app: 'browser', title: 'Off-Hobby', body: `Your order "${o.title}" never shipped. File a claim within 3 days!`, icon: 'os_warn', news: true });
    },
  };

  function reply(s, t, v) {
    const l = listing(s), n = neg(s), P = PERSONA[s.pers];
    if (!l) return;
    if (v === 'bye') { post(s, t, pick(['No problem!', 'OK.', 'ok bye', 'Have a nice day!', 'Come back anytime.'])); return; }
    if (l.sold && !String(v).startsWith('direct')) { post(s, t, 'Sorry, it sold already!'); return; }
    if (v === 'avail') {
      n.availAsked = true;
      post(s, t, { friendly: 'Yes, still here!', stubborn: 'Yes. That is why the listing is up.', desperate: 'YES!!! Still here, nobody wants it, please!!', scammy: 'yes available. only 1 left. many people asking. pay fast', collector: 'It is.', kid: 'yes its still in my room', grandma: 'Oh yes, it is right here on the shelf next to the photos.', chatty: 'Yep yep!! Waiting for a good home :)' }[s.pers], menu(s, l));
      return;
    }
    if (v === 'flaws') {
      n.flawsAsked = true;
      const fl = [...(l.item.flaws || []), ...variantLines(l.item.variant)];
      let txt;
      if (s.pers === 'scammy') txt = 'no flaws. perfect. like new. 100% real';
      else if (!fl.length) txt = s.pers === 'collector' ? `Graded ${GRADES[l.item.grade]?.name || l.item.grade}. No flaws worth mentioning.` : 'None that I can see!';
      else if (P.honest < 0.95 && fl.length > 1) txt = `Just ${fl[0].toLowerCase()}. That's all.`;
      else txt = `${s.pers === 'kid' ? 'umm ' : ''}${fl.map((f) => f[0].toLowerCase() + f.slice(1)).join('; ')}.`;
      // honest sellers knock a little off for flaws you point out
      if (fl.length && s.pers !== 'scammy' && s.pers !== 'stubborn' && !n.deal) {
        const cut = nicePrice((n.ask ?? l.price) * (0.93 - Math.min(0.08, fl.length * 0.02)));
        if (cut < (n.ask ?? l.price)) { n.ask = cut; txt += ` Because of that I can do ${yen(cut)}.`; }
      }
      post(s, t, txt, menu(s, l));
      return;
    }
    if (String(v).startsWith('offer:')) { offer(s, t, l, +String(v).slice(6)); return; }
    if (String(v).startsWith('counter:')) { const c = +String(v).slice(8); n.deal = c; post(s, t, pick(['Deal!', 'OK, deal.', 'Fine. Deal.', 'Yes!! Deal!!']), menu(s, l)); return; }
    if (v === 'scamgone') { l.sold = true; l.soldTo = 'someone'; post(s, t, 'too slow. other buyer paid. bye'); t.post({ from: 'system', text: `${s.name} went offline.`, delay: 5 }); return; }
    if (v === 'lost') { l.sold = true; l.soldTo = 'someone'; post(s, t, 'Too slow! The other buyer took it. Sorry!'); return; }
    if (String(v).startsWith('pay:')) { pay(s, t, l, +String(v).slice(4)); return; }
    if (String(v).startsWith('direct:')) {
      // the scam: money gone, no parcel, the account vanishes
      const amt = +String(v).slice(7);
      const ok = g.sim?.payDigital ? g.sim.payDigital(amt, `Bank transfer to "${s.name}"`) : g.spend(amt);
      if (!ok) { post(s, t, 'transfer fail?? u have no money??'); return; }
      S.stats.scammed++;
      l.sold = true; l.soldTo = 'someone';
      t.post({ text: 'thank you. item will ship tomorrow :)', delay: 1.5 });
      t.post({ from: 'system', text: `${s.name} has left Pichat. Payments made outside Off-Hobby can't be refunded.`, delay: 6 });
      setTimeout(() => t.block?.(), 9000);
      g.os?.achievements?.unlock('mkt_scammed');
      return;
    }
    if (v === 'safe') {
      // insisting on paying through Off-Hobby: the scammer either gives up or plays along (and ships a brick)
      if (Math.random() < 0.5) { post(s, t, 'no off-hobby. bank only. ok bye'); t.post({ from: 'system', text: `${s.name} went offline.`, delay: 4 }); l.sold = true; l.soldTo = 'someone'; }
      else post(s, t, 'ok ok. pay with off-hobby then', [{ label: `Pay through Off-Hobby (${yen(n.deal || l.price)})`, value: `pay:${n.deal || l.price}` }, { label: 'Actually, no', value: 'bye' }]);
      return;
    }
    if (v === 'report') {
      (S.sellers[s.id] ||= {}).banned = true;
      l.sold = true; l.soldTo = 'banned';
      t.post({ from: 'system', text: `You reported ${s.name}. The Off-Hobby Safety Team suspended the account. Thank you!` });
      t.block?.();
      g.os?.achievements?.unlock('mkt_scam_spotter');
    }
  }

  function offer(s, t, l, v) {
    const n = neg(s), P = PERSONA[s.pers];
    n.rounds = (n.rounds || 0) + 1;
    S.stats.haggled++;
    const ask = n.ask ?? l.price;
    if (s.pers === 'scammy') {
      n.deal = v;
      post(s, t, `ok ${yen(v)} deal!! but pay me direct by bank transfer, no off-hobby fee, cheaper for both of us. hurry other buyer waiting`, [
        { label: `Pay ${yen(v)} by direct transfer`, value: `direct:${v}` }, { label: 'Only through Off-Hobby', value: 'safe' }, { label: 'Report this seller', value: 'report' },
      ], { qte: { seconds: 7, timeout: 'scamgone' } });
      return;
    }
    const floor = l.price * P.floor * (0.97 + ((l.seed % 7) / 100));
    if (v >= floor) {
      n.deal = v;
      post(s, t, { friendly: `${yen(v)}? Sure, deal!`, stubborn: `...Fine. ${yen(v)}.`, desperate: `YES. ${yen(v)}. Thank you thank you.`, collector: `${yen(v)} is acceptable.`, kid: `ok!! ${yen(v)}!! mom says ok`, grandma: `${yen(v)}? Of course, dear. I'll put something extra in the box.`, chatty: `Deal!! ${yen(v)}!! :D` }[s.pers] || 'Deal!', menu(s, l));
      return;
    }
    if (v < floor * 0.75 || (s.pers === 'stubborn' && v < floor * 0.9)) {
      if (s.pers === 'stubborn') { n.angry = true; n.angryLid = l.id; post(s, t, `${yen(v)}? Lowballer. The price is ${yen(l.price)}, take it or leave it.`, menu(s, l)); return; }
      if (s.pers === 'kid') { post(s, t, 'MOM SAYS NO. thats too cheap she says', menu(s, l)); return; }
      const c = nicePrice(Math.max(floor, (ask + floor) / 2));
      post(s, t, `${yen(v)} is too low. Best I can do is ${yen(c)}.`, [{ label: `OK, ${yen(c)}`, value: `counter:${c}` }, ...menu(s, l).filter((x) => !String(x.value).startsWith('offer'))]);
      n.ask = c;
      return;
    }
    // close: a counter-offer, sometimes with a hurry-up
    const c = nicePrice(Math.max(floor, (v + ask) / 2));
    n.ask = c;
    const hurry = n.rounds >= 2 || Math.random() < 0.35;
    if (hurry) {
      post(s, t, `Somebody else just offered ${yen(nicePrice(c * 0.98))}! Give me ${yen(c)} right now and it's yours.`, [{ label: `Deal, ${yen(c)}!`, value: `counter:${c}` }, { label: 'Let them have it', value: 'bye' }], { qte: { seconds: 6, timeout: 'lost' } });
    } else post(s, t, `Hmm... meet me in the middle? ${yen(c)}.`, [{ label: `OK, ${yen(c)}`, value: `counter:${c}` }, ...menu(s, l).filter((x) => !String(x.value).startsWith('offer'))]);
  }

  function pay(s, t, l, amt) {
    const r = mk.buy(l, amt, amt < l.price ? 'haggle' : 'buy');
    const n = neg(s);
    if (!r.ok) { post(s, t, r.msg.includes('bank') ? "Hmm, the payment didn't go through. Not enough in the bank?" : r.msg, menu(s, l)); return; }
    n.deal = null; n.lid = null;
    (S.sellers[s.id] ||= {}).deals = (S.sellers[s.id].deals || 0) + 1;
    const when = whenText(g, r.order.eta);
    post(s, t, { friendly: `Payment received, thank you! Shipping today. The courier should bring it ${when}.`, stubborn: `Paid. Shipping. Arrives ${when}.`, desperate: `THANK YOU!!! shipping right now!! arrives ${when}!!`, scammy: `payment ok. ship soon. tracking number later`, collector: `Received. I'll pack it with care. Expect it ${when}.`, kid: `yay!!! mom is putting it in a box. it comes ${when}`, grandma: `Thank you dear. My grandson will take it to the post. It should come ${when}.`, chatty: `Yay!! Packing it with lots of bubble wrap!! Should be there ${when} :)` }[s.pers]);
  }

  function text(s, t, txt) {
    const l = listing(s);
    if (/scam|fake|real\?|legit/i.test(txt)) { post(s, t, s.pers === 'scammy' ? 'not scam. 100% real. trust' : 'Ha, it is real, I promise. Check my rating!'); return; }
    if (/discount|cheaper|lower|price/i.test(txt) && l && !l.sold) { post(s, t, 'Make me an offer!', menu(s, l)); return; }
    post(s, t, pick({ friendly: ['Haha, sure!', 'Thanks for asking!'], stubborn: ['...', 'Read the listing.'], desperate: ['please buy something', 'ok!!'], scammy: ['pay fast pls', 'ok'], collector: ['Indeed.', 'Quite.'], kid: ['lol', 'ok', 'mom says hi'], grandma: ['Oh my, you type so fast.', 'Is that so? How nice.'], chatty: ['Haha omg yes', 'Totally!! :)'] }[s.pers] || ['ok']));
  }

  // threads from earlier sessions: listen to their buttons again
  for (const id of Object.keys(g.os?.st?.msgr?.threads || {})) if (id.startsWith('oh_s')) thread(seller(g, id.slice(3)));
}
