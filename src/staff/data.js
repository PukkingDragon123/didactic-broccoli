// Employees: the static tables. Roles (what someone can be assigned to do), shift patterns, the funny archetypes that
// apply on the Inspired job site next to the ordinary locals, their CV lines, quirks, interview answers and small talk.
// Everything here is plain data + tiny text helpers; the behaviour lives in worker.js / tasks.js / chats.js.

export const ROLES = {
  restock: { id: 'restock', name: 'Restocker', jp: '品出し', stat: 'speed', desc: 'Refills sold-out machines from the capsule cartons in the shop (and the cardboard boxes).', short: 'Refills machines' },
  clean: { id: 'clean', name: 'Cleaner', jp: '清掃', stat: 'reliability', desc: 'Sweeps up empty capsules and dust, ties off the trash bag and takes it to the garbage station.', short: 'Sweeps, takes the trash out' },
  greet: { id: 'greet', name: 'Cashier / greeter', jp: 'レジ', stat: 'charm', desc: 'Welcomes customers at the shutter, answers their questions and sells the figures on your price-tagged stands.', short: 'Greets and sells' },
  coins: { id: 'coins', name: 'Coin collector', jp: '集金', stat: 'honesty', desc: 'Empties the machines\' coin boxes into the register, the piggy bank or (failing both) the bank across the lane.', short: 'Empties coin boxes' },
  courier: { id: 'courier', name: 'Courier runner', jp: '発送', stat: 'speed', desc: 'Finds what you sold on Off-Hobby, packs it and drops it in the OUTGOING crate for Gen-san.', short: 'Packs Off-Hobby parcels' },
  guard: { id: 'guard', name: 'Night guard', jp: '夜警', stat: 'reliability', desc: 'Patrols the shop and the lane at night. Nothing gets shaken, scribbled on or "borrowed".', short: 'Watches the shop at night' },
};
export const ROLE_IDS = Object.keys(ROLES);

/** Shift patterns (hours; `to` past midnight wraps). */
export const HOURS = {
  morning: { id: 'morning', name: 'Mornings', from: 9, to: 14 },
  afternoon: { id: 'afternoon', name: 'Afternoons', from: 14, to: 19 },
  day: { id: 'day', name: 'Full day', from: 9, to: 19 },
  evening: { id: 'evening', name: 'Evenings', from: 16, to: 22 },
  night: { id: 'night', name: 'Nights', from: 20, to: 2 },
};
export const HOUR_IDS = Object.keys(HOURS);
export const shiftLen = (hid) => { const s = HOURS[hid] || HOURS.day; return (s.to - s.from + 24) % 24 || 24; };
export const shiftText = (hid) => { const s = HOURS[hid] || HOURS.day; return `${String(s.from).padStart(2, '0')}:00-${String(s.to % 24).padStart(2, '0')}:00`; };
/** Is hour h (float) inside shift hid? */
export function inShift(hid, h) {
  const s = HOURS[hid] || HOURS.day;
  return s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to;
}

export const WAGE_MIN = 500, WAGE_MAX = 1500, WAGE_STD = 750, AD_FEE = 500;
export const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const PAYDAY = 5; // Friday
/** Weekday of a day number (0 = Sunday; day 1 was Thursday 1 April 1999), without asking the calendar (calendar
 *  sources must not call calendar.dateOf: it asks the sources back). */
export const weekdayOf = (day) => (day + 3) % 7;

// ------------------------------------------------------------------ names
export const FAMILY = ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Ito', 'Watanabe', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Ishikawa', 'Ogawa', 'Fujita', 'Okada', 'Goto', 'Hasegawa', 'Murakami', 'Kondo', 'Ishii', 'Saito', 'Sakamoto', 'Endo', 'Aoki', 'Fujii', 'Nishimura', 'Fukuda', 'Ota', 'Miura', 'Okamoto', 'Matsuda', 'Nakagawa', 'Harada', 'Ono', 'Takeuchi', 'Kaneko', 'Wada'];
export const GIVEN_M = ['Hiroshi', 'Takeshi', 'Kenji', 'Daisuke', 'Shota', 'Yuta', 'Kenta', 'Takumi', 'Ryo', 'Naoki', 'Kazuki', 'Tatsuya', 'Shingo', 'Makoto', 'Jun', 'Koji', 'Yusuke', 'Masato', 'Tomoya', 'Haruto', 'Satoshi', 'Shigeru', 'Isamu', 'Minoru', 'Akira', 'Goro', 'Taro', 'Tetsuya'];
export const GIVEN_F = ['Yuki', 'Ayaka', 'Misaki', 'Haruka', 'Mai', 'Yui', 'Nanami', 'Saki', 'Aya', 'Emi', 'Kana', 'Rina', 'Megumi', 'Tomoko', 'Keiko', 'Naomi', 'Sachiko', 'Michiko', 'Akemi', 'Chie', 'Kumiko', 'Mayumi', 'Noriko', 'Yoko', 'Hana', 'Sakura', 'Momoko', 'Fumiko'];
export const FOREIGN = [['Liam', 'O\'Brien', 'm', 'Ireland'], ['Chloe', 'Martin', 'f', 'France'], ['Jake', 'Thompson', 'm', 'Australia'], ['Ana', 'Silva', 'f', 'Brazil'], ['Erik', 'Lindqvist', 'm', 'Sweden'], ['Mia', 'Becker', 'f', 'Germany']];

