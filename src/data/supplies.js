// What the corner shop across the lane sells. Every item stands on Mikawa-ya's shelves (src/world/CornerShop.js stock,
// sold physically by src/plugins/mikawaya.js); bought items go straight into your inventory (or wait on the counter if
// your hands are full). Handled by game.buySupply(id).
export const SUPPLIES = [
  { id: 'milk', tool: 'milk', name: 'Milk', price: 150, desc: 'Fresh milk for the hungry cat.' },
  { id: 'broom', tool: 'broom', name: 'Broom', price: 600, desc: 'Sweep up dust and rubbish.' },
  { id: 'toolkit', tool: 'toolkit', name: 'Tool Kit', price: 900, desc: 'Screwdrivers, wrench and grease. Repairs broken machines.' },
  { id: 'batteries', tool: 'batteries', name: 'Batteries', price: 300, desc: "Four AA cells for Grandpa's old radio." },
  { id: 'tube', tool: 'tube', name: 'Fluorescent Tube', price: 400, desc: 'A new tube for the dead ceiling light.' },
  { id: 'watch', tool: 'watch', name: 'Old Pocket Watch', price: 4000, desc: 'Ticks very loudly. The old man swears it can stop time. Surely a joke.' },
  { id: 'flyers', tool: 'flyers', name: 'Flyers', price: 500, desc: '30 printed flyers. Hand them out to bring in customers.', uses: 30 },
  // dagashi: cheap sweets from the jars, the tub and the ¥10 box
  { id: 'ramune', tool: 'ramune', name: 'Ramune', price: 80, desc: 'Marble soda, ice cold from the tub. Thumb the marble in and drink.' },
  { id: 'puffstick', tool: 'puffstick', name: 'Puff Stick', price: 10, desc: 'The ¥10 corn puff. Cheese flavour. Crumbs everywhere.' },
  { id: 'candy', tool: 'candy', name: 'Fruit Candy', price: 10, desc: 'One wrapped sweet from the big jar on the table.' },
];
export const SUPPLY_BY_ID = Object.fromEntries(SUPPLIES.map((s) => [s.id, s]));
