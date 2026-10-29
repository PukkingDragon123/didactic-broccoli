// Mail on your room's PC: the welcome letters, a morning message every new day, and a public hook for other
// features (side quests): game.room.mail.push({ from, subject, body, attach? }) where attach = { kind: 'yen', amount }.
import { hash2 } from '../core/util.js';
import { dateOf } from './textures.js';
import { sfx } from './sfx.js';

const WELCOME = [
  {
    from: 'Capsule OS 98', subject: 'Welcome to your new PC!',
    body: 'Thank you for choosing CAPSULE OS 98.\n\nDouble-click an icon to open it (one tap on a touch screen). Drag windows by their title bar. Esc closes a window; on an empty desktop it switches the PC off and you stand up.\n\nHigh scores are saved automatically. Somebody called GRAMPS holds every record on this machine. Think you can beat him?',
  },
  {
    from: 'Gramps', subject: 'If you are reading this...',
    body: 'Kiddo,\n\nIf this old machine is talking to you, the landlady gave you the key to 102. This little room was my hideaway whenever the garage got too noisy.\n\nThe futon is clean (mostly). The PC works if you are patient with it. Mikan likes the warm spot under the window.\n\nThe garage is yours now. Don\'t worry about making it perfect. Make it fun, and make the kids smile.\n\n- Gramps\n\nP.S. Don\'t shake the fortune box before breakfast. It is grumpy in the mornings.',
  },
  {
    from: 'Mikawa-ya', subject: 'Welcome to the lane!',
    body: 'Welcome home, dear! It has been years since that garage had its lights on.\n\nMilk, brooms, batteries, flyers: you know where we are. We open early and close late. Well, we close when the old cat next door goes to sleep.\n\nSay hello to the little calico for me.\n\n- Mikawa-ya, across the lane',
  },
  {
    from: 'Sato (101)', subject: 'Hello from next door',
    body: 'Hi neighbour! I am Sato from 101. The walls are thin, so I already know you hum when you play video games.\n\nGarbage days are Tuesday and Friday. Please don\'t leave cup noodle lids on the stairs, the crows love them.\n\nI made too much curry again. There is a container hanging on your doorknob.',
  },
  {
    from: 'GACHA-MART', subject: 'Newsletter: summer capsule fever!',
    body: 'Dear Shop Owner,\n\nThis summer\'s hottest series are rolling out now. Remember: every series hides a SUPER SECRET figure!\n\nOrder refills and new machines from the PC in your garage.\n\nUnsubscribe? Ha ha. No.',
    attach: { kind: 'yen', amount: 300, label: 'Welcome coupon' },
  },
];

const WEATHER = ['Clear skies, a lazy breeze', 'Hot and sticky, cicadas at full volume', 'Light rain in the morning, golden evening', 'Sunny with a chance of capsules', 'Cloudy, perfect gacha weather', 'A cool wind from the river', 'Muggy. Mikan will sleep all day'];
const DAILY = [
  (d) => ({ from: 'Mikan', subject: 'mrrp', body: 'mrrrrp. mew mew mew mew.\n\nhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh\n\n(The cat walked across a keyboard somewhere. She looks very proud of herself.)', attach: d % 2 ? { kind: 'yen', amount: 120, label: 'A coin she found under the vending machine' } : null }),
  () => ({ from: 'Landlady Ota', subject: 'About the rent', body: 'Good morning!\n\nJust so you know, your grandfather paid the rent on 102 for the whole year in advance. In coins. Hundred-yen coins. In a capsule toy box.\n\nI am still counting them.\n\n- Ota, Sakura Heights' }),
  () => ({ from: 'Kenji (201)', subject: 'music at 3am?', body: 'hey 102,\n\nreally happy someone moved in. but could you turn the Capsule Drop music down a bit after midnight? the bassline comes through my floor.\n\nalso what is your high score. asking for a friend (me)' }),
  () => ({ from: 'Lucky Mail', subject: 'FWD: FWD: FWD: lucky capsule!!', body: 'This is the LUCKY CAPSULE of the lane!!\n\nForward this mail to 5 friends within 10 minutes and your next pull will be a SUPER SECRET.\n\nIf you do not, your next 3 capsules will all be the same hamster.\n\n(You decide not to forward it. A brave choice.)' }),
  (d) => ({ from: 'GACHA-MART', subject: 'Daily login bonus', body: 'Thank you for visiting GACHA-MART again!\n\nHere is a small coupon for your trouble. Spend it wisely (on capsules).', attach: { kind: 'yen', amount: 100 + (d % 4) * 50, label: 'Login coupon' } }),
  () => ({ from: 'Neighbourhood Assoc.', subject: 'Summer festival meeting', body: 'To all residents of the lane:\n\nThe summer festival planning meeting is on Saturday at the community hall. Please bring folding chairs and, if possible, cucumbers.\n\nWe are looking for volunteers for the goldfish scooping stall. Previous experience with goldfish not required.' }),
  () => ({ from: 'Yumeno Hot Springs', subject: 'Relax in our mountain onsen!', body: 'Tired from a long day of cranking handles?\n\nYUMENO HOT SPRINGS, two hours by local train. Outdoor baths, mountain views and the finest milk in a glass bottle.\n\nYour grandfather stayed with us every autumn. He always asked for the room by the waterfall.' }),
  () => ({ from: 'Sato (101)', subject: 'thank you!', body: 'Thank you for giving the curry container back so fast (and clean!).\n\nMy son keeps asking about the capsule shop. He says the cat is the manager. Is the cat the manager?' }),
];
// Grandpa left a few more letters; one turns up now and then
const GRAMPS = [
  { day: 3, subject: 'Found in the closet: about the machines', body: 'Kiddo,\n\nThe old red machine (the one with the cracked dome) was the first one I ever bought. It cost me a month of pay. Your grandmother said I was mad.\n\nShe was right. It was the best thing I ever did.\n\nOil the handle once a season and it will outlive us both.\n\n- Gramps' },
  { day: 6, subject: 'Found in a shoebox: about Mikan', body: 'Kiddo,\n\nThe calico started coming round the year the trains got new paint. I never fed her, officially. Unofficially, she ate better than I did.\n\nShe will pretend not to know you for a week. Then she will sit on your shoes.\n\n- Gramps' },
  { day: 10, subject: 'Tucked in a manga: about luck', body: 'Kiddo,\n\nPeople always ask me how to get the secret figure. The truth? Nobody knows. That is the fun of it.\n\nThe joy is not in getting the rare one. It is the moment before the capsule opens, when anything could be inside.\n\n- Gramps' },
  { day: 15, subject: 'The last one, under the futon', body: 'Kiddo,\n\nIf you have read all my notes, you have been living in this little room for a while now. Good. I hope it feels like home.\n\nThe garage was never about the toys. It was about the lane. The kids, the neighbours, the cat, the trains rumbling over the bridge at dusk.\n\nLook after them for me.\n\n- Gramps' },
];