// ------------------------------------------------------------------ ordinary locals: who they are (base preset + age range + a line)
// sex: fixed by the preset when it has one. job: their current situation (first CV line), ages [min, max].
export const LOCALS = [
  { base: 'schoolgirl', ages: [16, 18], w: 1.2, job: ['High-school student (part-time allowed, permission slip attached)', 'High-school student, kendo club, free after 4'], fav: 'greet' },
  { base: 'schoolboy', ages: [16, 18], w: 1.2, job: ['High-school student, baseball club (bench)', 'High-school student saving up for a scooter'], fav: 'restock' },
  { base: 'office_lady', ages: [23, 34], w: 1, job: ['Office worker looking for weekend shifts', 'Between jobs (the trading company merged)'], fav: 'coins' },
  { base: 'salaryman', ages: [26, 45], w: 0.8, job: ['Salaryman, wants evening shifts "for the exercise"', 'Recently "restructured" (laid off)'], fav: 'courier' },
  { base: 'mom', ages: [28, 42], w: 1, job: ['Mother of two, free while they\'re at school', 'Ran the PTA bake sale three years running'], fav: 'clean' },
  { base: 'grandma', ages: [62, 78], w: 0.8, job: ['Retired school dinner lady', 'Retired tobacconist, knows everyone'], fav: 'greet' },
  { base: 'grandpa', ages: [64, 80], w: 0.8, job: ['Retired carpenter, still up at 5 a.m.', 'Retired train conductor (very punctual)'], fav: 'guard' },
  { base: 'otaku', ages: [20, 32], w: 1, job: ['Freeter, knows every capsule series by heart', 'Model kit painter, steady hands'], fav: 'restock' },
  { base: 'delivery', ages: [22, 40], w: 0.8, job: ['Bicycle courier (fastest in Morio-cho, allegedly)', 'Former newspaper delivery boy, now a delivery man'], fav: 'courier' },
  { base: 'construction', ages: [24, 50], w: 0.6, job: ['Scaffolder looking for a quieter job', 'Builder, the site closed for the season'], fav: 'clean' },
  { base: 'tourist', ages: [20, 28], w: 0.5, job: ['On a working holiday visa', 'Backpacking, ran out of money in Morio-cho'], fav: 'greet', foreign: true },
];
export const LOCAL_CV = [
  'Konbini night shift, 2 years (never fell asleep. Much.)', 'Tofu delivery by bicycle', 'Cram school, finished 3rd in maths', 'Helped at the summer festival goldfish stall',
  'Pachinko parlour, 6 months (ears still ringing)', 'Washed dishes at the station soba shop', 'Delivered newspapers for 4 years', 'Sold baked sweet potatoes from a cart',
  'Shrine maiden at New Year (temp)', 'Video rental shop clerk (knows every movie)', 'Department store gift wrapping', 'Bento shop, lunch rush',
  'Ran the school store', 'Karaoke box front desk', 'Supermarket shelf stacker', 'Taught abacus to kids', 'Car wash attendant', 'Library volunteer',
];
export const HOBBIES = ['Collects ramune marbles', 'Plays shogi badly', 'Karaoke (enka only)', 'Goldfish (owns 14)', 'Baseball cards', 'Origami cranes (1,000 and counting)', 'Pigeon watching with Mr. Hatoda', 'Long walks to the steel tower', 'Bonsai', 'Arcade rhythm games', 'Reads manga in the konbini', 'Fishing in the river (nothing yet)', 'Collects bottle caps', 'Watches sumo'];

// ------------------------------------------------------------------ quirks (ordinary ones; archetypes add their own)
// effect keys are read by worker.js / tasks.js
export const QUIRKS = {
  chatty: { name: 'Chatty', desc: 'Talks to every customer. Slower, but they like it.', fx: { slow: 0.15, mood: 1 } },
  clumsy: { name: 'Clumsy', desc: 'Drops things. Often.', fx: { drop: 0.12 } },
  punctual: { name: 'Punctual', desc: 'Always on time. Early, even.', fx: { early: true } },
  late: { name: 'Fashionably late', desc: 'Turns up 10-30 minutes into every shift.', fx: { late: true } },
  hungry: { name: 'Snacker', desc: 'Takes little snack breaks. Crumbs.', fx: { snack: true } },
  singer: { name: 'Hums', desc: 'Hums enka while working. Customers find it soothing (some do).', fx: { hum: true } },
  neat: { name: 'Neat freak', desc: 'Sweeps whatever their actual job is.', fx: { neat: true } },
  catlover: { name: 'Cat person', desc: 'Stops to pet Mikan. Every. Single. Time.', fx: { cat: true } },
  // archetype quirks
  dish: { name: 'Dish on head', desc: 'A kappa: strong and tidy, but the water in the dish dries out. Dry kappa, weak kappa (and slippery).', fx: { dish: true } },
  leaves: { name: 'Leaf money', desc: 'A tanuki. Sometimes pays customers their change in leaves.', fx: { leaves: true } },
  bows: { name: 'Bows a lot', desc: 'Bows to everyone. And everything. Slower, very polite.', fx: { bows: true, slow: 0.1 } },
  phone: { name: 'Always on the phone', desc: 'Amazing at sales. On the phone about a quarter of the time.', fx: { phone: true } },
  robots: { name: 'Robot-obsessed', desc: 'Fast and keen. Sometimes "upgrades" things (price plates).', fx: { tinker: true } },
  sleepy: { name: 'Sleepy', desc: 'Naps standing up, especially after lunch.', fx: { nap: true } },
  ninja: { name: 'Definitely not a ninja', desc: 'Very fast. Appears behind people. Startles customers.', fx: { blink: true } },
  ghost: { name: 'Nights only', desc: 'Only works after dark. Counts capsules. Never loses one. Customers scream sometimes.', fx: { nightOnly: true, scare: true } },
};
export const COMMON_QUIRKS = ['chatty', 'clumsy', 'punctual', 'late', 'hungry', 'singer', 'neat', 'catlover'];

