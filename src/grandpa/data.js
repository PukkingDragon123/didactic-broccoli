// Grandpa's words and numbers: who he is, how he sounds, where he stands for each opening job and what he says
// there (src/grandpa/director.js reads STEPS), how he keeps you to it (SCOLD), what he says when you slap him, drop
// things or pet the cat, his stories, and the phone calls after he's gone (src/grandpa/phone.js).
// He's Tokuzō (Toku-san to the lane, "the old man from the gacha garage"), 81, ran the garage from 1958, bad back,
// moving to his sister Fumiko's in Atami by the sea. Gruff, practical, warm underneath, says what he means and
// doesn't do jokes for the sake of it. Strict about the work: he shows you once, then expects it done. Calls you kiddo.

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
// on the objective, nudge: when you dawdle (they get sharper), done: when it's finished, act: what his arm does while
// he explains ('point' at `face`, 'thump', ...), demo: walk up and show you first. There are no notes: he tells you.
export const STEPS = {
  shutter: {
    sit: true, face: [0.2, 0.6, 5.1], act: 'point',
    say: ["Shutter first. The key's on your ring.", 'The padlock sticks. Turn it hard.'],
    card: "Key's on your ring. Turn it hard, it sticks.",
    nudge: ['The shutter, kiddo. Key, padlock.', "Hold the key and use it on the padlock. Go on.", "I'm not getting up to do it for you."],
    done: ['That noise. Forty-one years it has made that noise.'],
  },
  breaker: {
    at: [1.75, -3.7], face: [1.12, 2.0, -4.89], act: 'point', demo: { at: [1.15, -4.18], act: 'thump' },
    say: ['Power. The grey box by the back door is the main breaker.', 'Flip it up. If it sticks, hit it here, flat hand.'],
    card: 'Grey box by the back door. Flip it up.',
    nudge: ["The breaker's back here. Come on.", 'Grey box, back wall. Lever up.', "I showed you once already. Up."],
    done: ['There. Hear the fridge? That means it took.'],
    doneAct: 'thumbs',
  },
  lights: {
    at: [1.75, -3.7], face: [0.88, 1.2, -4.99], act: 'point',
    say: ['Light switch, same wall, left of the breaker.'],
    card: 'Light switch, same wall.',
    nudge: ["Lights, kiddo. I can't see a thing.", 'Left of the breaker. The switch.'],
    done: ['Now you can see the state of it. Three years of dust.'],
  },
  window: {
    at: [-1.4, 0.9], face: [-4, 2.1, 1.85], act: 'point',
    say: ['Open that window. The whole place smells of wet cardboard.'],
    card: 'Open the window. It smells of wet cardboard.',
    nudge: ['The window, left wall.', 'Air, kiddo. Open it.'],
    done: ['Better. That smells like the lane again.'],
    doneAct: 'fan',
  },
  wipe: {
    at: [1.75, -1.0], face: [0.2, 0.8, 0.1], act: 'point',
    say: ["Now the counter. There's a rag by the tap at the sink.", 'Wet it first. A dry rag just pushes the dust around.'],
    card: 'Wet the rag at the sink. Wipe the counter.',
    nudge: ['Counter. Wet rag. Wipe.', 'Four dusty patches. Get all of them.', "You've stopped. Why have you stopped?"],
    done: ['Good. Your grandmother wiped that counter every morning before opening.'],
  },
  tin: {
    at: [-0.5, -3.3], face: [-1.52, 1.75, -4.66], act: 'point',
    say: ['My biscuit tin, top shelf of the steel rack. My savings are in it.', "It's for brooms and milk and what the shop needs. Not for capsules."],
    card: 'My tin, top shelf. Savings for what the shop needs.',
    nudge: ['The tin, top shelf.', "Get the tin down. Carefully, it's heavy."],
    done: ["That's for the shop. Spend it on the shop."],
  },
  tray: {
    at: [-1.6, -1.0], face: [-0.52, 0.78, -0.2], act: 'point',
    say: ['The cloth bag is the change float.', 'Tip it into the coin tray on the counter. Kids pay in coins.'],
    card: 'Coin bag into the tray on the counter.',
    nudge: ['The tray, kiddo. The rubber one on the counter.', 'Coin bag, tray. Then we move on.'],
    done: ["Always keep change. Nothing worse than turning a kid away for change."],
    doneAct: 'thumbs',
  },
  junk: {
    at: [-2.0, -1.5], face: [-3.2, 0.6, 0.3], act: 'point',
    say: ['Those boxes by the wall are old machine parts. Junk, mostly.', 'Look inside before they go out. My old OPEN sign is in one of them somewhere.'],
    card: 'Look inside. Keep anything that says OPEN.',
    nudge: ['The boxes, kiddo. Look inside.', 'Open them. Both of them.'],
    done: ['Out they go, then. Forty years of "I\'ll fix it later".'],
  },
  shop: {
    sit: true, face: [-10.5, 1.4, 14.5], act: 'point',
    say: ["Now Mikawa-ya, across the lane. Milk for the cat, a broom, a new tube for the light.", "Pay from the tin money. I'll wait out here. Straight there and straight back."],
    card: 'Mikawa-ya, across the lane. Straight there and back.',
    nudge: ["Mikawa-ya's on the corner. That way.", "Mikawa-san closes for lunch. Hurry up."],
  },
  feed: {
    at: [0.6, 3.6], face: [-0.95, 0.2, 2.38],
    say: ['Milk in the bowl by the heater.', "Then step back. She won't come out while you're watching."],
    card: "Milk in the bowl by the heater. Then step back.",
    nudge: ['The bowl, kiddo. By the heater.', "She's hungry. Don't make her wait."],
    done: ['Look at that. She came out for you. It took me two years.'],
  },
  tube: {
    at: [1.7, 2.3], face: [0, 2.75, 0.8], act: 'point',
    say: ['The left tube went at Obon. Swap in the new one.', 'Careful on your feet.'],
    card: 'Swap the dead tube. Careful on your feet.',
    nudge: ['The dark tube, up there.', 'Hold the new tube and reach up.'],
    done: ['Good. Light everywhere now.'],
    doneAct: 'thumbs',
  },
  sweep: {
    at: [0.9, 4.0], face: [0, 0.2, 0], act: 'point',
    say: ['Sweep towards the shutter.', 'Dust goes out the front. That was my father\'s rule.'],
    card: 'Sweep the dust towards the shutter.',
    nudge: ['Broom, kiddo. The dust.', "There's still dust in the corners. I can see it from here."],
    done: ["I haven't seen this floor this clean since 1991."],
  },
  bag: {
    at: [1.8, 2.0], face: [1.25, 0.3, 2.7], act: 'point',
    say: ['Bin bags under the sink. Bag up the rubbish and tie them off.'],
    card: 'Bin bags under the sink. Bag it up.',
    nudge: ['Bag the rubbish, kiddo.', 'Tie them tight or the crows get in.'],
    done: ['Good knots. It\'ll do.'],
  },
  trashout: {
    sit: true, face: [-6.6, 0.8, 5.8], act: 'point',
    say: ['All of it to the garbage station. Left of here, past the notice board.', "Burnable goes today. Don't leave bags in the lane."],
    card: 'All of it to the garbage station, left of here.',
    nudge: ["The station's that way, kiddo. Left.", "Those bags won't carry themselves."],
    done: ['Clean. The garage is clean.', "...Give me a minute. I didn't think I'd see it like this again."],
  },
  pc: {
    at: [2.65, -3.1], face: [3.62, 1.0, -3.95], act: 'point',
    say: ['Last thing. Sit down at the computer.', "It's how you buy machines and capsules now. Daikoku's nephew set it up for me.", "There's not much on it yet. The Navigator for shopping and Pichat for messages. Have a look."],
    card: 'Sit down at the computer. Have a look.',
    nudge: ['The computer, kiddo. Sit down.', 'Over here. The desk.'],
    done: ['Good. You know more about those things than I ever will.'],
  },
};

