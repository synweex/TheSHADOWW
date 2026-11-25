// SkyStack City — date de joc: clădiri, misiuni, zone de altitudine
window.SC = window.SC || {};

SC.BUILDINGS = {
  casa:    { name: 'Casă',        emoji: '🏠', floors: 6,  popPer: 8,  cost: 0,    style: 'casa',    desc: 'Mică și cochetă' },
  bloc:    { name: 'Bloc',        emoji: '🏢', floors: 12, popPer: 16, cost: 150,  style: 'bloc',    desc: 'Multe familii' },
  birouri: { name: 'Birouri',     emoji: '🏬', floors: 20, popPer: 24, cost: 450,  style: 'birouri', desc: 'Sticlă și oțel' },
  turn:    { name: 'Zgârie-nori', emoji: '🏙️', floors: 32, popPer: 36, cost: 1200, style: 'turn',    desc: 'Mândria orașului' },
};
SC.BUILD_ORDER = ['casa', 'bloc', 'birouri', 'turn'];

SC.LOT_COUNT = 12;
SC.DISTRICTS = [
  { name: 'Cartierul Verde', icon: '🌳' },
  { name: 'Centrul Vechi', icon: '⛲' },
  { name: 'Downtown', icon: '🌆' },
];
// Primele 3 loturi sunt gratuite; restul costă monede
SC.lotCost = (i) => (i < 3 ? 0 : 60 + (i - 3) * 60);

SC.RANKS = [
  { pop: 0,     name: 'Sat' },
  { pop: 100,   name: 'Comună' },
  { pop: 400,   name: 'Orășel' },
  { pop: 1200,  name: 'Oraș' },
  { pop: 3000,  name: 'Municipiu' },
  { pop: 6000,  name: 'Metropolă' },
  { pop: 10000, name: 'Megalopolis' },
];
SC.rankFor = (pop) => {
  let r = SC.RANKS[0], next = null;
  for (let i = 0; i < SC.RANKS.length; i++) {
    if (pop >= SC.RANKS[i].pop) { r = SC.RANKS[i]; next = SC.RANKS[i + 1] || null; }
  }
  return { rank: r, next };
};

// goal.type: floors | perfects | combo | population
// mods: lives, speed, wind (0-2), width, time (secunde), drift (macara mobilă), popPer, style
SC.MISSIONS = [
  { name: 'Prima fundație',    desc: 'Construiește 5 etaje.',                         goal: { type: 'floors', value: 5 },        mods: {},                              reward: 50 },
  { name: 'Ochi de vultur',    desc: 'Fă 3 plasări perfecte.',                        goal: { type: 'perfects', value: 3 },      mods: {},                              reward: 60 },
  { name: 'Fără greșeli',      desc: '8 etaje cu o singură viață.',                   goal: { type: 'floors', value: 8 },        mods: { lives: 1 },                    reward: 80 },
  { name: 'Combo!',            desc: 'Fă un combo de 4 perfecte la rând.',            goal: { type: 'combo', value: 4 },         mods: {},                              reward: 80 },
  { name: 'Vânt de primăvară', desc: '10 etaje pe vânt ușor.',                        goal: { type: 'floors', value: 10 },       mods: { wind: 1 },                     reward: 100 },
  { name: 'Contra cronometru', desc: '12 etaje în 75 de secunde.',                    goal: { type: 'floors', value: 12 },       mods: { time: 75 },                    reward: 120 },
  { name: 'Comunitate',        desc: 'Mută 250 de locuitori.',                        goal: { type: 'population', value: 250 },  mods: { popPer: 16, style: 'bloc' },   reward: 120 },
  { name: 'Blocuri înguste',   desc: '12 etaje cu blocuri mai înguste.',              goal: { type: 'floors', value: 12 },       mods: { width: 0.78 },                 reward: 140 },
  { name: 'Macaragiu grăbit',  desc: '15 etaje, macaraua se mișcă rapid.',            goal: { type: 'floors', value: 15 },       mods: { speed: 1.5 },                  reward: 150 },
  { name: 'Macara pe șine',    desc: '15 etaje, macaraua alunecă stânga-dreapta.',    goal: { type: 'floors', value: 15 },       mods: { drift: 55 },                   reward: 170 },
  { name: 'Furtuna',           desc: '15 etaje pe vânt puternic.',                    goal: { type: 'floors', value: 15 },       mods: { wind: 2 },                     reward: 190 },
  { name: 'Maestru',           desc: 'Combo de 8 perfecte la rând.',                  goal: { type: 'combo', value: 8 },         mods: {},                              reward: 220 },
  { name: 'Zgârie-nori',       desc: 'Construiește 30 de etaje.',                     goal: { type: 'floors', value: 30 },       mods: { style: 'turn' },               reward: 240 },
  { name: 'Nervi de oțel',     desc: '20 etaje, o viață, macara rapidă.',             goal: { type: 'floors', value: 20 },       mods: { lives: 1, speed: 1.25 },       reward: 280 },
  { name: 'Megabloc',          desc: 'Mută 900 de locuitori.',                        goal: { type: 'population', value: 900 },  mods: { popPer: 28, style: 'birouri' },reward: 300 },
  { name: 'Până la nori',      desc: '40 de etaje, cu vânt — atinge norii!',          goal: { type: 'floors', value: 40 },       mods: { wind: 1, drift: 30 },          reward: 450 },
];

// Zone de altitudine (după numărul de etaje) — folosite în modul Endless
SC.ZONES = [
  { f: 0,   name: 'Orașul',            msg: null },
  { f: 20,  name: 'Nori',              msg: '☁️ Ai ajuns în nori!' },
  { f: 40,  name: 'Altitudine de zbor',msg: '✈️ Altitudine de croazieră' },
  { f: 60,  name: 'Stratosferă',       msg: '🎈 Stratosfera!' },
  { f: 80,  name: 'Spațiu',            msg: '🚀 Linia Kármán — ești în SPAȚIU!' },
  { f: 105, name: 'Orbită joasă',      msg: '🛰️ Orbită joasă' },
  { f: 135, name: 'Spre Lună',         msg: '🌕 Drumul spre Lună' },
  { f: 190, name: 'Planetele',         msg: '🪐 Printre planete' },
  { f: 250, name: 'Spațiu adânc',      msg: '🌌 Spațiu adânc' },
  { f: 330, name: 'Altă galaxie',      msg: '✨ Ai părăsit galaxia!' },
];
SC.zoneFor = (f) => {
  let z = SC.ZONES[0];
  for (const zz of SC.ZONES) if (f >= zz.f) z = zz;
  return z;
};

// Altitudine "fantastică": crește tot mai repede, ca să ajungi în spațiu pe la etajul 80
SC.altitude = (f) => 3.5 * f + 0.195 * f * f * f; // metri
SC.formatAlt = (m) => {
  if (m < 1000) return Math.round(m) + ' m';
  if (m < 1e6) return (m / 1000).toFixed(m < 1e4 ? 1 : 0) + ' km';
  return (m / 1e6).toFixed(2) + ' mil. km';
};