// ------------------------------------------------------------------ the funny ones
// Each: base preset (src/people/presets.js), sex, ages, stats [speed, honesty, charm, reliability] (1-5, a little
// random added), quirk, a few CV lines, a red flag the site points out, wage expectation (x the ad), shift limits.
export const ARCHETYPES = {
  kappa: {
    id: 'kappa', base: 'kappa', sex: 'm', ages: [180, 340], kind: 'kappa', quirk: 'dish', fav: 'clean', stats: [4, 4, 2, 4], wage: 0.85,
    names: [['Kawataro', 'Kappa'], ['Gataro', 'Kawa'], ['Kyuri', 'Mizushima']], color: '#7ccf6a',
    blurb: 'Hard-working river spirit seeks indoor work near a tap. Strong, tidy, polite. Will bow.',
    cv: ['Guarded the Morio river bridge, 212 years', 'Sumo (undefeated vs. humans, lost once to a horse)', 'Cucumber farm, seasonal', 'Lifeguard (unofficial, unpaid, unwanted)'],
    flag: 'Asked if the shop has a tap. Asked twice.', hobby: 'Cucumbers. Sumo. Cucumbers.',
    voice: { base: 210, duty: 0.25 }, tts: { pitch: 0.75, rate: 1.05, gender: 'm' },
  },
  tanuki: {
    id: 'tanuki', base: 'tanuki', sex: 'm', ages: [40, 90], kind: 'tanuki', quirk: 'leaves', fav: 'greet', stats: [2, 1, 5, 3], wage: 1.15,
    names: [['Ponta', 'Shigaraki'], ['Tanukichi', 'Ponpoko'], ['Bunbuku', 'Chagama']], color: '#c89a5a',
    blurb: 'Jolly businessman. Very good with money. Has plenty of it. Some of it is even real.',
    cv: ['Sake shop greeter (statue, 30 years)', 'Teapot (it is a long story)', 'Sales: sold a bridge, twice', 'Mountain inn "owner"'],
    flag: 'His references all have the same handwriting. And a leaf stuck to them.', hobby: 'Drumming on his belly. Sake.',
    voice: { base: 170, duty: 0.5 }, tts: { pitch: 0.7, rate: 0.95, gender: 'm' },
  },
  salaryman: {
    id: 'salaryman', base: 'salaryman', sex: 'm', ages: [61, 68], kind: 'retired', quirk: 'bows', fav: 'coins', stats: [2, 5, 3, 5], wage: 0.9,
    names: [['Shigeru', 'Hosokawa'], ['Isamu', 'Kuroda'], ['Minoru', 'Tsujimoto']], color: '#a8b4c8',
    blurb: '38 years at Morio Trading Co. Retired. Wife says "get out of the house". Will bow.',
    cv: ['Morio Trading Co., 38 years (deputy section chief)', 'Perfect attendance award, 1967-1999', 'Company song, solo verse (1988 year-end party)', 'Bowing: 15, 30 and 45 degrees certified'],
    flag: 'Bowed to the Inspired office printer. Apologised to it.', hobby: 'Golf practice in the park (no ball)',
    voice: { base: 140, duty: 0.125 }, tts: { pitch: 0.8, rate: 0.9, gender: 'm' },
  },
  gyaru: {
    id: 'gyaru', base: 'gyaru', sex: 'f', ages: [18, 22], kind: 'gyaru', quirk: 'phone', fav: 'greet', stats: [3, 3, 5, 2], wage: 1.05,
    names: [['Rukaa', 'Hoshino'], ['Mimi', 'Kirasaka'], ['Erika', 'Shibuya']], color: '#ff8ac0',
    blurb: 'Sales queen!! Could sell sand in the desert. Phone stays ON (it is for work, kind of).',
    cv: ['Shibuya 109 shop assistant (top seller, 3 months)', 'Purikura booth expert', 'Pager code fluent (0840, 4649)', 'Karaoke: 98 points (once)'],
    flag: 'Took 4 phone calls during the online form. The form had 3 questions.', hobby: 'Purikura. Tanning. Her phone.',
    voice: { base: 330, duty: 0.25 }, tts: { pitch: 1.4, rate: 1.2, gender: 'f' },
  },
  robokid: {
    id: 'robokid', base: 'schoolboy', sex: 'm', ages: [15, 16], kind: 'robokid', quirk: 'robots', fav: 'restock', stats: [4, 4, 3, 3], wage: 0.8,
    names: [['Kenta', 'Ishii'], ['Hiro', 'Tetsuwan'], ['Shinji', 'Gearyama']], color: '#7ab8ff',
    blurb: 'Robotics club captain (club of one). Fast hands. Wants to build a capsule-loading robot.',
    cv: ['Robotics club captain (founder, only member)', 'Built a robot that folds laundry (badly)', 'School festival: "Mecha-Taro" (caught fire, briefly)', 'Can solder in the dark'],
    flag: 'Asked whether he can "improve" the machines. With a screwdriver.', hobby: 'Robots. Robot anime. Robot model kits. Robots.',
    voice: { base: 290, duty: 0.5 }, tts: { pitch: 1.3, rate: 1.25, gender: 'm' },
  },
  student: {
    id: 'student', base: 'otaku', sex: 'x', ages: [19, 23], kind: 'student', quirk: 'sleepy', fav: 'courier', stats: [2, 4, 3, 2], wage: 0.85,
    names: [['Nemu', 'Yokota'], ['Sui', 'Minmin'], ['Kuu', 'Nemoto']], color: '#b8a8e0',
    blurb: 'Philosophy student. Very calm. Very, very calm. Available whenever I am awake.',
    cv: ['Morio University, philosophy, 3rd year (4th attempt)', 'Library night porter (asleep in the stacks)', 'Sleep study volunteer (paid, best job ever)', 'Essay: "On the nature of naps"'],
    flag: 'Fell asleep during the online application. The form timed out twice.', hobby: 'Naps. Thinking about naps.',
    voice: { base: 200, duty: 0.125 }, tts: { pitch: 0.95, rate: 0.82, gender: 'x' },
  },
  ninja: {
    id: 'ninja', base: 'ninja', sex: 'm', ages: [24, 35], kind: 'ninja', quirk: 'ninja', fav: 'courier', stats: [5, 3, 2, 4], wage: 1,
    names: [['Hanzo', 'Kage'], ['Sasuke', 'Kirigakure'], ['Jinpachi', 'Kurenai']], color: '#5a6a8a',
    blurb: 'Normal man. Very normal. Fast, quiet, good at rooftops. Not a ninja.',
    cv: ['"Import / export" (classified)', 'Family business: 400 years (cannot say which)', 'Rooftop maintenance (unlicensed)', 'Speed: yes'],
    flag: 'Nobody at Inspired saw him come in. Or leave.', hobby: 'Throwing stars. Throwing things. Star-gazing. Normal hobbies.',
    voice: { base: 160, duty: 0.125 }, tts: { pitch: 0.85, rate: 1.1, gender: 'm' },
  },
  ghost: {
    id: 'ghost', base: 'yurei', sex: 'f', ages: [17, 17], kind: 'ghost', quirk: 'ghost', fav: 'restock', stats: [3, 5, 2, 5], wage: 0.4, nightOnly: true,
    names: [['Okiku', 'Sarayashiki'], ['Oiwa', 'Yotsuya'], ['Otsuyu', 'Botan']], color: '#c8d8e8',
    blurb: 'Counted plates for 300 years. Will count your capsules. Will NOT lose one. Nights only.',
    cv: ['Himeji castle well: plate counting, since 1741', 'Never once late (time is meaningless)', 'Haunted a karaoke box (regulars loved it)', 'Night shifts only: dawn is "complicated"'],
    flag: 'Applied at 2:22 a.m. The form was damp.', hobby: 'Counting. Wells. Sad songs.',
    voice: { base: 380, duty: 0.125 }, tts: { pitch: 1.5, rate: 0.8, gender: 'f' },
  },
};
export const SPECIAL_IDS = Object.keys(ARCHETYPES);

