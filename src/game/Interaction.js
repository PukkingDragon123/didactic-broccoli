// Crosshair raycasting, hover rim-highlight, contextual hints and click / hold dispatch.
import * as THREE from 'three';

const RIM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xfff0c8) } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec3 p = position + normal * 0.0012; vec4 mv = modelViewMatrix*vec4(p,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); float pulse = 0.55 + 0.25*sin(uTime*5.0); gl_FragColor = vec4(uColor * (f*0.9 + 0.06) * pulse, 1.0); }`,
});

export class Interaction {
  constructor(game) {
    this.game = game;
    this.ray = new THREE.Raycaster();
    this.ray.far = 2.3;
    this.targets = []; // registered root objects
    this.hover = null; // {obj, handler, hit}
    this.holding = null; // {handler, obj}
    this.hintEl = document.getElementById('hint');
    this.crossEl = document.getElementById('crosshair');
    this.lastHint = '';
    this.enabled = true;
    this.showHints = true;
    this._center = new THREE.Vector2(0, 0);
    this.blockers = []; // meshes that block the ray (walls etc.)
    this.hintUses = {};
  }

  /** handler: { hint(held, hit) -> {key,text,sub}|null, use(held, hit), hold?:{start, update(dt), end}, highlight?:Object3D, reach? } */
  add(obj, handler) {
    obj.userData.handler = handler;
    this.targets.push(obj);
    return obj;
  }

  remove(obj) {
    const i = this.targets.indexOf(obj);
    if (i >= 0) this.targets.splice(i, 1);
    if (this.hover && this.hover.obj === obj) this.setHover(null);
  }

  findHandlerObj(o) {
    while (o) { if (o.userData.handler) return o; o = o.parent; }
    return null;
  }

  setHover(h) {
    if (this.hover?.obj !== h?.obj) {
      if (this.hover) this.unhighlight(this.hover);
      if (h) this.highlight(h);
    }
    this.hover = h;
  }

  highlight(h) {
    const root = h.handler.highlight || h.obj;
    if (h.handler.noHighlight) return;
    h._rims = [];
    root.traverse((m) => {
      if (!m.isMesh || m.userData.isRim || m.userData.noRim || !m.visible || m.isInstancedMesh) return;
      let rim = m.userData.rim;
      if (!rim) {
        rim = new THREE.Mesh(m.geometry, RIM);
        rim.userData.isRim = true;
        rim.raycast = () => {};
        rim.renderOrder = 5;
        m.userData.rim = rim;
      }
      if (rim.geometry !== m.geometry) rim.geometry = m.geometry;
      m.add(rim);
      h._rims.push(rim);
    });
  }

  unhighlight(h) {
    for (const r of h._rims || []) r.parent?.remove(r);
    h._rims = [];
  }

  setHint(hint) {
    const show = hint && this.showHints;
    const html = show ? `<span class="k">${hint.key}</span>${hint.text}${hint.sub ? `<span class="sub">${hint.sub}</span>` : ''}` : '';
    if (html !== this.lastHint) {
      this.lastHint = html;
      if (html) this.hintEl.innerHTML = html;
      this.hintEl.classList.toggle('show', !!html);
    }
  }

  update(dt) {
    RIM.uniforms.uTime.value += dt;
    const g = this.game;
    const inp = g.input;
    if (!this.enabled || !inp.locked || g.pc?.active) {
      this.setHover(null);
      this.setHint(null);
      this.crossEl.classList.remove('active');
      return;
    }
    const held = g.held.item;
    // continue an active hold even if the crosshair drifts slightly
    if (this.holding) {
      const h = this.holding;
      if (!inp.button(0) || h.handler.hold.done?.()) {
        h.handler.hold.end?.();
        this.holding = null;
      } else {
        h.handler.hold.update?.(dt);
        this.crossEl.classList.add('busy');
        const hint = h.handler.hint?.(held, h.hit);
        this.setHint(hint);
        return;
      }
    }
    this.crossEl.classList.remove('busy');

    this.ray.setFromCamera(this._center, g.camera);
    const hits = this.ray.intersectObjects(this.targets, true);
    let found = null;
    const blockDist = this.blockDistance();
    for (const hit of hits) {
      if (hit.distance > blockDist) break;
      const obj = this.findHandlerObj(hit.object);
      if (!obj || obj.userData.disabled) continue;
      const handler = obj.userData.handler;
      if (handler.reach && hit.distance > handler.reach) continue;
      const hint = handler.hint ? handler.hint(held, hit) : null;
      if (hint === null) continue;
      found = { obj, handler, hit, hint };
      break;
    }
    // fall back to the held item's own action (open capsule, place furniture...)
    if (!found && held) {
      const hh = g.held.hint();
      this.setHover(null);
      this.setHint(hh);
      this.crossEl.classList.toggle('active', !!hh && hh.key !== 'R');
      if (inp.buttonDown(0)) g.held.primary();
      return;
    }
    this.setHover(found);
    this.setHint(found?.hint || null);
    this.crossEl.classList.toggle('active', !!found);
    if (found && !held && inp.buttonDown(2) && found.handler.alt) found.handler.alt(found.hit);
    if (found && inp.buttonDown(0)) {
      const res = found.handler.use?.(held, found.hit);
      if (found.handler.hold && res !== false && found.handler.hold.canStart?.() !== false) {
        found.handler.hold.start?.();
        this.holding = { handler: found.handler, obj: found.obj, hit: found.hit };
      }
    }
  }

  blockDistance() {
    if (!this.blockers.length) return Infinity;
    const hits = this.ray.intersectObjects(this.blockers, false);
    return hits.length ? hits[0].distance + 0.01 : Infinity;
  }

  /** Cast from the crosshair against arbitrary objects (used by placement). */
  castAgainst(objects, far = 4) {
    this.ray.setFromCamera(this._center, this.game.camera);
    const prev = this.ray.far;
    this.ray.far = far;
    const hits = this.ray.intersectObjects(objects, true);
    this.ray.far = prev;
    return hits;
  }
}
