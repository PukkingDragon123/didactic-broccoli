// game.clock: the shop's time of day and day count.
//
// A day lasts about 20 real minutes: an in-game hour takes 70 s while the shop is open (09:00-19:00), 45 s in the
// morning and evening and 25 s in the small hours. The clock stands still during cutscenes, menus (the pause menu,
// the store, letters), the pocket watch's time stop, and during the opening chores (it starts once the shop has
// reopened); anything can hold it with hold(reason) / release(reason).
//
//   clock.day (1..), clock.hour (0..23), clock.minute (0..59), clock.hours (fractional hour), clock.minuteOfDay (float),
//   clock.weekday (0 = Sun), clock.stamp (minutes since day 1 00:00), clock.open (inside shop hours)
//   clock.time -> "08:05"           clock.paused        clock.speed (multiplier, debug)
//   clock.traffic(hour?) -> 0..1    customer density by hour (lifted by promotion)
//   clock.sun() -> { dir: Vector3, alt (deg), rise, set }       clock.daylight() -> 0..1
//   clock.set(day, hour)  clock.advance(minutes)  clock.skipTo(hour, { nextDay })
// Events (game.events): 'hour' { hour, day }, 'newDay' { day, date }, 'dawn' { day }, 'dusk' { day }, 'clockSkip' { from, to }.
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { sunDir, sunTimes } from './sky.js';

export const OPEN_HOUR = 9, CLOSE_HOUR = 19;
/** Real seconds per in-game hour, by hour of the day. */
export function secondsPerHour(h) {
  if (h >= OPEN_HOUR && h < CLOSE_HOUR) return 70;
  if (h < 6) return 25;
  return 45;
}
/** Real seconds in one whole in-game day. */
export const DAY_SECONDS = Array.from({ length: 24 }, (_, h) => secondsPerHour(h)).reduce((a, b) => a + b, 0);

// customers by hour: commuters, a lunch bump, the after-school rush, the evening stroll
const TRAFFIC = [0.05, 0.03, 0.02, 0.02, 0.03, 0.07, 0.18, 0.4, 0.55, 0.55, 0.6, 0.68, 0.82, 0.78, 0.76, 0.92, 1, 1, 1, 0.92, 0.75, 0.5, 0.26, 0.12];

const pad = (n) => String(n).padStart(2, '0');

export class Clock {
  constructor(game) {
    this.game = game;
    // a new shop: arrival in the late afternoon of Thursday 1 April (the opening plays in this golden hour)
    this.s = ensureState(game, 'clock', { day: 1, minute: 16 * 60 + 20, started: false });
    this.holds = new Set();
    this.speed = 1;
    this._sun = { dir: new THREE.Vector3(), alt: 0, rise: 6, set: 18, key: '' };
  }

  get day() { return this.s.day; }
  /** Minute of the hour (0..59); minuteOfDay is the float 0..1440. */
  get minute() { return Math.floor(this.s.minute % 60); }
  get minuteOfDay() { return this.s.minute; }
  get hour() { return Math.floor(this.s.minute / 60) % 24; }
  get hours() { return this.s.minute / 60; } // fractional hour
  get weekday() { return this.game.calendar?.dateOf(this.day).weekday ?? 4; }
  get time() { return `${pad(this.hour)}:${pad(this.minute)}`; }
  /** Minutes since day 1 00:00 (sortable stamps). */
  get stamp() { return (this.day - 1) * 1440 + this.s.minute; }
  get open() { const h = this.hours; return h >= OPEN_HOUR && h < CLOSE_HOUR; }

  hold(reason) { this.holds.add(reason); }
  release(reason) { this.holds.delete(reason); }

  /** Why the clock is not running right now (null = running). */
  pauseReason() {
    const g = this.game;
    if (this.holds.size) return [...this.holds][0];
    if (!g.story?.done && !this.s.started) return 'opening';
    if (g.cutscene?.active) return 'cutscene';
    if (g.pc?.active) return null; // sitting at the computer is part of the work day: time keeps running
    if (g.uiOpen) return 'menu';
    if (g.timeStop?.frozen) return 'timestop';
    if (g.held?.reading) return 'reading';
    if (g.input && !g.input.locked) return 'paused';
    return null;
  }
  get paused() { return !!this.pauseReason(); }

  update(dt) {
    if (this.paused) return;
    this.s.started = true;
    this.advanceReal(dt * this.speed);
  }

