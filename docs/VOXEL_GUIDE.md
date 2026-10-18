# Gacha Garage — Voxel Modelling Guide

Everything in the world is built in code from voxels with `VoxelModel` (`src/voxel/VoxelModel.js`),
meshed by `src/voxel/mesher.js` (greedy meshing + baked ambient occlusion + subtle per-voxel colour
jitter for a hand-painted look).

## Coordinate conventions
* Integer voxel coordinates. **+y is up, +z is the FRONT (faces the viewer/player), +x is right.**
* Build models centred on `x = 0` and `z = 0` with the bottom resting on `y = 0`.
  The mesher re-centres to bottom-centre automatically, but symmetric models are easiest when the
  centre column is `x = 0` (odd widths, use `mirrorX()`).
* Colours are sRGB hex numbers (`0xff8800`). Use the shared palette `C` from `src/voxel/palette.js`
  (plus `shade(hex, f)` / `mix(a, b, t)`) so the whole game feels coherent.

## Materials
Wrap a colour to change its material: `matte(c)` (default, soft vinyl/paint), `gloss(c)` (shiny enamel /
glossy plastic, clear-coated), `metal(c)` (chrome, brass, steel — reflective), `glow(c)` (emissive: lamps,
screens, neon, LEDs — blooms), `glass(c)` (transparent: windows, jelly, ice, water). Import from
`src/voxel/VoxelModel.js`. Plain numbers are matte.

## API (all methods return `this`; coordinates inclusive)
| method | notes |
|---|---|
| `set(x,y,z,c)` / `remove(x,y,z)` / `get` / `has` | single voxel. `c = null` removes |
| `box(x0,y0,z0,x1,y1,z1,c)` | solid box, corners in any order |
| `hollowBox(x0,y0,z0,x1,y1,z1,c,t=1,open=[])` | shell; `open` faces: 'top','bottom','front','back','left','right' |
| `sphere(cx,cy,cz,r,c)` / `ellipsoid(cx,cy,cz,rx,ry,rz,c)` | half-integer centres OK |
| `cylinder(cx,cy,cz,r,h,c,axis='y')` | base centre, length `h` along +axis |
| `tube(cx,cy,cz,rOuter,rInner,h,c,axis)` | pipe / cup walls |
| `cone(cx,cy,cz,r,h,c,axis='y')` | tip at +h (negative h points down) |
| `torus(cx,cy,cz,R,r,c,axis='y')` | ring around axis |
| `ring(cx,cy,cz,c,axis='z')` | tiny 5×5 pixel loop (keychain rings, handles) |
| `line(x0,y0,z0,x1,y1,z1,c,radius=0)` | 3D line, optional thickness |
| `shape(x0,y0,z0,x1,y1,z1,(x,y,z)=>bool,c)` | custom test; `c` may be a function `(x,y,z)=>colour` |
| `layer(rows, legend, {x,y,z,plane='xy',depth=1})` | place a pixel pattern as voxels. rows[0] = top row. plane 'xy' (front-facing, x=x+col, y=y-row), 'xz' (flat on top, z=z+row), 'zy' (side). `.`/space = skip |
| `project(rows, legend, x0, y0, dir='+z', {raise, depth})` | **paint a pixel pattern onto the surface** (faces, logos, labels). For '+z' the pattern's top-left pixel is at (x0, y0), columns go +x, rows go -y; the first voxel hit along -z is recoloured. `raise:true` adds a voxel in front instead (embossed). dirs: '+z','-z','+x','-x' (first coord = z), '+y' (x0 = x, y0 = z, rows go +z) |
| `paint(() => { ...shapes... })` | inside the callback shapes only RECOLOUR existing voxels (great for patches, stripes, bellies) |
| `mirrorX(even=false)` | copy x<0 half onto x>0 |
| `mirrorZ`, `translate`, `rotateY(n)`, `merge(other,dx,dy,dz)`, `clone()`, `recolor(fn)` | |
| `keychain(x,y,z,len=3)` | metal chain + ring sticking up from (x,y,z) |
| `v.jitter = 0.035` | per-voxel colour variation (0 disables). Keep default unless a surface must be flat |

