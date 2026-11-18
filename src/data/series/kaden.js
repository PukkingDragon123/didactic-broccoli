// Denki Dōbutsu (でんきどうぶつ, "Appliance Animals"): Shōwa home appliances that are animals, an original capsule-toy
// series modelled in Blender (art/blender/toys/kaden, concept in art/blender/toys/concepts_C.md). The twist: the
// machine's own motion is the animal's motion. Press it (left click in hand, right click on a shelf) and the appliance
// runs: the fan-owl oscillates and turns its head right round, the toaster-rabbit pops its toast ears.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'kaden',
  order: 40,
  name: 'Appliance Animals',
  jp: 'でんきどうぶつ',
  tagline: 'Switch on: the machine moves like the animal',
  taglineJp: 'スイッチオン！ 家電がどうぶつに',
  price: 300,
  themes: ['retro', 'home'],
  card: { bg: '#f1ead6', accent: '#3f9a86', text: '#24302c', accent2: '#d2483a', pattern: 'dots', kind: 'でんきどうぶつフィギュア' },
  capsule: { colors: [0x93cdb9, 0xd2483a, 0xefe4c8, 0xb6bec6] },
  items: [
    {
      id: 'fukuro', name: 'Swivel Owl', jp: 'くびふりフクロウ', rarity: 'common',
      desc: 'A mint-green desk fan with an owl\'s face in its wire guard. Switch it on and it oscillates, then turns its head right round to look behind it. The false eyes on its back cover are for exactly that.',
      gimmick: { text: 'Switch on', sfx: [[0.07, 'switchClick'], [0.2, 'motor', { dur: 2.4 }], [1.25, 'toyRatchet', { n: 6, gap: 0.03 }], [1.45, 'toyClick'], [2.05, 'toyRatchet', { n: 5, gap: 0.03 }], [2.2, 'toyClick'], [2.6, 'switchClick']] },
    },
    {
      id: 'usagi', name: 'Pop-up Rabbit', jp: 'ポンうさぎ', rarity: 'common',
      desc: 'A chrome pop-up toaster with ruby eyes. Its ears are two slices of toast, its nose is the browning knob and its tail is the plug. Press the lever: tick, tick, tick, DING.',
      gimmick: { text: 'Toast', sfx: [[0.1, 'switchClick'], [0.28, 'toyFold', { n: 3 }], [0.5, 'clockTick'], [0.75, 'clockTick'], [1.0, 'clockTick'], [1.25, 'clockTick'], [1.36, 'bellDing'], [1.42, 'boing'], [1.72, 'toyTap'], [1.95, 'toyClick'], [2.08, 'toyClick', { f: 2800 }]] },
    },
  ],
};