// ------------------------------------------------------------------ interview
/** The questions you can pick from (each round shows three). */
export const QUESTIONS = [
  { id: 'why', text: 'Why do you want to work here?' },
  { id: 'exp', text: 'Ever worked in a shop before?' },
  { id: 'weak', text: 'What\'s your biggest weakness?' },
  { id: 'money', text: 'Can I trust you with the coin boxes?' },
  { id: 'rigged', text: 'A customer says the machines are rigged. What do you say?' },
  { id: 'cat', text: 'Mikan the cat is the real boss here. Problem?' },
  { id: 'weekend', text: 'Can you work weekends and holidays?' },
  { id: 'gacha', text: 'Favourite capsule toy?' },
];
/** The one question only this archetype gets. */
export const SPECIAL_Q = {
  kappa: 'Is that... a dish on your head?',
  tanuki: 'Why is there a leaf on your head?',
  salaryman: 'You don\'t need to bow every time, you know.',
  gyaru: 'Could you put the phone down for a second?',
  robokid: 'What\'s with the antenna?',
  student: 'Are you... asleep?',
  ninja: 'Are you a ninja?',
  ghost: 'Your feet... are they missing?',
};

/** Answers by archetype and question (strings or arrays: one at random). `_` answers anything not listed. */
export const ANSWERS = {
  kappa: {
    special: ['This? It holds the water of my river. If it dries out I go weak and wobbly. Do you have a tap? A bucket? A kind heart?', 'It is my dish. Please do not tip it. If you bow to me I must bow back, and then... splash.'],
    why: 'My river got a concrete bank. No more customers to pull in. I mean... to help! I like helping now.', exp: 'I sold cucumbers to children on the bridge for 80 years. Well. I traded them. For their... never mind.',
    weak: 'Dry weather. Also cucumbers. If you leave one on the counter it will vanish and I will deny everything.', money: 'Money is just shiny river stones to me. You can trust me completely. I prefer cucumbers.',
    rigged: 'I would challenge them to sumo. Then bow. While they bow back, the water... no, I would just explain the odds.', cat: 'Cats do not like water. I am mostly water. We will respect each other from a distance.',
    weekend: 'Yes. Except when it rains. Then I must go and stand in it for a while. For my health.', gacha: 'The cucumber one. Is there a cucumber one? There should be a cucumber one.',
    _: 'Hm. In the river we have a saying: "Even a kappa drowns sometimes." It means... I do not know the answer.',
  },
  tanuki: {
    special: ['Leaf? What leaf? Oh, THIS leaf. It is... a fashion. All the businessmen wear one. Ho ho!', 'A leaf? Ha ha! You must be tired. Here, have a gift certificate. (It is also a leaf.)'],
    why: 'Business! Customers! The jingle of coins! I love the jingle of coins. I love it more than the coins. Mostly.', exp: 'I stood outside a sake shop for 30 years with a bottle and a ledger. Customers adored me. Statue work, you understand.',
    weak: 'Maths. Specifically the part where the money has to be real. Ho ho! Joking. Mostly joking.', money: 'Absolutely! I am a very good tanuki. Business tanuki. Every yen I give out is a real yen. Probably. Ho ho!',
    rigged: 'I would say: "Rigged? Sir, this is a game of FATE!" And then sell him three more turns.', cat: 'A cat? We tanuki get along with cats. We once ran a teahouse together. It burned down. Unrelated.',
    weekend: 'Weekends, holidays, full moons. Especially full moons. I drum on my belly. It is good for business.', gacha: 'The golden one! Anything golden! Is it real gold? Doesn\'t matter! Shiny!',
    _: 'Ho ho! A good question. A great question. A question worth... ten thousand yen! (He hands you a leaf.)',
  },
  salaryman: {
    special: ['Ah. Yes. Of course. My apologies. (He bows.) I apologise for bowing. (He bows again.)', 'Thirty-eight years at Morio Trading. The body remembers. Please excuse me. (Bow.)'],
    why: 'My wife says I watch too much sumo. I say I need structure. A schedule. A boss. Please be my boss. (Bow.)', exp: 'Thirty-eight years of sales, accounts and the year-end party. I sang the company song. Solo verse.',
    weak: 'I cannot leave work before the boss. Once I slept at the office for four days. Nobody noticed. (Bow.)', money: 'I balanced the Morio Trading petty cash for 20 years. One yen out, I would stay until midnight.',
    rigged: 'I would apologise on behalf of the company, explain the probability table, and bow at 45 degrees.', cat: 'I will greet her every morning. Respect for seniority. (He bows toward the cat bed.)',
    weekend: 'I have nowhere else to be. Ever. My wife confirmed this in writing.', gacha: 'The salaryman figure series. It is very realistic. Too realistic. I cried.',
    _: 'An excellent question. Let me prepare a written answer by Monday. (Bow.)',
  },
  gyaru: {
    special: ['Huh? Oh, totally, one sec... (She texts for nine more seconds.) ...Okay! What?', 'It\'s for WORK, okay? My friends are all customers. Potential customers. Like, a network!'],
    why: 'Capsule toys are SO kawaii and I can sell anything. Last week I sold my friend her own bag. She was happy!', exp: 'Shibuya 109, three months, top seller. Then I got bored. But like, I\'m not bored NOW.',
    weak: 'Mornings. And maths. And mornings. Oh and I\'m always on my phone, my friends say, but like, who cares, right?', money: 'Totally! I never steal. I just like, borrow. Lip gloss. Not money! Never money.',
    rigged: 'Oh my god, rigged?! Okay, look, I\'ll do a turn with you! Lucky hands! (She would sell him five turns.)', cat: 'A CAT?! Can I take purikura with her? She\'s gonna be famous!',
    weekend: 'Saturdays yes! Sundays... maybe? Depends on the boyfriend situation. It\'s complicated.', gacha: 'The sparkly ones! Pink ones! Anything I can hang on my phone! My phone has 14 straps!',
    _: 'Ehhh, chou muzui! Super hard question! Next!',
  },
  robokid: {
    special: ['It picks up radio signals! Mostly baseball. Sometimes a taxi company. Once, I swear, aliens.', 'It\'s an antenna! For my robot! He is at home. He can\'t climb stairs yet. Or walk.'],
    why: 'Gacha machines are basically robots! With cranks! I want to see how they work. From the inside. Can I open one?', exp: 'I ran the robotics stall at the school festival! It only caught fire once. Briefly. The fire was also briefly.',
    weak: 'I try to improve things that are fine. My mum\'s rice cooker plays the anime theme now. She did not ask for that.', money: 'Money? I only need it for parts. Servos are expensive! But I would never take yours. That\'s not robotic.',
    rigged: 'I would explain the mechanism! The spring! The ratchet! The gravity! By then they would forget they were angry!', cat: 'Can I build her a robot friend? A robot MOUSE? She would love it! Maybe! If it doesn\'t catch fire!',
    weekend: 'Yes! My robotics club meets only on Tuesdays. Because I\'m the only member and I said so.', gacha: 'Any robot! The tiny mecha! The ones with the joints that actually move!',
    _: 'Ooh! Good question! Let me compute... beep boop... I don\'t know!',
  },
  student: {
    special: ['...Hm? No. I was thinking with my eyes closed. It\'s a philosophy thing. (Yawn.)', '...Zz... Ah! Present! I mean. Yes. I\'m here. Was I asleep? Define "asleep".'],
    why: 'It\'s quiet here. And warm. And you have a bench. I mean, I want to grow as a person.', exp: 'Library night porter. Nobody steals books at 3 a.m. I made sure of that by being there. Asleep.',
    weak: 'Mornings. Afternoons. Early evenings. I\'m excellent from 10 p.m. to 11 p.m.', money: 'I don\'t care about money enough to steal it. Is that a good answer? It\'s a true answer.',
    rigged: 'I would ask them: "What is luck, really?" They would leave confused. Problem solved.', cat: 'Cats nap 16 hours a day. She is my role model. We will get along.',
    weekend: 'Yes. Weekends are just weekdays with a different name.', gacha: 'The sleeping cat one. Obviously.',
    _: '...(Long pause.) ...Could you repeat the question? Slower? In the afternoon?',
  },
  ninja: {
    special: ['No.', 'Ha ha ha. No. Why would you think that. (A smoke bomb rolls out of his sleeve. He kicks it under the table.)', 'I am a normal man. Look at my normal clothes. (They are all black.)'],
    why: 'Your shop has excellent rooftop access. I mean. Excellent customer access.', exp: 'Import, export. Things went in. Things came out. Nobody saw anything. That was the job.',
    weak: 'Doors. I forget they exist. I use windows. Sorry about the window.', money: 'In my family, we only take what the scroll says to take. Your coin boxes are not on the scroll.',
    rigged: 'I would appear behind them and whisper "Are they?" They would leave. Quickly.', cat: 'The cat sees me. Cats always see me. Only cats. And you, apparently.',
    weekend: 'I work in the shadows. Shadows are open weekends.', gacha: 'The ninja series. Not because I am one. They are just very accurate.',
    _: '(He was here a second ago. He is behind you now.) ...Pass.',
  },
  ghost: {
    special: ['Feet are for people who walk. I... drift. Is that a problem for the uniform?', 'I left them at the well in 1741. It is a long story. It involves plates.'],
    why: 'For three hundred years I counted plates. Nine. Always nine, never ten. I want to count something that adds up.', exp: 'Himeji castle. Plate inventory. Very long hours. Terrible management. Lord Aoyama, if you know him. Don\'t.',
    weak: 'Mornings. And afternoons. Sunlight is... complicated. Also I scream when I count to nine. Habit.', money: 'I have never stolen anything. I was accused, once, of losing a plate. I did not. I have been very upset about it since.',
    rigged: 'I would count the capsules in front of them. Slowly. One... two... They usually leave before nine.', cat: 'Cats can see me. She will hiss. Then she will sit on me. It is always like that.',
    weekend: 'Every night. Every single night. Forever. Is that... a lot?', gacha: 'The one with plates. Is there one with plates? Ten plates?',
    _: 'One... two... three... Sorry. I count when I am nervous.',
  },
};
/** Ordinary applicants answer by temperament (picked from their stats). */
export const LOCAL_ANSWERS = {
  why: { hi: ['My grandpa took me here as a kid. I want to keep the place alive!', 'I love capsule toys, and I love helping people. Perfect, right?'], lo: ['The ad said "easy work". Is it easy work?', 'It\'s close to my house. Like, really close. I can see it from my window.'] },
  exp: { hi: ['Two years at the konbini by the station. I can do the register in my sleep.', 'I helped at the festival stalls every summer. Crowds don\'t scare me.'], lo: ['Not really. But I watch a lot of shopping channel.', 'I sold my sister\'s comics once. She found out.'] },
  weak: { hi: ['I work too hard. No, really, my last boss told me to go home.', 'I\'m a bit shy at first. Give me a week.'], lo: ['I get bored. Easily. Like, now-ish.', 'Mornings. Waking up in general.'] },
  money: { hi: ['Of course. I once returned a ¥10,000 note I found on the platform. The police gave me a certificate.', 'I count everything twice. My family hates playing cards with me.'], lo: ['Yes! Totally. Why, did someone say something?', 'Trust is a strong word. But yes!'] },
  rigged: { hi: ['I\'d show them the odds sheet and let them watch me refill it. Honesty sells.', 'I\'d smile and offer them a turn on the luckiest machine.'], lo: ['I\'d say "Yeah, probably," and go on my break.', 'I\'d tell them to complain to you.'] },
  cat: { hi: ['I love cats! I\'ll bring her treats every day.', 'Cats are the best bosses. They never call you in on your day off.'], lo: ['I\'m allergic. *sneeze* But it\'s fine. *sneeze*', 'As long as she doesn\'t sit on the till.'] },
  weekend: { hi: ['Weekends are fine! Holidays too.', 'Any day. I don\'t have much of a social life.'], lo: ['Not Sundays. Sundays are sacred. Sacred to sleeping.', 'Some weekends. Depends.'] },
  gacha: { hi: ['The little food ones! The tiny ramen bowl! The tiny spoon!', 'Anything with cats. Is that obvious?'], lo: ['The expensive ones you can resell?', 'Whatever comes out, I guess.'] },
};

