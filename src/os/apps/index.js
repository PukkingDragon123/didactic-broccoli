// Every built-in Capsule 98 program, installed in desktop-icon order. Data APIs (bank statement, messenger, mail,
// phone, achievements) are installed here too, so they work while nobody sits at the PC; windows are only built
// when a program is opened.
import { installBank } from './bank.js';
import { installBrowser } from './browser.js';
import { installMessenger } from './messenger.js';
import { installMail } from './mail.js';
import { installPhone } from './phone.js';
import { installCalendar } from './calendar.js';
import { installCodex } from './codex.js';
import { installAchievements } from './achievements.js';
import { installMisc } from './misc.js';
import { installContent } from './content.js';

export function installApps(game, os) {
  installBank(game, os, { register: false }); // the statement starts recording money at once
  installBrowser(game, os);
  installMessenger(game, os);
  installMail(game, os);
  os.registerApp(os.bank.app);
  installPhone(game, os);
  installCalendar(game, os);
  installCodex(game, os);
  installAchievements(game, os);
  installMisc(game, os);
  installContent(game, os);
}
