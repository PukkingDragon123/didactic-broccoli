// What the corner shop across the lane sells. Bought items go straight into your inventory
// (or wait on the counter if your hands are full). Handled by game.buySupply(id).
export const SUPPLIES = [
  { id: 'milk', tool: 'milk', name: 'Milk', price: 150, desc: 'Fresh milk for the hungry cat.' },
  { id: 'broom', tool: 'broom', name: 'Broom', price: 600, desc: 'Sweep up dust and rubbish.' },
  { id: 'toolkit', tool: 'toolkit', name: 'Tool Kit', price: 900, desc: 'Screwdrivers, wrench and grease. Repairs broken machines.' },
  { id: 'batteries', tool: 'batteries', name: 'Batteries', price: 300, desc: "Four AA cells for Grandpa's old radio." },
  { id: 'tube', tool: 'tube', name: 'Fluorescent Tube', price: 400, desc: 'A new tube for the dead ceiling light.' },
  { id: 'watch', tool: 'watch', name: 'Old Pocket Watch', price: 4000, desc: 'Ticks very loudly. The old man swears it can stop time. Surely a joke.' },
  { id: 'flyers', tool: 'flyers', name: 'Flyers', price: 500, desc: '30 printed flyers. Hand them out to bring in customers.', uses: 30 },
];
export const SUPPLY_BY_ID = Object.fromEntries(SUPPLIES.map((s) => [s.id, s]));