/** What they say when they come in for the interview (by archetype; locals use the generic set). */
export const HELLO = {
  kappa: ['Good afternoon. (He bows very carefully, holding his dish level.)', 'Hello! Kawa... Kappa... I am here for the job. Do you have a tap?'],
  tanuki: ['Ho ho! The shopkeeper! A pleasure, a pleasure! (He shakes your hand. His palm is furry.)', 'Good day, good day! What a prosperous little shop! Prosperous!'],
  salaryman: ['Thank you for this opportunity. (Bow.) I brought my CV. Three copies. (Bow.)', 'Good afternoon. I am early. Twenty minutes early. I waited outside. (Bow.)'],
  gyaru: ['Hiii! Oh my god this place is SO retro! I\'m, like, obsessed!', 'Yaho! Wait, one sec, my friend is... okay! Hi!'],
  robokid: ['Hello! Is this the machine shop? I mean the job! Can I see inside a machine?!', 'Hi! I brought my resume! And a screwdriver! Just in case!'],
  student: ['...Hello. (Yawn.) Sorry. I came straight from bed. I mean, from class.', 'Good... morning? Afternoon? Hello.'],
  ninja: ['(He is suddenly standing right next to you.) Hello. I came in through the door. Normally.', 'Good evening. Do not mind the smoke. It was there before.'],
  ghost: ['Good evening... (The temperature drops. Mikan hisses.) I am here about the night job...', '...One. Two. Three. Hello. Sorry. Hello.'],
  local: ['Hello! I\'m here for the interview. I hope I\'m not too early!', 'Good afternoon! Thank you for seeing me.', 'Hi! Wow, it\'s exactly like I remember from when I was a kid.', 'Hello. I saw your ad on Inspired. I\'m very inspired.'],
};

