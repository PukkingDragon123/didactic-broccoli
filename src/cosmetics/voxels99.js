// The models of the 1999 closet (src/cosmetics/more.js), by the names the catalogue uses: detailed pieces from the
// people kit (src/peoplekit), in the same frames as src/cosmetics/voxels.js (head units; the eyes frame for glasses and
// face masks; the kitsune frame for side masks; body pieces in metric units, V = height / 140, built per wearer).
import { HATS } from '../peoplekit/hats.js';
import { FACE } from '../peoplekit/face.js';
import { BAGS } from '../peoplekit/bags.js';

const H = HATS, F = FACE;
export const V99 = {
  // hats
  duck: H.duck, hachimaki: H.hachimaki, daruma: H.daruma, capsuleHat: H.capsuleHat, fishHat: H.fishHat, kabuto: H.kabuto,
  sakuraClip: H.sakuraClip, kagami: H.kagami, visor: H.visor, santa: H.santa, chonmage: H.chonmage,
  // glasses & masks
  tengu: F.tengu, gariben: F.gariben, kafun: F.kafun, wrapShades: F.wrapShades, kaiser: F.kaiser, blackMask: F.blackMask,
  okame: F.okame, kurogitsune: F.kurogitsune, heroMask: F.heroMask,
  // body pieces
  obi: BAGS.obi, tie: BAGS.tie, tanukiSeg: BAGS.tanukiSeg, furoshiki: BAGS.furoshiki,
};