## Collectible series files — `src/data/series/<id>.js`
Default-export one series object. See `src/data/series/mochi.js` for the reference style.
```js
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
export default {
  id: 'shokudo', order: 2, name: 'Tiny Shokudō', jp: 'ミニチュア食堂',
  tagline: 'Hyper-real miniature diner food', taglineJp: '本物そっくり！',
  price: 200,                      // yen per pull (given to you)
  themes: ['food', 'retro'],       // museum theme tags: cute, nature, food, retro, spooky, space, shrine, candy, city, ocean, home, weird
  card: { bg: '#fff3d6', accent: '#e34234', text: '#3a2410', accent2: '#2f6fd6', pattern: 'stripes' }, // patterns: dots, stripes, checker, waves, stars, sakura, grid, plain
  capsule: { colors: [0xffd447, 0xe34234, 0xffffff, 0x8fb85a] }, // 3–5 capsule half colours that fit the theme
  items: [ { id, name, jp, rarity, desc, build(v) { ... } }, ... ],
};
```
* **8 items per series**: exactly 3 `common`, 2 `uncommon`, 1 `rare`, 1 `ultra`, 1 `secret` (in that order).
* `name` = short English name (≤ 26 chars), `jp` = authentic Japanese name, `desc` = one funny/charming
  sentence (≤ 90 chars). Secrets should be the funniest / most special (and begin desc with nothing special — the game handles the reveal).
* **Size**: collectibles are rendered at ~0.0027 m per voxel (real miniature scale). Aim for 18–30 voxels in the largest dimension
  (max 32). Footprint should stay within ~28×28. Stand items on a small base if they would tip over.
  Rarer items should look more elaborate (more detail, more colours, small diorama bases, gloss/metal/glow accents).
* Make every item instantly readable from a 3/4 front view, with a strong silhouette and a cute face where
  appropriate (see `face()` in mochi.js). Avoid flat single-colour blobs: use `paint()` for patches/shading,
  highlight voxels, darker undersides, outlines/rims, and small details. No two items should look alike.
* Original designs only — no real brand names, logos or copyrighted characters.
* Item `build(v)` must be deterministic (no Math.random). If you need noise, hash the coordinates.
* You may define helper functions inside your file. **Do not edit shared files** (`src/voxel/*`, `src/viewer.js`, other series).

## Props — `src/data/props/<file>.js`
```js
export default {
  vending: { name: 'Drink Vending Machine', voxel: 0.025, build(v) { ... } },
};
```
`voxel` = metres per voxel, so real size = voxels × voxel. Facing +z, bottom-centre origin.

## Characters — `src/data/visitors.js`
```js
export default {
  salaryman: {
    name: 'Salaryman', voxel: 0.03, variants: 3,
    // joint voxel coordinates (in the same space as the model); pivot = centre of that voxel
    rig: { neck: [0, 30, 0], hip: [0, 14, 0], shoulderL: [-5, 27, 0], shoulderR: [5, 27, 0], hipL: [-2, 13, 0], hipR: [2, 13, 0] },
    build(p, variant) { /* p.head, p.torso, p.armL, p.armR, p.legL, p.legR are VoxelModels */ },
  },
};
```
Model the whole character standing (arms down, feet on y=0, facing +z, centred on x=0) but put each
voxel into the right part model. Arms rotate around their shoulder joint, legs around their hip joint,
the head around the neck joint. `variant` (0..variants-1) should change colours / hair / accessories.

## Checking your work (required)
```
node tools/shoot.mjs "viewer.html?series=<id>&cols=4" shots/<id>.png 1600 900
node tools/shoot.mjs "viewer.html?series=<id>&cols=4&angle=back" shots/<id>-back.png 1600 900
node tools/shoot.mjs "viewer.html?props=<file>" shots/<file>.png 1600 1000
node tools/shoot.mjs "viewer.html?chars=visitors&variants=3" shots/visitors.png 1600 1000
```
Then open the PNG with the Read tool and iterate until every model looks great. The tool starts its own
server, so it is safe to run in parallel. Errors print to the console and in red on the page.

## Machines, banners and shop art
* Machine cabinets: `src/world/machineModels.js` (`MACHINE_SPECS`, 5 mm voxels plus pixel-art decals).
  Preview every type with its banner: `viewer.html?module=/src/dev/machines.js&angle=front&cols=4`
  (`&type=standard&series=uchu&ext=0.06&lvl=3` to pick one).
* Banners (台紙): `src/gfx/banner.js` composes `src/gfx/bannerScenes.js` (one painted 320×200 scene per series
  plus `BANNER_TEXT` catchphrases) with the figures, the title logo and the lineup. Preview: `banners.html?scale=2[&only=mochi]`.
  Scene previews: `scenes.html`.
* Old-shop props: `src/data/props/shop.js`. Signage: `src/gfx/shopArt.js` (`SHOP_ART`), preview `shopart.html`.
* Display sheets (themed mats for museum displays): `src/museum/styles.js`.
