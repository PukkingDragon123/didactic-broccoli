// A low-poly human: one rigidly skinned mesh + one painted atlas (1 draw call), procedural animation.
import * as THREE from 'three';
import { BONES, BONE_INDEX, buildPlan } from './body.js';
import { buildMesh, ATLAS } from './mesh.js';
import { Pix } from '../gfx/pix.js';
import { FacePainter, exprParams } from './face.js';
import { paintAtlas } from './paint.js';

export class Human {
  constructor(spec) {
    this.spec = spec;
    this.preset = spec.id;
    const plan = buildPlan(spec);
    this.P = plan.P; this.J = plan.J;
    const m = buildMesh(plan);
    this.tris = m.tris;
    this.pix = new Pix(ATLAS, ATLAS, spec.seed || 1);
    paintAtlas(spec, this.P, m.faces, this.pix);
    this.face = new FacePainter(spec, this.P, m.block, this.pix);
    this.E = exprParams('neutral');
    this.face.paint(this.E);
    this.pix.dirty = true;
    this.tex = this.pix.texture();
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.85, metalness: 0, alphaTest: 0.5 });
    // skeleton
    this.bones = [];
    for (const [name, parent] of BONES) {
      const bn = new THREE.Bone();
      bn.name = name;
      const p = this.J[name], pp = parent ? this.J[parent] : [0, 0, 0];
      bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
      if (parent) this.bones[BONE_INDEX[parent]].add(bn);
      this.bones.push(bn);
    }
    this.b = Object.fromEntries(this.bones.map((bn) => [bn.name, bn]));
    this.mesh = new THREE.SkinnedMesh(m.geometry, this.mat);
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.add(this.mesh);
    this.height = spec.H;
    for (const n of ['prop', 'box']) this.b[n].scale.setScalar(0);
  }

  update() {}
  dispose() { this.mesh.geometry.dispose(); this.tex.dispose(); this.mat.dispose(); this.root.removeFromParent(); }
}