export class Mail {
  constructor(room) {
    this.room = room;
    this.game = room.game;
    const st = room.state;
    if (!Array.isArray(st.mail)) st.mail = [];
    if (!st.mailSeeded) {
      st.mailSeeded = true;
      for (const m of WELCOME) this.push(m, { quiet: true, day: 1 });
    }
  }

  get list() { return this.room.state.mail; }
  unread() { return this.list.filter((m) => !m.read).length; }

  /** Deliver a message. Returns it. m = { from, subject, body, attach?: { kind: 'yen', amount, label } } */
  push(m, { quiet = false, day = null } = {}) {
    const st = this.room.state;
    const msg = {
      id: (st.mailId = (st.mailId || 0) + 1),
      from: String(m.from || 'Unknown'), subject: String(m.subject || '(no subject)'), body: String(m.body || ''),
      day: day ?? (this.game.state.day || 1), read: false,
      attach: m.attach && m.attach.kind === 'yen' && m.attach.amount > 0 ? { kind: 'yen', amount: Math.round(m.attach.amount), label: m.attach.label || 'Attachment', claimed: false } : null,
    };
    st.mail.push(msg);
    if (st.mail.length > 60) st.mail.splice(0, st.mail.length - 60);
    if (!quiet) {
      const os = this.room.os;
      if (os?.isOpen) { os.notify(`New mail from ${msg.from}`, 'cos_mail'); os.updateBadges(); os.wins.find((w) => w.app === 'mail')?.inst?.refresh?.(); }
      else if (this.room.inside) this.game.news('New mail', `From ${msg.from} · check your PC`);
      sfx('osMail', { vol: 0.8 });
      this.room.onMail?.();
    }
    return msg;
  }

  claim(msg) {
    if (!msg?.attach || msg.attach.claimed) return false;
    msg.attach.claimed = true;
    if (msg.attach.kind === 'yen') this.game.addMoney(msg.attach.amount);
    this.game.save();
    return true;
  }

  /** The mail that arrives when you wake up on a new day. */
  morning(day) {
    const { wdName, monthName, date } = dateOf(day);
    const weather = WEATHER[Math.floor(hash2(day, 17) * WEATHER.length)];
    this.push({ from: 'Lane Weather', subject: `${wdName} ${date} ${monthName.slice(0, 3)}: ${weather}`, body: `Good morning, Sakura Heights!\n\nToday (day ${day}): ${weather.toLowerCase()}.\nSunset over the railway bridge at around 18:40, as always.\n\nRemember to water your morning glories.` }, { day });
    const gr = GRAMPS.find((g) => g.day === day);
    if (gr) this.push({ from: 'Gramps', subject: gr.subject, body: gr.body }, { day });
    else this.push(DAILY[Math.floor(hash2(day, 29) * DAILY.length) % DAILY.length](day), { day });
    return weather;
  }
}

