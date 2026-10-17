import { gloss, metal, glow } from '../../voxel/VoxelModel.js';
const cols = [0xf2c14e, 0xffd860, 0xffe9a0, 0xffcc33, 0xe8b830, 0xfff0c0];
const out = {};
cols.forEach((c, i) => {
  out['m' + i] = { name: 'metal ' + c.toString(16), voxel: 0.02, build(v) { v.sphere(0, 6, 0, 6, metal(c)); v.box(-6, 0, 5, 6, 12, 6, metal(c)); } };
  out['g' + i] = { name: 'gloss ' + c.toString(16), voxel: 0.02, build(v) { v.sphere(0, 6, 0, 6, gloss(c)); v.box(-6, 0, 5, 6, 12, 6, gloss(c)); } };
});
export default out;
