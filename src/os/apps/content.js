// What's on the computer when you first switch it on, and what keeps coming in: Mr. Daikoku's bulk deals (with
// haggling and a hurry-up timed choice), a prize scam bot you have to see through quickly, the neighbours, the
// welcome mails and a trickle of spam. Everything is posted once per save.
import { yen } from '../OS.js';
import { now } from '../time.js';
import { SERIES, SERIES_BY_ID } from '../../data/series/index.js';
import { capsuleCost } from '../../game/economy.js';

// contact pictures: real in-game people (src/os/avatars.js renders them); bg is the tile behind them
const AVA = {
  daikoku: { bg: 0xffd23f, person: { preset: 'shopkeeper', seed: 1971 } },
  tanaka: { bg: 0xe8d0f0 }, // her own model from the lane (src/npc/doors.js)
  okuyasu: { bg: 0xffc88a }, // the lane character
  bot: { bg: 0xff6f91, person: { preset: 'salaryman', seed: 5150 } }, // a stock photo of a smiling man in a suit
};

export function installContent(game, os) {
  const M = os.messenger, st = os.st;
  const flags = st.flags;
  const deal = st.deal ||= { stage: 'idle', series: null, n: 40, pct: 20, done: 0, haggled: false, last: 0 };

  // ================================================================== Mr. Daikoku, the wholesaler
  const dk = M.thread({ id: 'daikoku', name: 'Daikoku Toys', avatar: AVA.daikoku, kind: 'supplier', about: 'Daikoku Toy Wholesale, Asakusabashi. Capsule toys by the box since 1971. Sales manager: Mr. Daikoku. Tel. 03-3866-1971.' });
  const pickSeries = () => {
    const lic = (game.state.licenses || []).filter((id) => SERIES_BY_ID[id] && !SERIES_BY_ID[id].hidden);
    const pool = lic.length ? lic : SERIES.filter((s) => !s.hidden).slice(0, 1).map((s) => s.id);
    return pool[Math.floor(Math.random() * pool.length)];
  };
  const price = (pct) => Math.round(capsuleCost(deal.series) * deal.n * (1 - pct / 100) / 10) * 10;
  function offer(fromPhone = false, delay = null) {
    deal.series = pickSeries(); deal.n = 40; deal.pct = 20; deal.haggled = false; deal.stage = 'offer'; deal.last = now(game).day;
    const se = SERIES_BY_ID[deal.series];
    dk.post({ text: fromPhone ? `Here you are: ${deal.n} capsules of ${se.name}, ${deal.pct}% off list, ${yen(price(deal.pct))} delivered.` : `${deal.done ? 'Morning! Daikoku here.' : "Good afternoon. Daikoku, from Daikoku Toy Wholesale in Asakusabashi. Mikawa-san tells me Toku-san's garage has lights on again. I sold your grandfather his first box of capsules in 1971."} This week I have ${deal.n} capsules of ${se.name} at ${deal.pct}% off list: ${yen(price(deal.pct))}, delivered to your shutter.`,
      delay: delay ?? (fromPhone ? 2 : 1.5), choices: [{ label: `Order it (${yen(price(deal.pct))})`, value: 'yes' }, { label: 'Can you do better?', value: 'haggle' }, { label: 'No thanks', value: 'no' }] });
  }
  function buy(pct) {
    const se = SERIES_BY_ID[deal.series];
    if (!(game.state.licenses || []).includes(deal.series)) {
      dk.post({ text: `One problem: you don't have the distribution licence for ${se.name} yet. It's on our order desk, daikoku-toys.co.jp, under Capsules. Message me once it's through.`, delay: 2, choices: [{ label: 'I have the licence now', value: `retry${pct}` }, { label: 'Never mind', value: 'no' }] });
      return;
    }
    const p = price(pct);
    const ok = game.sim?.payDigital ? game.sim.payDigital(p, `Daikoku Toys: ${se.name} x${deal.n}`) : game.spend(p, `Daikoku Toys: ${se.name} x${deal.n}`);
    if (!ok) {
      dk.post({ text: `The bank turned the transfer down. You're ${yen(p - (os.bank?.balance?.() ?? game.state.money))} short. I'll hold the lot until tomorrow.`, delay: 2, choices: [{ label: 'Try again', value: `retry${pct}` }, { label: 'OK, another time', value: 'no' }] });
      return;
    }
    game.delivery?.order({ type: 'refill', series: deal.series, count: deal.n, label: `${se.name} x${deal.n}` });
    game.save?.();
    deal.stage = 'idle'; deal.done++;
    dk.post({ text: `Done. Lane Express will drop the box at your shutter this afternoon. ${pct >= 30 ? 'Keep that price between us.' : 'Thank you for the order.'}`, delay: 2 });
    os.achievements?.unlock('os_deal');
    if (pct >= 30) os.achievements?.unlock('os_haggler');
  }
  dk.onReply((v) => {
    if (v === 'yes') buy(20);
    else if (v === 'yes25') buy(25);
    else if (v === 'yes30') buy(30);
    else if (String(v).startsWith('retry')) buy(+String(v).slice(5) || 20);
    else if (v === 'haggle') {
      if (deal.haggled) { dk.post({ text: "That's as low as I go on this one.", delay: 1.5, choices: [{ label: `Fine, order it (${yen(price(20))})`, value: 'yes' }, { label: 'No thanks', value: 'no' }] }); return; }
      deal.haggled = true;
      dk.post({ text: `25% off, ${yen(price(25))}. But a shop in Kameari wants the same lot, so I need an answer now.`, delay: 2.5, qte: { seconds: 7, timeout: 'slow' },
        choices: [{ label: `Deal! (${yen(price(25))})`, value: 'yes25' }, { label: 'Make it 30% or nothing', value: 'push' }, { label: 'Pass', value: 'no' }] });
    } else if (v === 'push') {
      if (Math.random() < 0.5) dk.post({ text: `...All right. 30%, ${yen(price(30))}. Toku-san used to do this to me too.`, delay: 3, choices: [{ label: `Confirm order (${yen(price(30))})`, value: 'yes30' }, { label: 'Cancel', value: 'no' }] });
      else dk.post({ text: "No. 25%, or it goes to Kameari. Last chance.", delay: 2.5, qte: { seconds: 5, timeout: 'slow' }, choices: [{ label: `OK, 25% then (${yen(price(25))})`, value: 'yes25' }, { label: 'Forget it', value: 'no' }] });
    } else if (v === 'slow') {
      dk.post({ text: `Kameari took the 25% lot. I can still do the usual 20% off: ${yen(price(20))}.`, delay: 2, choices: [{ label: `Order at 20% (${yen(price(20))})`, value: 'yes' }, { label: 'No thanks', value: 'no' }] });
    } else if (v === 'no') {
      deal.stage = 'idle';
      dk.post({ text: "Understood. I'll message you when the next lot comes in.", delay: 2 });
    }
  });
  dk.onText((s) => {
    if (/deal|offer|capsule|buy|order/i.test(s) && deal.stage === 'idle') offer(true);
    else dk.post({ text: /price|cheap|discount/i.test(s) ? 'My prices are list minus whatever I can manage. Ask for a deal and I\'ll see what\'s in the warehouse.' : 'I\'m at the warehouse until six. Ask me for a deal any time.', delay: 2 });
  });
  os.content = { daikokuDeal: (fromPhone) => { if (deal.stage === 'offer' && dk.openChoice()) dk.post({ text: 'The offer I sent this morning is still open.', delay: 1 }); else offer(fromPhone); } };

  // ================================================================== the prize scam bot (spot it fast)
  const bot = M.thread({ id: 'prizebot', name: 'xX_PRIZE_CENTER_Xx', avatar: AVA.bot, kind: 'spam', about: 'Official Prize Center. Winners notified daily.' });
  bot.onReply((v) => {
    if (v === 'claim') bot.post({ text: 'GREAT!!! To release your prize please pay the processing fee of 500 YEN. HURRY, the offer expires in 5 SECONDS!!!', delay: 1.5, qte: { seconds: 5, timeout: 'late' }, choices: [{ label: 'Pay ¥500', value: 'pay' }, { label: 'Wait... this is a scam!', value: 'scam' }] });
    else if (v === 'pay') {
      if (game.spend(500, 'Prize Center Ltd. (Cayman)')) { bot.post({ text: 'THANK YOU!!! Your prize will be shipped in 6-8 weeks. Please do not contact us.', delay: 1.5 }); os.achievements?.unlock('os_sucker'); setTimeout(() => bot.block(), 6000); }
      else bot.post({ text: 'PAYMENT FAILED. Please check your account and try again.', delay: 1.5 });
    } else if (v === 'scam' || v === 'report') {
      bot.post({ from: 'system', text: 'You reported xX_PRIZE_CENTER_Xx as spam. Pichat will look into it.' });
      bot.block();
      os.achievements?.unlock('os_spam_spotter');
    } else if (v === 'late') bot.post({ text: 'PRIZE EXPIRED. You may be selected again in a future draw.', delay: 1 });
  });

  // ================================================================== the neighbours
  const tn = M.thread({ id: 'tanaka', name: 'Mrs. Tanaka', avatar: AVA.tanaka, kind: 'npc', about: 'Lives two doors down from the garage. Likes enka, gardening and grandchildren.' });
  const kenta = () => tn.post({ text: 'Before I forget. My grandson Kenta collects the Neko Cafe capsules. He has every one except the secret. If one ever turns up in your shop, would you tell me?', delay: 5, choices: [{ label: "I'll keep an eye out.", value: 'quest' }, { label: 'No promises', value: 'np' }] });
  tn.onReply((v) => {
    if (v === 'hi') { tn.post({ text: 'Hello, dear. I bring the rubbish out at seven, so I\'ll see you in the mornings. Come by for tea when you have a minute.', delay: 3 }); kenta(); }
    else if (v === 'radio') { tn.post({ text: 'No, no, it works. He fixed it every few weeks for thirty years, and it still works. I just liked the company.', delay: 3 }); kenta(); }
    else if (v === 'quest') { tn.post({ text: 'Thank you, dear. He\'ll be so pleased.', delay: 2 }); game.events.emit('os:quest', { id: 'tanaka_neko', from: 'tanaka', series: 'neko_cafe' }); }
    else if (v === 'np') tn.post({ text: "That's fine. Don't work too late.", delay: 2 });
  });
  tn.onText(() => tn.post({ text: ['Sorry, dear, I type with one finger.', 'Is that so? Well.', "Have you eaten? There's rice left from lunch.", 'The hydrangeas by my door are out. Come and look.'][Math.floor(Math.random() * 4)], delay: 3 + Math.random() * 3 }));

  const ok = M.thread({ id: 'okuyasu', name: 'Okuyasu', avatar: AVA.okuyasu, kind: 'npc', about: 'lives on the lane. josuke set this up for me' });
  ok.onReply((v) => {
    if (v === 'nobread') { ok.post({ text: 'oh', delay: 1.5 }); ok.post({ text: "ok. i'll still come and look. josuke says hi", delay: 4 }); }
    else if (v === 'maybe') { ok.post({ text: 'ok im coming over', delay: 1.5 }); ok.post({ text: 'josuke says you were joking. were you joking', delay: 5 }); }
  });
  ok.onText(() => ok.post({ text: ['huh?', 'ok', 'are u open tomorrow', 'josuke says not to message u while ur working. sorry', 'ok see u'][Math.floor(Math.random() * 5)], delay: 2 + Math.random() * 2 }));

  // ================================================================== first switch-on: the starter messages
  if (!flags.seeded) {
    flags.seeded = true;
    offer(false, 25);
    tn.post({ text: 'Is that you in the garage, dear? I saw the lights from my window. Your grandfather used to fix my radio for me.', delay: 40, choices: [{ label: 'Hello, Mrs. Tanaka!', value: 'hi' }, { label: 'Does it still need fixing?', value: 'radio' }] });
    bot.post({ text: 'CONGRATULATIONS!!! Your Pichat ID was SELECTED to win 1,000,000 YEN in the National Gacha Draw!!! Confirm NOW or the prize goes to the next winner!!!', delay: 90, qte: { seconds: 6, timeout: 'late' }, choices: [{ label: 'CLAIM PRIZE!!', value: 'claim' }, { label: 'Report as spam', value: 'report' }, { label: 'Ignore', value: 'late' }] });
    ok.post({ text: 'OI!! is the gacha garage open?? do u sell bread there???', delay: 160, choices: [{ label: "Capsule toys, sorry", value: 'nobread' }, { label: '...Maybe', value: 'maybe' }] });

    const mail = (m) => os.mail.send({ ...m, quiet: true });
    mail({ from: 'Capsule Systems', addr: 'welcome@capsule98.co.jp', subject: 'Welcome to Capsule 98!', body: 'Thank you for choosing Capsule 98 Second Edition.\n\nGetting started:\n - Double-click an icon on the desktop to start a program.\n - Drag a window by its title bar. Drag its edges to resize it.\n - Right-click for more options almost everywhere.\n - The clock on the taskbar shows the time. Double-click it for the Calendar.\n - Press Esc (or Start > Stand Up) to get up from the computer.\n\nVisit http://www.capsule98.co.jp/help for more tips.\n\nThe Capsule 98 Team' });
    mail({ from: 'Morio Shinkin Bank', addr: 'online@shinkin.or.jp', subject: 'Your online banking is ready', body: "Dear Customer,\n\nYour business account (No. 0042-1999-0777) has been transferred to your name, and Shinkin Online is now set up on your computer.\n\nWith Shinkin Online you can:\n - see your balance and statement\n - pay your bills\n - apply for a small business loan\n\nTelephone banking: 0193-62-1952\n\nMorio Shinkin Bank - your neighbourhood bank since 1952" });
    mail({ from: 'GACHA-MART', addr: 'news@gacha-mart.co.jp', subject: 'A little gift (and some news)', body: "Dear Shop Owner,\n\nWe heard the back-lane garage is opening again. Your grandfather was one of our first customers, back when we still sold by catalogue.\n\nSome news: after 25 years we have closed the GACHA-MART web store. New machines and capsules: Daikoku Toy Wholesale (http://www.daikoku-toys.co.jp/). Second-hand everything: Off-Hobby (http://www.off-hobby.jp/).\n\nAs a farewell gift, please accept the coupon attached to this mail. It's good for anything in your bank account.\n\nThe GACHA-MART Team", attachments: [{ name: 'welcome_coupon.cpn', kind: 'coupon', data: { yen: 300 } }] });
    for (const s of SPAM.slice(0, 5)) mail({ ...s, spam: true, kind: 'spam' });
  }

  // ================================================================== day by day: new deals, spam
  game.events.on('newDay', ({ day }) => {
    if (deal.stage === 'idle' && day - (deal.last || 0) >= 2) offer();
    if (Math.random() < 0.6) { const s = SPAM[Math.floor(Math.random() * SPAM.length)]; os.mail.send({ ...s, kind: 'spam', spam: Math.random() < 0.75, quiet: true }); }
  });
}