// ------------------------------------------------------------------ keeping you to it (src/grandpa/director.js)
// He doesn't let you skip ahead or wander off while there's work. Lines get sharper the more you test him.
export const SCOLD = {
  // you walked off while the job is right here
  away: ["Oi! Where are you going? We're not finished.", 'Kiddo! Back here. The work is in the garage.', "Don't walk off on me. Back inside.", "I didn't stand out here on this back to watch you wander off."],
  // you kept going: he fetched you back
  haul: ['One job at a time. This one.', "Your mother did that too. Wandered off halfway through. Not today.", "When I'm showing you something, you stay and watch.", 'That\'s twice now. Stay where I can see you.', "I'm eighty-one. Don't make me come after you again."],
  // you tried to jump ahead
  early: {
    pc: ['Leave the computer. That comes last.', "Not yet. The computer's for when the place is clean."],
    board: ["Odd jobs can wait. We finish the garage first.", 'Leave the board. You have work here.'],
    van: ["You're not going anywhere. Shut the door.", "The van stays where it is. You've only just got here."],
  },
  // you haven't moved for a long while
  idle: ["Are you listening to me?", "Kiddo. I'm not saying it again.", "My taxi comes at six. Today, please.", "Standing there won't get it done."],
  // you're slow but trying
  slow: ['Take your time. Not all day, but take your time.'],
};

