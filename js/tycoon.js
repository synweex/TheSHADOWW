// SkyStack City — economia de tip Tycoon: venit pasiv, trezorerie, renovări, investiții
window.SC = window.SC || {};

// venit pe minut pentru fiecare locuitor, după tipul clădirii
SC.RENT = { casa: 0.06, bloc: 0.08, birouri: 0.12, turn: 0.16 };
// costul de bază al unei renovări (crește x1.75 pe nivel)
SC.RENO_BASE = { casa: 60, bloc: 180, birouri: 500, turn: 1400 };
SC.MAX_LVL = 10;

SC.INVEST = [
  { key: 'parc',    icon: '🌳', name: 'Parcuri',          desc: '+10% venit pe nivel',              base: 150,  mult: 2.0, max: 10 },
  { key: 'metrou',  icon: '🚇', name: 'Metrou',           desc: '+15% venit pe nivel',              base: 500,  mult: 2.1, max: 10 },
  { key: 'centrala',icon: '⚡', name: 'Centrală electrică',desc: '+25% venit pe nivel',             base: 1800, mult: 2.3, max: 10 },
  { key: 'seif',    icon: '🏦', name: 'Seif mai mare',    desc: '+30 min capacitate în trezorerie', base: 200,  mult: 1.9, max: 10 },
  { key: 'mkt',     icon: '📣', name: 'Marketing',        desc: '+15% monede din jocuri',           base: 250,  mult: 2.0, max: 10 },
  { key: 'primar',  icon: '🤵', name: 'Primar automat',   desc: 'Strânge singur banii din trezorerie', base: 4000, mult: 1, max: 1 },
];

SC.fmt = (n) => {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace('.0', '') + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
};

SC.Tycoon = (function () {
  const S = SC.Save;

  function ty() {
    const d = S.d;
    if (!d.ty) d.ty = { treasury: 0, last: Date.now(), inv: {} };
    if (!d.ty.inv) d.ty.inv = {};
    return d.ty;
  }
  const lvlOf = (key) => ty().inv[key] || 0;

  function lotIncome(lot) {
    if (!lot.b) return 0;
    const lvl = lot.b.lvl || 1;
    const base = lot.b.pop * (SC.RENT[lot.b.type] || 0.15);
    return base * (lot.b.complete ? 1 : 0.5) * (1 + 0.5 * (lvl - 1));
  }

  function multiplier() {
    return 1 + 0.1 * lvlOf('parc') + 0.15 * lvlOf('metrou') + 0.25 * lvlOf('centrala');
  }

  function incomePerMin() {
    return S.d.lots.reduce((s, l) => s + lotIncome(l), 0) * multiplier();
  }

  function capMinutes() { return 60 + 30 * lvlOf('seif'); }
  function capacity() { return Math.max(50, incomePerMin() * capMinutes()); }
  function gameBonus() { return 1 + 0.15 * lvlOf('mkt'); }
  function hasMayor() { return lvlOf('primar') > 0; }

  // adaugă venitul acumulat de la ultima verificare; întoarce cât s-a adăugat
  function tick(now = Date.now()) {
    const t = ty();
    const mins = Math.max(0, (now - t.last) / 60000);
    t.last = now;
    if (!mins) return 0;
    const cap = capacity();
    const before = t.treasury;
    t.treasury = Math.min(cap, t.treasury + incomePerMin() * mins);
    if (hasMayor() && t.treasury >= 1) {
      const c = Math.floor(t.treasury);
      S.d.coins += c; t.treasury -= c;
    }
    return Math.max(0, t.treasury - before);
  }

  // la pornire: cât a câștigat orașul cât ai lipsit
  function offline() {
    const t = ty();
    const now = Date.now();
    const away = now - t.last;
    if (away < 60000 || incomePerMin() <= 0) { tick(now); return null; }
    const coinsBefore = S.d.coins, trBefore = t.treasury;
    tick(now);
    const earned = (S.d.coins - coinsBefore) + (t.treasury - trBefore);
    return { away, earned: Math.floor(earned), full: t.treasury >= capacity() - 1 };
  }

  function collect() {
    const t = ty();
    const c = Math.floor(t.treasury);
    if (c <= 0) return 0;
    S.d.coins += c; t.treasury -= c;
    S.save();
    return c;
  }

  function renoCost(lot) {
    const lvl = lot.b.lvl || 1;
    return Math.round(SC.RENO_BASE[lot.b.type] * Math.pow(1.75, lvl - 1));
  }
  function renovate(lot) {
    const cost = renoCost(lot);
    if ((lot.b.lvl || 1) >= SC.MAX_LVL || S.d.coins < cost) return false;
    tick();
    S.d.coins -= cost;
    lot.b.lvl = (lot.b.lvl || 1) + 1;
    S.save();
    return true;
  }

  function invCost(inv) { return Math.round(inv.base * Math.pow(inv.mult, lvlOf(inv.key))); }
  function buyInvest(inv) {
    const cost = invCost(inv);
    if (lvlOf(inv.key) >= inv.max || S.d.coins < cost) return false;
    tick();
    S.d.coins -= cost;
    ty().inv[inv.key] = lvlOf(inv.key) + 1;
    S.save();
    return true;
  }

  return { ty, lvlOf, lotIncome, multiplier, incomePerMin, capMinutes, capacity, gameBonus, hasMayor, tick, offline, collect, renoCost, renovate, invCost, buyInvest };
})();
