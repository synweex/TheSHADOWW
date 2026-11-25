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
    refreshCoins();
  }

  function updateMenuBadge() {
    const t = SC.Tycoon.ty(), cap = SC.Tycoon.capacity();
    const show = !SC.Tycoon.hasMayor() && SC.Tycoon.incomePerMin() > 0 && t.treasury >= cap * 0.5;
    $('menuBadge').classList.toggle('hidden', !show);
    $('menuPop').textContent = SC.fmt(S.cityPop());
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
    const pop = S.cityPop();
    $('menuPop').textContent = pop;
    $('menuBest').textContent = S.d.best.floors;
    const inc = SC.Tycoon.incomePerMin();
    $('menuCityInfo').textContent = inc > 0 ? `${SC.rankFor(pop).rank.name} · +${SC.fmt(inc)}/min` : `${SC.rankFor(pop).rank.name} · ${pop} locuitori`;
    updateMenuBadge();
    const stars = Object.values(S.d.missions).reduce((a, b) => a + b, 0);
    $('menuMisInfo').textContent = `⭐ ${stars} / ${SC.MISSIONS.length * 3}`;
    if (!playing) game.reset({ mode: 'idle' });
  }

  // ---------- Oraș (Tycoon) ----------
  const T = SC.Tycoon;
  let cityTab = 'lots';

  function refreshCoins() { document.querySelectorAll('.coins').forEach((e) => (e.textContent = SC.fmt(S.d.coins))); }

  function renderCity() {
    T.tick();
    const pop = S.cityPop();
    const { rank, next } = SC.rankFor(pop);
    $('cityRank').textContent = '🏙️ ' + rank.name;
    $('cityNext').textContent = next ? `Următorul rang: ${next.name} la ${next.pop} locuitori` : 'Rang maxim atins!';
    $('rankFill').style.width = (next ? clampPct((pop - rank.pop) / (next.pop - rank.pop)) : 100) + '%';
    $('cityPop').textContent = SC.fmt(pop);
    $('cityMult').textContent = 'x' + T.multiplier().toFixed(2).replace(/\.?0+$/, '');
    $('cityBuilt').textContent = S.d.lots.filter((l) => l.b && l.b.complete).length;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === cityTab));
    $('lots').classList.toggle('hidden', cityTab !== 'lots');
    $('invest').classList.toggle('hidden', cityTab !== 'invest');
    if (cityTab === 'lots') renderLots(); else renderInvest();
    updateTreasury(true);
    refreshCoins();
  }

  function renderLots() {
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
        el.style.animationDelay = (i * 0.03) + 's';
        if (!lot.owned) {
          el.classList.add('locked');
          el.innerHTML = `<span class="e">🔒</span><span class="n">${SC.fmt(SC.lotCost(i))} 🪙</span>`;
        } else if (!lot.b) {
          el.classList.add('empty');
          el.innerHTML = `<span class="e">🏗️</span><span class="n">Construiește</span>`;
        } else {
          const B = SC.BUILDINGS[lot.b.type];
          if (!lot.b.complete) el.classList.add('unfinished');
          const inc = T.lotIncome(lot) * T.multiplier();
          el.innerHTML = `<span class="lv">Nv ${lot.b.lvl || 1}</span><span class="e">${B.emoji}</span><span class="n">${B.name}</span><span class="inc">+${SC.fmt(inc)}/min</span>`;
        }
        el.onclick = () => { SC.Audio.click(); openLot(i); };
        grid.appendChild(el);
      }
      wrap.appendChild(grid);
    });
  }

  function renderInvest() {
    const wrap = $('invest');
    wrap.innerHTML = '';
    SC.INVEST.forEach((inv, k) => {
      const lvl = T.lvlOf(inv.key);
      const maxed = lvl >= inv.max;
      const cost = T.invCost(inv);
      const row = document.createElement('div');
      row.className = 'inv';
      row.style.animationDelay = k * 0.05 + 's';
      const pips = inv.max > 1 ? `<div class="pips">${Array.from({ length: inv.max }, (_, j) => `<i class="${j < lvl ? 'on' : ''}"></i>`).join('')}</div>` : '';
      row.innerHTML = `<span class="e">${inv.icon}</span><div class="info"><b>${inv.name}${inv.max > 1 ? ` · Nv ${lvl}` : lvl ? ' ✔️' : ''}</b><small>${inv.desc}</small>${pips}</div>`;
      const btn = document.createElement('button');
      btn.className = 'btn small';
      if (maxed) { btn.textContent = 'MAX'; btn.disabled = true; }
      else {
        btn.innerHTML = `${SC.fmt(cost)} <i class="ico coin"></i>`;
        btn.disabled = S.d.coins < cost;
        btn.style.background = S.d.coins >= cost ? '#2e9e4e' : '';
        btn.onclick = () => {
          if (!T.buyInvest(inv)) return;
          SC.Audio.coin(); SC.Audio.milestone();
          toast(`${inv.icon} ${inv.name} îmbunătățit!`);
          renderCity();
        };
      }
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    const info = document.createElement('p');
    info.className = 'sub';
    info.style.fontSize = '13px';
    info.textContent = `Trezoreria se umple în ${T.capMinutes()} de minute. Clădirile neterminate aduc doar jumătate din venit.`;
    wrap.appendChild(info);
  }

  // trezoreria se actualizează live
  let trCache = '';
  function updateTreasury(force) {
    const t = T.ty();
    const cap = T.capacity();
    const rate = T.incomePerMin();
    const key = Math.floor(t.treasury) + '|' + Math.floor(cap) + '|' + rate.toFixed(1) + '|' + S.d.coins;
    if (!force && key === trCache) return;
    trCache = key;
    $('trAmount').textContent = SC.fmt(t.treasury);
    $('trFill').style.width = clampPct(t.treasury / cap) + '%';
    $('trFill').parentElement.classList.toggle('full', t.treasury >= cap - 0.5 && rate > 0);
    $('trRate').textContent = rate > 0 ? `+${SC.fmt(rate)} 🪙/min` : 'Construiește clădiri ca să ai venit';
    $('trCap').textContent = T.hasMayor() ? '🤵 primarul colectează' : `max ${SC.fmt(cap)}`;
    const can = Math.floor(t.treasury) >= 1;
    $('btnCollect').disabled = !can;
    $('btnCollect').classList.toggle('ready', t.treasury >= cap * 0.5 && can);
    refreshCoins();
  }

  // monede care zboară spre portofel
  function flyCoins(fromEl, n) {
    const app = $('app').getBoundingClientRect();
    const f = fromEl.getBoundingClientRect();
    const target = document.querySelector('#scrCity .pill') || fromEl;
    const tr = target.getBoundingClientRect();
    for (let k = 0; k < n; k++) {
      const c = document.createElement('i');
      c.className = 'ico coin fly-coin';
      c.style.left = (f.left - app.left + f.width / 2 - 11 + (Math.random() - 0.5) * 40) + 'px';
      c.style.top = (f.top - app.top + f.height / 2 - 11 + (Math.random() - 0.5) * 20) + 'px';
      $('app').appendChild(c);
      setTimeout(() => {
        c.style.transform = `translate(${tr.left - f.left - f.width / 2 + 20}px, ${tr.top - f.top}px) scale(.7)`;
        c.style.opacity = '0.3';
      }, 20 + k * 45);
      setTimeout(() => c.remove(), 900 + k * 45);
    }
  }

  // ---- vederea animată a orașului ----
  const cityAnim = { coins: [], spawn: 0, heli: null, heliT: 25, w: 0, h: 0 };

  function sizeCityView() {
    const cv = $('cityView');
    const r = cv.getBoundingClientRect();
    if (!r.width) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (cityAnim.w !== r.width || cityAnim.h !== r.height) {
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      cityAnim.w = r.width; cityAnim.h = r.height;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawCityView(dt = 0) {
    const ctx = sizeCityView();
    if (!ctx) return;
    const w = cityAnim.w, h = cityAnim.h, now = performance.now() / 1000;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#56aef5'); g.addColorStop(1, '#d6f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,170,0.35)'; ctx.beginPath(); ctx.arc(w - 30, 26, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(w - 30, 26, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [cx0, cy, s, v] of [[40, 30, 1, 6], [150, 20, 0.8, 4], [240, 44, 0.7, 8]]) {
      const cx = ((cx0 + now * v) % (w + 60)) - 30;
      ctx.beginPath(); ctx.arc(cx, cy, 10 * s, 0, 7); ctx.arc(cx + 12 * s, cy - 5 * s, 12 * s, 0, 7); ctx.arc(cx + 25 * s, cy, 9 * s, 0, 7); ctx.fill();
    }
    const groundY = h - 22;
    ctx.fillStyle = '#6cc04a'; ctx.fillRect(0, groundY, w, 22);
    ctx.fillStyle = '#4c525c'; ctx.fillRect(0, groundY + 9, w, 9);
    ctx.fillStyle = '#e8e8e8';
    for (let x = 0; x < w; x += 18) ctx.fillRect(x, groundY + 13, 8, 1);
    // mașinuțe
    for (let k = 0; k < 4; k++) {
      const dir = k % 2 ? -1 : 1;
      const x = (((k * 97 + now * 30 * dir) % (w + 40)) + w + 40) % (w + 40) - 20;
      ctx.fillStyle = ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1'][k];
      ctx.fillRect(x, groundY + (dir > 0 ? 10 : 14), 10, 3.5);
    }
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
      if (lot.b.complete) SC.drawRoof(ctx, 0, -lot.b.floors * 40, 128, B.style, now);
      ctx.restore();
    });
    ctx.fillStyle = '#3f9a3a';
    for (const k of [4, 8]) { ctx.beginPath(); ctx.arc(lotW * k, groundY - 6, 5, 0, 7); ctx.fill(); }

    // monede care ies din clădiri, proporțional cu venitul
    const earning = S.d.lots.map((l, i) => ({ i, inc: T.lotIncome(l), l })).filter((x) => x.inc > 0);
    cityAnim.spawn -= dt;
    if (earning.length && cityAnim.spawn <= 0) {
      cityAnim.spawn = Math.max(0.25, 1.6 - earning.length * 0.12);
      const pick = earning[Math.floor(Math.random() * earning.length)];
      const topY = groundY - pick.l.b.floors * 40 * sy - 10;
      cityAnim.coins.push({ x: lotW * (pick.i + 0.5), y: topY, life: 1.4 });
    }
    for (const c of cityAnim.coins) {
      c.life -= dt; c.y -= 18 * dt;
      ctx.globalAlpha = Math.min(1, c.life);
      ctx.fillStyle = '#e09a00'; ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(c.x, c.y, 3.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(c.x - 1.5, c.y - 2.5, 1.5, 2);
    }
    ctx.globalAlpha = 1;
    cityAnim.coins = cityAnim.coins.filter((c) => c.life > 0);

    // elicopter cu livrare bonus — atinge-l!
    cityAnim.heliT -= dt;
    if (!cityAnim.heli && cityAnim.heliT <= 0 && T.incomePerMin() > 0) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      cityAnim.heli = { x: dir > 0 ? -40 : w + 40, y: 30 + Math.random() * 40, dir };
    }
    const hl = cityAnim.heli;
    if (hl) {
      hl.x += hl.dir * 38 * dt;
      const y = hl.y + Math.sin(now * 3) * 3;
      ctx.save(); ctx.translate(hl.x, y); ctx.scale(hl.dir, 1);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
      const blade = 16 * Math.abs(Math.sin(now * 40));
      ctx.beginPath(); ctx.moveTo(-blade, -9); ctx.lineTo(blade, -9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -6); ctx.stroke();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, 7); ctx.fill();
      ctx.fillRect(-20, -2, 12, 3);
      ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(4, -1, 4, 3, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 13); ctx.stroke();
      ctx.restore();
      // lada cu bani
      ctx.fillStyle = '#b5743a'; ctx.fillRect(hl.x - 6, y + 13, 12, 9);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(hl.x - 6, y + 16, 12, 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(now * 6)) + ')';
      ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👆', hl.x, y + 36);
      if (hl.x < -60 || hl.x > w + 60) { cityAnim.heli = null; cityAnim.heliT = 60 + Math.random() * 90; }
    }
  }

  $('cityView').addEventListener('pointerdown', (e) => {
    const hl = cityAnim.heli;
    if (!hl) return;
    const r = $('cityView').getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.abs(x - hl.x) < 32 && Math.abs(y - hl.y - 8) < 32) {
      const reward = Math.max(40, Math.round(T.incomePerMin() * 4));
      S.d.coins += reward; S.save();
      cityAnim.heli = null; cityAnim.heliT = 90 + Math.random() * 90;
      SC.Audio.win();
      toast(`🚁 Livrare specială! +${SC.fmt(reward)} 🪙`);
      updateTreasury(true);
    }
  });

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    SC.Audio.click(); cityTab = t.dataset.tab; renderCity();
  }));

  $('btnCollect').addEventListener('click', () => {
    T.tick();
    const c = T.collect();
    if (!c) return;
    SC.Audio.coin(); setTimeout(() => SC.Audio.coin(), 120);
    flyCoins($('btnCollect'), Math.min(12, 3 + Math.floor(Math.log10(c + 1) * 2)));
    toast(`+${SC.fmt(c)} 🪙 colectate`);
    renderCity();
  });

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
      b.textContent = `Cumpără pentru ${SC.fmt(cost)} 🪙`;
      b.disabled = S.d.coins < cost;
      b.onclick = () => {
        if (S.d.coins < cost) return;
        S.d.coins -= cost; lot.owned = true; S.save();
        SC.Audio.coin();
        closeModal(); renderCity();
        toast('Teren cumpărat! 🎉');
      };
      body.appendChild(b);
      if (S.d.coins < cost) body.insertAdjacentHTML('beforeend', `<p class="sub">Îți mai trebuie ${SC.fmt(cost - S.d.coins)} 🪙 — colectează din trezorerie sau joacă!</p>`);
    } else {
      $('modalTitle').textContent = `Lot ${i + 1}`;
      if (lot.b) {
        const B = SC.BUILDINGS[lot.b.type];
        const lvl = lot.b.lvl || 1;
        const inc = T.lotIncome(lot) * T.multiplier();
        const box = document.createElement('div');
        box.className = 'reno';
        box.innerHTML = `<div class="row"><span>${B.emoji} <b style="color:#fff">${B.name}</b> · Nivel ${lvl}/${SC.MAX_LVL}</span></div>
          <div class="row"><span>👥 ${SC.fmt(lot.b.pop)} locuitori · ${lot.b.floors}/${B.floors} etaje</span></div>
          <div class="row"><span>Venit</span><b>+${SC.fmt(inc)} 🪙/min</b></div>
          ${lot.b.complete ? '' : '<div class="row"><span>⚠️ Neterminată: doar 50% din venit</span></div>'}`;
        if (lvl < SC.MAX_LVL) {
          const cost = T.renoCost(lot);
          const nextInc = inc * (1 + 0.5 * lvl) / (1 + 0.5 * (lvl - 1));
          const rb = document.createElement('button');
          rb.className = 'btn big';
          rb.innerHTML = `🔨 Renovează → Nv ${lvl + 1} · ${SC.fmt(cost)} <i class="ico coin"></i><br><small style="font-size:12px;font-weight:600">venit +${SC.fmt(inc)} → +${SC.fmt(nextInc)}/min</small>`;
          rb.disabled = S.d.coins < cost;
          rb.onclick = () => {
            if (!T.renovate(lot)) return;
            SC.Audio.coin(); SC.Audio.perfect(lvl);
            toast(`${B.emoji} ${B.name} renovat la nivelul ${lvl + 1}!`);
            renderCity(); openLot(i);
          };
          box.appendChild(rb);
        } else box.insertAdjacentHTML('beforeend', '<div class="row"><b>Nivel maxim! 🏆</b></div>');
        body.appendChild(box);
        body.insertAdjacentHTML('beforeend', `<div class="sep">Reconstruiește (se păstrează rezultatul mai bun)</div>`);
      }
      for (const key of SC.BUILD_ORDER) {
        const B = SC.BUILDINGS[key];
        const unlocked = !!S.d.types[key];
        const row = document.createElement('div');
        row.className = 'bopt';
        row.innerHTML = `<span class="e">${B.emoji}</span><div class="info"><b>${B.name}</b><small>${B.floors} etaje · ~${B.popPer} 👥/etaj · ${SC.RENT[key]} 🪙/loc./min</small></div>`;
        const btn = document.createElement('button');
        btn.className = 'btn small';
        if (unlocked) {
          btn.textContent = 'Construiește';
          btn.style.background = '#2e9e4e';
          btn.onclick = () => { closeModal(); startCity(i, key); };
        } else {
          btn.textContent = `${SC.fmt(B.cost)} 🪙`;
          btn.disabled = S.d.coins < B.cost;
          btn.onclick = () => {
            if (S.d.coins < B.cost) return;
            S.d.coins -= B.cost; S.d.types[key] = true; S.save();
            SC.Audio.coin();
            toast(`${B.name} deblocat!`);
            openLot(i);
            refreshCoins();
          };
        }
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    $('modal').classList.remove('hidden');
  }

  // fereastra "Bine ai revenit"
  function showOffline(o) {
    const h = Math.floor(o.away / 3600000), m = Math.floor((o.away % 3600000) / 60000);
    const away = h ? `${h}h ${m}m` : `${m} min`;
    $('modalTitle').textContent = '👋 Bine ai revenit!';
    const body = $('modalBody');
    body.innerHTML = `<p class="sub">Cât ai lipsit (${away}), orașul tău a strâns:</p>
      <div class="res-coins" style="font-size:34px;margin:6px 0 4px">+${SC.fmt(o.earned)}<i class="ico coin"></i></div>
      ${o.full ? '<p class="sub" style="color:#ff9a9a">Trezoreria e plină! Cumpără „Seif mai mare” ca să strângi mai mult.</p>' : ''}`;
    const b = document.createElement('button');
    b.className = 'btn big';
    b.textContent = T.hasMayor() ? 'Super!' : '💰 Colectează';
    b.onclick = () => {
      const c = T.collect();
      if (c) { SC.Audio.coin(); flyCoins(b, 8); }
      closeModal(); renderMenu(); refreshCoins();
    };
    body.appendChild(b);
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
      el.className = 'mis' + (unlocked ? '' : ' locked') + (stars ? ' done' : '') + (unlocked && !stars ? ' next' : '');
      el.style.animationDelay = Math.min(i * 0.035, 0.5) + 's';
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
      const nb = { type: cfg.type, floors: r.floors, pop: r.pop, complete: r.win, lvl: lot.b && lot.b.type === cfg.type ? lot.b.lvl || 1 : 1 };
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
      const li = SC.Tycoon.lotIncome(lot) * SC.Tycoon.multiplier();
      if (li > 0) sub += ` Clădirea aduce +${SC.fmt(li)} 🪙/min.`;
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

    coins = Math.round(coins * SC.Tycoon.gameBonus());
    SC.Tycoon.tick();
    S.d.coins += coins;
    S.save();

    $('resTitle').textContent = title;
    $('resSub').textContent = sub;
    $('resStars').innerHTML = stars || r.mode !== 'endless' && r.win
      ? [0, 1, 2].map((k) => `<span class="${k < stars ? '' : 'off'}" style="animation-delay:${0.35 + k * 0.22}s">⭐</span>`).join('')
      : '';
    $('resGrid').innerHTML = grid.map(([e, v, l], k) => `<div style="animation-delay:${0.1 + k * 0.06}s"><b>${e} ${v}</b><small>${l}</small></div>`).join('');
    countUp($('resCoins'), coins);
    $('resRecord').classList.toggle('hidden', !record);
    const hasNext = r.mode === 'mission' && r.win && cfg.missionIdx + 1 < SC.MISSIONS.length;
    $('btnNext').classList.toggle('hidden', !hasNext);
    $('btnAgain').textContent = r.mode === 'city' ? '🔄 Construiește din nou' : '🔄 Încă o dată';
    $('btnBack').textContent = r.mode === 'city' ? '🏙️ Înapoi în oraș' : r.mode === 'mission' ? '🎯 Misiuni' : '🏠 Meniu';
    if (stars) for (let k = 0; k < stars; k++) setTimeout(() => SC.Audio.perfect(k * 3), 350 + k * 220);
    else if (coins) setTimeout(() => SC.Audio.coin(), 250);
    show('result');
  }

  function clampPct(x) { return Math.max(0, Math.min(100, Math.round(x * 100))); }

  // numără monedele câștigate de la 0 în sus
  function countUp(el, value) {
    const t0 = performance.now(), dur = 900;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.innerHTML = `+${Math.round(value * (1 - Math.pow(1 - k, 3)))}<i class="ico coin"></i>`;
      if (k < 1) requestAnimationFrame(tick);
    };
    el.innerHTML = `+0<i class="ico coin"></i>`;
    setTimeout(() => requestAnimationFrame(tick), 300);
  }

  // ---------- HUD ----------
  let hudCache = {};
  function setText(id, v, cls) {
    if (hudCache[id] === v) return;
    const had = id in hudCache;
    hudCache[id] = v;
    const el = $(id);
    el.textContent = v;
    if (cls !== undefined) el.classList.toggle('warn', cls);
    if (had && (id === 'hudFloors' || id === 'hudPop' || id === 'hudLives')) {
      const target = id === 'hudLives' ? el : el.parentElement;
      const cl = id === 'hudLives' ? 'shake' : 'bump';
      target.classList.remove(cl); void target.offsetWidth; target.classList.add(cl);
    }
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
    document.querySelectorAll('#setSpeed button').forEach((b) => b.classList.toggle('on', +b.dataset.v === (S.d.settings.craneSpeed || 1)));
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
  document.querySelectorAll('#setSpeed button').forEach((b) => b.addEventListener('click', () => {
    S.d.settings.craneSpeed = +b.dataset.v; S.save(); SC.Audio.click(); renderSettings();
  }));
  $('setVib').onchange = (e) => { S.d.settings.vibrate = e.target.checked; SC.Audio.setVibrate(e.target.checked); S.save(); };
  let resetArmed = 0;
  $('btnReset').onclick = () => {
    const btn = $('btnReset');
    if (Date.now() - resetArmed > 3000) {
      resetArmed = Date.now();
      btn.textContent = '⚠️ Apasă din nou ca să ștergi tot';
      setTimeout(() => (btn.textContent = '🗑️ Resetează progresul'), 3000);
      return;
    }
    resetArmed = 0;
    btn.textContent = '🗑️ Resetează progresul';
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pause(); SC.Tycoon.tick(); S.save(); }
    else { const o = SC.Tycoon.offline(); if (o && o.earned > 0 && !playing) showOffline(o); }
  });
  window.addEventListener('resize', () => { if (current === 'city') drawCityView(); });

  // ---------- Bucla principală ----------
  let last = performance.now(), econT = 0, saveT = 0;
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    if (playing) updateHud();
    econT += dt;
    if (econT > 0.5) {
      econT = 0;
      SC.Tycoon.tick();
      if (current === 'city') updateTreasury();
      if (current === 'menu') updateMenuBadge();
      if (++saveT > 20) { saveT = 0; S.save(); }
    }
    if (current === 'city') drawCityView(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  show('menu');
  const off = SC.Tycoon.offline();
  if (off && off.earned > 0) setTimeout(() => showOffline(off), 600);
  window.addEventListener('pagehide', () => { SC.Tycoon.tick(); S.save(); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  }
})();