// ------------------------------------------------------------------ reactions
export const REACT = {
  slap: ['Ow! What was that for?', "Hey! I'm eighty-one!", "Don't you raise your hand to me.", 'Your mother will hear about this.'],
  slapAgain: ['Enough. I mean it.', "Do that again and you'll do the rest of it on your own.", 'I raised your mother better than this, and she raised you.'],
  drop: ["Pick that up. It's a shop, not a tip.", "Careful. Don't leave things on the floor.", 'Butterfingers.'],
  pet: ["She lets you pet her? She bit me in '96.", 'Behind the ears. She likes that.', "Well. She's never done that for me."],
  hold: ['Careful with her. ...She likes you.', "Put her down gently when you're done."],
  stare: ['What? Have I got something on my face?', "Don't stare, kiddo. Get on with it."],
  run: ["Walk! You'll knock something over.", 'No running in the garage. Never has been.'],
  radio: ['My station. Still on the same frequency.'],
  milk: ['Milk. Good. That goes in the bowl.'],
  blocked: ['Mind out, kiddo.', 'Let me through.', "You're standing where I'm going."],
  van: ["Leaving already? The clutch will get you again."],
  far: ['Oi! Where are you off to?', 'Kiddo! Back here!', "Don't wander off."],
  calling: ['Kiddo! Over here.', 'This way. Come on.', 'Over here, where I am.'],
  money: ["You spent the tin money on what? ...Here. That's the last of mine.", "Here. Don't tell me what happened to the rest."],
};

// ------------------------------------------------------------------ clicking him: a little chat
export const ANECDOTES = [
  ["In '64 we put a little TV on the counter for the Olympics.", 'Kids came for the capsules and stayed for the volleyball.', 'Best summer the shop ever had.'],
  ["Your grandmother didn't like the machines at first.", 'Then she got a little ceramic cat out of one, second turn.', 'She kept it by the bed for forty years.'],
  ['A boy once paid me in buttons. Six buttons.', 'I let him turn the handle anyway.', "He's a dentist in Sendai now. Sends a card every New Year."],
  ['The secret figures are about one in five hundred.', "People thought I knew which capsule had one. I never did.", 'Nobody does. That\'s the point.'],
];
export const BACK = ["Bad. Thank you for asking.", "It's all right if I don't bend, lift or sit on anything low.", "The doctor says rest. I say I'll rest in Atami."];

