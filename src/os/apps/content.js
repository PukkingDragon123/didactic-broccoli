// What's on the computer when you first switch it on, and what keeps coming in: Mr. Daikoku's bulk deals (with
// haggling and a hurry-up timed choice), a prize scam bot you have to see through quickly, the neighbours, the
// welcome mails and Grandpa's letter, and a trickle of spam. Everything is posted once per save.
import { yen } from '../OS.js';
import { now } from '../time.js';
import { SERIES, SERIES_BY_ID } from '../../data/series/index.js';
import { capsuleCost } from '../../game/economy.js';

const AVA = {
  daikoku: { bg: 0xffd23f, hair: 'bald', glasses: 0x2a2220, mouth: 'grin', shirt: 0x2a5aa8 },
  tanaka: { bg: 0xe8d0f0, hair: 'bun', hairCol: 0xb8b0b8, shirt: 0x8a6ab0, blush: true },
  okuyasu: { bg: 0xffc88a, hair: 'short', hairCol: 0x5a4a3a, shirt: 0x1a2a6a, mark: true, mouth: 'o' },
  bot: { robot: true, bg: 0xff6f91, eye: 0xffd23f },
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
    dk.post({ text: fromPhone ? `As promised! ${deal.n} capsules of ${se.name}, ${deal.pct}% off the list price: ${yen(price(deal.pct))} delivered.` : `${deal.done ? 'Hello again, my favourite gacha shop!' : "Hello! Daikoku Toy Wholesale here. Heard Grandpa's garage is open again, wonderful news!"} This week's special: ${deal.n} capsules of ${se.name} at ${deal.pct}% off list. That's ${yen(price(deal.pct))}, delivered to your shutter.`,
      delay: delay ?? (fromPhone ? 2 : 1.5), choices: [{ label: `Order it (${yen(price(deal.pct))})`, value: 'yes' }, { label: 'Can you do better?', value: 'haggle' }, { label: 'No thanks', value: 'no' }] });
  }
  function buy(pct) {
    const se = SERIES_BY_ID[deal.series];
    if (!(game.state.licenses || []).includes(deal.series)) {
      dk.post({ text: `Ah, wait. My records say your shop has no distribution licence for ${se.name}. You can get one on our order desk (daikoku-toys.co.jp, the Capsules page). Tell me when you have it!`, delay: 2, choices: [{ label: 'I have the licence now', value: `retry${pct}` }, { label: 'Never mind', value: 'no' }] });
      return;
    }
    const p = price(pct);
    const ok = game.sim?.payDigital ? game.sim.payDigital(p, `Daikoku Toys: ${se.name} x${deal.n}`) : game.spend(p, `Daikoku Toys: ${se.name} x${deal.n}`);
    if (!ok) {
      dk.post({ text: `Hmm, the bank says the transfer didn't go through. You're ${yen(p - (os.bank?.balance?.() ?? game.state.money))} short. Come back when the till is fuller, ha ha!`, delay: 2, choices: [{ label: 'Try again', value: `retry${pct}` }, { label: 'OK, another time', value: 'no' }] });
      return;
    }
    game.delivery?.order({ type: 'refill', series: deal.series, count: deal.n, label: `${se.name} x${deal.n}` });
    game.save?.();
    deal.stage = 'idle'; deal.done++;
    dk.post({ text: `Pleasure doing business! Lane Express will drop the box at your shutter shortly. ${pct >= 30 ? "Don't tell anyone about that price." : 'Come again!'}`, delay: 2 });
    os.achievements?.unlock('os_deal');
    if (pct >= 30) os.achievements?.unlock('os_haggler');
  }
  dk.onReply((v) => {
    if (v === 'yes') buy(20);
    else if (v === 'yes25') buy(25);
    else if (v === 'yes30') buy(30);
    else if (String(v).startsWith('retry')) buy(+String(v).slice(5) || 20);
    else if (v === 'haggle') {
      if (deal.haggled) { dk.post({ text: "That's already my best price, friend!", delay: 1.5, choices: [{ label: `Fine, order it (${yen(price(20))})`, value: 'yes' }, { label: 'No thanks', value: 'no' }] }); return; }
      deal.haggled = true;
      dk.post({ text: `Hmm... 25% off, ${yen(price(25))}. But only if you decide RIGHT NOW. Another shop is asking about the same lot!`, delay: 2.5, qte: { seconds: 7, timeout: 'slow' },
        choices: [{ label: `Deal! (${yen(price(25))})`, value: 'yes25' }, { label: 'Make it 30% or nothing', value: 'push' }, { label: 'Pass', value: 'no' }] });
    } else if (v === 'push') {
      if (Math.random() < 0.5) dk.post({ text: `Ugh... FINE. 30%, ${yen(price(30))}. You're your grandfather's grandkid, all right.`, delay: 3, choices: [{ label: `Confirm order (${yen(price(30))})`, value: 'yes30' }, { label: 'Cancel', value: 'no' }] });
      else dk.post({ text: "Ha! No. 25% or I sell it to the other shop. Last chance!", delay: 2.5, qte: { seconds: 5, timeout: 'slow' }, choices: [{ label: `OK, 25% then (${yen(price(25))})`, value: 'yes25' }, { label: 'Forget it', value: 'no' }] });
    } else if (v === 'slow') {
      dk.post({ text: `Too slow! The other shop took the 25% lot. My normal offer still stands: 20% off, ${yen(price(20))}.`, delay: 2, choices: [{ label: `Order at 20% (${yen(price(20))})`, value: 'yes' }, { label: 'No thanks', value: 'no' }] });
    } else if (v === 'no') {
      deal.stage = 'idle';
      dk.post({ text: "No problem! I'll message you when something good comes in.", delay: 2 });
    }
  });
  dk.onText((s) => {
    if (/deal|offer|capsule|buy|order/i.test(s) && deal.stage === 'idle') offer(true);
    else dk.post({ text: /price|cheap|discount/i.test(s) ? 'Prices? Always fair. Mostly fair. Ha ha!' : 'Ha ha! Business is business. Ask me for a deal any time.', delay: 2 });
  });
  os.content = { daikokuDeal: (fromPhone) => { if (deal.stage === 'offer' && dk.openChoice()) dk.post({ text: 'The offer I sent is still open, by the way!', delay: 1 }); else offer(fromPhone); } };

  // ================================================================== the prize scam bot (spot it fast)
  const bot = M.thread({ id: 'prizebot', name: 'xX_PRIZE_CENTER_Xx', avatar: AVA.bot, kind: 'spam', about: 'OFFICIAL PRIZE CENTER (not a scam)' });
  bot.onReply((v) => {
    if (v === 'claim') bot.post({ text: 'GREAT!!! to UNLOCK ur prize please send small processing fee of 500 YEN. HURRY prize expire in 5 SECOND!!!', delay: 1.5, qte: { seconds: 5, timeout: 'late' }, choices: [{ label: 'Pay ¥500', value: 'pay' }, { label: 'Wait... this is a scam!', value: 'scam' }] });
    else if (v === 'pay') {
      if (game.spend(500, 'Prize Center Ltd. (Cayman)')) { bot.post({ text: 'THANK YOU!!! ur prize will arrive in 6-8 business YEARS :) :) :)', delay: 1.5 }); os.achievements?.unlock('os_sucker'); setTimeout(() => bot.block(), 6000); }
      else bot.post({ text: 'payment FAIL!! u have no money?? sad', delay: 1.5 });
    } else if (v === 'scam' || v === 'report') {
      bot.post({ from: 'system', text: 'You reported xX_PRIZE_CENTER_Xx as spam. Pichat will look into it.' });
      bot.block();
      os.achievements?.unlock('os_spam_spotter');
    } else if (v === 'late') bot.post({ text: 'PRIZE EXPIRED!!! but dont worry u can win again tomorrow :)', delay: 1 });
  });

  // ================================================================== the neighbours
  const tn = M.thread({ id: 'tanaka', name: 'Mrs. Tanaka', avatar: AVA.tanaka, kind: 'npc', about: 'Lives two doors down from the garage. Likes enka, gardening and grandchildren.' });
  const kenta = () => tn.post({ text: 'Oh! Before I forget. My grandson Kenta collects the Neko Cafe capsules. If you ever find the secret one, he would be over the moon.', delay: 5, choices: [{ label: "I'll keep an eye out!", value: 'quest' }, { label: 'No promises', value: 'np' }] });
  tn.onReply((v) => {
    if (v === 'hi') { tn.post({ text: 'Such a polite child. Your grandfather would be proud. Come by for tea sometime!', delay: 3 }); kenta(); }
    else if (v === 'radio') { tn.post({ text: 'Ho ho! It works perfectly. He fixed it so well it outlived him.', delay: 3 }); kenta(); }
    else if (v === 'quest') { tn.post({ text: 'Thank you, dear! You are a treasure.', delay: 2 }); game.events.emit('os:quest', { id: 'tanaka_neko', from: 'tanaka', series: 'neko_cafe' }); }
    else if (v === 'np') tn.post({ text: "That's fine, that's fine. Don't work too hard!", delay: 2 });
  });
  tn.onText(() => tn.post({ text: ['Ho ho, you young people type so fast!', 'Is that so? How nice.', "Don't forget to eat properly, dear.", 'My hydrangeas are blooming. Come and see!'][Math.floor(Math.random() * 4)], delay: 3 + Math.random() * 3 }));

  const ok = M.thread({ id: 'okuyasu', name: 'Okuyasu', avatar: AVA.okuyasu, kind: 'npc', about: 'lives on the lane. likes bread. NOT stupid (josuke wrote this)' });
  ok.onReply((v) => {
    if (v === 'nobread') { ok.post({ text: 'WHAT', delay: 1.5 }); ok.post({ text: "...ok i'll still come. josuke says hi", delay: 4 }); }
    else if (v === 'maybe') { ok.post({ text: 'REALLY?!?! IM COMING OVER', delay: 1.5 }); ok.post({ text: 'josuke says there is no bread. why would he lie to me', delay: 5 }); }
  });
  ok.onText(() => ok.post({ text: ['huh?', 'lol', 'do u have snacks', 'josuke says to stop bothering u. im not bothering u right', 'ok!!!'][Math.floor(Math.random() * 5)], delay: 2 + Math.random() * 2 }));

  // ================================================================== first switch-on: the starter messages
  if (!flags.seeded) {
    flags.seeded = true;
    offer(false, 25);
    tn.post({ text: 'Is that you in the garage, dear? I saw the lights on. Your grandfather used to fix my radio every week, you know.', delay: 40, choices: [{ label: 'Hello, Mrs. Tanaka!', value: 'hi' }, { label: 'Does it still need fixing?', value: 'radio' }] });
    bot.post({ text: 'CONGRATURATION!!! U are SELECTED WINNER of 1,000,000 YEN GACHA PRIZE!!! confirm NOW or prize go to next winner!!!', delay: 90, qte: { seconds: 6, timeout: 'late' }, choices: [{ label: 'CLAIM PRIZE!!', value: 'claim' }, { label: 'Report as spam', value: 'report' }, { label: 'Ignore', value: 'late' }] });
    ok.post({ text: 'OI!! is the gacha garage open?? do u sell bread there???', delay: 160, choices: [{ label: "It's capsule toys, not bread", value: 'nobread' }, { label: '...Maybe', value: 'maybe' }] });

    const mail = (m) => os.mail.send({ ...m, quiet: true });
    mail({ from: 'Capsule Systems', addr: 'welcome@capsule98.co.jp', subject: 'Welcome to Capsule 98!', body: 'Thank you for choosing Capsule 98 Second Edition.\n\nGetting started:\n - Double-click an icon on the desktop to start a program.\n - Drag a window by its title bar. Drag its edges to resize it.\n - Right-click for more options almost everywhere.\n - The clock on the taskbar shows the time. Double-click it for the Calendar.\n - Press Esc (or Start > Stand Up) to get up from the computer.\n\nVisit http://www.capsule98.co.jp/help for more tips.\n\nThe Capsule 98 Team' });
    mail({ from: 'Grandpa', addr: 'gramps@capsule.ne.jp', subject: "If you're reading this...", body: "Kiddo,\n\nIf you're reading this, you made it to the garage and figured out how to switch on this old thing. I set it to send you this letter the first time it was turned on by someone who isn't me. Clever, huh? Mr. Daikoku's nephew did it.\n\nThe shop is yours now. It was never about the money. It's about the face a kid makes when the capsule drops and they don't know yet what's inside.\n\nA few things:\n - Order capsules from Mr. Daikoku (his order desk is on the Internet). Haggle with him. He respects it.\n - Second-hand bargains are on Off-Hobby. Count what's in the box.\n - The bills come by mail now. Pay them on the computer. Don't make Mrs. Ota come round.\n - Mrs. Tanaka will message you. Be nice to her. She was nice to me for forty years.\n - Feed the cat.\n\nI'm proud of you.\n\nGrandpa", attachments: [{ name: 'shop_notes.txt', kind: 'note', data: "SHOP NOTES (Grandpa)\n\n- Kids come after school (3 to 6). Make sure the machines are full by then.\n- Holidays and festivals are busy. Check the calendar.\n- Price it fair. People notice.\n- Clean the floor. People notice that too.\n- The secret figures are 1 in 500. Don't promise anyone.\n" }] });
    mail({ from: 'Morio Shinkin Bank', addr: 'online@shinkin.or.jp', subject: 'Your online banking is ready', body: "Dear Customer,\n\nYour business account (No. 0042-1999-0777) has been transferred to your name, and Shinkin Online is now set up on your computer.\n\nWith Shinkin Online you can:\n - see your balance and statement\n - pay your bills\n - apply for a small business loan\n\nTelephone banking: 0193-62-1952\n\nMorio Shinkin Bank - your neighbourhood bank since 1952" });
    mail({ from: 'GACHA-MART', addr: 'news@gacha-mart.co.jp', subject: 'A little gift (and some news)', body: "Dear Shop Owner,\n\nWe were so happy to hear the back-lane garage is open again! Your grandfather was one of our very first customers.\n\nSome news: after 25 years we have closed the GACHA-MART web store. New machines and capsules: Daikoku Toy Wholesale (http://www.daikoku-toys.co.jp/). Second-hand everything: Off-Hobby (http://www.off-hobby.jp/).\n\nAs a farewell gift, please accept the coupon attached to this mail. Spend it on capsules (or on anything you like, we won't check).\n\nThe GACHA-MART Team", attachments: [{ name: 'welcome_coupon.cpn', kind: 'coupon', data: { yen: 300 } }] });
    for (const s of SPAM.slice(0, 5)) mail({ ...s, spam: true, kind: 'spam' });
  }

  // ================================================================== day by day: new deals, spam, Grandpa's letters
  game.events.on('newDay', ({ day }) => {
    if (deal.stage === 'idle' && day - (deal.last || 0) >= 2) offer();
    if (Math.random() < 0.6) { const s = SPAM[Math.floor(Math.random() * SPAM.length)]; os.mail.send({ ...s, kind: 'spam', spam: Math.random() < 0.75, quiet: true }); }
    const gl = LETTERS.find((l) => l.day === day);
    if (gl && !flags[`letter${day}`]) { flags[`letter${day}`] = true; os.mail.send({ from: 'Grandpa', addr: 'gramps@capsule.ne.jp', subject: gl.subject, body: gl.body }); }
  });
}