/** Their reaction when hired / rejected (and what they think of you afterwards). */
export const HIRED = {
  kappa: 'Thank you! I will work hard! (He bows deeply. Water splashes on your shoes.) ...Do you have a towel?',
  tanuki: 'Ho ho! Splendid! You won\'t regret this! (Something that looks like a ¥10,000 note falls out of his sleeve. It\'s a leaf.)',
  salaryman: 'Thank you. Thank you. (Bow. Bow. Bow.) I will not let you down. I will arrive at seven.',
  gyaru: 'KYAAA! Seriously?! I\'m texting everyone! Okay! Okay! Best boss ever!',
  robokid: 'YES! I\'ll bring my tools! And my robot! Okay, not the robot. Maybe the robot.',
  student: 'Oh. Wow. Okay. Cool. I\'ll... be there. Mostly awake.',
  ninja: 'Understood. (He vanishes. A second later the shutter rattles. He was still in the room.)',
  ghost: 'Truly? After three hundred years... a job that isn\'t plates. I will count everything. Everything.',
  local: ['Really?! Thank you so much! I won\'t let you down!', 'Yes! Thank you! When do I start?', 'Oh, thank goodness. Thank you, boss!'],
};
export const REJECTED = {
  kappa: 'I see. (He bows. Water spills. He looks at the puddle for a long time.) ...The river it is, then.',
  tanuki: 'Ho... ho. Your loss, friend! (He leaves a business card. It is a leaf.)',
  salaryman: 'I understand. Thank you for your time. (He bows for an uncomfortably long time.)',
  gyaru: 'Ehhh?! Whatever! Your shop is SO last century anyway! ...It\'s cute though.',
  robokid: 'Oh. Okay. I\'ll... I\'ll come back when I\'ve built a better robot.',
  student: '...Okay. Cool. I\'m going to go have a nap about it.',
  ninja: 'Understood. You were never here. I mean, I was never here.',
  ghost: '...Again. Like the plates. Always one short. (She drifts out through the wall.)',
  local: ['Oh... okay. Thank you for your time.', 'That\'s a shame. Good luck with the shop.', 'Really? Hm. Okay.'],
};

