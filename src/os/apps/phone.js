// Phone: the desk telephone, dialled from the computer (keypad, phone book, recent calls, call transcript).
//   game.os.phone.register(number, { name, onCall(call), listed? = true, about? })
//       onCall gets a call: await call.say(text), await call.ask(text, [{ label, value }], { seconds? }) -> value | null,
//       call.hangup(), call.ended, call.number, call.name. Return/await whatever you like; the call ends when
//       onCall finishes (or the player hangs up: pending say/ask resolve null).
//   game.os.phone.call(number)   dial it (opens the Phone at the computer)
//   game.os.phone.ring({ number, name, onCall })   an incoming call (rings at the desk; answer at the computer)
//   game.os.phone.entries()      the phone book
// Built in: 110 police, 119 fire/ambulance, 117 time, 177 weather, Lane Express delivery, Daikoku Toys, Mikawa-ya,
// the bank's phone line, a pizza place. Events: 'phone' { type: 'call'|'end'|'police', number, ... }.
import * as THREE from 'three';
import { h, esc, ic, btn } from './ui.js';
import { now, stampText, clockText, WEEKDAYS, MONTHS } from '../time.js';
import { talk } from '../../people/voice.js';
import { forecast } from './sites.js';

const KEYS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] };
const norm = (n) => String(n).replace(/[^0-9*#]/g, '');
const NUMWORDS = (n) => Math.round(n).toLocaleString('en-US');

export function installPhone(game, os) {
  const st = os.st.phone ||= { log: [] };
  const book = new Map();
  let ringing = null;

  const api = os.phone = {
    register(number, def) { book.set(norm(number), { number: String(number), listed: true, ...def }); },
    entries: () => [...book.values()].filter((e) => e.listed !== false),
    call(number) {
      const w = os.open('phone', { dial: String(number) });
      if (!w) { game.news?.('The phone is on the computer desk', '', 3000); return false; }
      return true;
    },
    ring({ number = 'Unknown', name = 'Unknown caller', onCall } = {}) {
      ringing = { number, name, onCall, t0: performance.now() };
      const pos = game.pc?.root?.getWorldPosition?.(new THREE.Vector3());
      let n = 0;
      const ring = () => {
        if (!ringing || n++ > 6) { if (ringing) { st.log.push({ number, name, t: now(game).stamp, dir: 'missed' }); ringing = null; } return; }
        os.sound('phoneRing', { pos, vol: 1.2, force: true });
        setTimeout(ring, 2600);
      };
      ring();
      os.notify({ app: 'phone', title: 'Incoming call', body: `${name} (${number})`, icon: 'os_phone', news: true });
      if (os.seated) os.open('phone', {});
    },
  };

  os.on('ready', () => { if (ringing && !os.wins.some((w) => w.app === 'phone')) os.open('phone', {}); });

  class Call {
    constructor(number, entry, ui) { this.number = number; this.name = entry?.name || number; this.ui = ui; this.ended = false; this.t0 = performance.now(); this.voice = entry?.voice || { base: 200 + (norm(number).length * 37) % 160, duty: 0.25 }; }
    say(text, who = this.name) {
      if (this.ended) return Promise.resolve(null);
      return this.ui.line(who, text, this.voice).then(() => (this.ended ? null : true));
    }
    async ask(text, choices, { seconds = 0 } = {}) {
      if (text && !(await this.say(text))) return null;
      if (this.ended) return null;
      if (seconds) {
        const v = await os.qte({ title: this.name, prompt: text, choices, seconds, icon: 'os_phone' });
        if (v !== null) this.ui.line('You', choices.find((c) => c.value === v)?.label || '', null, true);
        return this.ended ? null : v;
      }
      return this.ui.choose(choices).then((v) => { if (v !== null) this.ui.line('You', choices.find((c) => c.value === v)?.label || '', null, true); return this.ended ? null : v; });
    }
    wait(ms) { return new Promise((r) => setTimeout(() => r(!this.ended), ms)); }
    hangup() { this.ui.hangup(); }
  }

  os.registerApp({
    id: 'phone', name: 'Phone', icon: 'os_phone', group: 'Accessories', w: 600, h: 430, minW: 520, minH: 380,
    about: 'Capsule Phone Dialer 1.2 for the NTT-compatible modem.',
    open(win, args) {
      win.body.classList.add('ph');
      let digits = '', call = null, state = 'idle', chooseRes = null, timer = 0;
      const lcd1 = h('div', { class: 'ph-l1' }), lcd2 = h('div', { class: 'ph-l2' });
      const lcd = h('div', { class: 'ph-lcd' }, lcd1, lcd2);
      const pad = h('div', { class: 'ph-pad' });
      for (const [k, sub] of KEYS) {
        const b = h('button', { class: 'ph-k', html: `<b>${k}</b><small>${sub}</small>` });
        b.addEventListener('click', () => press(k));
        pad.append(b);
      }
      const bCall = btn('Call', () => dial(), { cls: 'ph-call' });
      const bEnd = btn('Hang up', () => hangup(), { cls: 'ph-end' });
      const left = h('div', { class: 'ph-left' }, lcd, pad, h('div', { class: 'ph-act' }, bCall, bEnd));
      const right = h('div', { class: 'ph-right' });
      win.body.append(h('div', { class: 'c98-split' }, left, right));
      const show = (a, b = '') => { lcd1.textContent = a; lcd2.textContent = b; };

      let tab = 'book';
      const drawSide = () => {
        right.textContent = '';
        if (state === 'talk' || state === 'ring' || state === 'ended') { right.append(transcript); if (state !== 'ended') right.append(choicesEl); return; }
        const tabsEl = h('div', { class: 'c98-tabs' });
        for (const [id, label] of [['book', 'Phone Book'], ['log', 'Recent Calls']]) {
          const b = h('button', { class: `c98-tab${tab === id ? ' on' : ''}`, text: label });
          b.addEventListener('click', () => { tab = id; drawSide(); });
          tabsEl.append(b);
        }
        const panel = h('div', { class: 'c98-tabpanel ph-book' });
        if (tab === 'book') {
          for (const e of api.entries()) {
            const row = h('div', { class: 'ph-be', html: `${ic(e.icon || 'os_user', 1)}<span>${esc(e.name)}</span><b>${esc(e.number)}</b>` });
            row.addEventListener('click', () => { digits = norm(e.number); show(e.number, e.name); });
            row.addEventListener('dblclick', () => { digits = norm(e.number); dial(); });
            panel.append(row);
          }
        } else {
          const tn = now(game);
          for (const l of st.log.slice(-30).reverse()) panel.append(h('div', { class: 'ph-be', html: `${ic(l.dir === 'missed' ? 'os_warn' : l.dir === 'in' ? 'arrow_left' : 'arrow_right', 1)}<span>${esc(l.name || l.number)}</span><b>${esc(stampText(game, l.t, tn))}</b>` }));
          if (!st.log.length) panel.append(h('div', { class: 'c98-empty', text: 'No recent calls.' }));
        }
        right.append(tabsEl, panel);
      };
      const transcript = h('div', { class: 'ph-tr c98-list' });
      const choicesEl = h('div', { class: 'ph-ch' });

      const press = (k) => {
        const f = DTMF[k];
        if (f) os.sound('dtmf', { f1: f[0], f2: f[1] });
        if (state === 'talk' && chooseRes?.byKey?.(k)) return;
        if (state !== 'idle') return;
        if (digits.length < 14) digits += k;
        const e = book.get(digits);
        show(digits.replace(/(\d{2,4})(\d{3,4})(\d{4})$/, '$1-$2-$3'), e ? e.name : '');
      };
      const line = (who, text, voice, me = false) => new Promise((res) => {
        const row = h('div', { class: `ph-ln${me ? ' me' : ''}` }, h('b', { text: `${who}: ` }), h('span'));
        transcript.append(row);
        const span = row.lastChild;
        if (me || !text) { span.textContent = text; transcript.scrollTop = transcript.scrollHeight; res(); return; }
        const chirp = voice ? talk(null, { base: voice.base, duty: voice.duty, vol: 0.6 }) : null;
        let i = 0;
        const iv = setInterval(() => {
          if (!call || call.ended) { clearInterval(iv); span.textContent = text; res(); return; }
          const ch = text[i++];
          span.textContent += ch;
          if (os.seated) chirp?.(ch);
          transcript.scrollTop = transcript.scrollHeight;
          if (i >= text.length) { clearInterval(iv); setTimeout(res, 420); }
        }, 34);
      });
      const choose = (choices) => new Promise((res) => {
        choicesEl.textContent = '';
        const done = (v) => { chooseRes = null; choicesEl.textContent = ''; res(v); };
        chooseRes = { done, byKey: (k) => { const c = choices.find((x) => String(x.key ?? '') === k || x.label.startsWith(k + ' ')); if (c) { done(c.value); return true; } return false; } };
        for (const c of choices) choicesEl.append(btn(c.label, () => done(c.value)));
      });
      const ui = { line, choose, hangup: () => hangup() };

      const dial = async () => {
        if (state !== 'idle') return;
        if (ringing) { answer(); return; }
        if (!digits) { os.sound('dialTone'); show('Enter a number', ''); return; }
        const num = digits, e = book.get(num);
        state = 'dialing';
        bCall.disabled = true;
        os.sound('hookUp');
        show(`Calling ${num}`, e?.name || '');
        st.log.push({ number: num, name: e?.name || '', t: now(game).stamp, dir: 'out' });
        // the tones of the number, then the ring-back
        for (const k of num) { if (state !== 'dialing') return; const f = DTMF[k]; if (f) os.sound('dtmf', { f1: f[0], f2: f[1] }); await sleep(110); }
        if (state !== 'dialing') return;
        state = 'ring';
        transcript.textContent = ''; choicesEl.textContent = '';
        drawSide();
        call = new Call(num, e, ui);
        const rings = e ? 1 + Math.floor(Math.random() * 2) : 1;
        for (let i = 0; i < rings; i++) { os.sound('ringback'); show('Ringing...', e?.name || num); await sleep(2600); if (state !== 'ring') return; }
        state = 'talk';
        game.events.emit('phone', { type: 'call', number: num, name: e?.name || null });
        const t0 = performance.now();
        clearInterval(timer);
        timer = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); show(e?.name || num, `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`); }, 500);
        drawSide();
        try {
          if (e?.onCall) await e.onCall(call);
          else { os.sound('sitTone'); await sleep(1100); await call.say('The number you have dialled is not in service. Please check the number and dial again.', 'Recording'); }
        } catch (err) { console.error(err); }
        if (state === 'talk') hangup();
      };
      const answer = async () => {
        const r = ringing;
        ringing = null;
        state = 'talk';
        os.sound('hookUp');
        transcript.textContent = ''; choicesEl.textContent = '';
        call = new Call(r.number, { name: r.name }, ui);
        st.log.push({ number: r.number, name: r.name, t: now(game).stamp, dir: 'in' });
        drawSide();
        show(r.name, 'Connected');
        try { await r.onCall?.(call); } catch (err) { console.error(err); }
        if (state === 'talk') hangup();
      };
      const hangup = () => {
        if (state === 'idle') { digits = ''; show('Ready', clockText(now(game), os.st.h24)); return; }
        const was = state;
        state = 'ended';
        if (call) call.ended = true;
        chooseRes?.done(null);
        clearInterval(timer);
        os.sound('hookDown');
        game.events.emit('phone', { type: 'end', number: call?.number });
        show(was === 'dialing' || was === 'ring' ? 'Cancelled' : 'Call ended', '');
        setTimeout(() => { if (state !== 'ended') return; state = 'idle'; digits = ''; call = null; bCall.disabled = false; show('Ready', clockText(now(game), os.st.h24)); drawSide(); }, 1300);
      };
      win.onKey = (e) => {
        if (/^[0-9*#]$/.test(e.key)) { press(e.key); return true; }
        if (e.key === 'Enter') { dial(); return true; }
        if (e.key === 'Backspace' && state === 'idle') { digits = digits.slice(0, -1); show(digits || 'Ready', book.get(digits)?.name || ''); return true; }
        return false;
      };
      win.onClose(() => { if (call) call.ended = true; chooseRes?.done(null); clearInterval(timer); state = 'idle'; });
      win.onArgs = (a) => { if (a?.dial && state === 'idle') { digits = norm(a.dial); dial(); } };
      show(ringing ? 'Incoming call' : 'Ready', ringing ? ringing.name : clockText(now(game), os.st.h24));
      drawSide();
      if (args.dial) { digits = norm(args.dial); setTimeout(dial, 200); }
    },
  });

  // ------------------------------------------------------------------ the built-in numbers
  const R = (n, d) => api.register(n, d);
  R('110', { name: 'Police (emergency)', icon: 'os_warn', voice: { base: 150, duty: 0.5 }, async onCall(c) {
    const v = await c.ask('Morio Police. What is your emergency?', [{ label: 'Report a crime', value: 'crime' }, { label: 'My capsule machine was robbed!', value: 'robbed' }, { label: 'Report my friend (it\'s a prank)', value: 'prank' }, { label: 'Sorry, wrong number', value: 'wrong' }]);
    if (v === 'crime') {
      const w = await c.ask('Please describe what you saw.', [{ label: 'A man is sketching everyone on the lane', value: 'rohan' }, { label: 'Someone keeps buying all the corn soup', value: 'soup' }, { label: 'Never mind', value: 'no' }]);
      if (w === 'rohan') await c.say("...Is he wearing a headband? Yes, we know him. He's harmless. Mostly. Don't let him read you.");
      else if (w === 'soup') await c.say('That is not a crime, caller. That is a vending machine working as intended.');
      else if (w) await c.say('All right. Stay safe.');
    } else if (v === 'robbed') {
      const w = await c.ask('Was anything taken?', [{ label: 'Just some capsules', value: 'caps' }, { label: '...Actually, it was the cat', value: 'cat' }]);
      if (w === 'caps') await c.say("We'll send an officer to walk the lane tonight. Lock your shutter, and keep the coin boxes emptied.");
      else if (w === 'cat') await c.say('Caller, we cannot arrest a cat. Please give her a fish and ask nicely.');
    } else if (v === 'prank') {
      game.events.emit('phone', { type: 'police', prank: true, number: '110' });
      const w = await c.ask('...I see. And what did your friend do?', [{ label: 'Nothing! Hehe, just kidding', value: 'k' }, { label: '[hang up quickly]', value: 'hang' }]);
      if (w === 'k') { await c.say('Making false reports to the police is an offence. This call is coming from... a garage on the back lane. We will remember that.'); os.achievements?.unlock('os_prank'); }
      else if (w === 'hang') { os.achievements?.unlock('os_prank'); return; }
    } else if (v === 'wrong') await c.say('Please only call 110 in an emergency. Have a good day.');
  } });
  R('119', { name: 'Fire / Ambulance', icon: 'os_warn', voice: { base: 175, duty: 0.5 }, async onCall(c) {
    const v = await c.ask('Fire and ambulance service. Is it a fire, or do you need an ambulance?', [{ label: 'Fire!', value: 'fire' }, { label: 'Ambulance', value: 'amb' }, { label: 'Neither, sorry', value: 'no' }]);
    if (v === 'fire') await c.say('Where is the fire? ...Caller? Hello? If the fire is "your love for capsule toys", please hang up.');
    else if (v === 'amb') await c.say('What happened? ...You cut your finger opening a capsule? Please put a plaster on it. We believe in you.');
    else if (v) await c.say('This line is for emergencies only. Thank you.');
  } });
  R('117', { name: 'Time (117)', icon: 'clock', voice: { base: 260, duty: 0.125 }, async onCall(c) {
    for (let i = 0; i < 2 && !c.ended; i++) {
      const t = now(game);
      await c.say(`At the tone, the time will be ${t.hour} hours, ${t.minute} minutes, and ${(i * 10 + 10)} seconds.`, 'Time Service');
      if (c.ended) return;
      os.sound('timeSignal');
      if (!(await c.wait(4000))) return;
    }
  } });
  R('177', { name: 'Weather forecast (177)', icon: 'os_sun', voice: { base: 240, duty: 0.125 }, async onCall(c) {
    const t = now(game), f = forecast(game, t.day), f2 = forecast(game, t.day + 1);
    await c.say(`Tenki Net forecast for the Kanto region, ${WEEKDAYS[t.weekday]}, ${MONTHS[t.month]} ${t.date}.`, 'Weather Line');
    await c.say(`Today: ${f.name.toLowerCase()}, high ${f.hi} degrees, low ${f.lo}. Chance of rain, ${f.rain} percent.`, 'Weather Line');
    await c.say(`Tomorrow: ${f2.name.toLowerCase()}, high ${f2.hi} degrees. That is the end of the forecast.`, 'Weather Line');
  } });
  R('0120-117-889', { name: 'Lane Express (deliveries)', icon: 'map', voice: { base: 190, duty: 0.25 }, async onCall(c) {
    const n = game.delivery?.queue?.length || 0;
    await c.say('Lane Express, thank you for calling! Let me look up your address... the garage on the back lane.');
    const v = await c.ask(n ? `You have ${n} parcel${n > 1 ? 's' : ''} on the way. Our driver is out on the lane now.` : 'There are no parcels on the way to you right now.', [{ label: 'When will it arrive?', value: 'when' }, { label: 'Thanks, bye!', value: 'bye' }]);
    if (v === 'when') await c.say(n ? 'Very soon! It will be left at your shutter. Please carry it in before the crows find it.' : 'Order something first, then we can talk about arrival times! Ha ha.');
    else if (v) await c.say('Thank you for using Lane Express!');
  } });
  R('03-3866-1971', { name: 'Daikoku Toy Wholesale', icon: 'cart', voice: { base: 160, duty: 0.25 }, async onCall(c) {
    const v = await c.ask("Daikoku Toys! Daikoku speaking. Oh, it's the gacha garage! How's business?", [{ label: 'Got any deals for me?', value: 'deal' }, { label: 'Just saying hi', value: 'hi' }]);
    if (v === 'deal') { await c.say("For you? Always! I'll send it over on Pichat right now. Check your messages!"); os.content?.daikokuDeal?.(true); }
    else if (v) await c.say('Ha ha! Business is business, but hello is free. Call me when you need capsules!');
  } });
  R('0193-62-0331', { name: 'Mikawa-ya General Store', icon: 'shop', voice: { base: 300, duty: 0.25 }, async onCall(c) {
    await c.say("Mikawa-ya! ...Oh, it's you, dear. Is everything all right at the garage?");
    const v = await c.ask('', [{ label: 'Do you deliver?', value: 'del' }, { label: 'Is the cat with you?', value: 'cat' }]);
    if (v === 'del') await c.say("Deliver? Dear, we're thirty steps away! Come over, I'll put the kettle on.");
    else if (v === 'cat') await c.say("Mikan? She was here for her lunch. Now she's asleep on top of one of your machines, I expect.");
  } });
  R('0193-62-1952', { name: 'Morio Shinkin Bank (phone banking)', icon: 'os_bank', voice: { base: 230, duty: 0.125 }, async onCall(c) {
    const v = await c.ask('Welcome to Morio Shinkin Bank telephone banking. For your balance, press 1. For bills, press 2. To speak to an operator, press 0.', [{ label: '1 - Balance', value: '1', key: '1' }, { label: '2 - Bills', value: '2', key: '2' }, { label: '0 - Operator', value: '0', key: '0' }]);
    if (v === '1') await c.say(`Your balance is: ${NUMWORDS(os.bank.balance())} yen. Thank you for banking with Morio Shinkin.`, 'Bank');
    else if (v === '2') { const due = game.bills?.due?.() || []; await c.say(due.length ? `You have ${due.length} unpaid bill${due.length > 1 ? 's' : ''}, totalling ${NUMWORDS(due.reduce((a, b) => a + b.amount, 0))} yen. Pay them in Shinkin Online.` : 'You have no unpaid bills. Thank you!', 'Bank'); }
    else if (v === '0') { await c.say('All of our operators are busy. Please hold.', 'Bank'); os.sound('osMidi'); if (!(await c.wait(2000))) return; os.sound('osMidi'); if (!(await c.wait(2000))) return; await c.say('...Thank you for holding. The bank is now closed for lunch.', 'Bank'); }
  } });
  R('0120-38-4444', { name: 'Pizza La Morio', icon: 'heart', voice: { base: 210, duty: 0.5 }, async onCall(c) {
    const v = await c.ask('Pizza La Morio, thank you for calling! Delivery or pick-up?', [{ label: 'Delivery to the back lane', value: 'd' }, { label: 'What toppings do you have?', value: 't' }]);
    if (v === 'd') await c.say("Ah... the back lane? Sorry, our scooters don't go through the underpass. The driver says it's haunted.");
    else if (v === 't') await c.say('Corn, mayonnaise, potato, teriyaki chicken, and our special: corn mayonnaise potato teriyaki chicken!');
  } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
