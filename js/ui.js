// SkyStack City — interfața: meniuri, oraș, misiuni, HUD, rezultate
(function () {
  const $ = (id) => document.getElementById(id);
  const S = SC.Save;
  S.load();
  SC.Audio.setEnabled(S.d.settings.sound);
  SC.Audio.setVibrate(S.d.settings.vibrate);

  const game = new SC.Game($('game'));
  SC.game = game;

  let current = 'menu';     // ecranul curent
  let playing = false;
  let lastCfg = null;       // pentru "Încă o dată"
  let returnTo = 'menu';

  const SCREENS = { menu: 'scrMenu', city: 'scrCity', missions: 'scrMissions', help: 'scrHelp', settings: 'scrSettings', pause: 'scrPause', result: 'scrResult' };

  function show(name) {
    for (const k in SCREENS) $(SCREENS[k]).classList.toggle('hidden', k !== name);
    current = name;
    if (name === 'menu') renderMenu();
    if (name === 'city') renderCity();
    if (name === 'missions') renderMissions();
    if (name === 'settings') renderSettings();
    document.querySelectorAll('.coins').forEach((e) => (e.textContent = S.d.coins));
  }

  function toast(msg, ms = 1800) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('hidden'), ms);
  }

  // ---------- Meniu ----------
  function renderMenu() {
    $('menuPop').textContent = S.cityPop();
    $('menuBest').textContent = S.d.best.floors;
    if (!playing) game.reset({ mode: 'idle' });
  }

  // ---------- Oraș ----------
  function renderCity() {
    const pop = S.cityPop();
    const { rank, next } = SC.rankFor(pop);
    $('cityRank').textContent = '🏙️ ' + rank.name;
    $('cityNext').textContent = next ? `Următorul rang: ${next.name} la ${next.pop} locuitori` : 'Rang maxim atins!';
    $('cityPop').textContent = pop;
    $('cityBuilt').textContent = S.d.lots.filter((l) => l.b && l.b.complete).length;

    const wrap = $('lots');
    wrap.innerHTML = '';
    SC.DISTRICTS.forEach((dist, di) => {
      const h = document.createElement('div');
      h.className = 'district';
      h.textContent = `${dist.icon} ${dist.name}`;
      wrap.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'lot-grid';
      for (let k = 0; k < 4; k++) {
        const i = di * 4 + k;
        const lot = S.d.lots[i];
        const el = document.createElement('button');
        el.className = 'lot';
        if (!lot.owned) {
          el.classList.add('locked');
          el.innerHTML = `<span class="e">🔒</span><span class="n">${SC.lotCost(i)} 🪙</span>`;
        } else if (!lot.b) {
          el.classList.add('empty');
          el.innerHTML = `<span class="e">🏗️</span><span class="n">Construiește</span>`;
        } else {
          const B = SC.BUILDINGS[lot.b.type];
          if (!lot.b.complete) el.classList.add('unfinished');
          el.innerHTML = `<span class="e">${B.emoji}</span><span class="n">${B.name}</span><span class="p">${lot.b.floors}/${B.floors} · 👥${lot.b.pop}</span>`;
        }
        el.onclick = () => { SC.Audio.click(); openLot(i); };
        grid.appendChild(el);
      }
      wrap.appendChild(grid);
    });
    drawCityView();
  }

  function drawCityView() {
    const cv = $('cityView');
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#56aef5'); g.addColorStop(1, '#d6f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // soare + nori
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(w - 30, 26, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [cx, cy, s] of [[40, 30, 1], [150, 20, 0.8], [240, 40, 0.7]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 10 * s, 0, 7); ctx.arc(cx + 12 * s, cy - 5 * s, 12 * s, 0, 7); ctx.arc(cx + 25 * s, cy, 9 * s, 0, 7); ctx.fill();
    }
    const groundY = h - 22;
    ctx.fillStyle = '#6cc04a'; ctx.fillRect(0, groundY, w, 22);
    ctx.fillStyle = '#555c66'; ctx.fillRect(0, groundY + 10, w, 8);
    const lotW = w / SC.LOT_COUNT;
    const sx = (lotW * 0.82) / 128;
    const sy = Math.min(sx, (groundY - 18) / (32 * 40 + 100));
    S.d.lots.forEach((lot, i) => {
      const cx = lotW * (i + 0.5);
      if (!lot.owned) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(cx - lotW * 0.4, groundY - 3, lotW * 0.8, 3);
        return;
      }
      if (!lot.b) {
        ctx.fillStyle = '#c9a36a'; ctx.fillRect(cx - lotW * 0.4, groundY - 3, lotW * 0.8, 3);
        ctx.fillStyle = '#f0b400'; ctx.fillRect(cx - 1, groundY - 16, 2, 13);
        ctx.fillRect(cx - 1, groundY - 16, 7, 2);
        return;
      }
      const B = SC.BUILDINGS[lot.b.type];
      ctx.save();
      ctx.translate(cx, groundY);
      ctx.scale(sx, sy);
      for (let f = 0; f < lot.b.floors; f++) SC.drawFloor(ctx, 0, -(f + 1) * 40, 128, 40, B.style, f, false, f === 0);
      if (lot.b.complete) SC.drawRoof(ctx, 0, -lot.b.floors * 40, 128, B.style, 0);
      ctx.restore();
    });
    // separatoare de cartier
    ctx.fillStyle = '#3f9a3a';
    for (const k of [4, 8]) { ctx.beginPath(); ctx.arc(lotW * k, groundY - 6, 5, 0, 7); ctx.fill(); }
  }

  function openLot(i) {
    const lot = S.d.lots[i];
    const body = $('modalBody');
    body.innerHTML = '';
    if (!lot.owned) {
      const cost = SC.lotCost(i);
      $('modalTitle').textContent = `Lot ${i + 1} — ${SC.DISTRICTS[Math.floor(i / 4)].name}`;
      body.innerHTML = `<p class="sub">Cumpără acest teren ca să construiești pe el.</p>`;
      const b = document.createElement('button');
      b.className = 'btn big';
      b.textContent = `Cumpără pentru ${cost} 🪙`;
      b.disabled = S.d.coins < cost;
      b.onclick = () => {
        if (S.d.coins < cost) return;
        S.d.coins -= cost; lot.owned = true; S.save();
        SC.Audio.coin();
        closeModal(); renderCity(); show('city');
        toast('Teren cumpărat! 🎉');
      };
      body.appendChild(b);
      if (S.d.coins < cost) body.insertAdjacentHTML('beforeend', `<p class="sub">Îți mai trebuie ${cost - S.d.coins} 🪙 — joacă misiuni sau Endless!</p>`);
    } else {
      $('modalTitle').textContent = `Lot ${i + 1}`;
      if (lot.b) {
        const B = SC.BUILDINGS[lot.b.type];
        body.insertAdjacentHTML('beforeend', `<p class="sub">${B.emoji} ${B.name} · ${lot.b.floors}/${B.floors} etaje · 👥 ${lot.b.pop}${lot.b.complete ? '' : ' · <b>neterminată</b>'}<br><small>Poți reconstrui — se păstrează rezultatul mai bun.</small></p>`);
      }
      for (const key of SC.BUILD_ORDER) {
        const B = SC.BUILDINGS[key];
        const unlocked = !!S.d.types[key];
        const row = document.createElement('div');
        row.className = 'bopt';
        row.innerHTML = `<span class="e">${B.emoji}</span><div class="info"><b>${B.name}</b><small>${B.floors} etaje · ~${B.popPer} 👥/etaj · ${B.desc}</small></div>`;
        const btn = document.createElement('button');
        btn.className = 'btn small';
        if (unlocked) {
          btn.textContent = 'Construiește';
          btn.style.background = '#2e9e4e';
          btn.onclick = () => { closeModal(); startCity(i, key); };
        } else {
          btn.textContent = `${B.cost} 🪙`;
          btn.disabled = S.d.coins < B.cost;
          btn.onclick = () => {
            if (S.d.coins < B.cost) return;
            S.d.coins -= B.cost; S.d.types[key] = true; S.save();
            SC.Audio.coin();
            toast(`${B.name} deblocat!`);
            openLot(i);
            document.querySelectorAll('.coins').forEach((e) => (e.textContent = S.d.coins));
          };
        }
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); }

  // ---------- Misiuni ----------
  function missionTags(m) {
    const t = [];
    const md = m.mods;
    if (md.lives === 1) t.push('❤️ 1 viață');
    if (md.wind) t.push(md.wind > 1 ? '🌪️ vânt puternic' : '🌬️ vânt');
    if (md.time) t.push(`⏱ ${md.time}s`);
    if (md.speed) t.push('⚡ rapid');
    if (md.width) t.push('↔️ înguste');
    if (md.drift) t.push('🛤️ macara mobilă');
    return t.join(' · ');
  }

  function renderMissions() {
    const list = $('missionList');
    list.innerHTML = '';
    let total = 0;
    SC.MISSIONS.forEach((m, i) => {
      const stars = S.d.missions[i] || 0;
      total += stars;
      const unlocked = i === 0 || (S.d.missions[i - 1] || 0) > 0;
      const el = document.createElement('button');
      el.className = 'mis' + (unlocked ? '' : ' locked') + (stars ? ' done' : '');
      const tags = missionTags(m);
      el.innerHTML = `<div class="num">${unlocked ? i + 1 : '🔒'}</div>
        <div class="info"><b>${m.name}</b><small>${m.desc}</small>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
        <div class="st">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}<br><small>🪙 ${m.reward}</small></div>`;
      el.onclick = () => {
        SC.Audio.click();
        if (!unlocked) return toast('Termină misiunea anterioară mai întâi!');
        startMission(i);
      };
      list.appendChild(el);
    });
    $('misStars').textContent = `⭐ ${total} / ${SC.MISSIONS.length * 3}`;
  }

  // ---------- Pornirea jocului ----------
  function beginPlay(cfg) {
    lastCfg = cfg;
    cfg.onEnd = onEnd;
    closeModal();
    for (const k in SCREENS) $(SCREENS[k]).classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('tapHint').classList.remove('hidden');
    game.reset(cfg);
    playing = true;
    current = 'play';
    hudCache = {};
  }

  function startCity(i, type) {
    const B = SC.BUILDINGS[type];
    const lots = S.d.lots;
    const sameRow = (j) => j >= 0 && j < lots.length && Math.floor(j / 4) === Math.floor(i / 4);
    const nb = [sameRow(i - 1) ? lots[i - 1].b : null, sameRow(i + 1) ? lots[i + 1].b : null];
    returnTo = 'city';
    beginPlay({ mode: 'city', target: B.floors, popPer: B.popPer, style: B.style, lot: i, type, neighbors: nb });
  }

  function startMission(idx) {
    const m = SC.MISSIONS[idx];
    returnTo = 'missions';
    beginPlay(Object.assign({ mode: 'mission', goal: m.goal, missionIdx: idx }, m.mods));
  }

  function startEndless() {
    returnTo = 'menu';
    beginPlay({ mode: 'endless' });
  }

  // ---------- Final de joc ----------
  function onEnd(r) {
    playing = false;
    $('hud').classList.add('hidden');
    $('tapHint').classList.add('hidden');
    const cfg = r.cfg;
    let coins = 0, title = '', sub = '', stars = 0, record = false;
    const grid = [];
    grid.push(['🏢', r.floors, 'etaje']);
    grid.push(['👥', r.pop, 'locuitori']);
    grid.push(['🎯', r.perfects, 'perfecte']);
    grid.push(['🔥', r.maxCombo, 'combo maxim']);

    if (r.mode === 'city') {
      const B = SC.BUILDINGS[cfg.type];
      const lot = S.d.lots[cfg.lot];
      const nb = { type: cfg.type, floors: r.floors, pop: r.pop, complete: r.win };
      const old = lot.b;
      let kept = false;
      if (r.floors > 0) {
        if (!old || old.type !== cfg.type || (nb.complete && !old.complete) || (nb.complete === old.complete && nb.pop > old.pop)) lot.b = nb;
        else kept = true;
      }
      coins = Math.round(r.pop / 4) + (r.win ? 25 : 0);
      title = r.win ? `${B.emoji} ${B.name} gata!` : '🚧 Clădire neterminată';
      sub = r.win ? `${r.pop} locuitori s-au mutat în oraș!` : (r.reason || '') + (r.floors ? ' Poți încerca din nou oricând.' : '');
      if (kept) sub += ' (Recordul anterior a fost păstrat.)';
      stars = r.win ? (r.livesLost === 0 ? 3 : r.livesLost === 1 ? 2 : 1) : 0;
    } else if (r.mode === 'mission') {
      const idx = cfg.missionIdx;
      const m = SC.MISSIONS[idx];
      if (r.win) {
        stars = cfg.lives === 1 || r.livesLost === 0 ? 3 : r.livesLost === 1 ? 2 : 1;
        const prev = S.d.missions[idx] || 0;
        coins = prev ? Math.round(m.reward * 0.25) : m.reward;
        if (stars > prev) { S.d.missions[idx] = stars; if (prev) coins += Math.round(m.reward * 0.25 * (stars - prev)); }
        title = '🎉 Misiune reușită!';
        sub = m.name;
      } else {
        coins = Math.round(r.floors * 1.5);
        title = '💥 Misiune eșuată';
        sub = r.reason || m.name;
      }
    } else {
      coins = r.floors * 3 + r.perfects * 2;
      title = '🚀 Turnul tău';
      const zone = SC.zoneFor(r.floors);
      sub = `Ai ajuns până la: ${zone.name} · ${SC.formatAlt(r.alt)}`;
      if (r.floors > S.d.best.floors) { S.d.best.floors = r.floors; record = r.floors > 0; }
      if (r.pop > S.d.best.pop) S.d.best.pop = r.pop;
      grid.splice(1, 0, ['📏', SC.formatAlt(r.alt), 'altitudine']);
      grid.push(['🏆', S.d.best.floors, 'record etaje']);
    }

    S.d.coins += coins;
    S.save();

    $('resTitle').textContent = title;
    $('resSub').textContent = sub;
    $('resStars').textContent = stars ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    $('resGrid').innerHTML = grid.map(([e, v, l]) => `<div><b>${e} ${v}</b><small>${l}</small></div>`).join('');
    $('resCoins').textContent = `+${coins} 🪙`;
    $('resRecord').classList.toggle('hidden', !record);
    const hasNext = r.mode === 'mission' && r.win && cfg.missionIdx + 1 < SC.MISSIONS.length;
    $('btnNext').classList.toggle('hidden', !hasNext);
    $('btnAgain').textContent = r.mode === 'city' ? '🔄 Construiește din nou' : '🔄 Încă o dată';
    $('btnBack').textContent = r.mode === 'city' ? '🏙️ Înapoi în oraș' : r.mode === 'mission' ? '🎯 Misiuni' : '🏠 Meniu';
    if (coins) setTimeout(() => SC.Audio.coin(), 250);
    show('result');
  }

  // ---------- HUD ----------
  let hudCache = {};
  function setText(id, v, cls) {
    if (hudCache[id] === v) return;
    hudCache[id] = v;
    const el = $(id);
    el.textContent = v;
    if (cls !== undefined) el.classList.toggle('warn', cls);
  }

  function updateHud() {
    const g = game, c = g.cfg;
    const n = g.floors.length;
    setText('hudFloors', c.target ? `${n}/${c.target}` : String(n));
    setText('hudPop', String(g.pop));
    setText('hudLives', '❤️'.repeat(Math.max(0, g.lives)) + '🖤'.repeat(Math.max(0, g.maxLives - g.lives)));
    let goal = '';
    if (c.goal) {
      const gl = c.goal;
      if (gl.type === 'perfects') goal = `🎯 Perfecte ${g.perfects}/${gl.value}`;
      else if (gl.type === 'combo') goal = `🎯 Combo ${g.combo} (max ${g.maxCombo}/${gl.value})`;
      else if (gl.type === 'population') goal = `🎯 👥 ${g.pop}/${gl.value}`;
      else goal = `🎯 Etaje ${n}/${gl.value}`;
    } else if (g.combo >= 2) goal = `🔥 Combo x${g.combo}`;
    setText('hudGoal', goal);
    setText('hudAlt', g.mode === 'endless' ? `📍 ${SC.zoneFor(n).name} · ${SC.formatAlt(SC.altitude(n))}` : '');
    setText('hudTimer', c.time ? `⏱ ${Math.ceil(g.timeLeft)}s` : '', c.time && g.timeLeft < 10);
    const w = g.wind;
    const wStr = Math.abs(w) > 15 ? `🌬️ ${w > 0 ? '→'.repeat(Math.abs(w) > 120 ? 3 : Math.abs(w) > 60 ? 2 : 1) : '←'.repeat(Math.abs(w) > 120 ? 3 : Math.abs(w) > 60 ? 2 : 1)}` : '';
    setText('hudWind', wStr);
  }

  // ---------- Setări ----------
  function renderSettings() {
    $('setSound').checked = S.d.settings.sound;
    $('setVib').checked = S.d.settings.vibrate;
    const st = S.d.stats;
    $('statsBox').innerHTML = `📦 Blocuri puse: <b>${st.blocks}</b><br>🎯 Perfecte: <b>${st.perfects}</b><br>🎮 Jocuri: <b>${st.games}</b><br>🚀 Record Endless: <b>${S.d.best.floors}</b> etaje (${SC.formatAlt(SC.altitude(S.d.best.floors))})`;
  }

  // ---------- Evenimente ----------
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    SC.Audio.unlock(); SC.Audio.click();
    if (b.dataset.go === 'help') { S.d.seenHelp = true; S.save(); }
    show(b.dataset.go);
  }));
  $('btnEndless').onclick = () => { SC.Audio.unlock(); SC.Audio.click(); startEndless(); };
  $('modalClose').onclick = () => { SC.Audio.click(); closeModal(); };
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  function pause() {
    if (!playing || game.finished) return;
    game.paused = true;
    show('pause');
  }
  $('btnPause').addEventListener('click', (e) => { e.stopPropagation(); SC.Audio.click(); pause(); });
  $('btnResume').onclick = () => { SC.Audio.click(); $('scrPause').classList.add('hidden'); current = 'play'; game.paused = false; };
  $('btnRestart').onclick = () => { SC.Audio.click(); beginPlay(lastCfg); };
  $('btnQuit').onclick = () => { SC.Audio.click(); playing = false; $('hud').classList.add('hidden'); $('tapHint').classList.add('hidden'); game.reset({ mode: 'idle' }); show(returnTo); };
  $('btnAgain').onclick = () => { SC.Audio.click(); beginPlay(lastCfg); };
  $('btnNext').onclick = () => { SC.Audio.click(); startMission(lastCfg.missionIdx + 1); };
  $('btnBack').onclick = () => { SC.Audio.click(); game.reset({ mode: 'idle' }); show(returnTo); };

  $('setSound').onchange = (e) => { S.d.settings.sound = e.target.checked; SC.Audio.setEnabled(e.target.checked); S.save(); SC.Audio.click(); };
  $('setVib').onchange = (e) => { S.d.settings.vibrate = e.target.checked; SC.Audio.setVibrate(e.target.checked); S.save(); };
  $('btnReset').onclick = () => {
    if (!confirm('Sigur ștergi tot progresul? Orașul, monedele și stelele vor dispărea.')) return;
    S.reset();
    SC.Audio.setEnabled(true); SC.Audio.setVibrate(true);
    toast('Progres resetat.');
    show('settings');
  };

  // atingere pe ecran = lasă blocul
  $('game').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SC.Audio.unlock();
    if (!playing || current !== 'play') return;
    $('tapHint').classList.add('hidden');
    game.tap();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (playing && current === 'play') { e.preventDefault(); $('tapHint').classList.add('hidden'); game.tap(); }
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      if (current === 'play') pause();
      else if (current === 'pause') $('btnResume').onclick();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('resize', () => { if (current === 'city') drawCityView(); });

  // ---------- Bucla principală ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    if (playing) updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  show('menu');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