// ------------------------------------------------------------------ on the job
/** Lines while working (by archetype; locals use the generic set). */
export const WORK_LINES = {
  kappa: ['Sweep, sweep, splash.', 'A little water, a lot of work!', 'Cucumber break soon? No? Okay.', 'This floor is cleaner than my river.'],
  tanuki: ['Ho ho! Business is booming!', 'Welcome, welcome, customers of fortune!', 'Pon-poko-pon!', 'Every yen is a friend!'],
  salaryman: ['Excuse me. (Bow.)', 'Pardon me. (Bow.)', 'Thank you for your patronage. (Bow.)', 'Section chief reporting. I mean, staff.'],
  gyaru: ['Omg wait...', 'Totally!', 'Cho kawaii!', 'One sec, one sec...', 'Lucky hands, you\'ll get a rare!'],
  robokid: ['Beep boop. Restocking subroutine engaged!', 'The ratchet on No.2 sounds amazing!', 'If I had servos I could do this in half the time!'],
  student: ['(Yawn.)', 'Mm.', 'Work is just... sleep with your eyes open.', 'Is it nap o\'clock?'],
  ninja: ['...', 'Nobody saw that.', 'Swift as the wind. Normal wind.', '(He was over there. Now he is here.)'],
  ghost: ['One... two... three...', '...eight... nine... TEN. Ten! They are all here!', 'So many capsules. So many to count.'],
  local: ['Irasshaimase!', 'Welcome!', 'Thank you very much!', 'Phew, busy today.', 'Hm hm hm...', 'Almost done here!'],
};
export const GREET_LINES = {
  kappa: ['Welcome! Please do not bow. Please.', 'Irasshaimase!'], tanuki: ['Welcome, welcome! Lucky day today!', 'Ho ho! A customer!'],
  salaryman: ['Irasshaimase. (A 45 degree bow.)', 'Welcome. Thank you for your patronage. (Bow.)'], gyaru: ['Hiii! Welcome!', 'Yaho! Irasshai!'],
  robokid: ['Welcome, human customer!', 'Hi! Machine No.1 is running great today!'], student: ['...Welcome. (Yawn.)', 'Hi.'],
  ninja: ['(Suddenly beside you.) Welcome.', 'Welcome.'], ghost: ['Welcome... (Brr.)', 'Irasshai... maseee...'],
  local: ['Irasshaimase!', 'Welcome!', 'Hello! Have a look around!', 'Welcome to Gacha Garage!'],
};
export const BYE_LINES = { local: ['Thanks, see you tomorrow!', 'Good night, boss!', 'Otsukaresama deshita!', 'See you next shift!'], salaryman: ['Thank you for today. (Bow.) I will return tomorrow at seven.'], ghost: ['The sun is coming... goodbye...'], ninja: ['(Gone.)'], gyaru: ['Bye-bye! Love you! I mean, bye!'], tanuki: ['Ho ho! Until tomorrow, partner!'], kappa: ['Time for my evening soak. Good night!'], student: ['Finally. Bed.'], robokid: ['Logging off! Bye!'] };

