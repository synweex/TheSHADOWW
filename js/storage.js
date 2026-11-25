// Salvarea progresului în localStorage
window.SC = window.SC || {};

SC.Save = (function () {
  const KEY = 'skystack_city_v1';

  function fresh() {
    return {
      coins: 0,
      lots: Array.from({ length: SC.LOT_COUNT }, (_, i) => ({ owned: i < 3, b: null })),
      types: { casa: true },
      missions: {},          // index -> stele (1..3)
      best: { floors: 0, pop: 0 },
      stats: { blocks: 0, perfects: 0, games: 0 },
      settings: { sound: true, vibrate: true, craneSpeed: 1 },
      seenHelp: false,
    };
  }

  let data = fresh();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const f = fresh();
        data = Object.assign(f, d);
        data.settings = Object.assign(f.settings, d.settings || {});
        data.best = Object.assign(f.best, d.best || {});
        data.stats = Object.assign(f.stats, d.stats || {});
        if (!Array.isArray(data.lots) || data.lots.length !== SC.LOT_COUNT) data.lots = f.lots;
      }
    } catch (e) { data = fresh(); }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function reset() { data = fresh(); save(); return data; }

  function cityPop() {
    return data.lots.reduce((s, l) => s + (l.b ? l.b.pop : 0), 0);
  }

  return { load, save, reset, cityPop, get d() { return data; } };
})();