const SPAM = [
  { from: 'Prize Notification', addr: 'winner@free-gacha-prize.biz', subject: 'CONGRATURATIONS!!! U WIN', body: 'DEAR WINNER,\n\nYOUR E-MAIL ADDRESS HAS WON 1,000,000 YEN IN THE INTERNATIONAL GACHA LOTTERY!!!\n\nTo claim, visit http://www.free-gacha-prize.biz/ and pay the small processing fee.\n\nTHIS IS NOT A SCAM.' },
  { from: 'Capsule Enhancement', addr: 'bigger@capsule-plus.biz', subject: 'Make your capsules BIGGER', body: 'Shop owners! Our JUMBO capsule shells fit any standard machine and hold toys up to 80mm.\n\nMinimum order 5,000 shells. Payment in advance by postal transfer only.' },
  { from: 'Prince Kenichi of Osaka', addr: 'prince@royal-osaka.biz', subject: 'URGENT BUSINESS PROPOSAL', body: 'Dear Friend,\n\nI am the director of a toy import company in Osaka. A shipment worth 50,000,000 yen is held at customs and I need a trusted shop to receive it.\n\nPlease reply with your bank details and a handling fee of 30,000 yen. You will receive 30% of the goods.\n\nYours in trust,\nK. Nishimura' },
  { from: 'Friend Finder 2000', addr: 'meet@friendfinder-2000.biz', subject: 'Someone in Morio-cho wants to meet you', body: 'A member near you sent you a message!\n\nTo read it, register at http://www.friendfinder-2000.biz/ (registration fee 3,000 yen).' },
  { from: 'CapsuleCleaner 2000', addr: 'alert@pc-virus-alert.biz', subject: 'WARNING: Your PC has 386 viruses!!!', body: 'Our scan has detected 386 VIRUSES on your computer!!!\n\nDownload CapsuleCleaner 2000 now from the attachment to remove them.', attachments: [{ name: 'CLEANER2000.EXE', kind: 'virus' }] },
  { from: 'Kappa Collectibles', addr: 'sales@100percent-real.biz', subject: 'RARE kappa figure, 100% REAL not fake', body: 'RARE vintage kappa figure, 1960s, original paint!!! 100% genuine, not a reproduction.\n\nOnly 9,800 yen. Cash on delivery not possible. Postal money order only.' },
  { from: 'Lucky Mail', addr: 'chain@lucky-mail.jp', subject: 'FW: FW: FW: FW: lucky capsule!!', body: 'This is the LUCKY CAPSULE mail!!\n\nForward it to 5 friends within 10 minutes and your next pull will be a secret figure.\n\nA girl in Sendai did not forward it and lost her purse the same day.' },
  { from: 'Work From Home', addr: 'rich@yen-yen-yen.biz', subject: 'Earn 500,000 yen a week stuffing capsules!!', body: 'Earn BIG money at home putting toys in capsules!!\n\nNo experience needed. Send 5,000 yen for the starter kit and we will send work every week.' },
];
