// Pixel icons for building and money: the placement badges by the crosshair (fits / doesn't fit), the gumball, the
// piggy bank and a furniture carton for the hotbar.
import { defineIcon } from '../gfx/icons.js';

defineIcon('place_ok', { rows: [
  '..........',
  '........FE',
  '.......FEe',
  '......FEe.',
  'FE...FEe..',
  'EEE.FEe...',
  '.eEEEe....',
  '..eEe.....',
  '...e......',
  '..........',
] });
defineIcon('place_no', { rows: [
  '..........',
  '.QR....QR.',
  '.RRR..RRr.',
  '..RRRRRr..',
  '...RRRr...',
  '...RRRr...',
  '..RRrRRr..',
  '.RRr..RRr.',
  '.rr....rr.',
  '..........',
] });
defineIcon('gumball', { rows: [
  '....qq....',
  '..qRRRRq..',
  '.qRSSRRRq.',
  '.RSWSRRRr.',
  'qRSSRRRRrq',
  'qRRRRRRRrq',
  '.RRRRRRrr.',
  '.qRRRRrrq.',
  '..qrrrrq..',
  '....qq....',
] });
defineIcon('piggy', { rows: [
  '..............',
  '.....kkkk.....',
  '..PPPPPPPPP...',
  '.PSSPPPPPPPP..',
  'PSSPPPPPPPPPPS',
  'PSKPPPPPPPPPSS',
  'PPPPPPPPPPPPPS',
  '.PPPPPPPPPPPP.',
  '..ppPPPPPPpp..',
  '..pp.....pp...',
  '..............',
] });
defineIcon('carton', { rows: [
  '................',
  '..AAAAAAAAAAAA..',
  '.ATTTTTwwTTTTTA.',
  '.TTTTTTwwTTTTTt.',
  '.TTTTTTwwTTTTTt.',
  '.TTTTTTTTTTTTTt.',
  '.TTwwwwwwwwTTTt.',
  '.TTwKKKKKKwTTTt.',
  '.TTwwwwwwwwTTTt.',
  '.TTTTTTTTTTTTTt.',
  '.TTTTTTTTTTTTTt.',
  '.ttttttttttttt..',
  '................',
] });