const SPAM = [
  { from: 'Prize Notification', addr: 'winner@free-gacha-prize.biz', subject: 'CONGRATURATIONS!!! U WIN', body: 'DEAR WINNER,\n\nYOUR E-MAIL ADDRESS HAS WON 1,000,000 YEN IN THE INTERNATIONAL GACHA LOTTERY!!!\n\nTo claim, visit http://www.free-gacha-prize.biz/ and pay the small processing fee.\n\nTHIS IS NOT A SCAM.' },
  { from: 'Capsule Enhancement', addr: 'bigger@capsule-plus.biz', subject: 'Make your capsules BIGGER', body: 'Tired of small capsules? Our amazing formula makes your capsules 300% BIGGER overnight!!\n\nDoctors hate it! Capsule machines hate it!\n\nOrder now: 3 bottles for the price of 4.' },
  { from: 'Prince Kenichi of Osaka', addr: 'prince@royal-osaka.biz', subject: 'URGENT BUSINESS PROPOSAL', body: 'Dear Friend,\n\nI am Prince Kenichi of the Royal Family of Osaka. I have 500,000,000 yen in capsule toys stuck in a warehouse and I need your help to move them.\n\nPlease send your bank details and a small fee of 30,000 yen. You will receive 50% of the capsules.\n\nYours in trust,\nPrince Kenichi' },
  { from: 'Hot Singles', addr: 'meet@lonely-morio.biz', subject: 'Hot singles in Morio-cho want to meet YOU', body: 'There are 3 hot singles in your area RIGHT NOW!!!\n\n(They are all the same guy. He likes bread.)' },
  { from: 'CapsuleCleaner 2000', addr: 'alert@pc-virus-alert.biz', subject: 'WARNING: Your PC has 386 viruses!!!', body: 'Our scan has detected 386 VIRUSES on your computer!!!\n\nDownload CapsuleCleaner 2000 now from the attachment to remove them.', attachments: [{ name: 'CLEANER2000.EXE', kind: 'virus' }] },
  { from: 'Kappa Collectibles', addr: 'sales@100percent-real.biz', subject: 'RARE kappa figure, 100% REAL not fake', body: 'Rare KAPPA figure, found in river!!! 100% real, not plastic.\n\nOnly 9,800 yen. Does not smell (much).' },
  { from: 'Lucky Mail', addr: 'chain@lucky-mail.jp', subject: 'FW: FW: FW: FW: lucky capsule!!', body: 'This is the LUCKY CAPSULE of the lane!!\n\nForward this mail to 5 friends within 10 minutes and your next pull will be a SUPER SECRET.\n\nIf you do not forward it, a crow will steal your coins. It happened to my cousin.' },
  { from: 'Work From Home', addr: 'rich@yen-yen-yen.biz', subject: 'Earn 500,000 yen a week stuffing capsules!!', body: 'Earn BIG money at home putting tiny toys in capsules!!\n\nNo experience needed! Just send 5,000 yen for the starter kit (one capsule, one toy).' },
];

const LETTERS = [
  { day: 3, subject: 'Found in the drawer: about the machines', body: "Kiddo,\n\nThe old red machine with the cracked dome was the first one I ever bought. It cost me a month of pay. Your grandmother said I was crazy. She was right, but she still put the first coin in.\n\nIf a machine jams, don't hit it. Talk to it. (Then hit it, gently.)\n\nGrandpa" },
  { day: 6, subject: 'Found under the keyboard: about luck', body: "Kiddo,\n\nPeople always ask me how to get the secret figure. The truth? Nobody knows. That's the fun of it.\n\nThe joy isn't in getting the rare one. It's in the turning.\n\nGrandpa" },
  { day: 10, subject: 'The last one: about the shop', body: "Kiddo,\n\nIf you've read all my notes, you've been running the place for a while now. Good.\n\nThe garage was never about the toys. It was about the lane: the kids, the neighbours, the cat. Look after them, and the shop looks after itself.\n\nThat's all. Now go and turn some handles.\n\nGrandpa" },
];