/** Pichat messages they send you: at hire, sick days, quitting... by archetype (locals generic). */
export const MSG = {
  hiredLocal: ['Thank you again for the job! See you on my first shift!', 'Hello boss! Saved your number. Looking forward to working with you!'],
  late: { local: ['Sorry!! Train delay! 10 mins!', 'So sorry, overslept, running!'], gyaru: ['omg sry!! boyfriend drama. coming!!'], student: ['zzz... oh no'], kappa: ['Sorry. Stuck in a rainstorm. It was lovely. Coming.'], tanuki: ['Ho ho! Small delay, big profits! On my way!'] },
  report: ['Night report: all quiet. A fox looked at me for a while. I looked back. It left.', 'Night report: chased off two kids trying to shake machine No.1. They ran. I didn\'t have to.', 'Night report: a kappa bowed at me from the lane. I bowed back. Very polite neighbourhood.', 'Night report: an umbrella hopped past. I did not ask questions.', 'Night report: nothing to report. That is the best kind of report.', 'Night report: Gonta tried to stick a note on the shutter. Confiscated. It said "kick me".'],
};

/** Small talk while working: f(ctx) -> line or null. ctx built in chats.js (day numbers, weather, rent, gossip). */
export const SMALL = {
  busy: (c) => c.customers > 25 ? [`${c.customers} customers today! My feet hurt. In a good way.`, `Busy day! ${c.plays} turns on the machines so far.`] : null,
  quiet: (c) => c.customers < 6 && c.hour > 12 ? ['Quiet today, huh. Maybe we need flyers?', 'Not many people today. Is it the weather?'] : null,
  complaints: (c) => c.complaints > 2 ? [`${c.complaints} complaints today... someone said the prices are high.`, 'A customer grumbled about the prices. Just saying.'] : null,
  rent: (c) => c.rentSoon ? ['Isn\'t rent due soon? Mrs. Ota came by and looked at the shutter for a long time.', 'Rent day is coming. Mrs. Ota is never late. She says you shouldn\'t be either.'] : null,
  weather: (c) => c.weather ? [`The radio said ${c.weather.toLowerCase()} tomorrow.`, `Tomorrow: ${c.weather.toLowerCase()}. Good gacha weather. All weather is good gacha weather.`] : null,
  empty: (c) => c.empty ? [`Machine No.${c.empty} is sold out, by the way.`, `No.${c.empty} is empty. Customers keep looking sad at it.`] : null,
  dirty: (c) => c.dirty ? ['The floor\'s getting messy. Just saying.', 'There are capsules all over the floor. Not my fault. Mostly.'] : null,
  payday: (c) => c.payday ? ['It\'s payday soon! Not that I\'m counting. I\'m counting.', 'Friday is payday, right? Right?'] : null,
};