  /** Move the clock on by `sec` real seconds (paced by the hour). */
  advanceReal(sec) {
    let left = sec;
    for (let guard = 0; left > 1e-6 && guard < 200; guard++) {
      const h = this.hour;
      const perMin = secondsPerHour(h) / 60;
      const toNext = (Math.floor(this.s.minute / 60) + 1) * 60 - this.s.minute;
      const step = Math.min(toNext, left / perMin);
      this.tick(step);
      left -= step * perMin;
    }
  }

  /** Advance by in-game minutes, firing every event on the way. */
  advance(minutes) {
    let left = minutes;
    for (let guard = 0; left > 1e-6 && guard < 100000; guard++) {
      const toNext = (Math.floor(this.s.minute / 60) + 1) * 60 - this.s.minute;
      const step = Math.min(toNext, left);
      this.tick(step);
      left -= step;
    }
  }

  tick(m) {
    const before = this.s.minute;
    // land exactly on the hour (no float crumbs that would skip or repeat an 'hour' event)
    const boundary = (Math.floor(before / 60) + 1) * 60;
    if (before + m > boundary - 1e-7) m = boundary - before;
    const sun = this.sunTimes();
    this.s.minute += m;
    const after = this.s.minute;
    const ev = this.game.events;
    if (before < sun.rise * 60 && after >= sun.rise * 60) ev.emit('dawn', { day: this.day });
    if (before < sun.set * 60 && after >= sun.set * 60) ev.emit('dusk', { day: this.day });
    if (Math.floor(after / 60) !== Math.floor(before / 60)) {
      if (after >= 1440) {
        this.s.minute = after - 1440;
        this.s.day++;
        this._sun.key = '';
        ev.emit('hour', { hour: 0, day: this.day });
        this.game.calendar?.onNewDay?.(this.day);
        ev.emit('newDay', { day: this.day, date: this.game.calendar?.dateOf(this.day) });
      } else ev.emit('hour', { hour: Math.floor(after / 60), day: this.day });
    }
  }

  /** Jump to a time (e.g. sleeping). nextDay: always the following day. Events of skipped hours are not fired one by
   *  one: listeners get 'clockSkip' and the 'newDay' of every day crossed. */
  skipTo(hour, { nextDay = false } = {}) {
    const from = this.stamp;
    let target = hour * 60;
    const days = nextDay || target <= this.s.minute ? 1 : 0;
    for (let i = 0; i < days; i++) {
      this.s.day++;
      this.game.calendar?.onNewDay?.(this.day);
      this.game.events.emit('newDay', { day: this.day, date: this.game.calendar?.dateOf(this.day), skipped: true });
    }
    this.s.minute = target;
    this._sun.key = '';
    this.game.events.emit('clockSkip', { from, to: this.stamp });
    this.game.events.emit('hour', { hour: Math.floor(hour), day: this.day });
  }

  set(day, hour = this.hours) { this.s.day = Math.max(1, Math.round(day)); this.s.minute = ((hour % 24) + 24) % 24 * 60; this._sun.key = ''; this.game.events.emit('clockSkip', { to: this.stamp }); }

  sunTimes() {
    const yd = this.game.calendar?.yearDay(this.day) ?? 91;
    if (this._sun.yd !== yd) { const t = sunTimes(yd); this._sun.yd = yd; this._sun.rise = t.rise; this._sun.set = t.set; }
    return this._sun;
  }

  /** The sun right now: direction toward it, altitude in degrees, sunrise / sunset hours. Cached per in-game minute. */
  sun() {
    const yd = this.game.calendar?.yearDay(this.day) ?? 91;
    const key = yd * 2000 + Math.floor(this.s.minute * 4);
    const S = this._sun;
    if (S.key !== key) {
      S.key = key;
      sunDir(yd, this.hours, S.dir);
      S.alt = Math.asin(S.dir.y) * 180 / Math.PI;
      this.sunTimes();
    }
    return S;
  }

  daylight() { return Math.min(1, Math.max(0, (this.sun().alt + 2) / 14)); }

  /** Customer density 0..1 for an hour (default: now), lifted toward 1 by active promotion (ads, see sim.adBoost). */
  traffic(hour = this.hours) {
    const h = ((hour % 24) + 24) % 24, i = Math.floor(h), f = h - i;
    const base = TRAFFIC[i] + (TRAFFIC[(i + 1) % 24] - TRAFFIC[i]) * f;
    const ad = Math.min(1, this.game.sim?.adBoost?.() || 0);
    return base + (1 - base) * 0.45 * ad;
  }

  format() { return `Day ${this.day} ${this.time}`; }
}