// ------------------------------------------------------------------ phone calls after he's gone (src/grandpa/phone.js)
// A script is a list of steps: a string (he says it) or { ask: [[label, reply], ...] } (you pick; he answers).
export const CALLS = {
  arrived: [
    "Kiddo? It's me. Grandpa. ...Your grandpa.",
    "I'm at Fumiko's. Got here an hour ago.",
    { ask: [['How was the trip?', 'Long. Three changes. I slept from Odawara.'], ['How\'s your back?', 'Stiff from the train. Fumiko has me lying on the floor.'], ['Miss me already?', '...A bit. The sea is loud here. I\'m used to trains.']] },
    "Remember: odd jobs on the board for money, then a machine off the computer. Bank first.",
    { ask: [["I'll manage.", 'I know you will.'], ["What if I get stuck?", 'Ring me. Not after eight.']] },
    "Right. This is long distance and Fumiko is watching the clock. Bye, kiddo.",
  ],
  machine: [
    'Kiddo. Mikawa-san phoned. He says a van came with a big box.',
    'A machine already. Used or new?',
    { ask: [['Used, like you said.', 'Good. The old ones are built better.'], ['New.', 'New. Well, it\'s your money now. Your shop.']] },
    'Unbox it, plug it in, fill it, price it. Kids pay a hundred. Then hang my sign.',
    "...I'm proud of you. That's all. Bye.",
  ],
  opened: [
    'I heard. Mikawa-san phoned, then Mrs. Ota, then Mr. Mori.',
    'The garage is open again.',
    "...Give me a second.",
    { ask: [['Kids came, Grandpa.', "Kids came. Good. That's all it ever was."], ['The whole lane came out.', "The whole lane. Was Mr. Mori there? He never misses anything, even if he can't hear it."]] },
    "Flip the sign every morning, flip it back every night. That's the job. The rest you learn.",
    'Bye, kiddo. Bath time.',
  ],
  checkin: [
    ["Kiddo. It's Grandpa. Just checking in.", { ask: [["It's raining here.", "Here too. Fumiko says it rains sideways off the sea in autumn."], ['All good here.', 'Good. That\'s what I wanted to hear.']] }, 'Right. Long distance. Bye.'],
    ["It's me. Fumiko has me doing radio exercises at six in the morning.", { ask: [['Good for your back.', "That's what she says. You two would get on."], ['Did you do them?', 'The first half. Then I sat down.']] }, 'Bye, kiddo.'],
    ['Kiddo. Is Mikan eating?', { ask: [['Every morning.', "Good. Don't give her the expensive tins. She'll expect them."], ['She sleeps on my shoes.', 'She did that to me for years.']] }, 'That\'s all. I just wondered. Bye.'],
    ['How many turns today?', { ask: [['Lots.', 'Good. Busy is good.'], ['A few.', 'It builds. Hand out flyers. Talk to the mothers.']] }, 'Right. Bye.'],
    ["It's Grandpa. Something I forgot to tell you.", "Kids lie about how many turns they've had. Let them. It's part of it.", { ask: [['Okay.', 'Okay. Good.'], ["Anything else you forgot?", 'Probably. I\'ll ring when I remember.']] }, 'Bye, kiddo.'],
    ['Kiddo. I carried a watermelon home from the market today.', { ask: [['Your back!', "My back's fine. Fumiko took it off me halfway."], ['Sounds like you\'re better.', 'A little. The baths help.']] }, 'Bye.'],
  ],
  // you dialled him (Phone > phone book): whatever's on his mind
  dialled: [
    ['Fumiko residence. ...Oh. Kiddo.', 'Everything all right? The shop? The cat?', { ask: [['All good.', 'Good. Then I can stop worrying for a day.'], ['Just wanted to hear you.', '...Well. Here I am.']] }, 'Go on, back to work. Bye.'],
    ['Hello? ...Kiddo. You found the number.', "Not after eight, remember. I'm in the bath.", { ask: [['How\'s the sea?', 'Big and grey today. I walked along it this morning.'], ['How\'s your back?', 'Better. A little better every week.']] }, 'Bye, kiddo.'],
  ],
};
