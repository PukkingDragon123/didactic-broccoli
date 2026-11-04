// Grandpa's words and numbers: who he is, how he sounds, where he stands for each opening job and what he says
// there (src/grandpa/director.js reads STEPS), what he says when you slap him, drop things or pet the cat, his
// anecdotes, and the phone calls and the postcard after he's gone (src/grandpa/phone.js).
// He's Tokuzō (Toku-san to the lane, "the old man from the gacha garage"), 81, ran the garage from 1958, bad back,
// moving to his sister Fumiko's in Atami by the sea. Dry, warm, a bit sad, never sappy. He calls you kiddo.

export const NAME = 'Tokuzō';
export const NAME_TAG = 'Grandpa';
export const PHONE = '0557-81-1937';
export const SISTER = 'Fumiko';
export const TOWN = 'Atami';
/** 8-bit voice: low, a square-ish wave, a chirp every third letter (src/grandpa/Grandpa.js gpVoice). */
export const VOICE = { base: 112, duty: 0.5, vol: 0.85 };
/** Real voice (src/talk/speech.js): a slow, low old man. */
export const TTS = { gender: 'm', pitch: 0.55, rate: 0.8, seed: 1937, volume: 1 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];
export { pick };

// ------------------------------------------------------------------ day one, job by job
// at: where he stands ([x, z], snapped to his walking grid), face: what he faces / looks at ([x, y, z]), sit: on his
// stool out front instead, say: what he says when the job comes up (one line after another), card: the short line
// on the objective card, nudge: when you dawdle, done: when it's finished, act: what his arm does while he explains
// ('point' at `face`, 'thump', ...), demo: walk up and show you first.
export const STEPS = {
  letter: {
    sit: true, face: [0.85, 1.32, 5.1], act: 'point',
    say: ["That envelope on the shutter's from me.", 'Wrote it in case I fell asleep before you got here.', 'Read it anyway. Took me all morning.'],
    card: 'My letter on the shutter. Took me all morning.',
    nudge: ['The letter, kiddo. On the shutter.', "It's the one that says KIDDO. That's you.", 'My handwriting won\'t bite.'],
    done: ['Good handwriting, eh? Your grandmother made me practise. Forty years, she never stopped correcting it.'],
  },
  shutter: {
    sit: true, face: [0.2, 0.6, 5.1], act: 'point',
    say: ["Key's on your ring. Padlock's stiff.", 'Like me.'],
    card: "Key's on your ring. The padlock's stiff.",
    nudge: ['The shutter, kiddo. Key, lock, turn.', "I'd do it myself, but then what are you for?", 'Select the key. Click the shutter. Modern problems.'],
    done: ['Listen to it squeak. Forty-one years it\'s squeaked like that.'],
  },
  read_power: {
    at: [1.55, 1.55], face: [0.2, 0.8, 0.42], act: 'point',
    say: ["My note's on the counter. Power first.", 'Always power first.'],
    card: 'Note on the counter. Power first.',
    nudge: ['Counter. White note. Can\'t miss it.', "You can't fix what you can't see. Note on the counter."],
    done: ['Big letters. For my eyes, not yours.'],
  },
  breaker: {
    at: [1.75, -3.7], face: [1.12, 2.0, -4.89], act: 'point', demo: { at: [1.15, -4.18], act: 'thump' },
    say: ['Breaker. Grey box by the back door.', "Flip it up. If it sticks, give it one of these."],
    card: 'Grey box by the back door. Flip it up.',
    nudge: ["Oi. The breaker's back here.", "Grey box. Back wall. It won't flip itself.", 'Up, kiddo. The lever goes up.'],
    done: ['There she is. Hear that hum?', "That's the old girl waking up."],
    doneAct: 'thumbs',
  },
  lights: {
    at: [1.75, -3.7], face: [0.88, 1.2, -4.99], act: 'point',
    say: ['Light switch. Same wall.'],
    card: 'Light switch, same wall.',
    nudge: ['Lights, kiddo. I\'m old, not a bat.', 'Switch is left of the breaker.'],
    done: ['Ugh. Now I can see the dust.', 'I liked it better dark.'],
  },
  window: {
    at: [-1.4, 0.9], face: [-4, 2.1, 1.85], act: 'point',
    say: ['Now open that window before we both die of cardboard.'],
    card: 'Open the window. It stinks of cardboard.',
    nudge: ['Window. Left wall. I can taste the cardboard.', 'Air, kiddo. Please.'],
    done: ['Ahh. Air.', 'Smells like the lane again.'],
    doneAct: 'fan',
  },
  read_clean: {
    at: [1.6, -3.2], face: [2.52, 0.72, -4.53], act: 'point',
    say: ["Next note's on the sink. Cleaning.", "You'll love it."],
    card: 'Note on the sink. Cleaning.',
    nudge: ['Sink. Back right. Note.', "The note on the sink won't read itself. I tried."],
  },
  wipe: {
    at: [1.75, -1.0], face: [0.2, 0.8, 0.1], act: 'point',
    say: ["Rag's by the tap. Wet it first.", 'Dry wiping just moves the dust about.'],
    card: 'Wet the rag at the sink. Wipe the counter.',
    nudge: ['Counter, kiddo. Wet rag. Wipe.', "Four dusty spots. I counted. I had time."],
    done: ['Shiny.', "Your grandmother would've done it in half the time. And told you so."],
  },
  read_tin: {
    at: [-0.5, -3.3], face: [-1.18, 1.43, -4.45], act: 'point',
    say: ['Yellow note on the steel rack. About my tin.'],
    card: 'Yellow note on the steel rack.',
    nudge: ['Steel rack, back left. Yellow note.'],
  },
  tin: {
    at: [-0.5, -3.3], face: [-1.52, 1.75, -4.66], act: 'point',
    say: ['My biscuit tin. Savings.', 'No biscuits, sorry. I ate those in March.'],
    card: 'My tin. Savings for brooms and milk.',
    nudge: ['The tin, kiddo. Top shelf.', "That tin's heavier than it looks. Like me."],
    done: ["That's for brooms and milk. Not capsules.", "I'll know."],
  },
  tray: {
    at: [-1.6, -1.0], face: [-0.52, 0.78, -0.2], act: 'point',
    say: ["Coin bag's the change float.", 'Tip it in the tray on the counter. Kids pay in coins.'],
    card: 'Coin bag into the tray on the counter.',
    nudge: ['The tray, kiddo. Little rubber one on the counter.'],
    done: ['Never be short of change. Kids cry. Then their mothers come.'],
    doneAct: 'thumbs',
  },
  read_junk: {
    at: [-2.0, -1.5], face: [-3.2, 0.6, 0.3], act: 'point',
    say: ['Those boxes are my junk. Note on them.', 'Read it before you bin anything.'],
    card: 'Note on my junk boxes.',
    nudge: ['The boxes by the wall. Note on top.'],
  },
  junk: {
    at: [-2.0, -1.5], face: [-3.2, 0.6, 0.3], act: 'point',
    say: ['Old machine parts, mostly.', 'Look inside before they go. I lose things in boxes.'],
    card: 'Look inside. Keep anything that says OPEN.',
    nudge: ['The boxes, kiddo. Look inside.', "I lost my glasses in one of those once. Found them in '86. On my head."],
    done: ['Out they go. Forty years of "I\'ll fix it later".'],
  },
  read_cat: {
    at: [0.2, 2.9], face: [-0.95, 0.6, 1.55], act: 'point',
    say: ["Note on the heater's about...", '...the cat.'],
    card: 'Note on the heater. About the cat.',
    nudge: ['Heater. Note. Cat business.'],
  },
  shop: {
    sit: true, face: [-10.5, 1.4, 14.5], act: 'point',
    say: ["Mikawa-ya's across the lane. Milk, a broom, a new tube.", "Tell Mikawa-san it's on my tab.", '...I have no tab. Pay him.', "I'll be out front. My back says so."],
    card: "Mikawa-ya, across the lane. I'll wait out front.",
    nudge: ["Mikawa-ya's that way. The little shop on the corner.", "Don't keep Mikawa-san waiting. He'll fall asleep."],
  },
  feed: {
    at: [0.6, 3.6], face: [-0.95, 0.2, 2.38],
    say: ['Milk in the bowl by the heater.', "Then stand back. She doesn't like being watched. Same as me."],
    card: "Milk in the bowl by the heater. Then stand back.",
    nudge: ['The bowl, kiddo. By the heater.', "She's hiding, but she's hungry. She's always hungry."],
    done: ['Look at that. Took me two years.', 'Took you one carton.'],
  },
  tube: {
    at: [1.7, 2.3], face: [0, 2.75, 0.8], act: 'point',
    say: ['Left tube died at Obon.', "Swap it. Don't fall. I can't catch you."],
    card: "The dead tube. Don't fall, I can't catch you.",
    nudge: ['The dark tube, kiddo. Up there.'],
    done: ['Let there be light.', 'Again.'],
    doneAct: 'thumbs',
  },
  sweep: {
    at: [0.9, 4.0], face: [0, 0.2, 0], act: 'point',
    say: ['Sweep toward the shutter.', 'Dust goes outside where it belongs. My father\'s rule.'],
    card: 'Sweep the dust toward the shutter.',
    nudge: ['Broom, kiddo. Dust.', "The dust won't leave on its own. I gave it years."],
    done: ["Look at that floor. Haven't seen it since 1991."],
  },
  bag: {
    at: [1.8, 2.0], face: [1.25, 0.3, 2.7], act: 'point',
    say: ['Bin bags under the sink. Bag it up, tie it off.'],
    card: 'Bin bags under the sink. Bag it up.',
    nudge: ['Bag the rubbish, kiddo.', 'Tie it tight. The crows read loose knots.'],
    done: ['Tied like a sailor.', '...A bad sailor. It\'ll do.'],
  },
  trashout: {
    sit: true, face: [-6.6, 0.8, 5.8], act: 'point',
    say: ['Garbage station, left of here, past my notice board.', "Burnable today. Don't let the crows see you."],
    card: 'All of it to the garbage station. Mind the crows.',
    nudge: ['Station\'s that way, kiddo. Left.', "Those bags won't walk. I've asked."],
    done: ['Clean. Clean!', 'I could cry. I won\'t. But I could.'],
  },
};

