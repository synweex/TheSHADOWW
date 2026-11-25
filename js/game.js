// SkyStack City — motorul jocului (canvas 2D)
window.SC = window.SC || {};

(function () {
  const W = 360;          // lățimea logică a ecranului
  const FH = 40;          // înălțimea unui etaj
  const BASE_BW = 128;    // lățimea unui bloc
  const ROPE = 190;       // lungimea cablului macaralei
  const PIVOT_Y = 104;    // unde e agățat cablul (sub HUD)
  const TOP_SCREEN = PIVOT_Y + ROPE + FH + FH * 2.2; // unde ținem vârful turnului pe ecran
  const THETA = 0.52;     // amplitudinea balansului

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }

  // ---------- Stiluri de clădiri ----------
  const STYLE = {
    casa:    { wall: ['#f2c48d', '#eeb87a', '#f5cf9f'], trim: '#b5643a', win: '#86cfe9', cols: 3 },
    bloc:    { wall: ['#a3bad1', '#97b0c9', '#adc3d8'], trim: '#5e7590', win: '#d3ecf9', cols: 4 },
    birouri: { wall: ['#4fb3c8', '#47a9be', '#58bcd0'], trim: '#2b6f80', win: '#c4f4ff', cols: 6, glass: true },
    turn:    { wall: ['#38476b', '#34436a', '#3f5079'], trim: '#d9b45a', win: '#7fa0d8', cols: 5, gold: true },
    spatiu:  { wall: ['#e3e8f0', '#d6dde9', '#eaeef5'], trim: '#8b97ab', win: '#6fd3ff', cols: 3, space: true },
  };
  SC.STYLE = STYLE;

  function drawFloor(ctx, cx, top, w, h, style, i, lit, ground) {
    const S = STYLE[style] || STYLE.bloc;
    const x = cx - w / 2;
    ctx.fillStyle = S.wall[i % 3];
    ctx.fillRect(x, top, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x + w * 0.84, top, w * 0.16, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, top, w * 0.05, h);

    if (S.space) {
      // module spațiale: hublouri + panouri solare
      if (i % 2 === 0) {
        ctx.fillStyle = '#2a4f9e';
        ctx.fillRect(x - w * 0.28, top + h * 0.3, w * 0.24, h * 0.4);
        ctx.fillRect(x + w * 1.04, top + h * 0.3, w * 0.24, h * 0.4);
        ctx.strokeStyle = '#6f8fd0'; ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath(); ctx.moveTo(x - w * 0.28 + k * w * 0.06, top + h * 0.3); ctx.lineTo(x - w * 0.28 + k * w * 0.06, top + h * 0.7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + w * 1.04 + k * w * 0.06, top + h * 0.3); ctx.lineTo(x + w * 1.04 + k * w * 0.06, top + h * 0.7); ctx.stroke();
        }
        ctx.fillStyle = '#8b97ab';
        ctx.fillRect(x - w * 0.04, top + h * 0.46, w * 0.04, h * 0.08);
        ctx.fillRect(x + w, top + h * 0.46, w * 0.04, h * 0.08);
      }
      for (let c = 0; c < S.cols; c++) {
        const wx = x + w * (0.2 + c * 0.3);
        ctx.fillStyle = '#7b879b';
        ctx.beginPath(); ctx.arc(wx, top + h * 0.48, h * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hash(i * 7 + c) < 0.6 ? '#ffe28a' : S.win;
        ctx.beginPath(); ctx.arc(wx, top + h * 0.48, h * 0.17, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff7a59';
      ctx.fillRect(x, top + h - 6, w, 2);
      ctx.fillStyle = S.trim;
      ctx.fillRect(x - 2, top + h - 4, w + 4, 4);
      return;
    }

    const m = w * 0.08;
    const slot = (w - 2 * m) / S.cols;
    const ww = slot * (S.glass ? 0.82 : 0.6);
    const wh = h * (S.glass ? 0.66 : 0.48);
    const wy = top + h * (S.glass ? 0.12 : 0.18);
    for (let c = 0; c < S.cols; c++) {
      const wx = x + m + c * slot + (slot - ww) / 2;
      if (ground && c === Math.floor(S.cols / 2)) {
        // ușa de la parter
        ctx.fillStyle = '#5a3b2a';
        ctx.fillRect(wx - 2, top + h * 0.28, ww + 4, h * 0.72 - 5);
        ctx.fillStyle = '#e8c07a';
        ctx.fillRect(wx + ww - 3, top + h * 0.6, 2, 3);
        continue;
      }
      const isLit = hash(i * 13 + c * 3.7) < (lit ? 0.8 : S.gold ? 0.45 : 0.12);
      ctx.fillStyle = isLit ? '#ffd866' : S.win;
      ctx.fillRect(wx, wy, ww, wh);
      if (!isLit) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(wx, wy, ww * 0.35, wh);
      }
      if (style === 'casa') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, 2);
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        ctx.fillStyle = '#d4553f';
        ctx.fillRect(wx - 1, wy + wh, ww + 2, 3);
      } else if (style === 'bloc' && c % 2 === 0) {
        ctx.fillStyle = '#6b819a';
        ctx.fillRect(wx - 3, wy + wh, ww + 6, 3);
      }
    }
    if (S.gold) {
      ctx.fillStyle = S.trim;
      ctx.fillRect(x + 2, top, 3, h);
      ctx.fillRect(x + w - 5, top, 3, h);
    }
    ctx.fillStyle = S.trim;
    ctx.fillRect(x - 3, top + h - 5, w + 6, 5);
  }
  SC.drawFloor = drawFloor;

  function drawRoof(ctx, cx, top, w, style, t) {
    const x = cx - w / 2;
    if (style === 'casa') {
      ctx.fillStyle = '#7a3b2a';
      ctx.fillRect(x + w * 0.66, top - 34, 12, 24);
      ctx.fillStyle = '#c4453a';
      ctx.beginPath(); ctx.moveTo(x - 10, top); ctx.lineTo(cx, top - 38); ctx.lineTo(x + w + 10, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.moveTo(cx, top - 38); ctx.lineTo(x + w + 10, top); ctx.lineTo(cx, top); ctx.closePath(); ctx.fill();
    } else if (style === 'bloc') {
      ctx.fillStyle = '#5e7590';
      ctx.fillRect(x - 3, top - 8, w + 6, 8);
      ctx.fillStyle = '#8796a8';
      ctx.fillRect(x + w * 0.15, top - 26, 26, 18);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.75, top - 8); ctx.lineTo(x + w * 0.75, top - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.75 - 8, top - 32); ctx.lineTo(x + w * 0.75 + 8, top - 32); ctx.stroke();
    } else if (style === 'birouri') {
      ctx.fillStyle = '#2b6f80';
      ctx.fillRect(x - 3, top - 10, w + 6, 10);
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.ellipse(cx, top - 12, w * 0.36, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('H', cx, top - 12);
    } else if (style === 'turn') {
      ctx.fillStyle = '#2c3856';
      ctx.fillRect(x + w * 0.12, top - 16, w * 0.76, 16);
      ctx.fillRect(x + w * 0.28, top - 32, w * 0.44, 16);
      ctx.fillStyle = '#d9b45a';
      ctx.fillRect(x + w * 0.12, top - 18, w * 0.76, 3);
      ctx.fillRect(x + w * 0.28, top - 34, w * 0.44, 3);
      ctx.fillStyle = '#c9ced8';
      ctx.beginPath(); ctx.moveTo(cx - 4, top - 34); ctx.lineTo(cx, top - 90); ctx.lineTo(cx + 4, top - 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff3b3b' : '#6b1a1a';
      ctx.beginPath(); ctx.arc(cx, top - 90, 3.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#8b97ab';
      ctx.fillRect(cx - 3, top - 30, 6, 30);
      ctx.fillStyle = '#dfe5ee';
      ctx.beginPath(); ctx.ellipse(cx, top - 32, 24, 9, -0.3, 0, Math.PI); ctx.fill();
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#63e6ff' : '#2a7a90';
      ctx.beginPath(); ctx.arc(cx, top - 40, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  SC.drawRoof = drawRoof;

  // ---------- Culorile cerului după altitudine (în etaje) ----------
  const SKY = [
    { f: 0,   top: '#56aef5', bot: '#cdeeff' },
    { f: 20,  top: '#79c2fb', bot: '#f1f9ff' },
    { f: 42,  top: '#2c6cc6', bot: '#93c8f2' },
    { f: 62,  top: '#122a63', bot: '#4569b0' },
    { f: 82,  top: '#04050e', bot: '#11183a' },
    { f: 160, top: '#030309', bot: '#0b0c25' },
    { f: 240, top: '#0b0319', bot: '#22103d' },
    { f: 330, top: '#14031c', bot: '#0a1838' },
  ];
  function skyAt(f) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (f <= b.f) {
        const t = clamp((f - a.f) / (b.f - a.f), 0, 1);
        return [mix(a.top, b.top, t), mix(a.bot, b.bot, t)];
      }
    }
    const l = SKY[SKY.length - 1];
    return [l.top, l.bot];
  }

  // ---------- Obiecte de fundal (generate o singură dată) ----------
  function buildBackground() {
    let seed = 1;
    const rnd = () => hash(seed++ * 3.17);
    const objs = [];
    for (let k = 0; k < 46; k++) objs.push({ t: 'cloud', f: 10 + rnd() * 52, x: rnd() * W, sy: rnd() * 600, p: 0.45 + rnd() * 0.4, s: 0.6 + rnd() * 0.9, v: 4 + rnd() * 10 });
    for (let k = 0; k < 7; k++) objs.push({ t: 'bird', f: 1 + rnd() * 16, x: rnd() * W, sy: rnd() * 500, p: 0.85, v: 18 + rnd() * 18 });
    for (let k = 0; k < 3; k++) objs.push({ t: 'plane', f: 32 + rnd() * 18, x: rnd() * W, sy: rnd() * 500, p: 0.6, v: 30 + rnd() * 15 });
    objs.push({ t: 'balloon', f: 62, x: 70, sy: 260, p: 0.5, v: 0 });
    for (let k = 0; k < 7; k++) objs.push({ t: 'sat', f: 86 + rnd() * 70, x: rnd() * W, sy: rnd() * 600, p: 0.4, v: 8 + rnd() * 10 });
    objs.push({ t: 'station', f: 112, x: 260, sy: 240, p: 0.38, v: 5 });
    objs.push({ t: 'moon', f: 145, x: 270, sy: 230, p: 0.22, v: 0 });
    objs.push({ t: 'planet', f: 200, x: 90, sy: 260, p: 0.2, v: 0, c1: '#e6b36a', c2: '#a86a2c', ring: true });
    objs.push({ t: 'planet', f: 262, x: 280, sy: 300, p: 0.18, v: 0, c1: '#e0644b', c2: '#7a2016' });
    objs.push({ t: 'planet', f: 300, x: 80, sy: 220, p: 0.17, v: 0, c1: '#7fd3e6', c2: '#2a6a9a', ring: true });
    for (let k = 0; k < 9; k++) objs.push({ t: 'nebula', f: 230 + rnd() * 200, x: rnd() * W, sy: rnd() * 600, p: 0.12, s: 90 + rnd() * 120, h: Math.floor(rnd() * 360) });
    objs.push({ t: 'galaxy', f: 345, x: 200, sy: 260, p: 0.12 });
    for (let k = 0; k < 6; k++) objs.push({ t: 'rock', f: 170 + rnd() * 120, x: rnd() * W, sy: rnd() * 600, p: 0.5, s: 4 + rnd() * 8, v: 6 + rnd() * 12 });
    const stars = [];
    for (let k = 0; k < 140; k++) stars.push({ x: rnd() * W, y: rnd() * 900, r: 0.5 + rnd() * 1.4, d: 0.02 + rnd() * 0.06, tw: rnd() * 6 });
    const skyline = [];
    let sx = -10;
    while (sx < W + 20) { const w = 24 + rnd() * 34; skyline.push({ x: sx, w, h: 40 + rnd() * 110, c: rnd() }); sx += w + 2; }
    const trees = [];
    for (let k = 0; k < 9; k++) trees.push({ x: rnd() * W, s: 0.7 + rnd() * 0.6 });
    return { objs, stars, skyline, trees };
  }

  // ---------- Clasa Game ----------
  class Game {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.bg = buildBackground();
      this.H = 640;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.reset({ mode: 'idle' });
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      if (!r.width) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.cv.width = Math.round(r.width * this.dpr);
      this.cv.height = Math.round(r.height * this.dpr);
      this.scale = r.width / W;
      this.H = r.height / this.scale;
    }

    reset(cfg) {
      this.cfg = Object.assign({ lives: 3, speed: 1, wind: 0, width: 1, time: 0, drift: 0 }, cfg);
      this.mode = this.cfg.mode;
      this.floors = [];
      this.lives = this.maxLives = this.cfg.lives;
      this.pop = 0; this.perfects = 0; this.combo = 0; this.maxCombo = 0; this.livesLost = 0;
      this.BW = BASE_BW * this.cfg.width;
      this.state = this.mode === 'idle' ? 'idle' : 'spawn';
      this.spawnT = 0; this.waitT = 0; this.endT = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.omega = 2.1;
      this.swayAmp = 0; this.swayPhase = 0;
      this.camY = 90 - this.H;
      this.blk = null;
      this.debris = []; this.parts = []; this.floats = []; this.banner = null;
      this.timeLeft = this.cfg.time;
      this.wind = 0; this.windTarget = 0; this.windT = 0;
      this.t = 0; this.finished = false; this.win = false; this.result = null;
      this.roof = null; this.shake = 0; this.flash = 0;
      this.zoneIdx = 0;
      this.pivotX = W / 2; this.pivotV = 0;
      this.paused = false;
      this.endReason = '';
    }

    // ---- utilitare ----
    styleFor(i) {
      if (this.cfg.style) return this.cfg.style;
      if (this.mode !== 'endless') return 'bloc';
      if (i >= 80) return 'spatiu';
      if (i < 12) return 'bloc';
      if (i < 28) return 'birouri';
      return Math.floor(i / 10) % 2 === 0 ? 'turn' : 'birouri';
    }
    popPer() {
      if (this.cfg.popPer) return this.cfg.popPer;
      return this.mode === 'endless' ? 20 : 15;
    }
    floorTop(i) { return -(i + 1) * FH; }
    swayDisp(i) {
      const n = this.floors.length;
      if (n < 2) return 0;
      return this.swayAmp * Math.sin(this.swayPhase) * Math.pow((i + 1) / n, 1.6);
    }
    floorX(i) { return this.floors[i].xb + this.swayDisp(i); }
    lean() { const n = this.floors.length; return n ? this.floors[n - 1].xb - W / 2 : 0; }
    topInfo() {
      const n = this.floors.length;
      if (!n) return { x: W / 2, xb: W / 2, y: 0 };
      return { x: this.floorX(n - 1), xb: this.floors[n - 1].xb, y: this.floorTop(n - 1) };
    }
    viewFloor() { return Math.max(0, -(this.camY + TOP_SCREEN) / FH); }
    spaceFactor() { return clamp((this.viewFloor() - 58) / 26, 0, 1); }
    ropeLen() { return this.state === 'spawn' ? lerp(30, ROPE, ease(this.spawnT / 0.45)) : ROPE; }
    angle() { return THETA * Math.sin(this.phase); }

    // ---- input ----
    tap() {
      if (this.paused) return;
      if (this.state === 'hang' || (this.state === 'spawn' && this.spawnT > 0.3)) this.release();
    }

    release() {
      const a = this.angle();
      const R = this.ropeLen() + FH / 2;
      const da = THETA * this.omega * Math.cos(this.phase);
      const cx = this.pivotX + R * Math.sin(a);
      const cy = PIVOT_Y + R * Math.cos(a);
      const n = this.floors.length;
      this.blk = {
        x: cx, y: cy + this.camY,
        vx: R * Math.cos(a) * da * 0.42 + this.pivotV * 0.5,
        vy: -R * Math.sin(a) * da * 0.3,
        rot: -a, style: this.styleFor(n), i: n,
      };
      this.state = 'drop';
      this.retract = 0;
      SC.Audio.drop();
    }

    spawnNext() { this.state = 'spawn'; this.spawnT = 0; this.blk = null; }

    // ---- logica de aterizare ----
    resolve(top) {
      const b = this.blk;
      const dx = b.x - top.x;
      const ad = Math.abs(dx);
      const first = this.floors.length === 0;
      const perfTol = this.BW * (first ? 0.12 : 0.075);
      const okTol = this.BW * (first ? 0.85 : 0.6);
      if (ad > okTol) return this.fail(dx >= 0 ? 1 : -1, 'Ratat!');
      const perfect = ad <= perfTol;
      const xb = perfect ? top.xb : top.xb + dx;
      if (!perfect && Math.abs(xb - W / 2) > this.BW * 1.0) return this.fail(dx >= 0 ? 1 : -1, 'Prea înclinat!');
      this.place(xb, perfect, 1 - ad / okTol);
    }

    place(xb, perfect, acc) {
      const i = this.floors.length;
      this.floors.push({ xb, style: this.blk.style, perfect, land: 1 });
      this.blk = null;
      if (perfect) {
        this.combo++; this.perfects++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.swayAmp *= 0.75;
        this.flash = 1;
      } else {
        this.combo = 0;
      }
      const gain = Math.round(this.popPer() * (perfect ? 1 + Math.min(this.combo, 10) * 0.1 : 0.45 + 0.5 * acc));
      this.pop += gain;
      const x = this.floorX(i), y = this.floorTop(i);
      this.floats.push({ x: x + 50, y: y + 10, text: '+' + gain + ' 👤', color: '#fff', life: 1.2 });
      if (perfect) {
        this.banner = { text: this.combo > 1 ? `PERFECT x${this.combo}` : 'PERFECT!', life: 1, big: this.combo >= 3 };
        SC.Audio.perfect(this.combo);
        for (let k = 0; k < 18; k++) this.parts.push({ x: x + (Math.random() - 0.5) * this.BW, y: y + FH, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 180, life: 0.8, max: 0.8, c: ['#ffd54a', '#fff6c2', '#ff9f43'][k % 3], s: 2 + Math.random() * 3 });
      } else {
        SC.Audio.land();
      }
      for (let k = 0; k < 10; k++) {
        const side = k % 2 ? 1 : -1;
        this.parts.push({ x: x + side * this.BW / 2, y: y + FH, vx: side * (30 + Math.random() * 60), vy: -Math.random() * 40, life: 0.5, max: 0.5, c: 'rgba(230,220,200,0.8)', s: 3 + Math.random() * 3 });
      }
      this.shake = perfect ? 0.12 : 0.2;
      SC.Save.d.stats.blocks++;
      if (perfect) SC.Save.d.stats.perfects++;

      // milestone-uri în Endless
      if (this.mode === 'endless') {
        const n = this.floors.length;
        for (let z = this.zoneIdx + 1; z < SC.ZONES.length; z++) {
          if (n >= SC.ZONES[z].f) {
            this.zoneIdx = z;
            this.banner = { text: SC.ZONES[z].msg, life: 2.4, big: true, milestone: true };
            SC.Audio.milestone();
          }
        }
      }

      if (this.checkGoal()) return this.finish(true);
      this.state = 'wait';
      this.waitT = 0.28;
    }

    fail(dir, msg) {
      const b = this.blk;
      this.debris.push({ x: b.x, y: b.y, vx: dir * 80 + b.vx * 0.5, vy: Math.min(b.vy, 200) * 0.3, rot: b.rot, vr: dir * (2.5 + Math.random() * 2), style: b.style, i: b.i });
      this.blk = null;
      this.lives--; this.livesLost++; this.combo = 0;
      this.banner = { text: msg, life: 1, bad: true };
      this.shake = 0.35;
      SC.Audio.fail();
      this.state = 'wait';
      this.waitT = 0.7;
    }

    checkGoal() {
      const c = this.cfg;
      if (c.target && this.floors.length >= c.target) return true;
      const g = c.goal;
      if (!g) return false;
      if (g.type === 'floors') return this.floors.length >= g.value;
      if (g.type === 'perfects') return this.perfects >= g.value;
      if (g.type === 'combo') return this.maxCombo >= g.value;
      if (g.type === 'population') return this.pop >= g.value;
      return false;
    }

    finish(win, reason) {
      if (this.finished) return;
      this.finished = true;
      this.win = win;
      this.state = 'done';
      this.endReason = reason || '';
      this.blk = null;
      if (win) {
        if (this.floors.length && this.mode !== 'endless') this.roof = { t: 0, style: this.floors[this.floors.length - 1].style };
        this.endT = 2.0;
        SC.Audio.win();
        this.banner = { text: this.mode === 'city' ? 'CLĂDIRE GATA!' : 'MISIUNE REUȘITĂ!', life: 2.2, big: true };
        for (let k = 0; k < 70; k++) {
          this.parts.push({ x: Math.random() * W, y: this.camY - 20 - Math.random() * 80, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 120, life: 2.5, max: 2.5, c: `hsl(${Math.random() * 360},90%,60%)`, s: 3 + Math.random() * 3, conf: true, rot: Math.random() * 6 });
        }
      } else {
        this.endT = 1.3;
        SC.Audio.over();
      }
      SC.Save.d.stats.games++;
      this.result = {
        mode: this.mode, win, floors: this.floors.length, pop: this.pop,
        perfects: this.perfects, maxCombo: this.maxCombo, livesLost: this.livesLost,
        reason: this.endReason, cfg: this.cfg,
        alt: SC.altitude(this.floors.length),
      };
    }

    // ---- update ----
    update(dt) {
      if (this.paused) return;
      this.t += dt;
      const c = this.cfg;
      const n = this.floors.length;
      const endless = this.mode === 'endless';

      // dificultate progresivă
      const sp = c.speed * (1 + Math.min(endless ? 0.85 : 0.45, n * (endless ? 0.0065 : 0.012)));
      this.omega = 2.1 * sp;
      this.phase += this.omega * dt;

      // macaraua alunecă (misiuni sau Endless sus)
      const drift = c.drift + (endless ? clamp((n - 30) * 1.1, 0, 60) : 0);
      const px = W / 2 + Math.sin(this.t * 0.55) * drift;
      this.pivotV = (px - this.pivotX) / Math.max(dt, 0.001);
      this.pivotX = px;

      // balansul turnului
      let target = n > 3 ? Math.min(endless ? 32 : 22, (n - 3) * 0.5) : 0;
      target += Math.min(18, Math.abs(this.lean()) * 0.12);
      this.swayAmp = lerp(this.swayAmp, target, 1 - Math.exp(-dt * 1.5));
      this.swayPhase += dt * 1.25;

      // vânt
      let windLevel = c.wind;
      if (endless && n >= 40 && n < 80) windLevel = Math.max(windLevel, 1); // curentul jet
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = 4 + Math.random() * 4;
        const mag = windLevel === 0 ? 0 : windLevel === 1 ? 60 + Math.random() * 50 : 130 + Math.random() * 70;
        this.windTarget = (Math.random() < 0.5 ? -1 : 1) * mag;
      }
      if (!windLevel) this.windTarget = 0;
      this.wind = lerp(this.wind, this.windTarget, 1 - Math.exp(-dt * 1.2));

      // cronometru
      if (c.time && !this.finished && this.state !== 'idle') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish(false, 'Timpul a expirat!'); }
      }

      switch (this.state) {
        case 'spawn':
          this.spawnT += dt;
          if (this.spawnT >= 0.45) this.state = 'hang';
          break;
        case 'drop': {
          const b = this.blk;
          const g = 1750 * (1 - 0.45 * this.spaceFactor());
          const prevBottom = b.y + FH / 2;
          b.vy += g * dt;
          b.vx += this.wind * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot *= Math.exp(-7 * dt);
          this.retract += dt;
          const top = this.topInfo();
          const bottom = b.y + FH / 2;
          if (prevBottom <= top.y && bottom >= top.y) this.resolve(top);
          else if (b.y - this.camY > this.H + 60) this.fail(b.x >= top.x ? 1 : -1, 'Ratat!'); // plasă de siguranță
          break;
        }
        case 'wait':
          this.waitT -= dt;
          if (this.waitT <= 0) {
            if (this.lives <= 0) this.finish(false, 'Nu mai ai vieți!');
            else this.spawnNext();
          }
          break;
        case 'done':
          this.endT -= dt;
          if (this.roof) this.roof.t += dt;
          if (this.endT <= 0 && !this.ended) {
            this.ended = true;
            if (c.onEnd) c.onEnd(this.result);
          }
          break;
      }
      if (this.state !== 'done') this.ended = false;

      // camera
      const topY = n ? this.floorTop(n - 1) : 0;
      const camTarget = Math.min(90 - this.H, topY - TOP_SCREEN);
      this.camY = lerp(this.camY, camTarget, 1 - Math.exp(-dt * 4));

      // resturi, particule, texte
      for (const d of this.debris) { d.vy += 1600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
      this.debris = this.debris.filter((d) => d.y - this.camY < this.H + 200);
      for (const p of this.parts) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.conf) { p.vx += Math.sin(this.t * 3 + p.rot) * 30 * dt; p.rot += dt * 5; } else p.vy += 300 * dt;
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const f of this.floats) { f.life -= dt; f.y -= 40 * dt; }
      this.floats = this.floats.filter((f) => f.life > 0);
      for (const f of this.floors) if (f.land > 0) f.land = Math.max(0, f.land - dt * 4);
      if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt * 3);
    }

    // ---- desenare ----
    render() {
      const ctx = this.ctx;
      const s = this.scale * this.dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      const H = this.H;
      const vf = this.viewFloor();
      const sf = this.spaceFactor();

      // cerul
      const [ct, cb] = skyAt(vf);
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, ct); gr.addColorStop(1, cb);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);

      // stele
      const starA = clamp((vf - 50) / 30, 0, 1);
      if (starA > 0) {
        for (const st of this.bg.stars) {
          const y = ((st.y - this.camY * st.d) % (H + 20) + H + 20) % (H + 20) - 10;
          ctx.globalAlpha = starA * (0.55 + 0.45 * Math.sin(this.t * 2 + st.tw));
          ctx.fillStyle = '#fff';
          ctx.fillRect(st.x, y, st.r, st.r);
        }
        ctx.globalAlpha = 1;
      }

      // Pământul văzut de sus
      const earthT = clamp((vf - 64) / 36, 0, 1) * (1 - clamp((vf - 175) / 90, 0, 1));
      if (earthT > 0.01) {
        const R = 900 - earthT * 250;
        const cy = H + R - earthT * 150;
        const eg = ctx.createRadialGradient(W / 2, cy, R - 60, W / 2, cy, R + 30);
        eg.addColorStop(0, '#1f5fb8'); eg.addColorStop(0.8, '#3d8fe0'); eg.addColorStop(0.93, '#9fe0ff'); eg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.globalAlpha = earthT;
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(W / 2, cy, R + 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(90,170,90,0.6)';
        ctx.beginPath(); ctx.ellipse(W * 0.3, cy - R + 40, 60, 16, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W * 0.75, cy - R + 60, 40, 12, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      this.renderBgObjects(ctx, vf);

      // orizontul cu orașul (paralaxă)
      const groundScreen = -this.camY;
      const p = 0.55;
      const skyBase = -this.camY * p + (H - 90) * (1 - p);
      if (skyBase - 160 < H) {
        for (const b of this.bg.skyline) {
          ctx.fillStyle = mix('#8fb3d6', '#6e94bd', b.c);
          ctx.fillRect(b.x, skyBase - b.h, b.w, b.h + 400);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          for (let wy = skyBase - b.h + 8; wy < skyBase - 6; wy += 12)
            for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 9) ctx.fillRect(wx, wy, 4, 5);
        }
      }

      // vecinii din oraș (modul Oraș)
      ctx.save();
      const shx = (Math.random() - 0.5) * this.shake * 14;
      const shy = (Math.random() - 0.5) * this.shake * 10;
      ctx.translate(shx, shy - this.camY);

      if (this.cfg.neighbors) {
        this.cfg.neighbors.forEach((nb, k) => {
          if (!nb) return;
          const cx = k === 0 ? 20 : W - 20;
          const w = 70, h = 26;
          for (let i = 0; i < nb.floors; i++) {
            const top = -(i + 1) * h;
            if (top - this.camY > H || top - this.camY < -60) continue;
            drawFloor(ctx, cx, top, w, h, SC.BUILDINGS[nb.type].style, i, false, i === 0);
          }
          if (nb.complete) {
            ctx.save(); ctx.translate(cx, -nb.floors * h); ctx.scale(0.55, 0.55);
            drawRoof(ctx, 0, 0, w / 0.55, SC.BUILDINGS[nb.type].style, this.t);
            ctx.restore();
          }
        });
      }

      // solul
      if (groundScreen < H + 40) {
        ctx.fillStyle = '#6cc04a';
        ctx.fillRect(-20, 0, W + 40, H + 200);
        ctx.fillStyle = '#58a83a';
        ctx.fillRect(-20, 0, W + 40, 6);
        ctx.fillStyle = '#555c66';
        ctx.fillRect(-20, 34, W + 40, 26);
        ctx.fillStyle = '#f2f2f2';
        for (let x = -10; x < W + 20; x += 36) ctx.fillRect(x, 46, 18, 3);
        for (const tr of this.bg.trees) {
          if (Math.abs(tr.x - W / 2) < this.BW / 2 + 20) continue;
          ctx.fillStyle = '#7a5230';
          ctx.fillRect(tr.x - 2, -14 * tr.s, 4, 14 * tr.s);
          ctx.fillStyle = '#3f9a3a';
          ctx.beginPath(); ctx.arc(tr.x, -18 * tr.s, 10 * tr.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#9aa1ab';
        ctx.fillRect(W / 2 - this.BW / 2 - 12, -4, this.BW + 24, 10);
        ctx.fillStyle = '#7d848e';
        ctx.fillRect(W / 2 - this.BW / 2 - 12, 4, this.BW + 24, 3);
      }

      // turnul
      const lit = sf > 0.35;
      const n = this.floors.length;
      for (let i = 0; i < n; i++) {
        const top = this.floorTop(i);
        const sy = top - this.camY;
        if (sy > H + 10 || sy < -FH - 100) continue;
        const f = this.floors[i];
        const x = this.floorX(i);
        if (f.land > 0) {
          const sq = f.land * 0.08;
          ctx.save();
          ctx.translate(x, top + FH);
          ctx.scale(1 + sq, 1 - sq);
          drawFloor(ctx, 0, -FH, this.BW, FH, f.style, i, lit, i === 0);
          ctx.restore();
        } else {
          drawFloor(ctx, x, top, this.BW, FH, f.style, i, lit, i === 0);
        }
        if (f.perfect && i === n - 1 && this.flash > 0) {
          ctx.strokeStyle = `rgba(255,230,120,${this.flash})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x - this.BW / 2 - 4, top - 4, this.BW + 8, FH + 8);
        }
      }

      // acoperișul la final
      if (this.roof && n) {
        const k = ease(this.roof.t / 0.5);
        const top = this.floorTop(n - 1);
        ctx.save();
        ctx.globalAlpha = k;
        drawRoof(ctx, this.floorX(n - 1), top - (1 - k) * 60, this.BW, this.roof.style, this.t);
        ctx.restore();
      }

      // resturi care cad
      for (const d of this.debris) {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        drawFloor(ctx, 0, -FH / 2, this.BW, FH, d.style, d.i, lit, false);
        ctx.restore();
      }

      // blocul care cade
      if (this.state === 'drop' && this.blk) {
        const b = this.blk;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        drawFloor(ctx, 0, -FH / 2, this.BW, FH, b.style, b.i, lit, b.i === 0);
        ctx.restore();
      }

      // particule
      for (const pt of this.parts) {
        ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
        ctx.fillStyle = pt.c;
        if (pt.conf) {
          ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
          ctx.fillRect(-pt.s, -pt.s / 2, pt.s * 2, pt.s); ctx.restore();
        } else ctx.fillRect(pt.x - pt.s / 2, pt.y - pt.s / 2, pt.s, pt.s);
      }
      ctx.globalAlpha = 1;

      // texte plutitoare
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const f of this.floats) {
        ctx.globalAlpha = clamp(f.life, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // macaraua (spațiu ecran)
      if (this.mode !== 'idle') this.renderCrane(ctx, lit);

      // vânt
      if (Math.abs(this.wind) > 15) this.renderWind(ctx);

      // banner
      if (this.banner) {
        const b = this.banner;
        const life0 = b.milestone ? 2.4 : b.big ? 2.2 : 1;
        const age = life0 - b.life;
        const sc = b.big ? 1 + 0.25 * Math.max(0, 1 - age * 4) : 1 + 0.4 * Math.max(0, 1 - age * 6);
        ctx.save();
        ctx.globalAlpha = clamp(b.life * 2, 0, 1);
        ctx.translate(W / 2, b.milestone ? H * 0.36 : TOP_SCREEN - 150);
        ctx.scale(sc, sc);
        ctx.font = `900 ${b.milestone ? 20 : b.big ? 30 : 26}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeText(b.text, 0, 0);
        ctx.fillStyle = b.bad ? '#ff6b6b' : b.milestone ? '#ffffff' : '#ffd84a';
        ctx.fillText(b.text, 0, 0);
        ctx.restore();
      }
    }

    renderCrane(ctx, lit) {
      const py = PIVOT_Y;
      // brațul macaralei
      ctx.fillStyle = '#f0b400';
      ctx.fillRect(0, py - 22, W, 4);
      ctx.fillRect(0, py - 8, W, 4);
      ctx.strokeStyle = '#f0b400'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W + 20; x += 20) { ctx.moveTo(x, py - 18); ctx.lineTo(x + 10, py - 8); ctx.lineTo(x + 20, py - 18); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, py - 4, W, 2);
      // căruciorul
      const px = this.pivotX;
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(px - 16, py - 26, 32, 22);
      ctx.fillStyle = '#ffcc33';
      ctx.fillRect(px - 12, py - 22, 24, 3);
      ctx.fillStyle = '#20242c';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();

      if (this.state === 'spawn' || this.state === 'hang') {
        const a = this.angle();
        const L = this.ropeLen();
        const ex = px + L * Math.sin(a), ey = py + L * Math.cos(a);
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.save();
        ctx.translate(ex, ey); ctx.rotate(-a);
        // cârligul + chingile
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-this.BW * 0.35, 6); ctx.moveTo(0, 0); ctx.lineTo(this.BW * 0.35, 6); ctx.stroke();
        ctx.fillStyle = '#9aa0a8';
        ctx.fillRect(-4, -4, 8, 8);
        const n = this.floors.length;
        drawFloor(ctx, 0, 6, this.BW, FH, this.styleFor(n), n, lit, n === 0);
        ctx.restore();
      } else if (this.state === 'drop') {
        const L = Math.max(10, ROPE * (1 - ease(this.retract / 0.35)) + 10);
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + L); ctx.stroke();
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(px - 4, py + L - 4, 8, 8);
      } else if (this.state === 'idle') {
        const a = this.angle() * 0.6;
        const ex = px + ROPE * 0.7 * Math.sin(a), ey = py + ROPE * 0.7 * Math.cos(a);
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(ex - 5, ey - 2, 10, 10);
      }
    }

    renderWind(ctx) {
      const dir = Math.sign(this.wind);
      const a = clamp(Math.abs(this.wind) / 200, 0.15, 0.6);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) {
        const y = 140 + ((k * 73) % (this.H - 200));
        const len = 30 + (k % 3) * 15;
        let x = ((this.t * this.wind * 1.8 + k * 97) % (W + 80) + W + 80) % (W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * len, y); ctx.stroke();
      }
    }

    renderBgObjects(ctx, vf) {
      const H = this.H;
      for (const o of this.bg.objs) {
        const y = o.sy + (vf - o.f) * FH * o.p;
        if (y < -200 || y > H + 200) continue;
        let x = o.x;
        if (o.v) x = ((o.x + this.t * o.v) % (W + 160) + W + 160) % (W + 160) - 80;
        switch (o.t) {
          case 'cloud': {
            const s = o.s;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
            ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
            ctx.arc(x + 44 * s, y, 17 * s, 0, Math.PI * 2);
            ctx.rect(x, y - 2 * s, 44 * s, 18 * s);
            ctx.fill();
            break;
          }
          case 'bird': {
            const fl = Math.sin(this.t * 10 + o.x) * 4;
            ctx.strokeStyle = '#2d3b4f'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x - 7, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + 7, y - fl); ctx.stroke();
            break;
          }
          case 'plane': {
            ctx.fillStyle = '#f4f6fa';
            ctx.beginPath(); ctx.ellipse(x, y, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d63b3b';
            ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 24, y - 10); ctx.lineTo(x - 14, y); ctx.fill();
            ctx.fillStyle = '#c9d0db';
            ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 10, y + 10); ctx.lineTo(x + 4, y); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 120, y); ctx.stroke();
            break;
          }
          case 'balloon': {
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 40); ctx.stroke();
            ctx.fillStyle = '#f1f1f1';
            ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffb347'; ctx.fillRect(x - 4, y + 40, 8, 6);
            break;
          }
          case 'sat': {
            ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.2 + o.f);
            ctx.fillStyle = '#c9ced8'; ctx.fillRect(-4, -4, 8, 8);
            ctx.fillStyle = '#3460b8'; ctx.fillRect(-18, -3, 12, 6); ctx.fillRect(6, -3, 12, 6);
            ctx.restore();
            break;
          }
          case 'station': {
            ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 30, y - 3, 60, 6); ctx.fillRect(x - 6, y - 8, 12, 16);
            ctx.fillStyle = '#2e55a8';
            for (const dx of [-28, -16, 10, 22]) { ctx.fillRect(x + dx, y - 22, 8, 16); ctx.fillRect(x + dx, y + 6, 8, 16); }
            break;
          }
          case 'moon': {
            ctx.fillStyle = '#e8e6df';
            ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#cfccc2';
            for (const [cx, cy, r] of [[-20, -15, 14], [25, 10, 10], [-5, 30, 8], [30, -30, 7], [-38, 18, 6]]) {
              ctx.beginPath(); ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2); ctx.fill();
            }
            break;
          }
          case 'planet': {
            const g = ctx.createRadialGradient(x - 15, y - 15, 5, x, y, 50);
            g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
            if (o.ring) {
              ctx.strokeStyle = 'rgba(230,210,170,0.6)'; ctx.lineWidth = 6;
              ctx.beginPath(); ctx.ellipse(x, y, 80, 18, -0.3, Math.PI, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill();
            if (o.ring) {
              ctx.strokeStyle = 'rgba(230,210,170,0.75)'; ctx.lineWidth = 6;
              ctx.beginPath(); ctx.ellipse(x, y, 80, 18, -0.3, 0, Math.PI); ctx.stroke();
            }
            break;
          }
          case 'nebula': {
            const g = ctx.createRadialGradient(x, y, 0, x, y, o.s);
            g.addColorStop(0, `hsla(${o.h},80%,60%,0.28)`); g.addColorStop(1, `hsla(${o.h},80%,40%,0)`);
            ctx.fillStyle = g;
            ctx.fillRect(x - o.s, y - o.s, o.s * 2, o.s * 2);
            break;
          }
          case 'galaxy': {
            ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.05);
            for (let k = 0; k < 220; k++) {
              const a = k * 0.18, r = k * 0.45;
              ctx.fillStyle = `hsla(${260 + k * 0.4},90%,${70 - k * 0.1}%,0.8)`;
              ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.5, 2, 2);
              ctx.fillRect(-Math.cos(a) * r, -Math.sin(a) * r * 0.5, 2, 2);
            }
            ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            break;
          }
          case 'rock': {
            ctx.fillStyle = '#8a7b6c';
            ctx.beginPath(); ctx.arc(x, y, o.s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6d6054';
            ctx.beginPath(); ctx.arc(x + o.s * 0.3, y - o.s * 0.2, o.s * 0.35, 0, Math.PI * 2); ctx.fill();
            break;
          }
        }
      }
    }
  }

  SC.Game = Game;
  SC.FH = FH;
})();
