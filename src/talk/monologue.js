// Talking to yourself: short inner-monologue murmurs, spoken in your own voice and floating low in the view. They come
// at moments that matter (an empty wallet, a secret pull, a bill arriving, being up far too late, a prank you only
// notice later...) and whenever you press T to think out loud about where you are and how the day is going.
//   game.monologue.say(text, { force })     murmur something (rate-limited unless forced)
import { talk as blipVoice } from '../people/voice.js';
import { getItem } from '../data/series/index.js';
import { formatYen } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Monologue {
  constructor(game, speech) {
    this.game = game;
    this.speech = speech;
    const el = document.createElement('div');
    el.id = 'tk-self';
    document.body.appendChild(el);
    this.el = el;
    this.t = 0; this.life = 0; this.last = -99; this.queue = [];
    this.blip = blipVoice(null, { base: 245, duty: 0.25, vol: 0.55 });
    this.flags = {};
    this.hook();
  }

  /** Your own voice for real speech: from your character's body type. */
  get profile() {
    const a = this.game.state.avatar || {};
    const f = a.body === 'f';
    return { gender: f ? 'f' : 'm', pitch: f ? 1.12 : 0.95, rate: 1.04, seed: 11, volume: 0.75 };
  }

  say(text, { force = false } = {}) {
    if (!text) return;
    const g = this.game;
    if (!force && g.time - this.last < 5) { if (this.queue.length < 2) this.queue.push({ text, t: g.time }); return; }
    this.last = g.time;
    this.text = String(text);
    this.el.innerHTML = '<span></span>';
    this.span = this.el.firstChild;
    this.shown = 0; this.t = 0;
    this.life = Math.max(3.2, 1.4 + this.text.length * 0.06);
    this.el.style.opacity = '0';
    this.speech?.speak(this.text, this.profile, { priority: 'self' });
    g.events.emit('monologue', { text: this.text });
  }

  update(dt) {
    const g = this.game;
    if (this.text) {
      this.t += dt;
      // type it out (with a quiet blip), stepped fade in and out
      const n = Math.min(this.text.length, Math.floor(this.t * 40));
      if (n > this.shown) { for (let i = this.shown; i < n; i++) this.blip(this.text[i]); this.shown = n; this.span.textContent = this.text.slice(0, n); }
      const k = this.t < 0.15 ? Math.ceil((this.t / 0.15) * 3) / 3 : this.t > this.life ? Math.max(0, 1 - Math.floor(((this.t - this.life) / 0.3) * 4) / 4) : 1;
      this.el.style.opacity = k.toFixed(2);
      if (this.t > this.life + 0.3) { this.text = null; this.el.textContent = ''; }
    } else if (this.queue.length && g.time - this.last > 2.5) {
      const q = this.queue.shift();
      if (g.time - q.t < 8) this.say(q.text, { force: true }); // a thought that's gone stale stays unsaid
    }
    // thinking out loud on demand
    // (T is the chat key in a multiplayer room, and labels a cardboard box you're looking at)
    if (g.input.keyPressed?.('KeyT') && g.input.locked && !g.uiOpen && !g.pc?.active && !g.cutscene?.active && !g.mp?.active
      && g.interaction?.hover?.obj?.userData?.piece?.def?.feature !== 'storage') this.say(this.musing(), { force: true });
    this.watch(dt);
  }

  /** Context checks a few times a second: late nights, the wallet. */
  watch(dt) {
    const g = this.game, c = g.clock;
    if ((this.wT = (this.wT || 0) - dt) > 0) return;
    this.wT = 1;
    if (!c || g.cutscene?.active || g.talk?.active) return;
    const h = c.hours, day = c.day;
    if ((h >= 23.5 || h < 3) && this.flags.tired !== day) { this.flags.tired = day; this.say(pick(['*yawn* ...I should really get some sleep.', 'It\'s so late. My eyes are closing on their own.', 'Even the cat went to bed. What am I doing?'])); }
    if (g.state.money < 100 && this.flags.broke !== day && g.story?.done) { this.flags.broke = day; this.say(pick(['My wallet is... empty. Time to empty the coin boxes.', `${formatYen(g.state.money)}. That's it. That's all I have.`, 'Empty wallet. Grandpa never told me this part.'])); }
    const kick = g.state.flags?.kickMe;
    if (kick && c.stamp - kick > 20 && !this.flags.kick) { this.flags.kick = true; g.state.flags.kickMe = 0; this.say("Why does everyone keep laughing... wait. There's a note on my back. 'KICK ME'. GONTA!"); }
  }

  /** What you think about when you think out loud (T). */
  musing() {
    const g = this.game, c = g.clock, p = g.player.pos;
    const h = c?.hours ?? 15;
    const out = [];
    const empty = g.machines.filter((m) => m.data.stock.length === 0).length;
    const coins = g.machines.reduce((a, m) => a + (m.data.cash || 0), 0);
    if (empty) out.push(empty === 1 ? 'One of the machines is sold out. I should restock it.' : `${empty} machines are empty. That's money walking past.`);
    if (coins > 500) out.push(`There must be ${formatYen(coins)} sitting in the coin boxes.`);
    if (g.state.money < 300) out.push('I\'m nearly broke. Coin boxes. Now.');
    if (h < 7) out.push('So early. The lane is so quiet.');
    else if (h >= 19 && h < 22) out.push('The lanterns are on. I love the lane at night.');
    else if (h >= 22) out.push('It\'s late. Something always moves out there after dark...');
    if (p.z > 5.5) out.push(pick(['Smells like somebody\'s grilling fish.', 'The old lane hasn\'t changed since I was a kid.', 'I wonder who lives in all these houses.']));
    else out.push(pick(['Grandpa\'s garage. MY garage.', 'This place needs a good sweep.', 'I wonder what Grandpa would think.']));
    const due = g.bills?.dueSoon?.(3);
    if (due?.length) out.push(`The ${due[0].name.toLowerCase()} is due soon. ${formatYen(due[0].amount)}.`);
    return pick(out);
  }

  hook() {
    const g = this.game, ev = g.events;
    ev.on('discover', (d) => {
      const it = getItem(d.key);
      if (it?.rarity === 'secret') this.say(pick(['No way... the SECRET one?! My hands are shaking.', 'Is this... the super secret?! One in five hundred!']), { force: true });
      else if (it?.rarity === 'ultra' && d.isNew) this.say(pick(['An ultra rare! Okay, okay, stay calm.', 'Ultra rare. Today is a good day.']));
    });
    ev.on('bill', (e) => {
      if (e?.type && e.type !== 'issued') return;
      const b = e?.bill;
      this.say(b ? pick([`A bill. ${b.name}, ${formatYen(b.amount)}. Of course.`, `${b.name}: ${formatYen(b.amount)}. Where does it all go?`]) : 'Another bill...');
    });
    ev.on('npcSlapped', (e) => { if (Math.random() < 0.5) this.say(pick(['...Why did I do that.', 'That felt good. And also bad.', 'I\'ll regret that later.'])); void e; });
    ev.on('complaint', () => { if (Math.random() < 0.35) this.say(pick(['Maybe my prices ARE too high...', 'Another grumpy customer. Hm.'])); });
    ev.on('pranked', (e) => { if (e?.what === 'note') this.flags.kick = false; });
  }
}