// ------------------------------------------------------------------ reactions
export const REACT = {
  slap: ["Ow! I'm eighty-one!", 'Did you just... I changed your nappies!', 'Hit an old man. In his own lane.', 'Your mother will hear about this.'],
  slapAgain: ["Once more and I'm leaving you the cat AND the gas bill.", 'I have a cane, kiddo. I know how to use it.', 'Fine. I deserved that one. For something. In 1987.'],
  drop: ['Butterfingers.', "Pick that up. It's not a tip.", 'Dropped it? I do that. What\'s your excuse?', "That's how I lost my teeth. Don't ask."],
  pet: ["She lets you pet her? She bit me in '96.", 'Behind the ears. She likes behind the ears.', "Look at that. Traitor. I fed her for years."],
  hold: ['Careful with her. She... huh. She likes you.', "Don't let her sit on your head. She's done it to me."],
  stare: ['What? Something on my face?', 'I know. I got old. It happens.', "Take a picture. It'll last longer. I won't."],
  run: ["Walk! You'll break something. Probably me.", 'No running in the garage. House rule. Since 1958.'],
  radio: ['My station! Still there. Like everything else round here.'],
  milk: ['Milk! Good. Not for you.'],
  blocked: ['Mind out, kiddo.', 'Excuse me. Old man coming through.', "You're standing where I'm going."],
  van: ["Leaving already? The clutch'll bite you again."],
  far: ['Oi! Where are you off to?', 'Kiddo! Back here!', "Don't wander off. The lane eats people. Mostly their money."],
  idle: ['Take your time. Not too much. I\'m eighty-one.', 'Day-dreaming? I used to do that. Then I got customers.', 'Hm. You remind me of me. Slow.'],
};

