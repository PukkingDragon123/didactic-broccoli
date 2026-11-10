// The models of the bigger wardrobe (src/cosmetics/catalog.js), by the names the catalogue uses. They used to be voxel
// models; they are now detailed, smooth pieces from the people kit (src/peoplekit: hats.js, face.js, bags.js), in the
// same frames: head pieces in head units (1 = 1/20 of the head height, head bone at the origin, +z the face, +x the
// wearer's left; chin -4, eyes 6, brows 8, hair line 13.2, crown 16, cranium centre z 2.4), hats on the hair in the
// "crown" group, glasses in the "eyes" group (origin at eye level, lenses at z 12), side masks in the kitsune mask's
// frame, bags in metric units (V = height / 140) on the chest bone. Every builder returns a BufferGeometry.
import { HATS } from '../peoplekit/hats.js';
import { FACE } from '../peoplekit/face.js';
import { BAGS } from '../peoplekit/bags.js';

const H = HATS, F = FACE;
export const VX = {
  // hats on the hair (crown group)
  strawhat: H.strawhat, beret: H.beret, kappa: H.kappa, onigiri: H.onigiri, pigeonBody: H.pigeonBody, pigeonHead: H.pigeonHead,
  curlers: H.curlers, explorer: H.explorer, crown: H.crown, sprout: H.sprout, catears: H.catears, oniHorns: H.oniHorns,
  oniBand: H.oniBand, towel: H.towel, octopus: H.octopus, conductor: H.conductor, chef: H.chef, propBlade: H.propBlade,
  // hats that hug the head
  beanie: H.beanie, propCap: H.propCap, shrub: H.shrub, paperbag: H.paperbag, pompadour: H.pompadour, yurei: H.yurei,
  tiehead: H.tiehead, kasa: H.kasa, ranger: H.ranger, astro: H.astro, towelBand: H.towelBand,
  // glasses & masks (eyes group) and the side-worn festival masks
  maskSurgical: F.maskSurgical, heartglasses: F.heartglasses, eyepatch: F.eyepatch, monocle: F.monocle, swirl: F.swirl,
  glasses3d: F.glasses3d, yenshades: F.yenshades, bandaid: F.bandaid, hyottoko: F.hyottoko, onimask: F.onimask,
  // backpacks (chest bone)
  capsulePack: BAGS.capsulePack, teddyPack: BAGS.teddyPack,
};