// ------------------------------------------------------------------ clicking him: a little chat
export const ANECDOTES = [
  ["In '64 we had the Olympics on a little TV on the counter.", 'Kids came for the capsules, stayed for the volleyball.', 'I sold out of everything. Even the TV.'],
  ["Your grandmother hated the machines at first.", 'Then she pulled a tiny ceramic cat. Second turn.', 'She kept it by the bed forty years. I never told her I rigged it.'],
  ['A boy once paid me in buttons.', 'Six buttons. I let him turn.', "He's a dentist now. Still owes me six buttons."],
  ['The secret figures are one in five hundred.', "People think I knew where they were. I didn't.", 'I just looked very wise.'],
];
export const BACK = ['Bad. Thank you for asking. Bad.', "It's fine as long as I don't bend, lift, sit, stand or think about it.", "Doctor says it's my age. I said I'm eighty-one, what's my excuse at eighty?"];

// ------------------------------------------------------------------ phone calls after he's gone (src/grandpa/phone.js)
// A script is a list of steps: a string (he says it) or { ask: [[label, reply], ...] } (you pick; he answers).
export const CALLS = {
  arrived: [
    "Kiddo? It's me. Grandpa. ...Your grandpa.",
    "I'm at Fumiko's. Arrived in one piece. Mostly one piece.",
    { ask: [['How was the trip?', 'The man next to me ate dried squid for three hours. I smell like a harbour.'], ['How\'s your back?', 'Better. Fumiko made me lie on the floor. Now I can\'t get up. Very relaxing.'], ['Miss me already?', 'Ha! ...A bit. The sea\'s very loud. The lane was quieter. Except the trains.']] },
    "Found my note on the computer desk? Machines are on the computer now. Mr. Daikoku's nephew set it up.",
    { ask: [["I'll manage.", "That's the spirit."], ["What's a computer?", 'Ha. Me neither. Press things until it works. That\'s what I did.']] },
    "Right. This is long distance. Fumiko's watching the clock like a hawk. Bye, kiddo.",
  ],
  machine: [
    'Kiddo. Mikawa-san phoned. He says a van came with a big box.',
    'A machine! Already! Used or new?',
    { ask: [['Used. Like you said.', 'Good. Used ones have stories.'], ['New and shiny.', "Shiny! Flash. Don't tell Mr. Daikoku I said flash."]] },
    'Unbox it, plug it in, fill it up. Kids pay a hundred. Then hang my sign.',
    "...I'm proud of you. That's all. Bye.",
  ],
  opened: [
    'I heard. Mikawa-san phoned. Then the Ota lady. Then Mr. Mori. He shouted. He can\'t hear.',
    'The garage is open again.',
    "...I'm not crying. It's the onsen steam.",
    { ask: [['Kids came, Grandpa.', "Kids came. Good. That's all it ever was."], ['Everyone danced.', "Danced! In my lane! Was Mr. Mori dancing? He can't hear the music. He just feels it."]] },
    "Flip the sign every morning, flip it back every night. That's the whole job. The rest is just toys.",
    'Bye. Bath time.',
  ],
  checkin: [
    ["Kiddo. It's Grandpa. The sea's doing that thing where it's very big.", { ask: [["It's raining here.", 'Here it rains sideways. Fumiko says that\'s normal. Nothing about Fumiko is normal.'], ['Sounds nice.', 'It is. Don\'t tell her I said so.']] }, 'Right. Long distance. Bye.'],
    ["It's me. Fumiko made me do radio calisthenics. At six. In the morning.", "I'm on holiday!", { ask: [['Good for your back.', 'That\'s what she said. You two are in league.'], ['Did you do them?', 'I did the first one. Then I lay down for the rest.']] }, 'Bye, kiddo.'],
    ['Kiddo. Is Mikan eating?', { ask: [['Like a horse.', "Good. Don't give her the expensive stuff. She'll expect it."], ['She sat on my shoes.', 'She did that to me in 1995. Then she owned me.']] }, "That's all. I just wondered. Bye."],
    ['How many turns today? Don\'t tell me. I\'ll worry.', '...Tell me.', { ask: [['Lots!', 'Lots! Good. Lots is good.'], ['A few.', 'A few is how it starts. Hand out flyers. Smile at the mothers.']] }, 'Right. Bye.'],
    ['It\'s Grandpa. A thing I forgot to write down.', "Kids lie about how many turns they've had. Let them. It's part of it.", { ask: [['Okay.', 'Okay. Good.'], ["You wrote everything down. Twice.", "And still forgot one. That's being old."]] }, 'Bye, kiddo.'],
    ['Kiddo. I carried a watermelon today.', "Fumiko says it was a small one. It wasn't.", { ask: [['Your back!', "My back's fine. My pride's sore. She made me put it down."], ['Proud of you.', "Ha! Now you know how it feels. Bye."]] }],
  ],
  // you dialled him (Phone > phone book): whatever's on his mind
  dialled: [
    ['Fumiko residence. ...Oh! Kiddo!', 'Everything all right? The shop? The cat? The breaker?', { ask: [['All good.', 'Good. Good. Then why are you calling? ...I\'m joking. It\'s nice.'], ['Just wanted to hear you.', '...Well. Here I am. Loud as ever.']] }, 'Go on, back to work. Bye.'],
    ['Hello? ...Kiddo! You found the number.', "Don't ring after eight. I'm in the bath. I'm always in the bath.", { ask: [['How\'s the sea?', 'Still there. Very wet.'], ['How\'s your back?', 'Better. Don\'t tell anyone. I enjoy the sympathy.']] }, 'Bye, kiddo.'],
  ],
};

export const POSTCARD = {
  subject: 'Postcard from Atami (typed by Takumi)',
  body: "Kiddo,\n\nFumiko's grandson Takumi is typing this. He says the computer can send pictures. I said send a postcard then. He said that's not how it works. Here's a postcard.\n\nThe sea is very big. The baths are very hot. Fumiko's cat hates me. Your cat is better.\n\nMikawa-san phones me every evening with the news. He says the kids are back. That's all I wanted.\n\nOil the red machine's handle once a season.\n\n- Grandpa\n\n(Takumi here. He made me type 'very' four times. I took two out.)",
};
